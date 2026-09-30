import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        {children}
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}

// A selected clip with fades (handles + shape nodes), an unselected
// clip (edge zones), and a crossfading pair (the crossfade node); the
// selected clip is also buried at its right edge under clip 3.
const clips = [
  { id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 1, selected: true },
  { id: 2, name: 'B', start: 6, duration: 4 },
  { id: 3, name: 'C', start: 3, duration: 2 },
];

const HANDLES = [
  '[data-fade-handle]',
  '[data-quickfade-node]',
  '[data-crossfade-node]',
  '[data-edge-trim]',
  '[data-buried-handle]',
  '.clip-display__handle',
];

function renderTrack(draggingClipIds: ReadonlySet<number>) {
  const utils = render(
    <Providers>
      <TrackNew
        clips={clips}
        width={1200}
        trackIndex={0}
        pixelsPerSecond={100}
        draggingClipIds={draggingClipIds}
        onClipTrimEdge={vi.fn()}
        onClipStretchEdge={vi.fn()}
        onClipFadeChange={vi.fn()}
        onClipFadeShapeChange={vi.fn()}
        onCrossfadeShapeChange={vi.fn()}
      />
    </Providers>,
  );
  const count = (selector: string) => utils.container.querySelectorAll(selector).length;
  return { ...utils, count };
}

describe('while clips are being dragged, every drag handle is hidden', () => {
  it('at rest every kind of handle is there', () => {
    const { container, count } = renderTrack(new Set());
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="1"]') as HTMLElement, { buttons: 0 });
    for (const selector of HANDLES) {
      expect(count(selector), selector).toBeGreaterThan(0);
    }
  });

  it('with a clip in flight — even one that is not on this track — none of them is', () => {
    for (const dragging of [new Set([1]), new Set([2]), new Set([99])]) {
      const { container, count } = renderTrack(dragging);
      fireEvent.mouseEnter(container.querySelector('[data-clip-id="1"]') as HTMLElement, { buttons: 0 });
      for (const selector of HANDLES) {
        expect(count(selector), `${selector} with ${[...dragging]} dragging`).toBe(0);
      }
      // The clips themselves, and the fade curves, are still drawn
      expect(count('[data-clip-id]')).toBe(3);
      expect(count('[data-fade-curve]')).toBeGreaterThan(0);
      cleanup();
    }
  });
});
