import { Emitter, type MediaPlayer, type PlayerEventName } from './types';

/* Minimal typings for the YouTube IFrame Player API */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(r: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  destroy(): void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: Record<string, number> };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | undefined;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('Could not load YouTube'));
    document.head.appendChild(s);
  });
  return apiPromise;
}

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1, 12) || null;
    if (u.hostname.endsWith('youtube.com') || u.hostname.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = /\/(?:embed|shorts|live|v)\/([\w-]{11})/.exec(u.pathname);
      return m?.[1] ?? null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** YouTube is just one MediaAdapter: the engine never imports this directly. */
export class YouTubePlayer implements MediaPlayer {
  readonly kind = 'youtube' as const;
  private events = new Emitter<PlayerEventName>();
  private player?: YTPlayer;
  private ready = false;
  private rate = 1;
  private playing = false;

  constructor(container: HTMLElement, videoId: string) {
    const mount = document.createElement('div');
    container.appendChild(mount);
    loadApi()
      .then(() => {
        this.player = new window.YT!.Player(mount, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3 },
          events: {
            onReady: () => {
              this.ready = true;
              this.player!.setPlaybackRate(this.rate);
              this.events.emit('ready');
              this.events.emit('durationchange');
            },
            onStateChange: (e: { data: number }) => {
              // 1 playing, 2 paused, 0 ended, 3 buffering
              if (e.data === 1 && !this.playing) {
                this.playing = true;
                this.events.emit('play');
              } else if ((e.data === 2 || e.data === 0) && this.playing) {
                this.playing = false;
                this.events.emit('pause');
                if (e.data === 0) this.events.emit('ended');
              }
            },
            onPlaybackRateChange: () => this.events.emit('ratechange'),
            onError: (e: { data: number }) => this.events.emit('error', e.data),
          },
        });
      })
      .catch((e) => this.events.emit('error', e));
  }

  play() {
    this.player?.playVideo();
  }
  pause() {
    this.player?.pauseVideo();
  }
  seek(t: number) {
    this.player?.seekTo(Math.max(0, t), true);
  }
  getCurrentTime() {
    return this.ready ? this.player!.getCurrentTime() : 0;
  }
  getDuration() {
    return this.ready ? this.player!.getDuration() : 0;
  }
  isPlaying() {
    return this.playing;
  }
  setPlaybackRate(r: number) {
    this.rate = r;
    if (!this.ready) return;
    const rates = this.player!.getAvailablePlaybackRates();
    const best = rates.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 1);
    this.player!.setPlaybackRate(best);
  }
  getPlaybackRate() {
    return this.ready ? this.player!.getPlaybackRate() : this.rate;
  }
  on(e: PlayerEventName, cb: (d?: unknown) => void) {
    return this.events.on(e, cb);
  }
  destroy() {
    this.events.clear();
    this.player?.destroy();
  }
}
