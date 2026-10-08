import { describe, it, expect } from 'vitest';
import { createWheelTargetLock } from '../canvasWheelTarget';

describe("the canvas wheel's target lock (2026-10-08)", () => {
  it('keeps the first target while the pointer is still and the wheel keeps turning, even when the track under it changes', () => {
    let clock = 1000;
    const lock = createWheelTargetLock(300, () => clock);
    expect(lock.target(150, () => 1)).toBe(1);
    clock += 50;
    // The track shrank: the same y now resolves to track 2 — ignored
    expect(lock.target(150, () => 2)).toBe(1);
    clock += 50;
    expect(lock.target(150.4, () => 2)).toBe(1); // sub-pixel jitter is "still"
  });

  it('a pointer move or a rest releases it', () => {
    let clock = 1000;
    const lock = createWheelTargetLock(300, () => clock);
    expect(lock.target(150, () => 1)).toBe(1);
    clock += 50;
    expect(lock.target(190, () => 2)).toBe(2); // moved
    clock += 500;
    expect(lock.target(190, () => 3)).toBe(3); // rested
    lock.release();
    expect(lock.target(190, () => 0)).toBe(0);
  });
});
