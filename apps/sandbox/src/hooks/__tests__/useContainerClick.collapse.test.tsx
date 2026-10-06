import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useContainerClick } from '../useContainerClick';
import type { Track, TracksAction, TimeSelection } from '../../contexts/TracksContext';

const tracks = [
  { id: 1, name: 'A', clips: [] },
  { id: 2, name: 'B', clips: [] },
  { id: 3, name: 'C', clips: [] },
] as unknown as Track[];

function setup(timeSelection: TimeSelection | null, laneClickBehavior: 'playhead-only' | 'select-track' | 'select-and-collapse', selectedTrackIndices: number[], alignTime?: (t: number) => number | null) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000, x: 0, y: 0, toJSON: () => ({}) }),
  });
  const dispatch = vi.fn<(a: TracksAction) => void>();
  const { result } = renderHook(() => useContainerClick({
    containerRef: { current: container },
    tracks,
    containerPropsOnClick: undefined,
    selectionWasJustDragging: () => false,
    pixelsPerSecond: 100,
    dispatch,
    TOP_GAP: 0,
    TRACK_GAP: 0,
    DEFAULT_TRACK_HEIGHT: 100,
    selectedTrackIndices,
    selectionAnchor: null,
    setSelectionAnchor: () => {},
    timeSelection,
    laneClickBehavior,
    alignTime,
  }));
  const click = (trackIndex: number, detail = 1) => result.current({
    clientX: 300, clientY: trackIndex * 100 + 50, metaKey: false, ctrlKey: false, shiftKey: false, detail,
    target: container, preventDefault: () => {},
  } as unknown as React.MouseEvent<HTMLDivElement>);
  const types = () => dispatch.mock.calls.map(([a]) => a.type);
  return { click, dispatch, types };
}

const range: TimeSelection = { startTime: 1, endTime: 3, tracks: [0, 1] } as TimeSelection;

describe('a plain lane click clears the time selection, wherever it lands (2026-10-07)', () => {
  it('inside the selection\'s rows: the range goes, the track is selected, the playhead parks', () => {
    const { click, dispatch, types } = setup(range, 'select-and-collapse', [0, 1]);
    click(1);
    expect(types()).toContain('SET_TIME_SELECTION');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TIME_SELECTION', payload: null });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_TRACKS', payload: [1] });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYHEAD_POSITION', payload: expect.any(Number) });
  });

  it('outside the rows: the same', () => {
    const { click, dispatch } = setup(range, 'select-and-collapse', [0, 1]);
    click(2);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TIME_SELECTION', payload: null });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED_TRACKS', payload: [2] });
  });

  it('playhead-only still clears the range; it just selects no track', () => {
    const { click, dispatch, types } = setup(range, 'playhead-only', [0, 1]);
    click(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TIME_SELECTION', payload: null });
    expect(types()).not.toContain('SET_SELECTED_TRACKS');
  });

  it('only a SINGLE click clears: the later clicks of a double or triple click leave the range the dblclick made', () => {
    const { click, types } = setup(range, 'select-and-collapse', [0, 1]);
    click(1, 2);
    click(1, 3);
    expect(types()).not.toContain('SET_TIME_SELECTION');
  });

  it('with no range there is nothing to clear', () => {
    const { click, types } = setup(null, 'select-and-collapse', []);
    click(0);
    expect(types()).not.toContain('SET_TIME_SELECTION');
  });
});

describe('a plain lane click parks the playhead on a clip edge within reach (2026-10-07)', () => {
  it('the magnet wins when it answers; the raw time otherwise', () => {
    // x 300 at 100px/s past the 12px content offset = 2.88s; the edge at 2.9 is within reach
    const near = setup(null, 'select-and-collapse', [], (t) => (Math.abs(t - 2.9) <= 0.06 ? 2.9 : null));
    near.click(0);
    expect(near.dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYHEAD_POSITION', payload: 2.9 });
    const far = setup(null, 'select-and-collapse', [], () => null);
    far.click(0);
    const call = far.dispatch.mock.calls.find(([a]) => a.type === 'SET_PLAYHEAD_POSITION')?.[0] as { payload: number };
    expect(call.payload).toBeCloseTo(2.88, 5);
  });
});
