import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ResizablePanel } from '../ResizablePanel';

afterEach(cleanup);

const getRoot = (container: HTMLElement) =>
  container.querySelector('.resizable-panel') as HTMLElement;

/** Wheel steps after the first in a frame are coalesced to the next
 *  animation frame (2026-10-08); tests that fire several wait for it */
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

describe('ResizablePanel wheel resize (Cmd/Ctrl+scroll)', () => {
  it('Cmd+scroll up grows the panel and reports the height', () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Resistance: 0.5 sensitivity, capped at 24px per event — deltaY -50
    // would be +25, capped to +24.
    fireEvent.wheel(getRoot(container), { deltaY: -50, metaKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(138, 'wheel');
    expect(getRoot(container).style.height).toBe('138px');
  });

  it('accumulates sub-pixel deltas across gentle trackpad events', async () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Each event contributes 0.5px — the first rounds to +1 at once,
    // then the remainder carries through the coalesced frame so four
    // events land at +2 total.
    for (let i = 0; i < 4; i++) {
      fireEvent.wheel(getRoot(container), { deltaY: -1, metaKey: true });
    }
    expect(onHeightChange).toHaveBeenLastCalledWith(115, 'wheel');
    await frame();
    expect(onHeightChange).toHaveBeenLastCalledWith(116, 'wheel');
  });

  it('scroll without Cmd/Ctrl does nothing (list scrolling stays untouched)', () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    fireEvent.wheel(getRoot(container), { deltaY: -50 });
    fireEvent.wheel(getRoot(container), { deltaY: -50, altKey: true });
    fireEvent.wheel(getRoot(container), { deltaY: -50, shiftKey: true });
    expect(onHeightChange).not.toHaveBeenCalled();
    expect(getRoot(container).style.height).toBe('114px');
  });

  it("Cmd/Ctrl+SHIFT+wheel resizes too and reports 'wheel-shift' (the every-track form, 2026-10-08) — from the X axis as well, since Shift turns a wheel horizontal", async () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    fireEvent.wheel(getRoot(container), { deltaY: -50, metaKey: true, shiftKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(138, 'wheel-shift');
    fireEvent.wheel(getRoot(container), { deltaY: 0, deltaX: -20, ctrlKey: true, shiftKey: true });
    await frame();
    expect(onHeightChange).toHaveBeenLastCalledWith(148, 'wheel-shift');
  });

  it('without wheelResize the wheel is ignored entirely', () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    fireEvent.wheel(getRoot(container), { deltaY: -50, metaKey: true });
    expect(onHeightChange).not.toHaveBeenCalled();
  });

  it('no detent: every height between the limits is reachable (2026-10-08, the snap points are gone)', async () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Shrinking from 114 by 10 (20 × 0.5) lands at 104 — and stays there
    // (it used to step over a 71–112 "forbidden" band to 71)
    fireEvent.wheel(getRoot(container), { deltaY: 20, ctrlKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(104, 'wheel');
    fireEvent.wheel(getRoot(container), { deltaY: 20, ctrlKey: true });
    await frame();
    expect(onHeightChange).toHaveBeenLastCalledWith(94, 'wheel');
  });

  it('clamps at minHeight', async () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={71} minHeight={44} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Per-event cap is 24px: 71 → 47 → clamped at 44, and further scrolls
    // stay pinned there.
    fireEvent.wheel(getRoot(container), { deltaY: 500, metaKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(47, 'wheel');
    fireEvent.wheel(getRoot(container), { deltaY: 500, metaKey: true });
    await frame();
    expect(onHeightChange).toHaveBeenLastCalledWith(44, 'wheel');
    await frame();
    fireEvent.wheel(getRoot(container), { deltaY: 500, metaKey: true });
    await frame();
    expect(onHeightChange).toHaveBeenLastCalledWith(44, 'wheel');
    expect(getRoot(container).style.height).toBe('44px');
  });

  it('adopts an external height change (Fit to Height) outside a gesture', () => {
    const { container, rerender } = render(
      <ResizablePanel initialHeight={114} wheelResize>
        <div>content</div>
      </ResizablePanel>,
    );
    expect(getRoot(container).style.height).toBe('114px');
    rerender(
      <ResizablePanel initialHeight={200} wheelResize>
        <div>content</div>
      </ResizablePanel>,
    );
    expect(getRoot(container).style.height).toBe('200px');
  });
});

describe('ResizablePanel drag resize — a track stays where it is let go', () => {
  it('releasing inside the old 71–112 band, or near the mount height, commits the released height — no spring, no snap (2026-10-08)', () => {
    const onResizeEnd = vi.fn();
    // As the app does: the released height is dispatched and comes back
    // as the live initialHeight (the panel re-adopts the prop after a
    // gesture, so a host that never updated it would pull it back)
    function Host() {
      const [h, setH] = React.useState(114);
      return (
        <ResizablePanel initialHeight={h} minHeight={44} onResizeEnd={(next) => { onResizeEnd(next); setH(next); }}>
          <div>content</div>
        </ResizablePanel>
      );
    }
    const { container } = render(<Host />);
    const content = container.querySelector('.resizable-panel__content') as HTMLElement;
    content.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: 114, right: 268, width: 268, height: 114, x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.mouseDown(content, { clientY: 113 });
    fireEvent.mouseMove(document, { clientY: 113 - 24 }); // 90: inside the old band
    fireEvent.mouseUp(document, { clientY: 113 - 24 });
    expect(onResizeEnd).toHaveBeenCalledWith(90);
    expect(getRoot(container).style.height).toBe('90px');
    // And near the mount height: 108 stays 108 (it used to spring home to
    // 114 from within 18px; the soft magnet reaches only 4 — see below)
    content.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: 90, right: 268, width: 268, height: 90, x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.mouseDown(content, { clientY: 89 });
    fireEvent.mouseMove(document, { clientY: 89 + 18 });
    fireEvent.mouseUp(document, { clientY: 89 + 18 });
    expect(onResizeEnd).toHaveBeenLastCalledWith(108);
    expect(getRoot(container).style.height).toBe('108px');
  });
});

describe('ResizablePanel drag resize — the soft magnet at the default height', () => {
  const drag = (snapHeight?: number | null) => {
    const heights: number[] = [];
    const { container } = render(
      <ResizablePanel initialHeight={130} minHeight={44} snapHeight={snapHeight} onHeightChange={(h) => heights.push(h)}>
        <div>content</div>
      </ResizablePanel>,
    );
    const content = container.querySelector('.resizable-panel__content') as HTMLElement;
    content.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: 130, right: 268, width: 268, height: 130, x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.mouseDown(content, { clientY: 129 });
    const at = (h: number) => { fireEvent.mouseMove(document, { clientY: 129 + (h - 130) }); return heights[heights.length - 1]; };
    return { at, end: () => fireEvent.mouseUp(document, { clientY: 0 }) };
  };

  it('within 4px of 114 the drag sticks to 114; outside it follows the cursor exactly (2026-10-08, "very soft snapping… passes its default size")', () => {
    const { at, end } = drag();
    expect(at(120)).toBe(120);
    expect(at(118)).toBe(114); // 4 away: caught
    expect(at(116)).toBe(114);
    expect(at(114)).toBe(114);
    expect(at(111)).toBe(114);
    expect(at(110)).toBe(114); // 4 away: still caught
    expect(at(109)).toBe(109); // 5 away: free
    expect(at(90)).toBe(90);
    expect(at(112)).toBe(114); // and on the way back
    end();
  });

  it('snapHeight null: no magnet at all', () => {
    const { at, end } = drag(null);
    expect(at(116)).toBe(116);
    expect(at(113)).toBe(113);
    end();
  });
});

describe('ResizablePanel drag resize — listeners survive mid-drag re-renders', () => {
  const startDrag = (container: HTMLElement, height: number) => {
    const content = container.querySelector('.resizable-panel__content') as HTMLElement;
    // The resize zone is the bottom `resizeThreshold` px. jsdom reports a
    // zero rect, so clientY is measured from a top of 0 — a press at
    // `height - 1` lands inside the bottom zone.
    content.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: height, right: 268,
      width: 268, height, x: 0, y: 0, toJSON: () => ({}),
    });
    fireEvent.mouseDown(content, { clientY: height - 1 });
  };

  it('does NOT re-bind its document listeners when the parent re-renders mid-drag', () => {
    // THE regression. TrackControlSidePanel passes inline arrows, so
    // every reported height re-renders the parent and mints fresh
    // callbacks. While those were effect deps, each mousemove tore the
    // document listeners down and bound new ones; a real mouseup landing
    // in that window was dropped, isResizing stayed true, and the track
    // kept following the cursor after release.
    //
    // The race itself needs a real event loop — jsdom's fireEvent is
    // synchronous, so the listener is always back before the next event.
    // What IS testable, and what actually changed, is the binding
    // discipline: the listeners must bind once per GESTURE, not per
    // render. See CLAUDE.md, "Ref-mirror for document listeners".
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    function Host() {
      const [h, setH] = React.useState(114);
      return (
        <ResizablePanel
          initialHeight={114}
          onHeightChange={(next) => setH(next)} // NEW identity every render, deliberately
          onResizeEnd={() => {}}
        >
          <div>{h}</div>
        </ResizablePanel>
      );
    }

    const { container } = render(<Host />);
    startDrag(container, 114);

    const countMouseUp = (spy: typeof addSpy) =>
      spy.mock.calls.filter(([type]) => type === 'mouseup').length;
    const boundAfterStart = countMouseUp(addSpy);
    expect(boundAfterStart).toBe(1); // the gesture bound its listener

    // Three moves, each re-rendering the host with fresh callbacks.
    fireEvent.mouseMove(document, { clientY: 130 });
    fireEvent.mouseMove(document, { clientY: 150 });
    fireEvent.mouseMove(document, { clientY: 170 });

    // The listener that is waiting for mouseup must be the SAME one.
    expect(countMouseUp(addSpy)).toBe(boundAfterStart);
    expect(countMouseUp(removeSpy)).toBe(0);

    fireEvent.mouseUp(document, { clientY: 170 });
    expect(countMouseUp(removeSpy)).toBe(1); // and it unbinds once, at the end

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('keeps clamping to the LATEST minHeight when it changes mid-drag', () => {
    // The clamp is read through the ref-mirror, so a prop that changes
    // during the gesture still applies without re-binding listeners.
    const heights: number[] = [];
    const { container, rerender } = render(
      <ResizablePanel initialHeight={114} minHeight={44} onHeightChange={(h) => heights.push(h)}>
        <div>content</div>
      </ResizablePanel>,
    );
    startDrag(container, 114);
    rerender(
      <ResizablePanel initialHeight={114} minHeight={100} onHeightChange={(h) => heights.push(h)}>
        <div>content</div>
      </ResizablePanel>,
    );
    fireEvent.mouseMove(document, { clientY: -500 });
    expect(heights[heights.length - 1]).toBe(100);
    fireEvent.mouseUp(document, { clientY: -500 });
  });
});

describe('ResizablePanel — the resize edge claims the press', () => {
  // A press on the bottom edge used to do TWO things: ResizablePanel
  // started a resize, and the track panel nested inside it started a
  // drag-reorder, so resizing a track also moved it up and down.
  // handleMouseDown already called stopPropagation, but as an ANCESTOR
  // in the bubble phase it ran after the descendant. It captures now.
  const renderWithChild = (onChildMouseDown: () => void) =>
    render(
      <ResizablePanel initialHeight={114} resizeThreshold={8}>
        <div data-testid="child" onMouseDown={onChildMouseDown} style={{ height: '100%' }}>
          track content
        </div>
      </ResizablePanel>,
    );

  const stubRect = (container: HTMLElement, height: number) => {
    const content = container.querySelector('.resizable-panel__content') as HTMLElement;
    content.getBoundingClientRect = () => ({
      top: 0, left: 0, bottom: height, right: 268,
      width: 268, height, x: 0, y: 0, toJSON: () => ({}),
    });
    return content;
  };

  it('a press on the bottom resize edge never reaches the content below it', () => {
    const childMouseDown = vi.fn();
    const { container, getByTestId } = renderWithChild(childMouseDown);
    stubRect(container, 114);
    // 113 is inside the bottom 8px zone. Fired on the CHILD, as a real
    // press is — the deepest element under the cursor is the target.
    fireEvent.mouseDown(getByTestId('child'), { clientY: 113 });
    expect(childMouseDown).not.toHaveBeenCalled();
    fireEvent.mouseUp(document, { clientY: 113 });
  });

  it('a press on the row body still reaches it', () => {
    const childMouseDown = vi.fn();
    const { container, getByTestId } = renderWithChild(childMouseDown);
    stubRect(container, 114);
    fireEvent.mouseDown(getByTestId('child'), { clientY: 57 });
    expect(childMouseDown).toHaveBeenCalledTimes(1);
  });
});

describe('createFrameCoalescer (2026-10-08, the trackpad judder)', () => {
  it('applies the first step at once, folds the rest of the frame into one, and keeps one-per-frame through a stream', async () => {
    const { createFrameCoalescer } = await import('../ResizablePanel');
    const applied: Array<[number, string]> = [];
    const c = createFrameCoalescer<string>((step, meta) => applied.push([step, meta]));
    c.push(1, 'a');
    c.push(2, 'b');
    c.push(3, 'c');
    expect(applied).toEqual([[1, 'a']]); // leading edge
    await frame();
    expect(applied).toEqual([[1, 'a'], [5, 'c']]); // the rest, together, with the latest meta
    c.push(4, 'd'); // a frame is still pending after a non-empty flush: coalesced again
    await frame();
    expect(applied[applied.length - 1]).toEqual([4, 'd']);
    await frame(); // an empty frame ends the stream
    c.push(7, 'e');
    expect(applied[applied.length - 1]).toEqual([7, 'e']); // leading again
    c.cancel();
  });
});
