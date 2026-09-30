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

const twoClips = [
  { id: 1, name: 'Selected', start: 0, duration: 4, selected: true },
  { id: 2, name: 'Unselected', start: 5, duration: 4 },
];

function renderTrack(props: Partial<React.ComponentProps<typeof TrackNew>> = {}) {
  const onClipTrimEdge = vi.fn();
  const onClipClick = vi.fn();
  const onBelow = { mouseDown: vi.fn(), click: vi.fn() };
  const utils = render(
    <Providers>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div onMouseDown={onBelow.mouseDown} onClick={onBelow.click}>
        <TrackNew
          clips={twoClips}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={onClipTrimEdge}
          onClipClick={onClipClick}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
          {...props}
        />
      </div>
    </Providers>,
  );
  const zone = (clipId: number, edge: 'left' | 'right') =>
    utils.container.querySelector<HTMLElement>(`[data-edge-trim="${edge}"][data-clip-ref="${clipId}"]`);
  const clipBox = (clipId: number) => {
    const el = utils.container.querySelector<HTMLElement>(`[data-clip-id="${clipId}"]`)!;
    const left = parseInt(el.style.left, 10);
    return { left, right: left + parseInt(el.style.width, 10) };
  };
  const span = (el: HTMLElement) => {
    const left = parseFloat(el.style.left);
    return { left, right: left + parseFloat(el.style.width) };
  };
  return { ...utils, onClipTrimEdge, onClipClick, onBelow, zone, clipBox, span };
}

