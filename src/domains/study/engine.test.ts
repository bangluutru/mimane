import { describe, expect, it } from 'vitest';
import { Emitter, type MediaPlayer, type PlayerEventName } from '@/domains/media/types';
import { StudyEngine, indexAt, type Scheduler } from './engine';

class FakePlayer implements MediaPlayer {
  readonly kind = 'html5' as const;
  t = 0;
  playing = false;
  rate = 1;
  ev = new Emitter<PlayerEventName>();
  play() { if (!this.playing) { this.playing = true; this.ev.emit('play'); } }
  pause() { if (this.playing) { this.playing = false; this.ev.emit('pause'); } }
  seek(s: number) { this.t = s; }
  getCurrentTime() { return this.t; }
  getDuration() { return 100; }
  isPlaying() { return this.playing; }
  setPlaybackRate(r: number) { this.rate = r; }
  getPlaybackRate() { return this.rate; }
  on(e: PlayerEventName, cb: () => void) { return this.ev.on(e, cb); }
  destroy() {}
}

/** Manual clock: frames run when advance() is called. */
class FakeScheduler implements Scheduler {
  time = 0;
  frames = new Map<number, () => void>();
  timers = new Map<number, { at: number; cb: () => void }>();
  id = 0;
  now() { return this.time; }
  frame(cb: () => void) { this.frames.set(++this.id, cb); return this.id; }
  cancelFrame(id: number) { this.frames.delete(id); }
  timeout(cb: () => void, ms: number) { this.timers.set(++this.id, { at: this.time + ms, cb }); return this.id; }
  clearTimeout(id: number) { this.timers.delete(id); }
}

const segs = [
  { start: 0, end: 2 },
  { start: 2.5, end: 4 },
  { start: 4.5, end: 7 },
];

function setup(mode: 'read' | 'repeat' | 'shadow' | 'dictation' = 'read', settings = {}, opts: { noFrames?: boolean } = {}) {
  const player = new FakePlayer();
  const sch = new FakeScheduler();
  if (opts.noFrames) sch.frame = () => ++sch.id; // hidden tab: rAF never fires
  const engine = new StudyEngine(player, segs, { mode, settings, scheduler: sch });
  /** advance media + clock by `sec`, in 50 ms frames */
  const run = (sec: number) => {
    for (let i = 0; i < sec / 0.05; i++) {
      sch.time += 50;
      if (player.playing) player.t += 0.05 * player.rate;
      for (const [id, tm] of [...sch.timers]) if (tm.at <= sch.time) { sch.timers.delete(id); tm.cb(); }
      const frames = [...sch.frames.values()];
      sch.frames.clear();
      frames.forEach((f) => f());
    }
  };
  return { player, sch, engine, run };
}

describe('indexAt', () => {
  it('maps gaps to the previous sentence', () => {
    expect(indexAt(segs, 0)).toBe(0);
    expect(indexAt(segs, 2.2)).toBe(0);
    expect(indexAt(segs, 2.5)).toBe(1);
    expect(indexAt(segs, 99)).toBe(2);
  });
});

describe('StudyEngine', () => {
  it('follows media time in continuous modes', () => {
    const { engine, run } = setup('read');
    engine.play();
    run(3);
    expect(engine.getState().index).toBe(1);
    expect(engine.getState().playing).toBe(true);
  });

  it('loops the current sentence the configured number of times', () => {
    const { engine, player, run } = setup('shadow', { loop: true, loopCount: 2 });
    engine.goTo(0);
    run(2.1);
    expect(engine.getState().index).toBe(0);
    expect(engine.getState().playCount).toBe(2);
    expect(player.t).toBeLessThan(0.5);
    run(2.1);
    // loop cycle finished: continues into the next sentence
    run(0.6);
    expect(engine.getState().index).toBe(1);
  });

  it('auto-pauses at the sentence end and continues on play', () => {
    const { engine, player, run } = setup('read', { autoPause: true });
    engine.goTo(0);
    run(2.2);
    expect(player.playing).toBe(false);
    expect(engine.getState().phase).toBe('held');
    engine.play();
    expect(engine.getState().index).toBe(1);
    expect(player.t).toBe(2.5);
    expect(player.playing).toBe(true);
  });

  it('repeat mode pauses for a gap then plays the next sentence', () => {
    const { engine, player, run } = setup('repeat', { repeatGapFactor: 1, repeatGapMin: 1 });
    engine.goTo(0);
    run(2.1);
    expect(engine.getState().phase).toBe('gap');
    expect(player.playing).toBe(false);
    run(2.1); // gap = max(1, 2s × 1) = 2s
    expect(engine.getState().index).toBe(1);
    expect(player.playing).toBe(true);
  });

  it('repeat gap scales with playback rate', () => {
    const { engine, run } = setup('repeat', { repeatGapFactor: 1, repeatGapMin: 0.5, rate: 0.5 });
    engine.goTo(0);
    run(4.1); // 2 s of media at 0.5× = 4 s wall time
    expect(engine.getState().phase).toBe('gap');
    expect(engine.getState().gapDuration).toBeCloseTo(4);
  });

  it('dictation holds on the same sentence', () => {
    const { engine, player, run } = setup('dictation');
    engine.goTo(1);
    run(1.6);
    expect(engine.getState().phase).toBe('held');
    engine.play(); // replays the same sentence
    expect(engine.getState().index).toBe(1);
    expect(player.t).toBe(2.5);
  });

  it('playSegment resolves at the sentence end (Native ↔ Me)', async () => {
    const { engine, player, run } = setup('read');
    let done = false;
    engine.playSegment(2).then(() => (done = true));
    run(2.6);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(player.playing).toBe(false);
  });

  it('resuming from native controls at a held boundary advances instead of re-pausing', () => {
    const { engine, player, run } = setup('read', { autoPause: true });
    engine.goTo(0);
    run(2.2);
    player.play(); // e.g. YouTube's own play button
    run(0.1);
    expect(engine.getState().index).toBe(1);
    expect(player.playing).toBe(true);
  });

  it('keeps sentence boundaries when animation frames are suspended (background tab)', () => {
    const { engine, player, run } = setup('read', { autoPause: true }, { noFrames: true });
    engine.goTo(0);
    run(2.5);
    expect(player.playing).toBe(false);
    expect(player.t).toBeLessThan(2.1); // stopped within one 50 ms step of the 2 s boundary
    expect(engine.getState().phase).toBe('held');
  });

  it('reports played time for statistics', () => {
    const { engine, run } = setup('shadow');
    let ms = 0;
    engine.onPlayTime((d, mode) => mode === 'shadow' && (ms += d));
    engine.play();
    run(1);
    expect(ms).toBeGreaterThan(900);
  });
});
