import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ResizablePanel } from '../ResizablePanel';

afterEach(cleanup);

const getRoot = (container: HTMLElement) =>
  container.querySelector('.resizable-panel') as HTMLElement;

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
    expect(onHeightChange).toHaveBeenLastCalledWith(138);
    expect(getRoot(container).style.height).toBe('138px');
  });

  it('accumulates sub-pixel deltas across gentle trackpad events', () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Each event contributes 0.5px — the first rounds to +1, then the
    // remainder carries so four events land at +2 total.
    for (let i = 0; i < 4; i++) {
      fireEvent.wheel(getRoot(container), { deltaY: -1, metaKey: true });
    }
    expect(onHeightChange).toHaveBeenLastCalledWith(116);
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
    fireEvent.wheel(getRoot(container), { deltaY: -50, metaKey: true, shiftKey: true });
    expect(onHeightChange).not.toHaveBeenCalled();
    expect(getRoot(container).style.height).toBe('114px');
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

  it('steps over the forbidden 71-112 band like a detent, both directions', () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={114} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Shrinking from 114 by 10 (20 × 0.5) lands at 104 — in the band → 71.
    fireEvent.wheel(getRoot(container), { deltaY: 20, ctrlKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(71);
    // Growing from 71 by 5 (10 × 0.5) lands at 76 — in the band → 112.
    fireEvent.wheel(getRoot(container), { deltaY: -10, ctrlKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(112);
  });

  it('clamps at minHeight', () => {
    const onHeightChange = vi.fn();
    const { container } = render(
      <ResizablePanel initialHeight={71} minHeight={44} wheelResize onHeightChange={onHeightChange}>
        <div>content</div>
      </ResizablePanel>,
    );
    // Per-event cap is 24px: 71 → 47 → clamped at 44, and further scrolls
    // stay pinned there.
    fireEvent.wheel(getRoot(container), { deltaY: 500, metaKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(47);
    fireEvent.wheel(getRoot(container), { deltaY: 500, metaKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(44);
    fireEvent.wheel(getRoot(container), { deltaY: 500, metaKey: true });
    expect(onHeightChange).toHaveBeenLastCalledWith(44);
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
