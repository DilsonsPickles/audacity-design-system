// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { TracksProvider, useTracksState } from '../../contexts/TracksContext';
import type { Track, ClipDragState } from '../../contexts/TracksContext';
import { useClipDragging } from '../useClipDragging';

afterEach(cleanup);

/**
 * A drag seeded the way useClipMouseDown seeds an Option+drag: the
 * drag state names the ORIGINALS and carries `duplicateOnFirstMove`;
 * the hook's first mousemove makes the copies and moves those.
 */
function Harness({ seed, onState, snapEnabled = false }: {
  seed: (tracks: Track[]) => ClipDragState;
  onState: (s: ReturnType<typeof useTracksState>) => void;
  snapEnabled?: boolean;
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
    snapEnabled,
    // A 1s grid, whether or not snapping is on (Canvas builds it either way)
    snapOptions: { timeFormat: 'minutes-seconds', bpm: 120, beatsPerMeasure: 4, snap: { subdivision: 1, triplet: false }, pixelsPerSecond: 100 },
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

function setUp(seed: (tracks: Track[]) => ClipDragState, snapEnabled = false) {
  let last!: ReturnType<typeof useTracksState>;
  const initialTracks = [
    { id: 1, name: 'A', clips: [clip(1, 1, { selected: true }), clip(2, 5, { selected: true })] },
    { id: 2, name: 'B', clips: [clip(3, 8)] },
  ] as unknown as Track[];
  const { container } = render(
    <TracksProvider initialTracks={initialTracks}>
      <Harness seed={seed} onState={(s) => { last = s; }} snapEnabled={snapEnabled} />
    </TracksProvider>,
  );
  const el = container.querySelector('[data-testid="container"]') as HTMLElement;
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 2000, height: 200, right: 2000, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
  });
  return {
    press: (x: number, y: number) => fireEvent.mouseDown(el, { clientX: x, clientY: y }),
    move: (x: number, y: number, mods: { shiftKey?: boolean; altKey?: boolean } = {}) =>
      act(() => { fireEvent.mouseMove(document, { clientX: x, clientY: y, ...mods }); }),
    release: () => act(() => { fireEvent.mouseUp(document); }),
    clipsOf: (trackIndex: number) => last.tracks[trackIndex].clips.map((c) => ({ id: c.id, start: c.start, selected: !!c.selected, sourceClipId: c.sourceClipId })),
    timeSelection: () => last.timeSelection,
    dispatch: () => last,
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

describe('Option+drag duplicates (2026-09-30)', () => {
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

describe('Shift+drag inverts snapping (2026-09-30)', () => {
  // The minutes-seconds grid at 100px/s snaps to 0.2s; a clip at 5s
  // dragged 1.37s lands on 6.4s snapped, 6.37s free
  const seedPlain = (tracks: Track[]): ClipDragState => ({ ...seedFor(2, [2])(tracks), duplicateOnFirstMove: undefined });

  it('snapping ON: a plain drag snaps to the grid; Shift held, it does not', () => {
    const plain = setUp(seedPlain, true);
    plain.press(500, 50);
    plain.move(637, 50);
    plain.release();
    expect(plain.clipsOf(0).find((c) => c.id === 2)!.start).toBeCloseTo(6.4, 9);
    cleanup();
    const shifted = setUp(seedPlain, true);
    shifted.press(500, 50);
    shifted.move(637, 50, { shiftKey: true });
    shifted.release();
    expect(shifted.clipsOf(0).find((c) => c.id === 2)!.start).toBeCloseTo(6.37, 9);
  });

  it('snapping OFF: a plain drag is free; Shift held, it snaps to the grid', () => {
    const plain = setUp(seedPlain, false);
    plain.press(500, 50);
    plain.move(637, 50);
    plain.release();
    expect(plain.clipsOf(0).find((c) => c.id === 2)!.start).toBeCloseTo(6.37, 9);
    cleanup();
    const shifted = setUp(seedPlain, false);
    shifted.press(500, 50);
    shifted.move(637, 50, { shiftKey: true });
    shifted.release();
    expect(shifted.clipsOf(0).find((c) => c.id === 2)!.start).toBeCloseTo(6.4, 9);
  });

  it('Option held during a drag no longer switches snapping off — Option is the duplicate modifier', () => {
    const t = setUp(seedPlain, true);
    t.press(500, 50);
    t.move(637, 50, { altKey: true });
    t.release();
    expect(t.clipsOf(0).find((c) => c.id === 2)!.start).toBeCloseTo(6.4, 9);
  });

  it('a Shift drag from an unselected clip selects it on its first movement, not at the press', () => {
    const seedUnselected = (tracks: Track[]): ClipDragState => {
      const lead = tracks[1].clips[0]; // clip 3, unselected
      return {
        clip: lead, trackIndex: 1, offsetX: 0, initialX: lead.start * 100, initialTrackIndex: 1, initialStartTime: lead.start,
        selectedClipsInitialPositions: [{ clipId: 3, trackIndex: 1, startTime: lead.start }],
        selectOnFirstMove: true,
      };
    };
    const t = setUp(seedUnselected, false);
    t.press(800, 150);
    expect(t.clipsOf(1)[0].selected).toBe(false);
    t.move(900, 150, { shiftKey: true });
    expect(t.clipsOf(1)[0].selected).toBe(true);
    t.release();
    expect(t.clipsOf(1)[0]).toMatchObject({ id: 3, start: 9, selected: true });
    // …and the previous selection is gone, as after a plain press
    expect(t.clipsOf(0).every((c) => !c.selected)).toBe(true);
  });
});

describe('a drag from inside the time selection sweeps the bracketed clips — on the first movement, not the press (2026-09-30)', () => {
  // Clip 3 (track B, unselected, 8s..10s) is pressed; the time selection
  // brackets clips 2 and 3, so both ride along once the drag moves
  const seedSweep = (tracks: Track[]): ClipDragState => {
    const lead = tracks[1].clips[0];
    return {
      clip: lead, trackIndex: 1, offsetX: 0, initialX: lead.start * 100, initialTrackIndex: 1, initialStartTime: lead.start,
      selectedClipsInitialPositions: [
        { clipId: 2, trackIndex: 0, startTime: 5 },
        { clipId: 3, trackIndex: 1, startTime: 8 },
      ],
      sweepOnFirstMove: true,
    };
  };

  it('a press alone leaves the selection and the time selection as they are', () => {
    const { press, release, clipsOf } = setUp(seedSweep);
    press(800, 150);
    release();
    expect(clipsOf(0).map((c) => c.selected)).toEqual([true, true]); // the seed's selection
    expect(clipsOf(1)[0].selected).toBe(false);
  });

  it('once it moves, the bracketed clips are selected, the bracket is dropped, and all of them move together', () => {
    const { press, move, release, clipsOf, timeSelection } = setUp(seedSweep);
    press(800, 150);
    move(900, 150);
    release();
    expect(clipsOf(1)[0]).toMatchObject({ id: 3, start: 9, selected: true });
    expect(clipsOf(0).find((c) => c.id === 2)).toMatchObject({ start: 6, selected: true });
    expect(clipsOf(0).find((c) => c.id === 1)).toMatchObject({ start: 1, selected: false }); // outside the bracket
    expect(timeSelection()).toBeNull();
  });
});
