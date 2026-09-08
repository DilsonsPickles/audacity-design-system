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
