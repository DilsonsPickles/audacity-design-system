// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { useMarqueeSelection, isMarqueeTrigger } from '../useMarqueeSelection';
import type { Track } from '../../contexts/TracksContext';

afterEach(cleanup);

const tracks = [
  { id: 1, name: 'A', clips: [{ id: 1, name: 'c1', start: 1, duration: 2, envelopePoints: [] }] },
] as unknown as Track[];

function Harness({ onCommit, onStart, onState }: {
  onCommit: (picks: unknown[], mods: unknown) => void;
  onStart: (mods: unknown) => void;
  onState: (s: { isMarqueeing: boolean; wasMarqueeing: () => boolean }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const m = useMarqueeSelection({
    containerRef: ref,
    tracks,
    pixelsPerSecond: 100,
    clipContentOffset: 0,
    topGap: 0,
    trackGap: 0,
    defaultTrackHeight: 100,
    onSelectionCommit: onCommit,
    onMarqueeStart: onStart,
  });
  React.useEffect(() => { onState({ isMarqueeing: m.isMarqueeing, wasMarqueeing: m.wasMarqueeing }); });
  return <div ref={ref} data-testid="canvas" onMouseDownCapture={m.onMouseDownCapture} style={{ width: 1000, height: 200 }} />;
}

function setUp() {
  const onCommit = vi.fn();
  const onStart = vi.fn();
  let state!: { isMarqueeing: boolean; wasMarqueeing: () => boolean };
  const { container } = render(<Harness onCommit={onCommit} onStart={onStart} onState={(s) => { state = s; }} />);
  const el = container.querySelector('[data-testid="canvas"]') as HTMLElement;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 1000, height: 200, right: 1000, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
  });
  return { el, onCommit, onStart, state: () => state };
}

describe('what starts a marquee (2026-09-30)', () => {
  it('the right button, or Cmd/Ctrl with the left', () => {
    expect(isMarqueeTrigger({ button: 2, metaKey: false, ctrlKey: false })).toBe(true);
    expect(isMarqueeTrigger({ button: 0, metaKey: true, ctrlKey: false })).toBe(true);
    expect(isMarqueeTrigger({ button: 0, metaKey: false, ctrlKey: true })).toBe(true);
    expect(isMarqueeTrigger({ button: 0, metaKey: false, ctrlKey: false })).toBe(false);
    expect(isMarqueeTrigger({ button: 1, metaKey: true, ctrlKey: false })).toBe(false);
  });

  it('a Cmd+left drag draws the marquee and commits what it covers on the LEFT button coming up', () => {
    const { el, onCommit, onStart, state } = setUp();
    act(() => { fireEvent.mouseDown(el, { button: 0, metaKey: true, clientX: 50, clientY: 10 }); });
    expect(state().isMarqueeing).toBe(false); // nothing until it moves
    act(() => { fireEvent.mouseMove(document, { clientX: 350, clientY: 90, metaKey: true }); });
    expect(state().isMarqueeing).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);
    // A right-button release mid-drag is not this drag's end
    act(() => { fireEvent.mouseUp(document, { button: 2 }); });
    expect(state().isMarqueeing).toBe(true);
    act(() => { fireEvent.mouseUp(document, { button: 0, metaKey: true }); });
    expect(state().isMarqueeing).toBe(false);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toEqual([{ trackIndex: 0, clipId: 1 }]);
    expect(state().wasMarqueeing()).toBe(true); // the click that follows is not a click
  });

  it('a Cmd+click that never moves is still a click: no marquee, nothing committed', () => {
    const { el, onCommit, onStart, state } = setUp();
    act(() => { fireEvent.mouseDown(el, { button: 0, metaKey: true, clientX: 50, clientY: 10 }); });
    act(() => { fireEvent.mouseMove(document, { clientX: 52, clientY: 11, metaKey: true }); });
    act(() => { fireEvent.mouseUp(document, { button: 0, metaKey: true }); });
    expect(onStart).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(state().wasMarqueeing()).toBe(false);
  });

  it('a plain left drag is not a marquee', () => {
    const { el, onCommit, state } = setUp();
    act(() => { fireEvent.mouseDown(el, { button: 0, clientX: 50, clientY: 10 }); });
    act(() => { fireEvent.mouseMove(document, { clientX: 350, clientY: 90 }); });
    expect(state().isMarqueeing).toBe(false);
    act(() => { fireEvent.mouseUp(document, { button: 0 }); });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('the right-drag marquee is as it was', () => {
    const { el, onCommit, state } = setUp();
    act(() => { fireEvent.mouseDown(el, { button: 2, clientX: 50, clientY: 10 }); });
    act(() => { fireEvent.mouseMove(document, { clientX: 350, clientY: 90 }); });
    expect(state().isMarqueeing).toBe(true);
    act(() => { fireEvent.mouseUp(document, { button: 2 }); });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
