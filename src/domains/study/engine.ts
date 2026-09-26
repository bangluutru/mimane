import type { MediaPlayer } from '@/domains/media/types';

/**
 * StudyEngine — one learning engine shared by every study mode.
 *
 *   listen     continuous; optional loop / auto-pause
 *   read       same as listen (UI shows transcript + aids)
 *   repeat     play sentence → pause (gap) for the learner to repeat → next
 *   shadow     continuous; learner speaks along; loop & speed are the main tools
 *   dictation  play sentence → hold until the learner submits
 *
 * Framework-free and driven by an injectable scheduler so it is unit-testable
 * with a fake player and a fake clock. It only knows the MediaPlayer interface.
 */

export type StudyMode = 'listen' | 'read' | 'repeat' | 'shadow' | 'dictation';

export interface TimedSegment {
  start: number;
  end: number;
}

export interface StudySettings {
  rate: number;
  /** loop the current sentence */
  loop: boolean;
  /** plays per sentence when looping (0 = until turned off) */
  loopCount: number;
  /** pause at the end of every sentence (listen / read / shadow) */
  autoPause: boolean;
  /** repeat mode: pause = sentence duration × factor (at least `repeatGapMin`) */
  repeatGapFactor: number;
  repeatGapMin: number;
}

export const DEFAULT_SETTINGS: StudySettings = {
  rate: 1,
  loop: false,
  loopCount: 0,
  autoPause: false,
  repeatGapFactor: 1.2,
  repeatGapMin: 1.5,
};

export type Phase = 'idle' | 'playing' | 'gap' | 'held';

export interface StudyState {
  index: number;
  playing: boolean;
  phase: Phase;
  /** plays of the current sentence in the current loop cycle */
  playCount: number;
  gapDuration: number; // seconds
  gapStartedAt: number; // scheduler.now() ms
  mode: StudyMode;
  settings: StudySettings;
}

export interface Scheduler {
  now(): number;
  frame(cb: () => void): number;
  cancelFrame(id: number): void;
  timeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export const browserScheduler: Scheduler = {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
  timeout: (cb, ms) => window.setTimeout(cb, ms),
  clearTimeout: (id) => window.clearTimeout(id),
};

const END_EPSILON = 0.04;

/** Index of the sentence that owns time `t` (gaps belong to the previous sentence). */
export function indexAt(segments: TimedSegment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= t + 0.001) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

type Listener = (s: StudyState) => void;

export class StudyEngine {
  private state: StudyState;
  private listeners = new Set<Listener>();
  private playTimeListeners = new Set<(ms: number, mode: StudyMode) => void>();
  private frameId?: number;
  private gapTimer?: number;
  /** fires at the expected sentence end, so boundaries hold even when rAF is throttled (background tab) */
  private boundaryTimer?: number;
  private heartbeat?: number;
  private lastTick?: number;
  /** after a seek, ignore boundaries until the player reports the new position */
  private seekTarget?: number;
  /** resolves a playSegment() call */
  private oneShot?: { index: number; resolve: (completed: boolean) => void };
  private unsub: (() => void)[] = [];

  constructor(
    private player: MediaPlayer,
    private segments: TimedSegment[],
    opts: { mode?: StudyMode; settings?: Partial<StudySettings>; startIndex?: number; scheduler?: Scheduler } = {},
    private scheduler: Scheduler = opts.scheduler ?? browserScheduler,
  ) {
    this.state = {
      index: Math.min(Math.max(opts.startIndex ?? 0, 0), Math.max(segments.length - 1, 0)),
      playing: false,
      phase: 'idle',
      playCount: 0,
      gapDuration: 0,
      gapStartedAt: 0,
      mode: opts.mode ?? 'read',
      settings: { ...DEFAULT_SETTINGS, ...opts.settings },
    };
    this.unsub.push(
      player.on('play', () => this.onPlayerPlay()),
      player.on('pause', () => this.onPlayerPause()),
      player.on('ready', () => player.setPlaybackRate(this.state.settings.rate)),
    );
  }

  /* ------------------------------------------------------------ public */

  getState = () => this.state;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  /** Called with played milliseconds (media time) for progress statistics. */
  onPlayTime(cb: (ms: number, mode: StudyMode) => void) {
    this.playTimeListeners.add(cb);
    return () => this.playTimeListeners.delete(cb);
  }

  get segmentCount() {
    return this.segments.length;
  }

