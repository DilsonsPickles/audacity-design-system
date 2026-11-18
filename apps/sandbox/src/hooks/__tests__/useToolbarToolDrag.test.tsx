import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, cleanup, fireEvent, act } from '@testing-library/react';
import type React from 'react';
import type { ToolbarLayout } from '@audacity-ui/components';
import { useToolbarToolDrag } from '../useToolbarToolDrag';

afterEach(cleanup);

const LAYOUT: ToolbarLayout = { top: [[{ id: 'main', tools: ['play', 'stop'] }]], bottom: [], left: [], right: [] };
const RECT = { left: 100, top: 100, width: 28, height: 28, right: 128, bottom: 128, x: 100, y: 100, toJSON: () => ({}) } as DOMRect;

function drag(x: number, y: number, opts: { from?: string; toolId?: string; intoOnly?: (id: string) => boolean } = {}) {
  const onRemove = vi.fn();
  const onMoveInto = vi.fn();
  const onMoveToNewBar = vi.fn();
  const { result } = renderHook(() => useToolbarToolDrag({
    layout: LAYOUT, toolFitsVertical: () => true, onMoveInto, onMoveToNewBar, onRemove, intoOnly: opts.intoOnly,
  }));
  act(() => {
    result.current.onToolMouseDown(opts.toolId ?? 'stop', opts.from ?? 'main', { button: 0, clientX: 110, clientY: 110 } as React.MouseEvent, RECT);
  });
  act(() => { fireEvent.mouseMove(document, { clientX: x, clientY: y }); });
  act(() => { fireEvent.mouseUp(document, { clientX: x, clientY: y }); });
  return { onRemove, onMoveInto, onMoveToNewBar };
}

describe('useToolbarToolDrag — OUT OF THE WINDOW IS OFF THE TOOLBARS (2026-11-18)', () => {
  it('a release past the window\'s top edge removes the tool, where the edge snap would have docked it', () => {
    const out = drag(300, -20);
    expect(out.onRemove).toHaveBeenCalledWith('stop');
    expect(out.onMoveToNewBar).not.toHaveBeenCalled();
    // just inside the edge: the top dock's snap, as before
    const inside = drag(300, 10);
    expect(inside.onRemove).not.toHaveBeenCalled();
    expect(inside.onMoveToNewBar).toHaveBeenCalled();
  });

  it('past any edge — left, right, bottom — likewise', () => {
    expect(drag(-5, 300).onRemove).toHaveBeenCalledWith('stop');
    expect(drag(window.innerWidth + 5, 300).onRemove).toHaveBeenCalledWith('stop');
    expect(drag(300, window.innerHeight + 5).onRemove).toHaveBeenCalledWith('stop');
  });
});

describe('useToolbarToolDrag — A DRAG OUT OF THE TOOL BANK (2026-11-18)', () => {
  it('released over no toolbar it moves nothing: the bank is where it came from, not a removal', () => {
    const out = drag(300, -20, { from: '', toolId: 'record' });
    expect(out.onRemove).not.toHaveBeenCalled();
    expect(out.onMoveInto).not.toHaveBeenCalled();
    expect(out.onMoveToNewBar).not.toHaveBeenCalled();
  });

  it('a tool from the bank still docks (the edge snap makes it a toolbar of its own)', () => {
    expect(drag(300, 10, { from: '', toolId: 'record' }).onMoveToNewBar).toHaveBeenCalledWith('record', expect.anything());
  });

  it('a separator or a space from the bank goes INTO a toolbar only: a new toolbar is refused', () => {
    const out = drag(300, 10, { from: '', toolId: 'bank-separator', intoOnly: (id) => id === 'bank-separator' });
    expect(out.onMoveToNewBar).not.toHaveBeenCalled();
    expect(out.onRemove).not.toHaveBeenCalled();
  });
});
