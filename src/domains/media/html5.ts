import { Emitter, type MediaPlayer, type PlayerEventName } from './types';

/** Adapter for <audio>/<video> elements (uploaded files, prepared lessons, URLs). */
export class Html5MediaPlayer implements MediaPlayer {
  readonly kind = 'html5' as const;
  private events = new Emitter<PlayerEventName>();
  private off: (() => void)[] = [];

  constructor(private el: HTMLMediaElement) {
    const bind = (native: string, ev: PlayerEventName) => {
      const h = () => this.events.emit(ev);
      el.addEventListener(native, h);
      this.off.push(() => el.removeEventListener(native, h));
    };
    bind('play', 'play');
    bind('pause', 'pause');
    bind('ended', 'ended');
    bind('ratechange', 'ratechange');
    bind('durationchange', 'durationchange');
    bind('error', 'error');
    el.preservesPitch = true;
    if (el.readyState >= 1) queueMicrotask(() => this.events.emit('ready'));
    else bind('loadedmetadata', 'ready');
  }

  play() {
    this.el.play().catch((e) => this.events.emit('error', e));
  }
  pause() {
    this.el.pause();
  }
  seek(t: number) {
    this.el.currentTime = Math.max(0, t);
  }
  getCurrentTime() {
    return this.el.currentTime;
  }
  getDuration() {
    return Number.isFinite(this.el.duration) ? this.el.duration : 0;
  }
  isPlaying() {
    return !this.el.paused && !this.el.ended;
  }
  setPlaybackRate(r: number) {
    this.el.playbackRate = r;
  }
  getPlaybackRate() {
    return this.el.playbackRate;
  }
  on(e: PlayerEventName, cb: (d?: unknown) => void) {
    return this.events.on(e, cb);
  }
  destroy() {
    this.off.forEach((f) => f());
    this.events.clear();
  }
}
