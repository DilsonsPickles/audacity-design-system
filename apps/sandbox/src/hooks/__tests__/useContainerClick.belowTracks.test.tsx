import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useContainerClick } from '../useContainerClick';
import type { Track, TracksAction } from '../../contexts/TracksContext';

// A click in the empty space below the tracks deselects every clip
// (2026-11-12), as it already cleared the tracks and the time selection.
function clickBelow(tracks: Track[]) {
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
    selectedTrackIndices: [0],
    selectionAnchor: null,
    setSelectionAnchor: () => {},
    timeSelection: null,
    laneClickBehavior: 'select-and-collapse',
  }));
  result.current({
    clientX: 300, clientY: 800, metaKey: false, ctrlKey: false, shiftKey: false, detail: 1,
    target: container, preventDefault: () => {},
  } as unknown as React.MouseEvent<HTMLDivElement>);
  return dispatch.mock.calls.map(([a]) => a.type);
}

const withClips = (selected: boolean) => [
  { id: 1, name: 'A', clips: [{ id: 10, start: 0, duration: 1, selected }] },
  { id: 2, name: 'B', clips: [{ id: 20, start: 0, duration: 1, selected: false }] },
] as unknown as Track[];

describe('a click below the tracks deselects all clips', () => {
  it('a selected clip is deselected', () => {
    expect(clickBelow(withClips(true))).toContain('DESELECT_ALL_CLIPS');
  });
  it('with nothing selected nothing is dispatched for clips', () => {
    expect(clickBelow(withClips(false))).not.toContain('DESELECT_ALL_CLIPS');
  });
});