  setSegments(segments: TimedSegment[]) {
    this.segments = segments;
  }

  setMode(mode: StudyMode) {
    this.clearGap();
    this.set({ mode, phase: this.state.playing ? 'playing' : 'idle' });
  }

  setSettings(patch: Partial<StudySettings>) {
    const settings = { ...this.state.settings, ...patch };
    if (patch.rate !== undefined) this.player.setPlaybackRate(patch.rate);
    if (patch.loop !== undefined) this.set({ settings, playCount: Math.min(this.state.playCount, 1) });
    else this.set({ settings });
  }

  play() {
    const { phase, index } = this.state;
    if (!this.segments.length) return this.player.play();
    // At a sentence boundary (held / gap), "play" means continue.
    if (phase === 'held' || phase === 'gap') return this.goTo(this.nextIndexAfterHold(index));
    const seg = this.segments[index];
    const t = this.player.getCurrentTime();
    if (t < seg.start - 0.25 || t >= seg.end - END_EPSILON) this.goTo(index);
    else this.player.play();
  }

  pause() {
    this.clearGap();
    this.cancelOneShot();
    this.player.pause();
    this.set({ phase: 'idle', playing: false });
  }

  toggle() {
    if (this.state.playing) this.pause();
    else this.play();
  }

  replay() {
    this.goTo(this.state.index);
  }

  next() {
    if (this.state.index < this.segments.length - 1) this.goTo(this.state.index + 1);
  }

  prev() {
    this.goTo(Math.max(0, this.state.index - 1));
  }

  goTo(index: number, opts: { autoplay?: boolean } = {}) {
    if (!this.segments.length) return;
    const i = Math.min(Math.max(index, 0), this.segments.length - 1);
    this.clearGap();
    this.cancelOneShot();
    const seg = this.segments[i];
    this.seekTarget = seg.start;
    this.player.seek(seg.start);
    this.set({ index: i, playCount: 1, phase: opts.autoplay === false ? 'idle' : 'playing' });
    if (opts.autoplay !== false) this.player.play();
  }

  /**
   * Play one sentence and stop at its end (Native ↔ Me comparison, shadow
   * recording). Resolves true when it played to the end, false if interrupted.
   */
  playSegment(index: number): Promise<boolean> {
    this.goTo(index);
    return new Promise((resolve) => {
      this.oneShot = { index, resolve };
    });
  }

  private cancelOneShot() {
    const o = this.oneShot;
    this.oneShot = undefined;
    o?.resolve(false);
  }

  destroy() {
    this.stopLoop();
    this.clearGap();
    this.unsub.forEach((f) => f());
    this.listeners.clear();
    this.playTimeListeners.clear();
  }

  /* ----------------------------------------------------------- internals */

