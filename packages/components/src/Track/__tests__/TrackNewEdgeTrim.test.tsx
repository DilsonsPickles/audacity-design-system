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
  it('the hit box is ON the edge: the app\'s 5px outside the clip and 6px inside', () => {
    const { zone, clipBox, span } = renderTrack({ height: 120 });
    const box = clipBox(2);
    expect(span(zone(2, 'left')!)).toEqual({ left: box.left - 5, right: box.left + 6 });
    expect(span(zone(2, 'right')!)).toEqual({ left: box.right - 6, right: box.right + 5 });
    for (const edge of ['left', 'right'] as const) {
      const el = zone(2, edge)!;
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.className).toContain(`track-edge-trim--${edge}`); // the trim cursor
    }
  });

  it('it covers the TRIM BOX\'S ROW — under the header, 32px on a full-height clip — so selecting the clip never moves the grabbable edge', () => {
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
    // Where the selected clip's trim handle sits (Clip.css: top 20, 32
    // tall), whatever the clip's height — the header above it is left
    // whole for dragging, the edge below it for the time selection
    expect(vertical(120)).toEqual({ top: 20, height: 32 });
    expect(vertical(114)).toEqual({ top: 20, height: 32 }); // the default track height
    expect(vertical(300)).toEqual({ top: 20, height: 32 });
    // Never past half way down the body, so a selection can always start on the edge
    for (const height of [90, 114, 200, 400]) {
      const v = vertical(height);
      expect(v.top).toBe(20);
      expect(v.top + v.height).toBeLessThanOrEqual(20 + (height - 20) / 2);
    }
    // The row follows the clip's height by the app's rule (2026-10-07,
    // utils/clipHandleRows.ts): half the room under the header, clamped
    // 22–32 — a 60px clip's row is 22; a COLLAPSED clip (too short for
    // its header, 44px and under) takes the row from its top, never
    // past half of itself — as the app's zone does
    expect(vertical(60)).toEqual({ top: 20, height: 22 });
    expect(vertical(44)).toEqual({ top: 0, height: 22 });
    expect(vertical(34)).toEqual({ top: 0, height: 17 });
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

  it('a SELECTED clip under the pointer has its handles and no edge zones; every other clip the reverse (2026-10-01)', () => {
    // Two clips selected elsewhere, so no single-selection exception
    const { container, zone } = renderTrack({ singleSelection: false });
    // At rest: zones everywhere, handles nowhere — selection alone shows none
    expect(zone(1, 'left')).toBeTruthy();
    expect(zone(1, 'right')).toBeTruthy();
    expect(container.querySelectorAll('.clip-display__handle')).toHaveLength(0);
    // Under the pointer: the selected clip 1 swaps its zones for handles
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="1"]') as HTMLElement, { buttons: 0 });
    expect(zone(1, 'left')).toBeNull();
    expect(zone(1, 'right')).toBeNull();
    expect(container.querySelectorAll('[data-clip-id="1"] .clip-display__handle--trim-left')).toHaveLength(1);
    expect(container.querySelectorAll('[data-clip-id="2"] .clip-display__handle')).toHaveLength(0);
    expect(zone(2, 'left')).toBeTruthy();
    // …but the UNSELECTED clip 2 does not: hovered, it keeps its zones
    // and shows no trim or stretch handles ("unselected items don't
    // need to show handles on hover") — only its fade handles
    fireEvent.mouseLeave(container.querySelector('[data-clip-id="1"]') as HTMLElement);
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="2"]') as HTMLElement, { buttons: 0 });
    expect(zone(1, 'left')).toBeTruthy();
    expect(zone(2, 'left')).toBeTruthy();
    expect(zone(2, 'right')).toBeTruthy();
    expect(container.querySelectorAll('[data-clip-id="2"] .clip-display__handle')).toHaveLength(0);
    expect(container.querySelectorAll('[data-fade-handle][data-fade-clip="2"]')).toHaveLength(2);
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
    // The zones are there while the clip is NOT under the pointer; the
    // fade handles (and the trim boxes, with the same 6px inside reach)
    // take over when it is — measure the zones first
    const zoneLeft = span(zone(2, 'left')!);
    const zoneRight = span(zone(2, 'right')!);
    const zoneZ = Number(zone(2, 'left')!.style.zIndex);
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="2"]') as HTMLElement, { buttons: 0 });
    const fade = (side: 'in' | 'out') => {
      const el = container.querySelector<HTMLElement>(`[data-fade-handle="${side}"][data-fade-clip="2"]`)!;
      const left = parseInt(el.style.left, 10);
      return { left, right: left + parseInt(el.style.width, 10), z: Number(el.style.zIndex) };
    };
    // Left edge: the zone ends EXACTLY where the fade handle's box
    // begins (6px in — the trim box's inside reach too), and the box
    // runs to 30 (at rest it is clipped from 0..30 to the 6px line —
    // the body rests 10px in since 2026-10-07, so that with a fade the
    // box starts on the fade's boundary)
    expect(zoneLeft.right).toBe(fade('in').left);
    expect(fade('in').right - fade('in').left).toBe(24);
    // Right edge: the fade handle's box ends where the zone begins
    expect(fade('out').right).toBe(zoneRight.left);
    expect(fade('out').right - fade('out').left).toBe(24);
    // …and the fade controls are stacked above the zones regardless
    expect(fade('in').z).toBeGreaterThan(zoneZ);
  });

  it('the fade handles do not show until the pointer is at least 6px into the clip — past the zone', () => {
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
    // In the clip, but within 6px of its edge: still nothing
    fireEvent.mouseEnter(clipEl, { clientX: 501, clientY: 60, buttons: 0 });
    expect(controls()).toBe(0);
    at(505);
    expect(controls()).toBe(0);
    // 6px in: they show
    at(506);
    expect(controls()).toBe(3); // two length handles + the fade-in's shape handle
    at(700);
    expect(controls()).toBe(3);
    // Back toward the edge: they go again…
    at(504);
    expect(controls()).toBe(0);
    // …and the same from the right-hand side
    at(894);
    expect(controls()).toBe(3);
    at(895);
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
    expect(span(zone(1, 'right')!)).toEqual({ left: joint - 6, right: joint });
    expect(span(zone(2, 'left')!)).toEqual({ left: joint, right: joint + 6 });
  });

  it('a selected neighbour keeps the unselected clip\'s zone out of itself', () => {
    const { zone, clipBox, span } = renderTrack({
      clips: [
        { id: 1, name: 'A', start: 0, duration: 4, selected: true },
        { id: 2, name: 'B', start: 4, duration: 3 },
      ],
    });
    const joint = clipBox(2).left;
    expect(span(zone(2, 'left')!)).toEqual({ left: joint, right: joint + 6 });
  });

  it('an edge buried under a higher clip has no zone', () => {
    // Containment, not an edge overlap: clip 1 sits wholly under clip 2
    // (later in the array = on top), so neither of its edges is there
    // to grab. (An EDGE overlap is a crossfade, whose buried edge DOES
    // get a zone — 2026-10-01, see the crossfaded-edge tests below.)
    const { zone } = renderTrack({
      clips: [
        { id: 1, name: 'A', start: 2, duration: 1 },
        { id: 2, name: 'B', start: 0, duration: 5 },
      ],
    });
    expect(zone(1, 'left')).toBeNull();
    expect(zone(1, 'right')).toBeNull();
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

describe('a crossfaded edge belongs to the crossfade (2026-10-01): no trim or stretch buttons there, a zone instead', () => {
  // Clip 1 (0..5) under clip 2 (3..7), BOTH selected: the overlap 3..5
  // is a crossfade. Clip 1's right edge and clip 2's left edge are the
  // crossfaded ones; the two outer edges are free.
  const bothSelected = [
    { id: 1, name: 'A', start: 0, duration: 5, selected: true },
    { id: 2, name: 'B', start: 3, duration: 4, selected: true },
  ];
  const button = (container: HTMLElement, clipId: number, label: string) =>
    container.querySelector(`[data-clip-id="${clipId}"] [aria-label="${label}"]`);

  const hover = (container: HTMLElement, clipId: number) =>
    fireEvent.mouseEnter(container.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement, { buttons: 0 });
  const leave = (container: HTMLElement, clipId: number) =>
    fireEvent.mouseLeave(container.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement);

  it('the crossfaded edges show no handles; the free edges keep both of theirs', () => {
    // Handles follow the pointer: one clip at a time
    const { container } = renderTrack({ clips: bothSelected, onClipStretchEdge: vi.fn() });
    hover(container, 1);
    expect(button(container, 1, 'Trim right edge')).toBeNull();
    expect(button(container, 1, 'Stretch right edge')).toBeNull();
    expect(button(container, 1, 'Trim left edge')).toBeTruthy();
    expect(button(container, 1, 'Stretch left edge')).toBeTruthy();
    leave(container, 1);
    hover(container, 2);
    expect(button(container, 2, 'Trim left edge')).toBeNull();
    expect(button(container, 2, 'Stretch left edge')).toBeNull();
    expect(button(container, 2, 'Trim right edge')).toBeTruthy();
    expect(button(container, 2, 'Stretch right edge')).toBeTruthy();
  });

  it('…and get edge zones instead, hovered or not — the under clip\'s reaching through the top clip', () => {
    const { container, zone } = renderTrack({ clips: bothSelected });
    expect(zone(1, 'right')).toBeTruthy(); // buried under clip 2, but crossfaded
    expect(zone(2, 'left')).toBeTruthy();
    // On the edge, as every zone is: 5 out, 6 in
    expect(zone(1, 'right')!.style.left).toBe(`${12 + 500 - 6}px`);
    expect(zone(2, 'left')!.style.left).toBe(`${12 + 300 - 5}px`);
    // Under the pointer, the clip's FREE edge swaps its zone for handles;
    // its crossfaded edge keeps the zone
    hover(container, 1);
    expect(zone(1, 'left')).toBeNull();
    expect(zone(1, 'right')).toBeTruthy();
    expect(zone(2, 'left')).toBeTruthy();
    expect(zone(2, 'right')).toBeTruthy();
  });

  it('dragging the under clip\'s crossfaded zone trims THAT clip\'s right edge — the overlap\'s length', () => {
    const { zone, onClipTrimEdge } = renderTrack({ clips: bothSelected });
    const z = zone(1, 'right')!;
    fireEvent.mouseDown(z, { button: 0, clientX: 506, clientY: 30 });
    fireEvent.mouseMove(document, { clientX: 480 });
    expect(onClipTrimEdge.mock.calls).toEqual([[1, 'right', 480]]);
    fireEvent.mouseUp(document);
  });

  it('with the clips apart the rule is the plain one: the hovered clip has handles on both edges and no zones', () => {
    const { container, zone } = renderTrack({ clips: [
      { id: 1, name: 'A', start: 0, duration: 3, selected: true },
      { id: 2, name: 'B', start: 4, duration: 3, selected: true },
    ] });
    hover(container, 1);
    expect(container.querySelectorAll('[data-clip-id="1"] .clip-display__handle')).toHaveLength(4);
    expect(container.querySelectorAll('[data-clip-id="2"] .clip-display__handle')).toHaveLength(0);
    expect(zone(1, 'right')).toBeNull();
    expect(zone(2, 'left')).toBeTruthy();
  });
});

describe('a SINGLE selected clip keeps its trim and stretch handles without the pointer (2026-10-01)', () => {
  it('with singleSelection the selected clip has handles and no zones, unhovered; its fade handles still wait for the pointer', () => {
    const { container, zone } = renderTrack({ singleSelection: true, onClipStretchEdge: vi.fn() });
    expect(container.querySelectorAll('[data-clip-id="1"] .clip-display__handle')).toHaveLength(4);
    expect(zone(1, 'left')).toBeNull();
    expect(zone(1, 'right')).toBeNull();
    expect(container.querySelector('[data-fade-handle][data-fade-clip="1"]')).toBeNull(); // fades: hover only
    // The unselected clip is as ever: zones, no handles
    expect(container.querySelectorAll('[data-clip-id="2"] .clip-display__handle')).toHaveLength(0);
    expect(zone(2, 'left')).toBeTruthy();
    // Under the pointer the selected clip gains its fade handles too
    fireEvent.mouseEnter(container.querySelector('[data-clip-id="1"]') as HTMLElement, { buttons: 0 });
    expect(container.querySelectorAll('[data-fade-handle][data-fade-clip="1"]')).toHaveLength(2);
  });

  it('without singleSelection (the host counted more than one) selection shows nothing', () => {
    const { container, zone } = renderTrack({ singleSelection: false });
    expect(container.querySelectorAll('.clip-display__handle')).toHaveLength(0);
    expect(zone(1, 'left')).toBeTruthy();
  });
});