describe('trimming an unselected clip by its edge', () => {
  it('the hit box is ON the edge: 4px outside the clip and 4px inside', () => {
    const { zone, clipBox, span } = renderTrack({ height: 120 });
    const box = clipBox(2);
    expect(span(zone(2, 'left')!)).toEqual({ left: box.left - 4, right: box.left + 4 });
    expect(span(zone(2, 'right')!)).toEqual({ left: box.right - 4, right: box.right + 4 });
    for (const edge of ['left', 'right'] as const) {
      const el = zone(2, edge)!;
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.className).toContain(`track-edge-trim--${edge}`); // the trim cursor
    }
  });

  it('it covers the TOP THIRD of the clip body only — the rest of the edge is left to the time selection', () => {
    // The body is what lies under the 20px header and the 1px border:
    // for a 120px clip, 21..119 = 98px, a third of which is 33px
    const vertical = (height: number) => {
      const { zone } = renderTrack({ height });
      const el = zone(2, 'left')!;
      const other = zone(2, 'right')!;
      expect(other.style.top).toBe(el.style.top);
      expect(other.style.height).toBe(el.style.height);
      const result = { top: parseInt(el.style.top, 10), height: parseInt(el.style.height, 10) };
      cleanup();
      return result;
    };
    expect(vertical(120)).toEqual({ top: 21, height: 33 });
    expect(vertical(114)).toEqual({ top: 21, height: 31 }); // the default track height
    expect(vertical(300)).toEqual({ top: 21, height: 93 });
    // Never over the header, and never past two thirds of the way down
    for (const height of [90, 114, 200, 400]) {
      const v = vertical(height);
      expect(v.top).toBeGreaterThanOrEqual(21);
      expect(v.top + v.height).toBeLessThan(21 + (height - 22) / 2);
    }
    // A short clip keeps a strip worth grabbing: 16px, or its whole body if that is less
    expect(vertical(60)).toEqual({ top: 21, height: 16 });  // body 38: a third would be 13
    expect(vertical(34)).toEqual({ top: 21, height: 12 });  // body 12
  });

  it('a press on the edge BELOW the zone is not caught by it', () => {
    const { container, zone, onBelow } = renderTrack({ height: 120 });
    const el = zone(2, 'left')!;
    const bottom = parseInt(el.style.top, 10) + parseInt(el.style.height, 10);
    expect(bottom).toBeLessThan(120);
    // Nothing of the zone is there to catch it: every zone ends above
    for (const z of Array.from(container.querySelectorAll<HTMLElement>('[data-edge-trim]'))) {
      expect(parseInt(z.style.top, 10) + parseInt(z.style.height, 10)).toBe(bottom);
    }
    // …so the press goes to what is underneath, as it always did
    fireEvent.mouseDown(container.querySelector('[data-clip-id="2"]') as HTMLElement, { button: 0, clientX: 500, clientY: 100 });
    expect(onBelow.mouseDown).toHaveBeenCalledTimes(1);
  });

  it('a selected clip has its handles and no edge zones; an unselected one the reverse', () => {
    const { container, zone } = renderTrack();
    expect(zone(1, 'left')).toBeNull();
    expect(zone(1, 'right')).toBeNull();
    expect(container.querySelectorAll('[data-clip-id="1"] .clip-display__handle--trim-left')).toHaveLength(1);
    expect(container.querySelectorAll('[data-clip-id="2"] .clip-display__handle')).toHaveLength(0);
  });

  it('dragging a zone streams the pointer to onClipTrimEdge, for that clip and that edge, until release', () => {
    const { onClipTrimEdge, zone } = renderTrack();
    for (const edge of ['left', 'right'] as const) {
      onClipTrimEdge.mockClear();
      fireEvent.mouseDown(zone(2, edge)!, { button: 0, clientX: 500 });
      expect(onClipTrimEdge).not.toHaveBeenCalled(); // a press alone trims nothing
      fireEvent.mouseMove(document, { clientX: 530 });
      fireEvent.mouseMove(document, { clientX: 560 });
      expect(onClipTrimEdge.mock.calls).toEqual([[2, edge, 530], [2, edge, 560]]);
      fireEvent.mouseUp(document);
      fireEvent.mouseMove(document, { clientX: 600 });
      expect(onClipTrimEdge).toHaveBeenCalledTimes(2); // over with the release
    }
  });

  it('a zone is not the clip: pressing, clicking or double-clicking it starts nothing else', () => {
    const { onClipClick, onClipTrimEdge, onBelow, zone } = renderTrack();
    const el = zone(2, 'left')!;
    fireEvent.mouseDown(el, { button: 0, clientX: 500 });
    fireEvent.mouseUp(document);
    fireEvent.click(el);
    fireEvent.doubleClick(el);
    expect(onBelow.mouseDown).not.toHaveBeenCalled(); // no clip drag / time selection underneath
    expect(onBelow.click).not.toHaveBeenCalled();     // no playhead move
    expect(onClipClick).not.toHaveBeenCalled();       // no selection
    // Only the main button trims
    fireEvent.mouseDown(el, { button: 2, clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 530 });
    expect(onClipTrimEdge).not.toHaveBeenCalled();
  });

  it('the zones and the fade handles share the edge without overlapping', () => {
    const { container, zone, span } = renderTrack();
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="2"]') as HTMLElement, { buttons: 0 });
    const fade = (side: 'in' | 'out') => {
      const el = container.querySelector<HTMLElement>(`[data-fade-handle="${side}"][data-fade-clip="2"]`)!;
      const left = parseInt(el.style.left, 10);
      return { left, right: left + parseInt(el.style.width, 10), z: Number(el.style.zIndex) };
    };
    // Left edge: the zone ends where the fade handle's box begins
    expect(span(zone(2, 'left')!).right).toBeLessThanOrEqual(fade('in').left);
    // Right edge: the fade handle's box ends where the zone begins
    expect(fade('out').right).toBeLessThanOrEqual(span(zone(2, 'right')!).left);
    // …and the fade controls are stacked above the zones regardless
    expect(fade('in').z).toBeGreaterThan(Number(zone(2, 'left')!.style.zIndex));
  });

  it('the fade handles do not show until the pointer is at least 4px into the clip', () => {
    const { container, zone } = renderTrack({
      clips: [{ id: 2, name: 'Unselected', start: 5, duration: 4, fadeIn: 1 }],
    });
    const clipEl = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    Object.defineProperty(clipEl, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 500, top: 0, right: 900, bottom: 114, width: 400, height: 114, x: 500, y: 0, toJSON: () => ({}) }),
    });
    const controls = () => container.querySelectorAll('[data-fade-handle], [data-quickfade-node]').length;
    const at = (clientX: number) => fireEvent.mouseMove(clipEl, { clientX, clientY: 60, buttons: 0 });

    // On the trim zone: nothing
    fireEvent.mouseEnter(zone(2, 'left')!, { clientX: 498, buttons: 0 });
    fireEvent.mouseMove(zone(2, 'left')!, { clientX: 498, buttons: 0 });
    expect(controls()).toBe(0);
    // In the clip, but within 4px of its edge: still nothing
    fireEvent.mouseEnter(clipEl, { clientX: 501, clientY: 60, buttons: 0 });
    expect(controls()).toBe(0);
    at(503);
    expect(controls()).toBe(0);
    // 4px in: they show
    at(504);
    expect(controls()).toBe(3); // two length handles + the fade-in's shape handle
    at(700);
    expect(controls()).toBe(3);
    // Back toward the edge: they go again…
    at(502);
    expect(controls()).toBe(0);
    // …and the same from the right-hand side
    at(896);
    expect(controls()).toBe(3);
    at(897);
    expect(controls()).toBe(0);
    // A press already under way is not a hover, however far in
    fireEvent.mouseMove(clipEl, { clientX: 700, clientY: 60, buttons: 1 });
    expect(controls()).toBe(0);
  });

  it('clips that touch: each edge keeps its own side of the joint', () => {
    const { zone, clipBox, span } = renderTrack({
      clips: [
        { id: 1, name: 'A', start: 0, duration: 4 },
        { id: 2, name: 'B', start: 4, duration: 3 },
      ],
    });
    const joint = clipBox(2).left;
    expect(span(zone(1, 'right')!)).toEqual({ left: joint - 4, right: joint });
    expect(span(zone(2, 'left')!)).toEqual({ left: joint, right: joint + 4 });
  });

  it('a selected neighbour keeps the unselected clip\'s zone out of itself', () => {
    const { zone, clipBox, span } = renderTrack({
      clips: [
        { id: 1, name: 'A', start: 0, duration: 4, selected: true },
        { id: 2, name: 'B', start: 4, duration: 3 },
      ],
    });
    const joint = clipBox(2).left;
    expect(span(zone(2, 'left')!)).toEqual({ left: joint, right: joint + 4 });
  });

  it('an edge buried under a higher clip has no zone', () => {
    const { zone } = renderTrack({
      clips: [
        { id: 1, name: 'A', start: 0, duration: 5 },
        { id: 2, name: 'B', start: 3, duration: 4 }, // later in the array = on top
      ],
    });
    expect(zone(1, 'right')).toBeNull();
    expect(zone(1, 'left')).toBeTruthy();
    expect(zone(2, 'left')).toBeTruthy();
    expect(zone(2, 'right')).toBeTruthy();
  });

  it('no zones where there is nothing to trim with, or on a clip being recorded', () => {
    expect(renderTrack({ onClipTrimEdge: undefined }).container.querySelector('[data-edge-trim]')).toBeNull();
    cleanup();
    const { zone } = renderTrack({ recordingClipId: 2 });
    expect(zone(2, 'left')).toBeNull();
    expect(zone(2, 'right')).toBeNull();
  });
});

