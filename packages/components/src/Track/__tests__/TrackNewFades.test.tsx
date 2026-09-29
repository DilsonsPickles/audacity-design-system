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

  it('the white edge shows only while a curve is being EDITED — its shape handle mid-drag — and only on its underside', () => {
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
    const whites = () => Array.from(container.querySelectorAll('[data-fade-line-underside]'));
    const lineStrokes = () => Array.from(container.querySelectorAll('[data-fade-line]')).map((el) => el.getAttribute('stroke'));
    const DARK = 'rgba(0, 0, 0, 0.55)';
    const allDark = [DARK, DARK, DARK];

    // Selected: no white
    expect(whites()).toHaveLength(0);
    // Pointer over the clip: no white
    hoverClip(container, 1);
    expect(whites()).toHaveLength(0);
    // Pointer on the shape handle: it shows its hover look, still no white
    const outNode = () => container.querySelector('[data-quickfade-node="out"]') as HTMLElement;
    fireEvent.mouseOut(container.querySelector('[data-clip-id="1"]') as HTMLElement, { relatedTarget: outNode(), buttons: 0 });
    expect(outNode().getAttribute('data-hovered')).toBe('true');
    expect(whites()).toHaveLength(0);
    // Dragging the LENGTH handle: no white
    const lengthHandle = container.querySelector('[data-fade-handle="out"][data-fade-clip="1"]') as HTMLElement;
    fireEvent.pointerDown(lengthHandle, { button: 0, clientX: 0, clientY: 0, pointerId: 50 });
    expect(whites()).toHaveLength(0);
    fireEvent.pointerUp(lengthHandle, { clientX: 0, clientY: 0, pointerId: 50 });
    expect(lineStrokes()).toEqual(allDark);

    // Dragging the fade OUT's shape handle: that curve, and only that one
    fireEvent.pointerDown(outNode(), { button: 0, clientX: 0, clientY: 0, pointerId: 51 });
    expect(whites()).toHaveLength(1);
    const white = whites()[0];
    expect(white.getAttribute('data-fade-line-underside')).toBe('out');
    expect(white.getAttribute('stroke')).toBe('#FFFFFF');
    expect(lineStrokes()).toEqual(allDark); // the line on top is untouched

    const curve = white.closest('[data-fade-curve]')!;
    const line = curve.querySelector('[data-fade-line]')!;
    // Same curve, wider, and drawn before (under) the line
    expect(white.getAttribute('d')).toBe(line.getAttribute('d'));
    expect(Number(white.getAttribute('stroke-width'))).toBeGreaterThan(Number(line.getAttribute('stroke-width')));
    expect(white.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // …and cut off along the curve: only the part BELOW it shows
    const clip = curve.querySelector('clipPath')!;
    expect(white.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
    expect(clip.querySelector('path')!.getAttribute('d')).toBe(fadeAreaBelowPath('out', 64, { t: 0.3, g: 0.6 }));

    // It lasts as long as the drag, wherever the pointer goes…
    fireEvent.mouseLeave(outNode());
    expect(whites()).toHaveLength(1);
    // …and ends with it, even when the pointer is still over the clip
    fireEvent.pointerUp(outNode(), { clientX: 0, clientY: 0, pointerId: 51 });
    expect(whites()).toHaveLength(0);
    expect(lineStrokes()).toEqual(allDark);
    expect(container.querySelector('[data-quickfade-node]')).toBeTruthy(); // the pointer IS still over the clip
  });

  it('the fade handle icon always carries a white stroke around its outline — at rest, hovered and mid-drag', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            { id: 1, name: 'A', start: 0, duration: 4, selected: true },
            { id: 2, name: 'B', start: 5, duration: 4 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={vi.fn()}
        />
      </Providers>,
    );
    const check = (expected: number) => {
      const glyphs = Array.from(container.querySelectorAll('[data-fade-handle] svg'));
      expect(glyphs).toHaveLength(expected);
      for (const svg of glyphs) {
        const halo = svg.querySelector('[data-fade-glyph-halo]')!;
        const frame = svg.querySelector('[data-fade-glyph-frame]')!;
        expect(halo.getAttribute('stroke')).toBe('#FFFFFF');
        expect(halo.getAttribute('fill')).toBe('none');
        // Around the body: a 1px stroke centred half a pixel outside it
        // on every side, corners to match
        for (const edge of ['x', 'y'] as const) {
          expect(Number(halo.getAttribute(edge))).toBe(Number(frame.getAttribute(edge)) - 0.5);
        }
        for (const size of ['width', 'height'] as const) {
          expect(Number(halo.getAttribute(size))).toBe(Number(frame.getAttribute(size)) + 1);
        }
        expect(Number(halo.getAttribute('rx'))).toBe(Number(frame.getAttribute('rx')) + 0.5);
        // …and under it, so the body stays whole
        expect(halo.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    };
    check(2); // the selected clip, pointer elsewhere
    hoverClip(container, 2);
    check(4); // plus the unselected clip under the pointer
    const handle = container.querySelector('[data-fade-handle="in"][data-fade-clip="2"]') as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientX: 0, clientY: 0, pointerId: 71 });
    check(4); // mid-drag
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 0, pointerId: 71 });
  });

  it('the fade handle is drawn like the trim and stretch handles: a black body, its curve in white', () => {
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
      // A solid black body with rounded corners — 10px, so that with its
      // 1px outline it measures the stretch disc's 12px
      expect(frame.getAttribute('fill')).toBe('#000000');
      expect(frame.getAttribute('width')).toBe('10');
      expect(frame.getAttribute('height')).toBe('10');
      const halo = svg.querySelector('[data-fade-glyph-halo]')!;
      expect(Number(halo.getAttribute('width')) + Number(halo.getAttribute('stroke-width') ?? 1)).toBe(12);
      expect(Number(frame.getAttribute('rx'))).toBeGreaterThan(0);
      // The mark inside is white, and clipped to the body's rounding
      const curve = svg.querySelector('[data-fade-glyph-curve]')!;
      expect(curve.getAttribute('stroke')).toBe('#FFFFFF');
      const clip = svg.querySelector('clipPath')!;
      expect(clip.querySelector('rect')!.getAttribute('rx')).toBe(frame.getAttribute('rx'));
      expect(curve.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
      expect(frame.compareDocumentPosition(curve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      return clip.id;
    });
    // Each icon has its own clip id — a shared one would point both at the first
    expect(new Set(clipIds).size).toBe(2);
  });

  it('the fade handle wears the pressed look for the whole drag, and only the one in hand', () => {
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
    const handle = (side: 'in' | 'out') => container.querySelector(`[data-fade-handle="${side}"]`) as HTMLElement;
    expect(handle('in').className).toContain('track-fade-handle');
    expect(container.querySelector('[data-fade-handle][data-pressed]')).toBeNull();
    fireEvent.pointerDown(handle('out'), { button: 0, clientX: 0, clientY: 0, pointerId: 81 });
    expect(handle('out').getAttribute('data-pressed')).toBe('true');
    expect(handle('in').getAttribute('data-pressed')).toBeNull();
    fireEvent.mouseLeave(handle('out')); // the pointer wanders; the drag goes on
    expect(handle('out').getAttribute('data-pressed')).toBe('true');
    fireEvent.pointerUp(handle('out'), { clientX: 0, clientY: 0, pointerId: 81 });
    expect(container.querySelector('[data-fade-handle][data-pressed]')).toBeNull();
    // It grows from the middle of its visible body, which is off-centre in the box
    expect(handle('in').style.transformOrigin).toBe('11px 11px');
    expect(handle('out').style.transformOrigin).toBe('5px 11px');
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
    // …nor given the white edge: that belongs to a quick fade's curve being edited
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

  it('the shape handle enlarges under the pointer and mid-drag — and stays a plain white dot', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, fadeOut: 1 }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    hoverClip(container, 1);
    const node = (side: 'in' | 'out') => container.querySelector(`[data-quickfade-node="${side}"]`) as HTMLElement;
    const plainWhiteDot = (side: 'in' | 'out') => {
      const shapes = Array.from(node(side).querySelectorAll('svg *'));
      expect(shapes).toHaveLength(1); // one circle — no roundel inside it
      expect(shapes[0].getAttribute('fill')).toBe('#FFFFFF');
      return shapes[0].getAttribute('r');
    };
    const idleRadius = plainWhiteDot('in');
    expect(node('in').className).toContain('track-fade-shape-handle');

    // Over the clip but not on the handle: at rest
    expect(node('in').getAttribute('data-hovered')).toBeNull();

    // On the handle: flagged for the enlarge, otherwise unchanged
    fireEvent.mouseOut(container.querySelector('[data-clip-id="1"]') as HTMLElement, { relatedTarget: node('in'), buttons: 0 });
    expect(node('in').getAttribute('data-hovered')).toBe('true');
    expect(plainWhiteDot('in')).toBe(idleRadius);
    // Only the handle under the pointer
    expect(node('out').getAttribute('data-hovered')).toBeNull();

    // Held through a drag, even with the pointer off the handle…
    fireEvent.pointerDown(node('in'), { button: 0, clientX: 50, clientY: 60, pointerId: 61 });
    fireEvent.mouseLeave(node('in'));
    expect(node('in').getAttribute('data-hovered')).toBe('true');
    expect(plainWhiteDot('in')).toBe(idleRadius);
    // …and gone when it is let go away from it
    fireEvent.pointerUp(node('in'), { clientX: 900, clientY: 400, pointerId: 61 });
    expect(container.querySelector('[data-quickfade-node][data-hovered]')).toBeNull();
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

  it('a fade with no stored shape is the S-curve, its handle at the centre; a stored shape keeps its own curve', () => {
    const renderIt = (extra: Record<string, unknown>) => {
      const { container } = render(
        <Providers>
          <TrackNew
            clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, selected: true, ...extra }]}
            width={800}
            trackIndex={0}
            pixelsPerSecond={100}
            onClipFadeShapeChange={vi.fn()}
          />
        </Providers>,
      );
      hoverClip(container, 1);
      return container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    };
    // Track height 114 → body 21..113 (92 tall). Half gain = y 67; the
    // handle is 16px square, so its top is 59.
    {
      const node = renderIt({});
      expect(node.style.top).toBe('59px');
      expect(node.getAttribute('aria-valuenow')).toBe('50');
    }
    cleanup();
    {
      // A straight line also crosses half gain at the middle
      const node = renderIt({ fadeInShape: 'linear' });
      expect(node.style.top).toBe('59px');
      expect(node.getAttribute('aria-valuetext')).toBe('linear');
    }
    cleanup();
    {
      // A stored exponent keeps its curve; its handle sits at the middle
      // of it. Equal-power: gain 0.707 → y 48 → top 40
      const node = renderIt({ fadeInShape: 1 });
      expect(node.style.top).toBe('40px');
    }
  });

  it('Cmd/Ctrl+click makes the fade linear; double-click resets it to the S-curve — neither toggles', () => {
    const renderIt = (extra: Record<string, unknown>) => {
      const onClipFadeShapeChange = vi.fn();
      const onClipClick = vi.fn();
      const { container } = render(
        <Providers>
          <TrackNew
            clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, ...extra }]}
            width={800}
            trackIndex={0}
            pixelsPerSecond={100}
            onClipFadeShapeChange={onClipFadeShapeChange}
            onClipClick={onClipClick}
          />
        </Providers>,
      );
      hoverClip(container, 1);
      const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
      return { node, onClipFadeShapeChange, onClipClick };
    };
    // Whatever the fade is now, each gesture names where it ends up
    for (const extra of [{}, { fadeInShape: 'linear' }, { fadeInShape: { t: 0.2, g: 0.7 } }, { fadeInShape: 1 }]) {
      for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
        const { node, onClipFadeShapeChange, onClipClick } = renderIt(extra);
        fireEvent.pointerDown(node, { button: 0, clientX: 50, clientY: 60, pointerId: 91, ...modifier });
        // The press is not a drag: moving with it held bends nothing
        fireEvent.pointerMove(node, { clientX: 80, clientY: 30, pointerId: 91, ...modifier });
        expect(onClipFadeShapeChange).not.toHaveBeenCalled();
        fireEvent.pointerUp(node, { clientX: 50, clientY: 60, pointerId: 91, ...modifier });
        fireEvent.click(node, modifier);
        expect(onClipFadeShapeChange).toHaveBeenCalledTimes(1);
        expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 'linear');
        expect(onClipClick).not.toHaveBeenCalled(); // and the clip is not selected by it
        cleanup();
      }
      {
        const { node, onClipFadeShapeChange } = renderIt(extra);
        fireEvent.click(node);
        fireEvent.click(node);
        expect(onClipFadeShapeChange).not.toHaveBeenCalled(); // a plain click does nothing
        fireEvent.doubleClick(node);
        expect(onClipFadeShapeChange).toHaveBeenCalledTimes(1);
        expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 2); // the default S-curve
        cleanup();
      }
    }
    // A stale hover does not lose the click. The browser can deliver
    // "pointer left the clip" and the press back to back, before the
    // first has been rendered — so the press lands on a handle that is
    // about to unmount. The press itself must keep it there.
    {
      const { node, onClipFadeShapeChange } = renderIt({});
      const root = node.parentElement as HTMLElement;
      const clipEl = root.querySelector('[data-clip-id="1"]') as HTMLElement;
      act(() => {
        fireEvent.mouseLeave(clipEl);
        fireEvent.pointerDown(node, { button: 0, clientX: 50, clientY: 60, pointerId: 92, metaKey: true });
      });
      expect(root.querySelector('[data-quickfade-node="in"]')).toBe(node); // still mounted, the same element
      fireEvent.click(node, { metaKey: true });
      expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 'linear');
      cleanup();
    }
    // Two quick Cmd+clicks stay linear — the double-click they add up to is not a reset
    const { node, onClipFadeShapeChange } = renderIt({});
    fireEvent.click(node, { metaKey: true });
    fireEvent.click(node, { metaKey: true });
    fireEvent.doubleClick(node, { metaKey: true });
    expect(onClipFadeShapeChange.mock.calls.map((c) => c[2])).toEqual(['linear', 'linear']);
  });

  it('the fade handles sit inside the clip: 10px in from its edge, on the trim handle\'s line', () => {
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
    const clip = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    const clipLeft = parseInt(clip.style.left, 10);
    const clipRight = clipLeft + 400;
    const box = (side: 'in' | 'out') => {
      const el = container.querySelector(`[data-fade-handle="${side}"]`) as HTMLElement;
      return { left: parseInt(el.style.left, 10), top: parseInt(el.style.top, 10) };
    };
    // No fade yet: each handle is at its corner. The body is the 10px
    // at the far side of the 16px box — [6, 16] for 'in', [0, 10] mirrored
    expect(box('in').left + 6 - clipLeft).toBe(10);
    expect(clipRight - (box('out').left + 10)).toBe(10);
    // The body's middle (11px down the box) is 38px below the clip's
    // top — the middle of the trim handle (top 28, 20 tall)
    expect(box('in').top + 11).toBe(38);
    expect(box('out').top).toBe(box('in').top);
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
