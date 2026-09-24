import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { ClipBody } from '../ClipBody';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

/** Record every fillRect the waveform loop issues, keyed by column. The
 *  loop draws one 1px-wide rect per column whose height is the column's
 *  min..max span × amplitude × gain — so the recorded heights ARE the
 *  drawn waveform envelope. */
function recordingContext() {
  const heights = new Map<number, number>();
  const ctx = {
    fillRect: (x: number, _y: number, w: number, h: number) => { if (w === 1) heights.set(Math.round(x), Math.max(heights.get(Math.round(x)) ?? 0, h)); },
    clearRect: () => {}, save: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
    fill: () => {}, closePath: () => {}, arc: () => {}, setTransform: () => {}, scale: () => {}, translate: () => {}, drawImage: () => {},
    fillText: () => {}, measureText: () => ({ width: 0 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData: () => {},
    createImageData: () => ({ data: new Uint8ClampedArray(4) }), createLinearGradient: () => ({ addColorStop: () => {} }),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', globalAlpha: 1,
  };
  return { ctx, heights };
}

// 100px wide, 1000 samples over 1s at 100px/s → 10 samples per column,
// alternating ±1 so every column spans the full ±1 → full height = 2 ×
// maxAmplitude = 2 × (94/2 − 2) = 90px before any fade.
const DATA = Array.from({ length: 1000 }, (_, i) => (i % 2 ? -1 : 1));
const FULL = 90;

async function renderWith(fadeRegions: React.ComponentProps<typeof ClipBody>['fadeRegions']) {
  const { ctx, heights } = recordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
  await act(async () => {
    render(
      <ThemeProvider>
        <ClipBody variant="waveform" channelMode="mono" width={100} height={94} pixelsPerSecond={100}
          waveformData={DATA} clipDuration={1} clipTrimStart={0} clipFullDuration={1} fadeRegions={fadeRegions} />
      </ThemeProvider>,
    );
  });
  return heights;
}

describe('ClipBody — a fade scales the drawn waveform', () => {
  it('no fade: every column is drawn at full height', async () => {
    const h = await renderWith(undefined);
    expect(h.get(10)).toBe(FULL);
    expect(h.get(50)).toBe(FULL);
    expect(h.get(99)).toBe(FULL);
  });

  it('a linear fade-out over the second half halves the waveform at its midpoint and ends near zero', async () => {
    const h = await renderWith([{ side: 'out', start: 0.5, end: 1, shape: 'linear' }]);
    expect(h.get(10)).toBe(FULL);           // before the fade: untouched
    expect(h.get(49)).toBe(FULL);
    expect(h.get(75)).toBeCloseTo(FULL / 2, 5); // t = 0.75s → halfway through a linear fade
    expect(h.get(99)!).toBeCloseTo(FULL * 0.02, 5); // t = 0.99s is 98% through a 0.5s fade → 2% of full
  });

  it('the default equal-power fade-out shrinks monotonically and holds level longer than linear', async () => {
    const h = await renderWith([{ side: 'out', start: 0.5, end: 1, shape: 1 }]);
    const cols = [50, 60, 70, 80, 90, 99].map((x) => h.get(x)!);
    for (let i = 1; i < cols.length; i++) expect(cols[i]).toBeLessThanOrEqual(cols[i - 1]);
    expect(h.get(75)!).toBeGreaterThan(FULL / 2); // cos(π/4)·90 ≈ 63.6 > 45: equal-power sits above linear at the midpoint
    expect(h.get(75)!).toBeCloseTo(FULL * Math.SQRT1_2, 3);
  });

  it('a fade-in mirrors it: near zero at the start, full once the fade ends', async () => {
    const h = await renderWith([{ side: 'in', start: 0, end: 0.5, shape: 'linear' }]);
    expect(h.get(0)!).toBeLessThanOrEqual(1); // t = 0 → gain 0, clamped to the 1px minimum
    expect(h.get(25)).toBeCloseTo(FULL / 2, 5);
    expect(h.get(75)).toBe(FULL);
  });
});
