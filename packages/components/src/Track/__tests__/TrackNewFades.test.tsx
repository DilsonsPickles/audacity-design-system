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
    const fadeInOverlay = container.querySelector<HTMLElement>('[data-fade-overlay="in"]');
    const fadeOutOverlay = container.querySelector<HTMLElement>('[data-fade-overlay="out"]');
    expect(fadeInOverlay).toBeTruthy();
    expect(fadeOutOverlay).toBeTruthy();
    expect(fadeInOverlay!.style.width).toBe('100px');
    expect(fadeOutOverlay!.style.width).toBe('50px');
  });

  it('handles show for the SELECTED clip only', () => {
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
    const clip1 = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    const clip2 = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    expect(clip1.querySelectorAll('[data-fade-handle]')).toHaveLength(2);
    expect(clip2.querySelector('[data-fade-handle]')).toBeNull();
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
    const clip1 = container.querySelector('[data-clip-id="1"]') as HTMLElement;
    const clip2 = container.querySelector('[data-clip-id="2"]') as HTMLElement;
    // A's tail and B's head belong to the crossfade — node owns them
    expect(clip1.querySelector('[data-fade-handle="in"]')).toBeTruthy();
    expect(clip1.querySelector('[data-fade-handle="out"]')).toBeNull();
    expect(clip2.querySelector('[data-fade-handle="in"]')).toBeNull();
    expect(clip2.querySelector('[data-fade-handle="out"]')).toBeTruthy();
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

  it('a selected clip with a quick fade shows a shape node; vertical drag bows the curve', () => {
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
    const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    expect(node).toBeTruthy();
    // midpoint gain = cos(π/4) ≈ 0.7071; track height 114 → bodyHeight 92.
    // Drag DOWN 19px → gain ≈ 0.5006 → shape = ln(g)/ln(0.7071) ≈ 2
    fireEvent.pointerDown(node, { button: 0, clientX: 62, clientY: 48, pointerId: 6 });
    fireEvent.pointerMove(node, { clientX: 62, clientY: 67, pointerId: 6 });
    expect(onClipFadeShapeChange).toHaveBeenCalledTimes(1);
    const [clipId, side, shape] = onClipFadeShapeChange.mock.calls[0];
    expect(clipId).toBe(1);
    expect(side).toBe('in');
    expect(shape).toBeCloseTo(2, 1);
    fireEvent.pointerUp(node, { pointerId: 6 });
  });

  it('no quick-fade shape node on unselected clips or crossfaded edges', () => {
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[
            // selected but its OUT edge is crossfaded → no node there
            { id: 1, name: 'A', start: 0, duration: 5, fadeOut: 1, selected: true },
            // unselected → no node despite the fade
            { id: 2, name: 'B', start: 3, duration: 4, fadeIn: 1 },
          ]}
          width={1200}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeShapeChange={vi.fn()}
        />
      </Providers>,
    );
    expect(container.querySelector('[data-quickfade-node]')).toBeNull();
  });

  it('the corner handle edits both axes: horizontal extent + vertical shape', () => {
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
    // diagonal: +150px extent, +19px down → fade 1.5s, shape ≈ 2
    fireEvent.pointerMove(inHandle, { clientX: 150, clientY: 49, pointerId: 7 });
    expect(onClipFadeChange).toHaveBeenLastCalledWith(1, 'in', 1.5);
    const [, , shape] = onClipFadeShapeChange.mock.calls[onClipFadeShapeChange.mock.calls.length - 1];
    expect(shape).toBeCloseTo(2, 1);
    fireEvent.pointerUp(inHandle, { pointerId: 7 });
  });

  it('the midpoint node is Y-axis only: shape changes, extent untouched', () => {
    const onClipFadeChange = vi.fn();
    const onClipFadeShapeChange = vi.fn();
    const { container } = render(
      <Providers>
        <TrackNew
          clips={[{ id: 1, name: 'A', start: 0, duration: 4, fadeIn: 1, selected: true }]}
          width={800}
          trackIndex={0}
          pixelsPerSecond={100}
          onClipFadeChange={onClipFadeChange}
          onClipFadeShapeChange={onClipFadeShapeChange}
        />
      </Providers>,
    );
    const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
    fireEvent.pointerDown(node, { button: 0, clientX: 62, clientY: 48, pointerId: 8 });
    // diagonal input: only the vertical component registers (shape ≈ 2)
    fireEvent.pointerMove(node, { clientX: 112, clientY: 67, pointerId: 8 });
    expect(onClipFadeChange).not.toHaveBeenCalled();
    const [, , shape] = onClipFadeShapeChange.mock.calls[onClipFadeShapeChange.mock.calls.length - 1];
    expect(shape).toBeCloseTo(2, 1);
    fireEvent.pointerUp(node, { pointerId: 8 });
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
