/**
 * Microphone capture with MediaRecorder. Nothing leaves the device.
 * Echo cancellation is disabled so the learner's voice is not "cleaned" into
 * something it is not; headphones are recommended while shadowing.
 */
export interface RecorderHandle {
  stop(): Promise<{ blob: Blob; mime: string; durationMs: number }>;
  cancel(): void;
  level(): number; // 0..1 live input level for a meter
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

export function isRecordingSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export async function startRecording(): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
  });
  const mime = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const started = performance.now();
  rec.start(100);

  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);

  const cleanup = () => {
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };

  return {
    level() {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      return Math.min(1, peak / 100);
    },
    stop() {
      return new Promise((resolve) => {
        rec.onstop = () => {
          cleanup();
          const type = rec.mimeType || mime || 'audio/webm';
          resolve({ blob: new Blob(chunks, { type }), mime: type, durationMs: performance.now() - started });
        };
        rec.stop();
      });
    },
    cancel() {
      rec.onstop = null;
      if (rec.state !== 'inactive') rec.stop();
      cleanup();
    },
  };
}

/** Decode audio and compute `n` normalised peak values for a waveform. */
export async function computePeaks(blob: Blob, n = 96): Promise<{ peaks: number[]; durationMs: number }> {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  const data = audio.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / n));
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (let j = i * size; j < Math.min(data.length, (i + 1) * size); j++) p = Math.max(p, Math.abs(data[j]));
    peaks.push(p);
    max = Math.max(max, p);
  }
  return { peaks: peaks.map((p) => (max ? +(p / max).toFixed(3) : 0)), durationMs: audio.duration * 1000 };
}

/** Play a blob; resolves when finished (or rejects on error). */
export function playBlob(blob: Blob, rate = 1, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.playbackRate = rate;
    const done = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.onended = done;
    a.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('playback failed'));
    };
    signal?.addEventListener('abort', () => {
      a.pause();
      done();
    });
    a.play().catch(reject);
  });
}
