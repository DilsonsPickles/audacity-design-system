// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { TracksProvider, useTracksState } from '../../contexts/TracksContext';
import type { Track, ClipDragState } from '../../contexts/TracksContext';
import { useClipDragging } from '../useClipDragging';

afterEach(cleanup);

/**
 * A drag seeded the way useClipMouseDown seeds a Cmd+drag: the drag
 * state names the ORIGINALS and carries `duplicateOnFirstMove`; the
 * hook's first mousemove makes the copies and moves those.
 */
function Harness({ seed, onState }: {
  seed: (tracks: Track[]) => ClipDragState;
  onState: (s: ReturnType<typeof useTracksState>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksState = useTracksState();
  const { startClipDrag } = useClipDragging({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    tracks: tracksState.tracks,
    pixelsPerSecond: 100,
    clipContentOffset: 0,
    topGap: 0,
    trackGap: 0,
    defaultTrackHeight: 100,
  });
  React.useEffect(() => { onState(tracksState); });
  return (
    <div
      ref={containerRef}
      data-testid="container"
      onMouseDown={() => startClipDrag(seed(tracksState.tracks))}
    />
  );
}

const clip = (id: number, start: number, extra: Record<string, unknown> = {}) =>
  ({ id, name: `c${id}`, start, duration: 2, trimStart: 0, envelopePoints: [], ...extra });

function setUp(seed: (tracks: Track[]) => ClipDragState) {
  let last!: ReturnType<typeof useTracksState>;
  const initialTracks = [
    { id: 1, name: 'A', clips: [clip(1, 1, { selected: true }), clip(2, 5, { selected: true })] },
    { id: 2, name: 'B', clips: [clip(3, 8)] },
  ] as unknown as Track[];
  const { container } = render(
    <TracksProvider initialTracks={initialTracks}>
      <Harness seed={seed} onState={(s) => { last = s; }} />
    </TracksProvider>,
  );
  const el = container.querySelector('[data-testid="container"]') as HTMLElement;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 2000, height: 200, right: 2000, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
  });
  return {
    press: (x: number, y: number) => fireEvent.mouseDown(el, { clientX: x, clientY: y }),
    move: (x: number, y: number) => act(() => { fireEvent.mouseMove(document, { clientX: x, clientY: y, altKey: true }); }),
    release: () => act(() => { fireEvent.mouseUp(document); }),
    clipsOf: (trackIndex: number) => last.tracks[trackIndex].clips.map((c) => ({ id: c.id, start: c.start, selected: !!c.selected, sourceClipId: c.sourceClipId })),
  };
}

const seedFor = (leadId: number, members: number[]) => (tracks: Track[]): ClipDragState => {
  const lead = tracks[0].clips.find((c) => c.id === leadId)!;
  return {
    clip: lead,
    trackIndex: 0,
    offsetX: 0,
    initialX: lead.start * 100,
    initialTrackIndex: 0,
    initialStartTime: lead.start,
    selectedClipsInitialPositions: members.map((id) => {
      const c = tracks[0].clips.find((cc) => cc.id === id)!;
      return { clipId: id, trackIndex: 0, startTime: c.start };
    }),
    duplicateOnFirstMove: true,
  };
};

describe('Cmd+drag duplicates (2026-09-30)', () => {
  it('the first movement makes the copies; the drag moves them and the originals stay put', () => {
    const { press, move, release, clipsOf } = setUp(seedFor(1, [1, 2]));
    press(100, 50);
    move(400, 50); // +3s
    release();
    const clips = clipsOf(0);
    // The originals, where they were, no longer selected
    expect(clips.filter((c) => c.id === 1 || c.id === 2)).toEqual([
      { id: 1, start: 1, selected: false, sourceClipId: undefined },
      { id: 2, start: 5, selected: false, sourceClipId: undefined },
    ]);
    // The copies, moved by the drag, selected, pointing at their sources' audio
    const copies = clips.filter((c) => c.id !== 1 && c.id !== 2);
    expect(copies).toEqual([
      { id: 4, start: 4, selected: true, sourceClipId: 1 },
      { id: 5, start: 8, selected: true, sourceClipId: 2 },
    ]);
    expect(clipsOf(1)).toEqual([{ id: 3, start: 8, selected: false, sourceClipId: undefined }]);
  });

  it('a press that never moves copies nothing', () => {
    const { press, release, clipsOf } = setUp(seedFor(1, [1, 2]));
    press(100, 50);
    release();
    expect(clipsOf(0).map((c) => c.id)).toEqual([1, 2]);
  });

  it('a single clip duplicates alone', () => {
    const { press, move, release, clipsOf } = setUp(seedFor(2, [2]));
    press(500, 50);
    move(600, 50); // +1s
    release();
    expect(clipsOf(0)).toEqual([
      { id: 1, start: 1, selected: false, sourceClipId: undefined },
      { id: 2, start: 5, selected: false, sourceClipId: undefined },
      { id: 4, start: 6, selected: true, sourceClipId: 2 },
    ]);
  });

  it('a plain drag (no flag) still moves the originals', () => {
    const { press, move, release, clipsOf } = setUp((tracks) => ({ ...seedFor(2, [2])(tracks), duplicateOnFirstMove: undefined }));
    press(500, 50);
    move(600, 50);
    release();
    expect(clipsOf(0).map((c) => [c.id, c.start])).toEqual([[1, 1], [2, 6]]);
  });
});
