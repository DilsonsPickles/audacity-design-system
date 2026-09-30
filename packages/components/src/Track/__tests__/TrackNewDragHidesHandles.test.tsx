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

describe('while a fade is being dragged, every OTHER clip\'s handles are hidden (2026-10-01)', () => {
  it('dragging an unselected clip\'s fade handle hides the selected clip\'s handles; they return on release', () => {
    const { container, count } = renderTrack(new Set());
    const clip2 = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    fireEvent.mouseEnter(clip2, { buttons: 0 });
    // Before: the selected clip 1 has its handles (one fade handle —
    // its out edge is crossfaded under clip 3), clip 2 its fade handles
    expect(count('[data-clip-id="1"] .clip-display__handle')).toBe(4);
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(1);
    expect(count('[data-fade-handle][data-fade-clip="2"]')).toBe(2);
    expect(count('[data-buried-handle]')).toBeGreaterThan(0);
    const inHandle = container.querySelector('[data-fade-handle="in"][data-fade-clip="2"]') as HTMLElement;
    fireEvent.pointerDown(inHandle, { button: 0, clientX: 620, clientY: 30, pointerId: 51 });
    // In hand: everything on clip 1 is gone (in-clip handles, fade
    // handles, buried duplicates), and so are clip 3's edge zones and
    // the crossfade node; clip 2 keeps its own fade handles
    expect(count('[data-clip-id="1"] .clip-display__handle')).toBe(0);
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(0);
    expect(count('[data-buried-handle]')).toBe(0);
    expect(count('[data-quickfade-node][data-clip-ref="1"]')).toBe(0);
    expect(count('[data-crossfade-node]')).toBe(0);
    expect(count('[data-edge-trim][data-clip-ref="3"]')).toBe(0);
    expect(count('[data-fade-handle][data-fade-clip="2"]')).toBe(2);
    fireEvent.pointerUp(inHandle, { clientX: 620, clientY: 30, pointerId: 51 });
    // Released: back as they were
    expect(count('[data-clip-id="1"] .clip-display__handle')).toBe(4);
    expect(count('[data-fade-handle][data-fade-clip="1"]')).toBe(1);
    expect(count('[data-buried-handle]')).toBeGreaterThan(0);
  });
});

describe('a fade drag on ANOTHER track hides this track\'s handles too', () => {
  it('the host hands the in-hand clip back as fadeInHandClipId; a foreign id hides everything here', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={clips}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          fadeInHandClipId={99}
          onClipTrimEdge={vi.fn()}
          onClipStretchEdge={vi.fn()}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
          onCrossfadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="1"]') as HTMLElement, { buttons: 0 });
    for (const selector of HANDLES) {
      expect(container.querySelectorAll(selector).length, selector).toBe(0);
    }
  });

  it('this track reports its own fade drags to the host, start and end', () => {
    const onFadeDragChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={clips}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onFadeDragChange={onFadeDragChange}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="2"]') as HTMLElement, { buttons: 0 });
    const handle = container.querySelector('[data-fade-handle="in"][data-fade-clip="2"]') as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientX: 620, clientY: 30, pointerId: 61 });
    expect(onFadeDragChange).toHaveBeenLastCalledWith(2);
    fireEvent.pointerUp(handle, { clientX: 620, clientY: 30, pointerId: 61 });
    expect(onFadeDragChange).toHaveBeenLastCalledWith(null);
  });
});

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
