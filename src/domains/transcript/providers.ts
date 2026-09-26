import type { AsrStage, TranscribeInput, TranscriptionProvider, TranscriptionResult } from './asr';

export const DEFAULT_SERVER_URL = 'http://127.0.0.1:8778';

export interface ServerHealth {
  ok: boolean;
  engine: string;
  models: Record<string, string>;
  ytdlp: boolean;
}

export async function serverHealth(baseUrl: string, timeoutMs = 1500): Promise<ServerHealth | null> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? ((await res.json()) as ServerHealth) : null;
  } catch {
    return null;
  }
}

/**
 * faster-whisper running on the learner's own machine (tools/transcriber).
 * Best accuracy; the only way to transcribe YouTube audio (via yt-dlp).
 */
export function localServerProvider(baseUrl: string): TranscriptionProvider {
  return {
    id: 'local-server',
    supports: (input) => !!input.file || !!input.youtubeUrl,
    available: async () => !!(await serverHealth(baseUrl)),
    async transcribe(input, onProgress, signal) {
      let res: Response;
      if (input.youtubeUrl) {
        res = await fetch(`${baseUrl}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input.youtubeUrl, language: input.language, model: input.quality }),
          signal,
        });
      } else {
        const form = new FormData();
        form.append('file', input.file!, (input.file as File).name ?? 'audio');
        if (input.language) form.append('language', input.language);
        form.append('model', input.quality);
        res = await fetch(`${baseUrl}/transcribe`, { method: 'POST', body: form, signal });
      }
      const body = (await res.json()) as { job?: string; error?: string };
      if (!res.ok || !body.job) throw new Error(body.error ?? `HTTP ${res.status}`);

      for (;;) {
        await new Promise((r) => setTimeout(r, 1000));
        if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
        const job = (await (await fetch(`${baseUrl}/jobs/${body.job}`, { signal })).json()) as {
          status: 'running' | 'done' | 'error';
          stage: AsrStage;
          progress: number;
          result?: TranscriptionResult;
          error?: string;
        };
        onProgress(job.progress, job.stage);
        if (job.status === 'done' && job.result) return job.result;
        if (job.status === 'error') throw new Error(job.error ?? 'transcription failed');
      }
    },
  };
}

/**
 * Whisper in the browser (Transformers.js, WebGPU when available, else WASM).
 * No install needed, but slower and less accurate; uploaded files only.
 */
export function browserProvider(): TranscriptionProvider {
  return {
    id: 'browser',
    supports: (input) => !!input.file,
    available: async () => typeof Worker !== 'undefined' && typeof AudioContext !== 'undefined',
    async transcribe(input, onProgress, signal) {
      onProgress(0.01, 'loading-model');
      const audio = await decodeTo16k(input.file!);
      const worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
      try {
        return await new Promise<TranscriptionResult>((resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          worker.onmessage = (e: MessageEvent) => {
            const m = e.data as
              | { type: 'progress'; progress: number; stage: AsrStage }
              | { type: 'done'; result: TranscriptionResult }
              | { type: 'error'; error: string };
            if (m.type === 'progress') onProgress(m.progress, m.stage);
            else if (m.type === 'done') resolve(m.result);
            else reject(new Error(m.error));
          };
          worker.onerror = (e) => reject(new Error(e.message));
          worker.postMessage({ audio, language: input.language, quality: input.quality }, [audio.buffer]);
        });
      } finally {
        worker.terminate();
      }
    },
  };
}

/** Decode any audio/video file to 16 kHz mono PCM (what Whisper expects). */
async function decodeTo16k(file: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    if (buf.numberOfChannels === 1) return buf.getChannelData(0).slice();
    const out = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels;
    }
    return out;
  } finally {
    ctx.close().catch(() => {});
  }
}

/** Pick the best available provider for an input. */
export async function pickProvider(input: TranscribeInput, serverUrl: string): Promise<TranscriptionProvider | null> {
  const server = localServerProvider(serverUrl);
  if (server.supports(input) && (await server.available())) return server;
  const browser = browserProvider();
  if (browser.supports(input) && (await browser.available())) return browser;
  return null;
}
