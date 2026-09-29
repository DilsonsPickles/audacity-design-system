import { render, fireEvent, cleanup, act } from '@testing-library/react';
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
    expect(container.querySelectorAll('[data-fade-handle][data-fade-clip="1"]')).toHaveLength(2);
    expect(container.querySelector('[data-fade-handle][data-fade-clip="2"]')).toBeNull();
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
    // The default is the S-curve: midpoint gain 0.5. Track height 114 →
    // bodyHeight 92. Drag UP 19px → gain ≈ 0.7065 → shape =
    // ln(g)/ln(0.7071) ≈ 1, the equal-power curve.
    fireEvent.pointerDown(node, { button: 0, clientX: 62, clientY: 67, pointerId: 6 });
    fireEvent.pointerMove(node, { clientX: 62, clientY: 48, pointerId: 6 });
    expect(onClipFadeShapeChange).toHaveBeenCalledTimes(1);
    const [clipId, side, shape] = onClipFadeShapeChange.mock.calls[0];
    expect(clipId).toBe(1);
    expect(side).toBe('in');
    expect(shape).toBeCloseTo(1, 1);
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

  it('a fade with no stored shape is the S-curve: its node rests at half gain, and double-click toggles linear', () => {
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
      const node = container.querySelector('[data-quickfade-node="in"]') as HTMLElement;
      return { node, onClipFadeShapeChange };
    };
    // Track height 114 → body 21..113 (92 tall). Half gain = y 67; the
    // node is 16px square, so its top is 59.
    {
      const { node, onClipFadeShapeChange } = renderIt({});
      expect(node.style.top).toBe('59px');
      expect(node.getAttribute('aria-valuenow')).toBe('2');
      fireEvent.doubleClick(node);
      expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 'linear');
    }
    cleanup();
    {
      // A straight line also crosses half gain at the middle; a second
      // double-click hands back the S-curve, not equal-power
      const { node, onClipFadeShapeChange } = renderIt({ fadeInShape: 'linear' });
      expect(node.style.top).toBe('59px');
      fireEvent.doubleClick(node);
      expect(onClipFadeShapeChange).toHaveBeenLastCalledWith(1, 'in', 2);
    }
    cleanup();
    {
      // Equal-power, when chosen, sits higher: gain 0.707 → y 48 → top 40
      const { node } = renderIt({ fadeInShape: 1 });
      expect(node.style.top).toBe('40px');
    }
  });

  it('the midpoint node bends the curve in BOTH axes; the extent never moves', () => {
    // Fade-in 1s @100px/s → region 0..100px; the dot rests at t = 0.5,
    // at half gain (the default S-curve).
    // Vertical drag: gain 0.5 → 0.707 at t = 0.5 solves shape = 1.
    // Horizontal drag: t 0.5 → 0.6 at gain 0.5 solves
    // ln(0.5)/ln(sin(0.6·π/2)) ≈ 3.27. Neither touches the extent.
    const renderIt = () => {
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
      const lastShape = () => onClipFadeShapeChange.mock.calls[onClipFadeShapeChange.mock.calls.length - 1][2];
      return { node, onClipFadeChange, lastShape };
    };

    {
      const { node, onClipFadeChange, lastShape } = renderIt();
      fireEvent.pointerDown(node, { button: 0, clientX: 62, clientY: 67, pointerId: 8 });
      fireEvent.pointerMove(node, { clientX: 62, clientY: 48, pointerId: 8 }); // straight up
      expect(onClipFadeChange).not.toHaveBeenCalled();
      expect(lastShape()).toBeCloseTo(1, 1);
      fireEvent.pointerUp(node, { pointerId: 8 });
    }
    cleanup();
    {
      const { node, onClipFadeChange, lastShape } = renderIt();
      const restLeft = node.style.left;
      fireEvent.pointerDown(node, { button: 0, clientX: 62, clientY: 48, pointerId: 9 });
      // The dot's mid-drag position is state set from a native listener,
      // flushed after the event — act() lets the DOM catch up.
      act(() => { fireEvent.pointerMove(node, { clientX: 72, clientY: 48, pointerId: 9 }); }); // 10px right = t 0.5 → 0.6
      expect(onClipFadeChange).not.toHaveBeenCalled(); // extent pinned
      expect(lastShape()).toBeCloseTo(3.27, 1);
      expect(node.style.left).not.toBe(restLeft); // the dot follows the pointer mid-drag…
      act(() => { fireEvent.pointerUp(node, { pointerId: 9 }); });
      expect(node.style.left).toBe(restLeft); // …and re-centres (t = 0.5) on release
    }
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
