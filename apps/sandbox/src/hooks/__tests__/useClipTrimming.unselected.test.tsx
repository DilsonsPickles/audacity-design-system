// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { TracksProvider, useTracksState } from '../../contexts/TracksContext';
import type { Track } from '../../contexts/TracksContext';
import { useClipTrimming } from '../useClipTrimming';
import { buildTrimParticipants } from '../../utils/trimParticipants';

afterEach(cleanup);

/**
 * The drag as the app runs it: the track's edge zone (or trim handle)
 * calls `onClipTrimEdge` on every pointer move; the first call seeds the
 * trim, and the hook's own document listeners do the trimming.
 */
function Harness({ grab, onState }: {
  grab: { trackIndex: number; clipId: number; edge: 'left' | 'right' };
  onState: (s: ReturnType<typeof useTracksState>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksState = useTracksState();
  const tracksRef = useRef(tracksState.tracks);
  tracksRef.current = tracksState.tracks;
  const { clipTrimStateRef } = useClipTrimming({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    tracks: tracksState.tracks,
    pixelsPerSecond: 100,
    clipContentOffset: 0,
  });
  React.useEffect(() => { onState(tracksState); });

  return (
    <div
      ref={containerRef}
      data-testid="container"
      onMouseDown={() => {
        const onMove = () => {
          if (clipTrimStateRef.current) return;
          const track = tracksRef.current[grab.trackIndex];
          const clip = track.clips.find((c) => c.id === grab.clipId)!;
          clipTrimStateRef.current = {
            ...grab,
            initialTrimStart: clip.trimStart || 0,
            initialDuration: clip.duration,
            initialClipStart: clip.start,
            allClipsInitialState: buildTrimParticipants(tracksRef.current, grab.trackIndex, grab.clipId),
          };
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      }}
    />
  );
}

const clip = (id: number, start: number, duration: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start, duration, trimStart: 1, fullDuration: duration + 2, envelopePoints: [], ...extra });

function setUp(grab: { trackIndex: number; clipId: number; edge: 'left' | 'right' }) {
  let last!: ReturnType<typeof useTracksState>;
  const initialTracks = [
    { id: 1, name: 'A', clips: [clip(1, 0, 3, { selected: true }), clip(2, 5, 4)] },
    { id: 2, name: 'B', clips: [clip(3, 0, 3, { selected: true })] },
  ] as unknown as Track[];
  const { container } = render(
    <TracksProvider initialTracks={initialTracks}>
      <Harness grab={grab} onState={(s) => { last = s; }} />
    </TracksProvider>,
  );
  const el = container.querySelector('[data-testid="container"]') as HTMLElement;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 2000, height: 200, right: 2000, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
  });
  const drag = (fromX: number, toX: number) => {
    fireEvent.mouseDown(el, { clientX: fromX });
    act(() => { fireEvent.mouseMove(document, { clientX: fromX, altKey: true }); }); // seeds
    act(() => { fireEvent.mouseMove(document, { clientX: toX, altKey: true }); });   // trims (Alt: no snapping)
    act(() => { fireEvent.mouseUp(document); });
  };
  const get = (trackIndex: number, id: number) => last.tracks[trackIndex].clips.find((c) => c.id === id)!;
  return { drag, get, state: () => last };
}

describe('useClipTrimming — an unselected clip trims alone and stays unselected (2026-09-29)', () => {
  it('right edge: only that clip changes, and the selection is what it was', () => {
    const { drag, get, state } = setUp({ trackIndex: 0, clipId: 2, edge: 'right' });
    const selectedTracksBefore = [...state().selectedTrackIndices];
    drag(900, 800); // clip 2 is 5s..9s; its right edge goes to 8s
    expect(get(0, 2)).toMatchObject({ start: 5, duration: 3 });
    expect(get(0, 2).selected ?? false).toBe(false);
    // The selected clips did not trim with it, and are still the selection
    expect(get(0, 1)).toMatchObject({ start: 0, duration: 3, selected: true });
    expect(get(1, 3)).toMatchObject({ start: 0, duration: 3, selected: true });
    expect(state().selectedTrackIndices).toEqual(selectedTracksBefore);
  });

  it('left edge: start, length and the source offset move together, on that clip only', () => {
    const { drag, get } = setUp({ trackIndex: 0, clipId: 2, edge: 'left' });
    drag(500, 550); // the left edge goes from 5s to 5.5s
    const trimmed = get(0, 2);
    expect(trimmed.start).toBeCloseTo(5.5, 9);
    expect(trimmed.duration).toBeCloseTo(3.5, 9);
    expect(trimmed.trimStart).toBeCloseTo(1.5, 9);
    expect(trimmed.selected ?? false).toBe(false);
    expect(get(0, 1)).toMatchObject({ start: 0, duration: 3, trimStart: 1, selected: true });
  });

  it('a SELECTED clip still trims with every selected clip, across tracks', () => {
    const { drag, get } = setUp({ trackIndex: 0, clipId: 1, edge: 'right' });
    drag(300, 250); // clip 1's right edge goes from 3s to 2.5s
    expect(get(0, 1).duration).toBeCloseTo(2.5, 9);
    expect(get(1, 3).duration).toBeCloseTo(2.5, 9);
    expect(get(0, 2)).toMatchObject({ start: 5, duration: 4 }); // the unselected clip is left alone
  });
});