describe('Cmd+click anywhere on a clip toggles its selection (2026-09-30)', () => {
  function renderClip() {
    const onClipClick = vi.fn();
    const onBelow = vi.fn();
    const { container } = render(
      <Providers>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div onClick={onBelow}>
          <TrackNew
            clips={[{ id: 2, name: 'Unselected', start: 5, duration: 4 }]}
            width={1200}
            trackIndex={0}
            pixelsPerSecond={100}
            onClipClick={onClipClick}
          />
        </div>
      </Providers>,
    );
    const wrapper = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    const body = wrapper.querySelector('.clip-display__inner canvas, .clip-display__inner') as HTMLElement;
    return { wrapper, body, onClipClick, onBelow };
  }

  it('a Cmd or Ctrl click on the BODY is the toggle, as on the header', () => {
    for (const mods of [{ metaKey: true }, { ctrlKey: true }]) {
      const { body, onClipClick, onBelow } = renderClip();
      fireEvent.click(body, mods);
      expect(onClipClick).toHaveBeenCalledWith(2, false, true);
      expect(onBelow).not.toHaveBeenCalled(); // and goes no further
      cleanup();
    }
  });

  it('a plain or Shift click on the body still selects nothing — the body is the time-selection surface', () => {
    const { body, onClipClick, onBelow } = renderClip();
    fireEvent.click(body);
    fireEvent.click(body, { shiftKey: true });
    fireEvent.click(body, { metaKey: true, shiftKey: true });
    expect(onClipClick).not.toHaveBeenCalled();
    expect(onBelow).toHaveBeenCalledTimes(3); // the container still sees them
  });
});

