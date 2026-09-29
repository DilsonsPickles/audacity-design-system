import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { TrackNew } from '../TrackNew';
import { fadeAreaBelowPath, fadeCurvePath, fadeInGain, type FadeHandle, type FadeShape } from '../../utils/clipCrossfades';
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

/** Put the pointer over a clip — the shape handle shows on hover only */
function hoverClip(container: HTMLElement, clipId: number) {
  fireEvent.mouseEnter(container.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement, { buttons: 0 });
}

describe('clip fades', () => {
  it('renders fade curve overlays for clips with fadeIn/fadeOut set', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, fadeIn: 1, fadeOut: 0.5 }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
        />
      </Providers>,
    );
    const fadeInOverlay = container.querySelector<HTMLElement>('[data-fade-curve="in"]');
    const fadeOutOverlay = container.querySelector<HTMLElement>('[data-fade-curve="out"]');
    expect(fadeInOverlay).toBeTruthy();
    expect(fadeOutOverlay).toBeTruthy();
    expect(fadeInOverlay!.style.width).toBe('100px');
    expect(fadeOutOverlay!.style.width).toBe('50px');
  });

  it('a quick fade dims the area above its curve, and nothing else', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, fadeIn: 1, fadeOut: 0.5, fadeOutShape: { t: 0.3, g: 0.6 } }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
        />
      </Providers>,
    );
    // No wash over the whole region any more
    expect(container.querySelector('[data-fade-overlay]')).toBeNull();
    for (const side of ['in', 'out'] as const) {
      const shape = side === 'in' ? 2 : { t: 0.3, g: 0.6 };
      const dim = container.querySelector(`[data-fade-dim="${side}"]`)!;
      const line = container.querySelector(`[data-fade-line="${side}"]`)!;
      // The dimmed area's lower edge IS the drawn curve, whatever its shape…
      expect(line.getAttribute('d')).toBe(fadeCurvePath(side, 64, shape));
      expect(dim.getAttribute('d')!.startsWith(line.getAttribute('d')!)).toBe(true);
      // …and it closes along the top, through the corner above the silent end
      expect(dim.getAttribute('d')!.endsWith(side === 'in' ? ' L 0.00,0.00 Z' : ' L 100.00,0.00 Z')).toBe(true);
      expect(dim.getAttribute('fill')).toMatch(/^rgba\(0, 0, 0, 0\.\d+\)$/);
      expect(dim.getAttribute('stroke')).toBe('none');
    }
  });

  it('a quick fade being edited gains a white edge on the UNDERSIDE of its line only; the dark line never changes', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 1, fadeOutShape: { t: 0.3, g: 0.6 }, selected: true },
            { id: 2, name: 'B', start: 5, duration: 4, fadeIn: 1 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    const lefts = Array.from(container.querySelectorAll<HTMLElement>('[data-fade-curve]')).map((el) => parseInt(el.style.left, 10));
    const clip2Left = Math.max(...lefts); // clip 2's one fade is the right-most region
    const curves = (clip: 1 | 2) => Array.from(container.querySelectorAll<HTMLElement>('[data-fade-curve]'))
      .filter((el) => (parseInt(el.style.left, 10) === clip2Left) === (clip === 2));
    const strokes = (clip: 1 | 2) => curves(clip).map((el) => el.querySelector('[data-fade-line]')!.getAttribute('stroke'));
    const undersides = (clip: 1 | 2) => curves(clip)
      .map((el) => el.querySelector('[data-fade-line-underside]')?.getAttribute('stroke'))
      .filter((stroke) => stroke !== undefined);
    const DARK = 'rgba(0, 0, 0, 0.55)';

    // At rest — selection alone is not editing
    expect(strokes(1)).toEqual([DARK, DARK]);
    expect(strokes(2)).toEqual([DARK]);
    expect(container.querySelector('[data-fade-line-underside]')).toBeNull();

    // Pointer over clip 1: both of ITS curves, and only its
    hoverClip(container, 1);
    expect(undersides(1)).toEqual(['#FFFFFF', '#FFFFFF']);
    expect(strokes(1)).toEqual([DARK, DARK]); // the line on top is untouched
    expect(undersides(2)).toEqual([]);
    expect(strokes(2)).toEqual([DARK]);

    const clipIds = curves(1).map((el) => {
      const side = el.getAttribute('data-fade-curve') as 'in' | 'out';
      const shape = side === 'in' ? 2 : { t: 0.3, g: 0.6 };
      const white = el.querySelector('[data-fade-line-underside]')!;
      const line = el.querySelector('[data-fade-line]')!;
      // Same curve, wider, and drawn before (under) the line
      expect(white.getAttribute('d')).toBe(line.getAttribute('d'));
      expect(Number(white.getAttribute('stroke-width'))).toBeGreaterThan(Number(line.getAttribute('stroke-width')));
      expect(white.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // …and cut off along the curve: only the part BELOW it shows
      const clip = el.querySelector('clipPath')!;
      expect(white.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
      expect(clip.querySelector('path')!.getAttribute('d')).toBe(fadeAreaBelowPath(side, 64, shape));
      return clip.id;
    });
    expect(new Set(clipIds).size).toBe(2); // one clip region per curve

    // A drag keeps it after the pointer has left the clip's box…
    const handle = container.querySelector('[data-fade-handle="in"][data-fade-clip="1"]') as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientX: 0, clientY: 0, pointerId: 51 });
    fireEvent.mouseLeave(handle);
    expect(undersides(1)).toEqual(['#FFFFFF', '#FFFFFF']);
    // …and letting go away from the clip returns it to rest
    fireEvent.pointerUp(handle, { clientX: 900, clientY: 400, pointerId: 51 });
    expect(strokes(1)).toEqual([DARK, DARK]);
    expect(container.querySelector('[data-fade-line-underside]')).toBeNull();
    // Nothing on top of the curve is ever white
    expect(container.querySelector('[data-fade-line][stroke="#FFFFFF"]')).toBeNull();
  });

  it('the fade handle icon is a rounded outline: no white fill, and the wedge is clipped to it', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    const glyphs = Array.from(container.querySelectorAll('[data-fade-handle] svg'));
    expect(glyphs).toHaveLength(2);
    const clipIds = glyphs.map((svg) => {
      const frame = svg.querySelector('[data-fade-glyph-frame]')!;
      expect(Number(frame.getAttribute('rx'))).toBeGreaterThan(0);
      expect(frame.getAttribute('fill')).toBe('none');
      // Nothing in the icon is filled white
      svg.querySelectorAll('[fill]').forEach((el) => {
        expect((el.getAttribute('fill') ?? '').toUpperCase()).not.toMatch(/^#FFF(FFF)?$/);
      });
      // The wedge is clipped to a square with the same rounding
      const clip = svg.querySelector('clipPath')!;
      expect(clip.querySelector('rect')!.getAttribute('rx')).toBe(frame.getAttribute('rx'));
      expect(svg.querySelector('g')!.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
      return clip.id;
    });
    // Each icon has its own clip id — a shared one would point both at the first
    expect(new Set(clipIds).size).toBe(2);
  });

  it('a crossfade keeps its veils and is not dimmed', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 5 },
            { id: 2, name: 'B', start: 3, duration: 4 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
        />
      </Providers>,
    );
    expect(container.querySelectorAll('[data-fade-overlay]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-fade-line]')).toHaveLength(2);
    expect(container.querySelector('[data-fade-dim]')).toBeNull();
    // …nor given the white edge under the pointer: that is the quick fade's editing state
    hoverClip(container, 1);
    expect(container.querySelector('[data-fade-line-underside]')).toBeNull();
    expect(container.querySelector('[data-fade-line][stroke="#FFFFFF"]')).toBeNull();
  });

  it('handles show for the selected clip, and for an unselected clip only while the pointer is over it', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'Clip 1', start: 0, duration: 4, selected: true },
            { id: 2, name: 'Clip 2', start: 5, duration: 4 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    expect(container.querySelectorAll('[data-fade-handle][data-fade-clip="1"]')).toHaveLength(2);
    expect(container.querySelector('[data-fade-handle][data-fade-clip="2"]')).toBeNull();
  });

  it('an UNSELECTED clip can be faded: its controls show under the pointer, and using them selects nothing', () => {
    const onClipFadeChange = vi.fn();
    const onClipFadeShapeChange = vi.fn();
    const onClipClick = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'Clip 1', start: 0, duration: 4, selected: true },
            { id: 2, name: 'Clip 2', start: 5, duration: 4, fadeIn: 1 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
          onClipFadeShapeChange={onClipFadeShapeChange}
          onClipClick={onClipClick}
        />
      </Providers>,
    );
    const clip2 = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    const handles = () => container.querySelectorAll('[data-fade-handle][data-fade-clip="2"]');
    const shapeNode = () => container.querySelector('[data-quickfade-node][data-clip-ref="2"]') as HTMLElement | null;
    expect(handles()).toHaveLength(0);
    expect(shapeNode()).toBeNull();

    // A press already under way passing over the clip is not a hover
    fireEvent.mouseEnter(clip2, { buttons: 1 });
    expect(handles()).toHaveLength(0);
    fireEvent.mouseLeave(clip2);

    fireEvent.mouseEnter(clip2, { buttons: 0 });
    expect(handles()).toHaveLength(2);
    expect(shapeNode()).toBeTruthy();
    // The selected clip keeps its own
    expect(container.querySelectorAll('[data-fade-handle][data-fade-clip="1"]')).toHaveLength(2);

    // Moving from the clip onto one of its controls keeps them up: the
    // controls sit above the clip, so the clip itself is "left"
    // (one native mouseout, clip → handle, as the browser sends it).
    const inHandle = handles()[0] as HTMLElement;
    fireEvent.mouseOut(clip2, { relatedTarget: inHandle, buttons: 0 });
    expect(handles()).toHaveLength(2);
    expect(handles()[0]).toBe(inHandle); // the same element — never unmounted

    // Length and shape both work, and neither touches the selection
    Object.defineProperty(clip2, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 500, top: 0, right: 900, bottom: 100, width: 400, height: 100, x: 500, y: 0, toJSON: () => ({}) }),
    });
    const handleNow = handles()[0] as HTMLElement;
    fireEvent.pointerDown(handleNow, { button: 0, clientX: 600, clientY: 30, pointerId: 31 });
    fireEvent.pointerMove(handleNow, { clientX: 650, clientY: 30, pointerId: 31 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(2, 'in', 1.5);
    fireEvent.pointerUp(handleNow, { clientX: 650, clientY: 30, pointerId: 31 });
    fireEvent.click(handleNow);
    expect(handles()).toHaveLength(2); // let go over the clip: still there

    const node = shapeNode()!;
    fireEvent.pointerDown(node, { button: 0, clientX: 600, clientY: 60, pointerId: 32 });
    fireEvent.pointerMove(node, { clientX: 610, clientY: 60, pointerId: 32 });
    expect(onClipFadeShapeChange.mock.calls[0][0]).toBe(2);
    fireEvent.pointerUp(node, { clientX: 610, clientY: 60, pointerId: 32 });
    fireEvent.click(node);
    expect(onClipClick).not.toHaveBeenCalled();

    // Pointer gone: the controls go with it
    fireEvent.mouseLeave(shapeNode()!);
    expect(handles()).toHaveLength(0);
    expect(shapeNode()).toBeNull();
  });

  it('a drag that ends over a clip: the first free move inside it brings the controls up', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 2, name: 'Clip 2', start: 5, duration: 4, fadeIn: 1 }]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    const clip2 = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    const controls = () => container.querySelectorAll('[data-fade-handle], [data-quickfade-node]').length;
    // Entered mid-press (say, a time selection dragged across): not a hover
    fireEvent.mouseEnter(clip2, { buttons: 1 });
    fireEvent.mouseMove(clip2, { buttons: 1 });
    expect(controls()).toBe(0);
    // Button released over the clip; the pointer then moves, still inside
    fireEvent.mouseMove(clip2, { buttons: 0 });
    expect(controls()).toBe(3); // two length handles + the fade-in's shape handle
    fireEvent.mouseLeave(clip2);
    expect(controls()).toBe(0);
  });

  it('a fade drag settles the hover from where the pointer is let go', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 2, name: 'Clip 2', start: 5, duration: 4, fadeIn: 1 }]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    const clip2 = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    Object.defineProperty(clip2, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 500, top: 0, right: 900, bottom: 100, width: 400, height: 100, x: 500, y: 0, toJSON: () => ({}) }),
    });
    const handles = () => container.querySelectorAll('[data-fade-handle]');
    fireEvent.mouseEnter(clip2, { buttons: 0 });

    // Pointer capture means no enter/leave arrives during the drag. Let
    // go over the clip: the controls stay, without the pointer having
    // to leave and come back
    let handle = handles()[0] as HTMLElement;
    fireEvent.mouseOut(clip2, { relatedTarget: handle, buttons: 0 });
    fireEvent.pointerDown(handle, { button: 0, clientX: 600, clientY: 30, pointerId: 41 });
    fireEvent.pointerMove(handle, { clientX: 650, clientY: 30, pointerId: 41 });
    fireEvent.pointerUp(handle, { clientX: 650, clientY: 30, pointerId: 41 });
    expect(handles()).toHaveLength(2);

    // …and a drag let go far outside the clip takes them away
    handle = handles()[0] as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientX: 600, clientY: 30, pointerId: 42 });
    fireEvent.pointerMove(handle, { clientX: 100, clientY: 400, pointerId: 42 });
    fireEvent.pointerUp(handle, { clientX: 100, clientY: 400, pointerId: 42 });
    expect(handles()).toHaveLength(0);
  });

  it('handles are absent entirely when fades are not editable (no onClipFadeChange)', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
        />
      </Providers>,
    );
    expect(container.querySelector('[data-fade-handle]')).toBeNull();
  });

  it('dragging the fade-in handle reports clamped seconds', () => {
    const onClipFadeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
        />
      </Providers>,
    );

    const wrapper = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    Object.defineProperty(wrapper, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, right: 400, bottom: 100, width: 400, height: 100, x: 0, y: 0, toJSON: () => ({}) }),
    });

    const inHandle = container.querySelector('[data-fade-handle="in"]') as HTMLElement;
    const outHandle = container.querySelector('[data-fade-handle="out"]') as HTMLElement;
    expect(inHandle).toBeTruthy();
    expect(outHandle).toBeTruthy();

    fireEvent.pointerDown(inHandle, { button: 0, clientX: 0, clientY: 30, pointerId: 1 });
    // 150px at 100 px/s → 1.5s fade-in
    fireEvent.pointerMove(inHandle, { clientX: 150, clientY: 30, pointerId: 1 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 1.5);
    // past the clip's end clamps to its 4s duration
    fireEvent.pointerMove(inHandle, { clientX: 900, clientY: 30, pointerId: 1 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 4);
    // dragging back to (almost) zero snaps the fade away
    fireEvent.pointerMove(inHandle, { clientX: 1, clientY: 30, pointerId: 1 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 0);
    fireEvent.pointerUp(inHandle, { pointerId: 1 });
  });

  it('the fade-out drag measures from the clip end and respects the fade-in', () => {
    const onClipFadeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, fadeIn: 3, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
        />
      </Providers>,
    );

    const wrapper = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    Object.defineProperty(wrapper, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, right: 400, bottom: 100, width: 400, height: 100, x: 0, y: 0, toJSON: () => ({}) }),
    });

    const outHandle = container.querySelector('[data-fade-handle="out"]') as HTMLElement;
    fireEvent.pointerDown(outHandle, { button: 0, clientX: 400, clientY: 30, pointerId: 2 });
    // pointer at 300px → 1s from the 4s end… but fadeIn=3 caps fadeOut at 1s anyway
    fireEvent.pointerMove(outHandle, { clientX: 300, clientY: 30, pointerId: 2 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'out', 1);
    // pointer at 0px would mean 4s — clamped to duration - fadeIn = 1s
    fireEvent.pointerMove(outHandle, { clientX: 0, clientY: 30, pointerId: 2 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'out', 1);
    fireEvent.pointerUp(outHandle, { pointerId: 2 });
  });

  it('crossfaded edges hide their quick-fade handles; free edges keep them', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 5, selected: true },
            { id: 2, name: 'B', start: 3, duration: 4, selected: true },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    // A's tail and B's head belong to the crossfade — node owns them
    expect(container.querySelector('[data-fade-handle="in"][data-fade-clip="1"]')).toBeTruthy();
    expect(container.querySelector('[data-fade-handle="out"][data-fade-clip="1"]')).toBeNull();
    expect(container.querySelector('[data-fade-handle="in"][data-fade-clip="2"]')).toBeNull();
    expect(container.querySelector('[data-fade-handle="out"][data-fade-clip="2"]')).toBeTruthy();
  });

  it('dragging the intersection node bends both curves — extents never move', () => {
    const onCrossfadeShapeChange = vi.fn();
    const onClipFadeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 5 },
            { id: 2, name: 'B', start: 3, duration: 4 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
          onCrossfadeShapeChange={onCrossfadeShapeChange}
        />
      </Providers>,
    );
    // symmetric default: crossing at 4.0s, gain cos(π/4)≈0.7071;
    // track height 114 → bodyHeight 92
    const node = container.querySelector('[data-crossfade-node]') as HTMLElement;
    expect(node).toBeTruthy();
    fireEvent.pointerDown(node, { button: 0, clientX: 400, clientY: 48, pointerId: 3 });
    // drag straight DOWN 19px → gain ≈ 0.7071 - 19/92 ≈ 0.5006 at t=0.5
    // → both shapes = ln(0.5006)/ln(0.7071) ≈ 2 (a deeper dip)
    fireEvent.pointerMove(node, { clientX: 400, clientY: 67, pointerId: 3 });
    expect(onCrossfadeShapeChange).toHaveBeenCalledTimes(1);
    const [outId, inId, outShape, inShape] = onCrossfadeShapeChange.mock.calls[0];
    expect(outId).toBe(1);
    expect(inId).toBe(2);
    expect(outShape).toBeCloseTo(2, 1);
    expect(inShape).toBeCloseTo(2, 1);
    // extents were never touched
    expect(onClipFadeChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(node, { pointerId: 3 });
  });

  it('Alt+drag on the node rolls instead (content edit)', () => {
    const onCrossfadeRoll = vi.fn();
    const onClipFadeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 5 },
            { id: 2, name: 'B', start: 3, duration: 4 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
          onCrossfadeRoll={onCrossfadeRoll}
        />
      </Providers>,
    );
    const node = container.querySelector('[data-crossfade-node]') as HTMLElement;
    fireEvent.pointerDown(node, { button: 0, altKey: true, clientX: 400, clientY: 60, pointerId: 4 });
    fireEvent.pointerMove(node, { clientX: 430, clientY: 60, pointerId: 4 });
    expect(onCrossfadeRoll).toHaveBeenCalledWith(1, 2, expect.closeTo(0.3, 5));
    expect(onClipFadeChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(node, { pointerId: 4 });
  });

  it('the shape handle shows on HOVER only — selection alone does not show it', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 1, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    // Selected: the corner handles are there, the shape handles are not
    expect(container.querySelectorAll('[data-fade-handle]')).toHaveLength(2);
    expect(container.querySelector('[data-quickfade-node]')).toBeNull();
    hoverClip(container, 1);
    expect(container.querySelectorAll('[data-quickfade-node]')).toHaveLength(2);
    fireEvent.mouseLeave(container.querySelector('[data-clip-id="1"]') as HTMLElement);
    expect(container.querySelector('[data-quickfade-node]')).toBeNull();
    expect(container.querySelectorAll('[data-fade-handle]')).toHaveLength(2);
  });

  it('a hovered clip with a quick fade shows a shape handle; dragging it reports the point the curve must pass through', () => {
    const onClipFadeShapeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeShapeChange={onClipFadeShapeChange}
        />
      </Providers>,
    );
    hoverClip(container, 1);
    const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    expect(node).toBeTruthy();
    // The default is the S-curve: the handle rests at (0.5, 0.5). Track
    // height 114 → bodyHeight 92. Drag UP 19px → gain 0.5 + 19/92.
    fireEvent.pointerDown(node, { button: 0, clientX: 62, clientY: 67, pointerId: 6 });
    fireEvent.pointerMove(node, { clientX: 62, clientY: 48, pointerId: 6 });
    expect(onClipFadeShapeChange).toHaveBeenCalledTimes(1);
    const [clipId, side, shape] = onClipFadeShapeChange.mock.calls[0];
    expect(clipId).toBe(1);
    expect(side).toBe('in');
    expect(shape.t).toBeCloseTo(0.5, 10);
    expect(shape.g).toBeCloseTo(0.5 + 19 / 92, 10);
    fireEvent.pointerUp(node, { pointerId: 6 });
  });

  it('no quick-fade shape node on crossfaded edges, or on a clip the pointer is not over', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            // hovered, but its OUT edge is crossfaded → no node there
            { id: 1, name: 'A', start: 0, duration: 5, fadeOut: 1, selected: true },
            // not under the pointer → no node despite the fade
            { id: 2, name: 'B', start: 3, duration: 4, fadeIn: 1 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    hoverClip(container, 1);
    expect(container.querySelector('[data-quickfade-node]')).toBeNull();
  });

  it('the corner handle is extent-only: vertical input never touches the shape', () => {
    const onClipFadeChange = vi.fn();
    const onClipFadeShapeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
          onClipFadeShapeChange={onClipFadeShapeChange}
        />
      </Providers>,
    );
    const wrapper = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    Object.defineProperty(wrapper, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, right: 400, bottom: 100, width: 400, height: 100, x: 0, y: 0, toJSON: () => ({}) }),
    });
    const inHandle = container.querySelector('[data-fade-handle="in"]') as HTMLElement;
    fireEvent.pointerDown(inHandle, { button: 0, clientX: 0, clientY: 30, pointerId: 7 });
    // diagonal input: only the horizontal component registers
    fireEvent.pointerMove(inHandle, { clientX: 150, clientY: 49, pointerId: 7 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 1.5);
    expect(onClipFadeShapeChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(inHandle, { pointerId: 7 });
  });

  it('a fade with no stored shape is the S-curve: its handle rests at the centre, and double-click toggles linear', () => {
    const renderIt = (extra: Record<string, unknown>) => {
      const onClipFadeShapeChange = vi.fn();
      const { container } = render(
        <Providers>
          <TrackNew
            clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, selected: true, ...extra }]}
            width={800}
            trackIndex={0}
            pixelsPerSecond={100}
            onClipFadeShapeChange={onClipFadeShapeChange}
          />
        </Providers>,
      );
      hoverClip(container, 1);
      const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
      return { node, onClipFadeShapeChange };
    };
    // Track height 114 → body 21..113 (92 tall). Half gain = y 67; the
    // handle is 16px square, so its top is 59.
    {
      const { node, onClipFadeShapeChange } = renderIt({});
      expect(node.style.top).toBe('59px');
      expect(node.getAttribute('aria-valuenow')).toBe('50');
      fireEvent.doubleClick(node);
      expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 'linear');
    }
    cleanup();
    {
      // A straight line also crosses half gain at the middle; a second
      // double-click hands back the S-curve, not equal-power
      const { node, onClipFadeShapeChange } = renderIt({ fadeInShape: 'linear' });
      expect(node.style.top).toBe('59px');
      expect(node.getAttribute('aria-valuetext')).toBe('linear');
      fireEvent.doubleClick(node);
      expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 2);
    }
    cleanup();
    {
      // A stored exponent keeps its curve; its handle sits at the middle
      // of it. Equal-power: gain 0.707 → y 48 → top 40
      const { node } = renderIt({ fadeInShape: 1 });
      expect(node.style.top).toBe('40px');
    }
  });

  it('the handle stays where it is put, inside its limits, and the curve runs through it', () => {
    // A host that applies the change, as the app does.
    const shapes: FadeShape[] = [];
    function Host() {
      const [shape, setShape] = React.useState<FadeShape | undefined>(undefined);
      return (
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeInShape: shape, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeShapeChange={(_id, _side, next) => { shapes.push(next); setShape(next); }}
        />
      );
    }
    const { container } = render(<Providers><Host /></Providers>);
    hoverClip(container, 1);
    const node = () => container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    const path = () => container.querySelector('[data-fade-line="in"]')!.getAttribute('d')!;
    const last = () => shapes[shapes.length - 1] as FadeHandle;
    // Body is 21..113 (92 tall); the handle is 16px square. The fade is
    // 1s at 100px/s, so 1% along it is 1px.
    const topFor = (gain: number) => `${Math.round(21 + (1 - gain) * 92 - 8)}px`;
    const left = () => parseInt(node().style.left, 10);
    const centreLeft = left();
    expect(node().style.top).toBe(topFor(0.5));

    const drag = (pointerId: number, dx: number, dy: number) => {
      fireEvent.pointerDown(node(), { button: 0, clientX: 300, clientY: 300, pointerId });
      act(() => { fireEvent.pointerMove(node(), { clientX: 300 + dx, clientY: 300 + dy, pointerId }); });
    };
    const release = (pointerId: number) => act(() => { fireEvent.pointerUp(node(), { pointerId }); });

    // Inside the limits the handle is under the pointer
    drag(11, 20, -10);
    expect(last().t).toBeCloseTo(0.7, 10);
    expect(last().g).toBeCloseTo(0.5 + 10 / 92, 10);
    expect(left()).toBe(centreLeft + 20);
    expect(node().style.top).toBe(topFor(0.5 + 10 / 92));
    expect(path()).toBe(fadeCurvePath('in', 64, last()));
    expect(fadeInGain(last().t, last())).toBeCloseTo(last().g, 10); // on the curve
    release(11);
    // …and it stays there: nothing re-centres on release
    expect(left()).toBe(centreLeft + 20);
    expect(node().style.top).toBe(topFor(0.5 + 10 / 92));

    // Far past every limit, toward each corner in turn
    const corners: Array<[number, number, FadeHandle]> = [
      [-400, -400, { t: 0.15, g: 0.725 }],
      [400, -400, { t: 0.85, g: 0.725 }],
      [400, 400, { t: 0.85, g: 0.275 }],
      [-400, 400, { t: 0.15, g: 0.275 }],
    ];
    corners.forEach(([dx, dy, corner], i) => {
      drag(20 + i, dx, dy);
      expect(last()).toEqual(corner);
      expect(left()).toBe(centreLeft + Math.round((corner.t - 0.5) * 100));
      expect(node().style.top).toBe(topFor(corner.g));
      expect(path()).toBe(fadeCurvePath('in', 64, corner));
      release(20 + i);
      expect(node().style.top).toBe(topFor(corner.g));
    });
  });

  it('the handle moves in BOTH axes; the fade extent never moves', () => {
    const onClipFadeChange = vi.fn();
    const onClipFadeShapeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 2, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
          onClipFadeShapeChange={onClipFadeShapeChange}
        />
      </Providers>,
    );
    const lastCall = () => onClipFadeShapeChange.mock.calls[onClipFadeShapeChange.mock.calls.length - 1];
    hoverClip(container, 1);
    const inNode = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    fireEvent.pointerDown(inNode, { button: 0, clientX: 62, clientY: 67, pointerId: 8 });
    fireEvent.pointerMove(inNode, { clientX: 72, clientY: 58, pointerId: 8 }); // 10px right, 9px up
    expect(lastCall()[1]).toBe('in');
    expect(lastCall()[2].t).toBeCloseTo(0.6, 10);
    expect(lastCall()[2].g).toBeCloseTo(0.5 + 9 / 92, 10);
    fireEvent.pointerUp(inNode, { pointerId: 8 });

    // The fade OUT is 2s = 200px: the same 10px is 5% along it, and
    // "along" runs from the fade's start toward the clip's end
    const outNode = container.querySelector('[data-quickfade-node="out"]') as HTMLElement;
    fireEvent.pointerDown(outNode, { button: 0, clientX: 300, clientY: 67, pointerId: 9 });
    fireEvent.pointerMove(outNode, { clientX: 310, clientY: 76, pointerId: 9 }); // 10px right, 9px down
    expect(lastCall()[1]).toBe('out');
    expect(lastCall()[2].t).toBeCloseTo(0.55, 10);
    expect(lastCall()[2].g).toBeCloseTo(0.5 - 9 / 92, 10);
    fireEvent.pointerUp(outNode, { pointerId: 9 });

    expect(onClipFadeChange).not.toHaveBeenCalled(); // extents pinned
  });

  it('a selected buried clip re-renders its covered edge handles at track level', () => {
    const onClipTrimEdge = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            // clip 1 selected, BELOW in z; its right edge (5s) lies
            // inside clip 2's span → covered
            { id: 1, name: 'A', start: 0, duration: 5, selected: true },
            { id: 2, name: 'B', start: 3, duration: 4 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={onClipTrimEdge}
        />
      </Providers>,
    );
    // Covered right edge gets duplicates; visible left edge gets none
    const trim = container.querySelector('[data-buried-handle="trim-right"]') as HTMLElement;
    expect(trim).toBeTruthy();
    expect(container.querySelector('[data-buried-handle="stretch-right"]')).toBeTruthy();
    expect(container.querySelector('[data-buried-handle="trim-left"]')).toBeNull();
    // The duplicate drives the same trim callback stream
    fireEvent.mouseDown(trim, { clientX: 500 });
    fireEvent.mouseMove(document, { clientX: 480 });
    expect(onClipTrimEdge).toHaveBeenLastCalledWith(1, 'right', 480);
    fireEvent.mouseUp(document);
  });

  it('no buried-edge duplicates when the selected clip is on top', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 5 },
            // clip 2 on top (later in array) and selected — both its
            // edges are visible
            { id: 2, name: 'B', start: 3, duration: 4, selected: true },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipTrimEdge={vi.fn()}
        />
      </Providers>,
    );
    expect(container.querySelector('[data-buried-handle]')).toBeNull();
  });

  it('handles hide when the clip is too narrow at the current zoom', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          // 4s at 10 px/s = 40px — under the 64px floor
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={10}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    expect(container.querySelector('[data-fade-handle]')).toBeNull();
  });

  it('a zero-extent handle hides when the opposite fade consumed the whole clip', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeOut: 4, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    // fade-out spans the clip → its boundary is at the clip start; the
    // roomless zero-extent fade-in handle must not stack on top of it
    expect(container.querySelector('[data-fade-handle="out"]')).toBeTruthy();
    expect(container.querySelector('[data-fade-handle="in"]')).toBeNull();
  });

  it('fade handle pointerdown does not leak into the clip mousedown path', () => {
    const parentSpy = vi.fn();
    const { container } = render(
      <Providers>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div onMouseDown={parentSpy}>
          <TrackNew
            clips={[{ id: 1, name: 'Clip 1', start: 0, duration: 4, selected: true }]}
            width={800}
            trackIndex={0}
            pixelsPerSecond={100}
            onClipFadeChange={vi.fn()}
          />
        </div>
      </Providers>,
    );
    const inHandle = container.querySelector('[data-fade-handle="in"]') as HTMLElement;
    fireEvent.mouseDown(inHandle, { button: 0 });
    expect(parentSpy).not.toHaveBeenCalled();
  });
});
