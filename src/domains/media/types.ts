/**
 * Media abstraction. The learning engine talks to this interface only —
 * YouTube, <audio>/<video> files and future podcast sources are adapters.
 */
export type PlayerEventName = 'ready' | 'play' | 'pause' | 'ended' | 'ratechange' | 'durationchange' | 'error';

export interface MediaPlayer {
  readonly kind: 'html5' | 'youtube';
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  on(event: PlayerEventName, cb: (detail?: unknown) => void): () => void;
  destroy(): void;
}

export class Emitter<E extends string> {
  private map = new Map<E, Set<(d?: unknown) => void>>();
  on(e: E, cb: (d?: unknown) => void) {
    let set = this.map.get(e);
    if (!set) this.map.set(e, (set = new Set()));
    set.add(cb);
    return () => set!.delete(cb);
  }
  emit(e: E, d?: unknown) {
    this.map.get(e)?.forEach((cb) => cb(d));
  }
  clear() {
    this.map.clear();
  }
}