describe('Option over an edge zone stretches instead of trimming (2026-09-30)', () => {
  function renderWithStretch() {
    const onClipTrimEdge = vi.fn();
    const onClipStretchEdge = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 2, name: 'Unselected', start: 5, duration: 4 }]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={onClipTrimEdge}
          onClipStretchEdge={onClipStretchEdge}
        />
      </Providers>,
    );
    const zone = (edge: 'left' | 'right') => container.querySelector<HTMLElement>(`[data-edge-trim="${edge}"]`)!;
    return { zone, onClipTrimEdge, onClipStretchEdge };
  }

  it('an Option press streams to the stretch, for that clip and edge, and only to it', () => {
    const { zone, onClipTrimEdge, onClipStretchEdge } = renderWithStretch();
    fireEvent.mouseDown(zone('right'), { button: 0, clientX: 900, altKey: true });
    fireEvent.mouseMove(document, { clientX: 930, altKey: true });
    // Letting go of Option mid-drag changes nothing: it was decided at the press
    fireEvent.mouseMove(document, { clientX: 960 });
    expect(onClipStretchEdge.mock.calls).toEqual([[2, 'right', 930], [2, 'right', 960]]);
    expect(onClipTrimEdge).not.toHaveBeenCalled();
    fireEvent.mouseUp(document);
  });

  it('without Option the press trims, as before', () => {
    const { zone, onClipTrimEdge, onClipStretchEdge } = renderWithStretch();
    fireEvent.mouseDown(zone('left'), { button: 0, clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 530, altKey: true }); // Option pressed AFTER the press
    expect(onClipTrimEdge).toHaveBeenCalledWith(2, 'left', 530);
    expect(onClipStretchEdge).not.toHaveBeenCalled();
    fireEvent.mouseUp(document);
  });

  it('the zone shows the stretch cursor while Option is held, ahead of any press', () => {
    const { zone } = renderWithStretch();
    expect(zone('left').getAttribute('data-edge-mode')).toBe('trim');
    expect(zone('left').className).not.toContain('--stretch');
    fireEvent.keyDown(document, { key: 'Alt' });
    expect(zone('left').getAttribute('data-edge-mode')).toBe('stretch');
    expect(zone('left').className).toContain('track-edge-trim--stretch');
    fireEvent.keyUp(document, { key: 'Alt' });
    expect(zone('left').getAttribute('data-edge-mode')).toBe('trim');
    // Losing the window with Option down must not leave it stuck
    fireEvent.keyDown(document, { key: 'Alt' });
    fireEvent.blur(window);
    expect(zone('left').getAttribute('data-edge-mode')).toBe('trim');
  });

  it('with no stretch wired, Option is ignored and the edge trims', () => {
    const { zone, onClipTrimEdge } = renderTrack();
    fireEvent.keyDown(document, { key: 'Alt' });
    expect(zone(2, 'left')!.getAttribute('data-edge-mode')).toBe('trim');
    fireEvent.mouseDown(zone(2, 'left')!, { button: 0, clientX: 500, altKey: true });
    fireEvent.mouseMove(document, { clientX: 530, altKey: true });
    expect(onClipTrimEdge).toHaveBeenCalledWith(2, 'left', 530);
    fireEvent.mouseUp(document);
    fireEvent.keyUp(document, { key: 'Alt' });
  });
});