  private set(patch: Partial<StudyState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  private onPlayerPlay() {
    const { phase, index } = this.state;
    if (phase === 'gap') this.clearGap();
    // Resumed from the media's own controls while parked at a sentence end:
    // continue as the in-app play button would, instead of re-triggering the end.
    const seg = this.segments[index];
    if ((phase === 'held' || phase === 'gap') && seg && this.player.getCurrentTime() >= seg.end - END_EPSILON) {
      this.goTo(this.nextIndexAfterHold(index));
    } else {
      this.set({ playing: true, phase: 'playing' });
    }
    this.startLoop();
  }

  private onPlayerPause() {
    this.stopLoop();
    if (this.state.playing) this.set({ playing: false, phase: this.state.phase === 'playing' ? 'idle' : this.state.phase });
  }

  private startLoop() {
    if (this.frameId !== undefined) return;
    this.lastTick = this.scheduler.now();
    const loop = () => {
      this.frameId = undefined;
      this.tick();
      if (this.player.isPlaying()) this.frameId = this.scheduler.frame(loop);
    };
    this.frameId = this.scheduler.frame(loop);
    // Heartbeat: rAF stops in hidden tabs / panes; timers keep (coarser) ticking.
    const beat = () => {
      this.heartbeat = undefined;
      if (!this.player.isPlaying()) return;
      this.tick();
      this.heartbeat = this.scheduler.timeout(beat, 200);
    };
    this.heartbeat = this.scheduler.timeout(beat, 200);
  }

  private stopLoop() {
    if (this.frameId !== undefined) this.scheduler.cancelFrame(this.frameId);
    this.frameId = undefined;
    this.lastTick = undefined;
    this.clearBoundaryTimer();
    if (this.heartbeat !== undefined) this.scheduler.clearTimeout(this.heartbeat);
    this.heartbeat = undefined;
  }

  private clearBoundaryTimer() {
    if (this.boundaryTimer !== undefined) this.scheduler.clearTimeout(this.boundaryTimer);
    this.boundaryTimer = undefined;
  }

  private armBoundaryTimer(t: number, seg: TimedSegment) {
    this.clearBoundaryTimer();
    const ms = ((seg.end - END_EPSILON - t) / this.state.settings.rate) * 1000;
    if (ms < 0 || ms > 60_000) return;
    this.boundaryTimer = this.scheduler.timeout(() => {
      this.boundaryTimer = undefined;
      if (this.player.isPlaying()) this.tick();
    }, Math.max(0, ms - 10));
  }

  /** One animation frame while playing. */
  tick() {
    const now = this.scheduler.now();
    if (this.lastTick !== undefined) {
      const ms = (now - this.lastTick) * this.state.settings.rate;
      if (ms > 0 && ms < 1000) this.playTimeListeners.forEach((l) => l(ms, this.state.mode));
    }
    this.lastTick = now;
    if (!this.segments.length) return;

    const t = this.player.getCurrentTime();
    if (this.seekTarget !== undefined) {
      if (Math.abs(t - this.seekTarget) > 0.75) return; // player hasn't caught up yet
      this.seekTarget = undefined;
    }

    const { index, mode, settings } = this.state;
    const seg = this.segments[index];
    const boundaryControlled =
      this.oneShot !== undefined || settings.loop || settings.autoPause || mode === 'repeat' || mode === 'dictation';

    if (!boundaryControlled) {
      const i = indexAt(this.segments, t);
      if (i !== index) this.set({ index: i, playCount: 1 });
      return;
    }

    if (t < seg.start - 0.5 || t > seg.end + 1.5) {
      // user scrubbed with native controls: follow them
      const i = indexAt(this.segments, t);
      if (i !== index) this.set({ index: i, playCount: 1 });
      return;
    }
    if (t >= seg.end - END_EPSILON) this.onSegmentEnd();
    else if (this.player.isPlaying()) this.armBoundaryTimer(t, seg);
  }

  private onSegmentEnd() {
    const { index, mode, settings, playCount } = this.state;

    if (this.oneShot) {
      const { resolve } = this.oneShot;
      this.oneShot = undefined;
      this.player.pause();
      this.set({ phase: 'held', playing: false });
      resolve(true);
      return;
    }

    const moreLoops = settings.loop && (settings.loopCount === 0 || playCount < settings.loopCount);

    if (mode === 'repeat') {
      this.player.pause();
      const seg = this.segments[index];
      const gap = Math.max(settings.repeatGapMin, ((seg.end - seg.start) / settings.rate) * settings.repeatGapFactor);
      this.set({ phase: 'gap', playing: false, gapDuration: gap, gapStartedAt: this.scheduler.now() });
      this.gapTimer = this.scheduler.timeout(() => {
        this.gapTimer = undefined;
        if (moreLoops) this.restartCurrent(playCount + 1);
        else if (index < this.segments.length - 1) this.goTo(index + 1);
        else this.set({ phase: 'held' });
      }, gap * 1000);
      return;
    }

    if (mode === 'dictation') {
      this.player.pause();
      this.set({ phase: 'held', playing: false });
      return;
    }

    if (moreLoops) {
      this.restartCurrent(playCount + 1);
      return;
    }
    if (settings.autoPause) {
      this.player.pause();
      this.set({ phase: 'held', playing: false });
      return;
    }
    // loop finished: continue to the next sentence
    if (index < this.segments.length - 1) this.set({ index: index + 1, playCount: 1 });
  }

  private restartCurrent(playCount: number) {
    const seg = this.segments[this.state.index];
    this.seekTarget = seg.start;
    this.player.seek(seg.start);
    this.set({ playCount, phase: 'playing' });
    this.player.play();
  }

  private nextIndexAfterHold(index: number) {
    const { mode, settings } = this.state;
    if (mode === 'dictation' || settings.loop) return index;
    return Math.min(index + 1, this.segments.length - 1);
  }

  private clearGap() {
    if (this.gapTimer !== undefined) this.scheduler.clearTimeout(this.gapTimer);
    this.gapTimer = undefined;
  }
}
