/// <reference lib="webworker" />
/**
 * In-browser Whisper (Transformers.js). Runs in a worker so the UI stays
 * responsive; models are downloaded once from the Hugging Face CDN and cached
 * by the browser. Audio never leaves the device.
 */
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import type { AsrSegment, TranscriptionResult } from './asr';

interface Req {
  audio: Float32Array;
  language?: string;
  quality: 'accurate' | 'fast';
}

const LANG_NAME: Record<string, string> = { ja: 'japanese', en: 'english', vi: 'vietnamese' };

async function hasWebGPU() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try {
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

self.onmessage = async (e: MessageEvent<Req>) => {
  const { audio, language, quality } = e.data;
  const post = (m: unknown) => (self as unknown as Worker).postMessage(m);
  try {
    const webgpu = await hasWebGPU();
    // WebGPU can afford the large-v3-turbo model; CPU (WASM) stays small.
    const model =
      quality === 'accurate'
        ? webgpu ? 'onnx-community/whisper-large-v3-turbo' : 'onnx-community/whisper-small'
        : 'onnx-community/whisper-base';
    const loaded = new Map<string, [number, number]>();
    const asr = (await pipeline('automatic-speech-recognition', model, {
      device: webgpu ? 'webgpu' : 'wasm',
      dtype: webgpu ? { encoder_model: 'fp16', decoder_model_merged: 'q4' } : 'q8',
      progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status === 'progress' && p.file && p.total) {
          loaded.set(p.file, [p.loaded ?? 0, p.total]);
          const [a, b] = [...loaded.values()].reduce(([x, y], [l, t]) => [x + l, y + t], [0, 0]);
          post({ type: 'progress', stage: 'loading-model', progress: 0.02 + 0.28 * (a / b) });
        }
      },
    })) as AutomaticSpeechRecognitionPipeline;

    post({ type: 'progress', stage: 'transcribing', progress: 0.32 });
    const out = (await asr(audio, {
      language: language ? LANG_NAME[language] : undefined,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    })) as { text: string; chunks?: { text: string; timestamp: [number, number | null] }[] };

    const duration = audio.length / 16000;
    const segments: AsrSegment[] = (out.chunks ?? [{ text: out.text, timestamp: [0, duration] }]).map((c) => ({
      start: c.timestamp[0],
      end: c.timestamp[1] ?? duration,
      text: c.text.trim(),
      words: [], // segment-level timing; sentence splitting falls back to segments
    }));
    const result: TranscriptionResult = { language: language ?? 'auto', duration, model: `${model} (${webgpu ? 'WebGPU' : 'WASM'})`, segments };
    post({ type: 'done', result });
  } catch (err) {
    post({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};
