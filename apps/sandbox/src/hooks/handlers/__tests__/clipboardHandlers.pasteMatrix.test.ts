/**
 * THE PASTE MATRIX (2026-11-12 spec), alwaysPasteAsNewClip ON half:
 * what pasting does to the audio already there — OVERLAPS carves its
 * landing span, PUSHES makes room (same track or every track), and a
 * RANGE destination REPLACES the selection (larger range: the
 * selection shrinks to the pasted span, push mode pulls later audio
 * back to keep sync; smaller range: the paste is sized to it).
 */
import { describe, it, expect, vi } from 'vitest';
import type { SetStateAction } from 'react';
import { handlePaste, type PastePrefs } from '../clipboardHandlers';
import { initialState, type TracksState, type Clip, type Track } from '../../../contexts/TracksContext';
import type { ClipboardState } from '../../useKeyboardShortcuts';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: `c${o.id}`,
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const stateWith = (tracks: TracksState['tracks'], extra: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, tracks, ...extra } as TracksState);

const makeDeps = (state: TracksState, pastePrefs?: Partial<PastePrefs>) => ({
  state,
  dispatch: vi.fn(),
  clipboard: null as ClipboardState | null,
  setClipboard: vi.fn() as unknown as React.Dispatch<SetStateAction<ClipboardState | null>>,
  audioManagerRef: { current: null as unknown as AudioPlaybackManager },
  // This file's defaults test the NEW-CLIP half; the OFF describe below
  // overrides asNewClip per test.
  pastePrefs: { mode: 'overlaps', pushScope: 'same-track', asNewClip: true, ...pastePrefs } as PastePrefs,
});

/** A one-clip clipboard: 2 s of audio from track 0 */
const twoSecondClipboard = (): ClipboardState => ({
  clips: [{ ...clip({ id: 50, start: 0, duration: 2 }), trackIndex: 0 }],
  operation: 'copy',
  wholeGroupIds: [],
});

const replacePayload = (dispatch: ReturnType<typeof vi.fn>): Track[] =>
  dispatch.mock.calls.find((c) => c[0].type === 'REPLACE_TRACKS_EDIT')![0].payload;

const selectionPayload = (dispatch: ReturnType<typeof vi.fn>) =>
  dispatch.mock.calls.find((c) => c[0].type === 'SET_TIME_SELECTION')?.[0].payload;

const spans = (t: Track) => t.clips.map((c) => [c.start, c.start + c.duration]).sort((a, b) => a[0] - b[0]);

describe('paste at a POINT', () => {
  const pointState = () =>
    stateWith(
      [
        { id: 1, name: 'dest', clips: [clip({ id: 10, start: 0, duration: 10 }), clip({ id: 11, start: 12, duration: 1 })] },
        { id: 2, name: 'other', clips: [clip({ id: 20, start: 0, duration: 10 })] },
      ],
      { focusedTrackIndex: 0, playheadPosition: 4 },
    );

  it('OVERLAPS carves the landing span out of the clips underneath', () => {
    const deps = makeDeps(pointState(), { mode: 'overlaps' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // [0..4] + pasted [4..6] + [6..10], the 12..13 clip untouched
    expect(spans(tracks[0])).toEqual([[0, 4], [4, 6], [6, 10], [12, 13]]);
    expect(spans(tracks[1])).toEqual([[0, 10]]); // other track untouched
  });

  it('PUSHES (same track) splits at the point and shifts later clips right — nothing joins', () => {
    const deps = makeDeps(pointState(), { mode: 'pushes', pushScope: 'same-track' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // [0..4] + pasted [4..6] + the pushed right half [6..12] + [14..15]
    expect(spans(tracks[0])).toEqual([[0, 4], [4, 6], [6, 12], [14, 15]]);
    // FOUR separate clips — the recipient never merges with its right
    // neighbour (the spec's noted bug, guarded)
    expect(tracks[0].clips).toHaveLength(4);
    expect(spans(tracks[1])).toEqual([[0, 10]]); // same-track scope
  });

  it('PUSHES (all tracks) makes room on every track, preserving sync', () => {
    const deps = makeDeps(pointState(), { mode: 'pushes', pushScope: 'all-tracks' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    expect(spans(tracks[1])).toEqual([[0, 4], [6, 12]]); // split + pushed too
  });

  it('the pasted clip lands selected, everything else deselected', () => {
    const deps = makeDeps(pointState(), { mode: 'overlaps' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    const pasted = tracks[0].clips.find((c) => c.start === 4 && c.duration === 2)!;
    expect(pasted.selected).toBe(true);
    expect(tracks[0].clips.filter((c) => c.selected)).toHaveLength(1);
  });
});

describe('paste into a RANGE destination (replaces the selection)', () => {
  const rangeState = (startTime: number, endTime: number) =>
    stateWith(
      [{ id: 1, name: 'dest', clips: [clip({ id: 10, start: 0, duration: 10 })] }],
      {
        focusedTrackIndex: 0,
        playheadPosition: startTime,
        timeSelection: { startTime, endTime, tracks: [0] },
      },
    );

  it('range LARGER than the clipboard, OVERLAPS: selection replaced, the leftover stays a gap, the selection shrinks to the pasted span', () => {
    const deps = makeDeps(rangeState(2, 8), { mode: 'overlaps' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // Carved [2..8]; pasted [2..4]; the 4..8 gap remains
    expect(spans(tracks[0])).toEqual([[0, 2], [2, 4], [8, 10]]);
    expect(selectionPayload(deps.dispatch)).toMatchObject({ startTime: 2, endTime: 4 });
  });

  it('range LARGER, PUSHES: later audio pulls back over the excess to keep relative positions', () => {
    const deps = makeDeps(rangeState(2, 8), { mode: 'pushes', pushScope: 'same-track' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // Carved [2..8]; pasted [2..4]; the tail [8..10] pulled back to [4..6]
    expect(spans(tracks[0])).toEqual([[0, 2], [2, 4], [4, 6]]);
    expect(selectionPayload(deps.dispatch)).toMatchObject({ startTime: 2, endTime: 4 });
  });

  it('range SMALLER than the clipboard: the paste is sized to the selection, no length change around it', () => {
    const deps = makeDeps(rangeState(2, 3), { mode: 'overlaps' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // Carved [2..3]; pasted truncated to 1 s
    expect(spans(tracks[0])).toEqual([[0, 2], [2, 3], [3, 10]]);
    const pasted = tracks[0].clips.find((c) => c.start === 2)!;
    expect(pasted.duration).toBe(1);
    expect(selectionPayload(deps.dispatch)).toMatchObject({ startTime: 2, endTime: 3 });
  });

  it('an explicit PasteAt point ignores the range (the canvas menu only opens with no selection)', () => {
    const deps = makeDeps(rangeState(2, 8), { mode: 'overlaps' });
    handlePaste({ ...deps, clipboard: twoSecondClipboard() }, { time: 0, trackIndex: 0 });
    const tracks = replacePayload(deps.dispatch);
    // Point paste at 0: carve [0..2] of the recipient, land there
    expect(spans(tracks[0])).toEqual([[0, 2], [2, 10]]);
    expect(selectionPayload(deps.dispatch)).toBeUndefined();
  });
});

describe('alwaysPasteAsNewClip OFF — the paste merges INTO the recipient clip', () => {
  /** Recipient [1..9], flat source (trim 0, full 8 s), waveform all 1s
   *  at 10 samples/s, an envelope point either side of the span and one
   *  inside it; a neighbour at [10..11] to watch the push. */
  const mergeState = (recipientExtra: Partial<Clip> = {}) =>
    stateWith(
      [{ id: 1, name: 'dest', clips: [
        clip({
          id: 10, start: 1, duration: 8, trimStart: 0, fullDuration: 8,
          waveform: Array(80).fill(1),
          envelopePoints: [{ time: 1, db: 0 }, { time: 4, db: -6 }, { time: 7, db: 0 }],
          ...recipientExtra,
        }),
        clip({ id: 11, start: 10, duration: 1 }),
      ] }],
      { focusedTrackIndex: 0, playheadPosition: 4 },
    );

  /** The clipboard's 2 s reads −1, so the splice shows in the samples */
  const negClipboard = (): ClipboardState => ({
    clips: [{ ...clip({ id: 50, start: 0, duration: 2, trimStart: 0, fullDuration: 2, waveform: Array(20).fill(-1) }), trackIndex: 0 }],
    operation: 'copy',
    wholeGroupIds: [],
  });

  it('OVERLAPS at a point: the audio under the span is OVERWRITTEN inside the clip — one clip, length unchanged, waveform spliced', () => {
    const deps = makeDeps(mergeState(), { mode: 'overlaps', asNewClip: false });
    handlePaste({ ...deps, clipboard: negClipboard() });
    const tracks = replacePayload(deps.dispatch);
    expect(spans(tracks[0])).toEqual([[1, 9], [10, 11]]); // still two clips, same geometry
    const merged = tracks[0].clips.find((c) => c.start === 1)!;
    expect(merged.id).not.toBe(10); // a fresh id — undo gets the old clip back
    // A merge paste selects NO clip; the pasted span becomes the time
    // selection instead (2026-11-12 feedback)
    expect(merged.selected).toBe(false);
    expect(selectionPayload(deps.dispatch)).toMatchObject({ startTime: 4, endTime: 6, tracks: [0] });
    expect(merged.trimStart).toBe(0);
    expect(merged.fullDuration).toBe(8);
    // Samples: [0..3 s) of the clip read 1, [3..5) read −1 (the paste), [5..8) read 1
    const wf = merged.waveform!;
    expect(wf[20]).toBe(1);   // 2 s in
    expect(wf[40]).toBe(-1);  // 4 s in — the pasted audio
    expect(wf[60]).toBe(1);   // 6 s in
    // The envelope point inside the span is gone; the others hold still
    expect(merged.envelopePoints.map((p) => p.time)).toEqual([1, 7]);
  });

  it('PUSHES at a point: the content is INSERTED — the clip grows, its later audio and the neighbour move right', () => {
    const deps = makeDeps(mergeState(), { mode: 'pushes', pushScope: 'same-track', asNewClip: false });
    handlePaste({ ...deps, clipboard: negClipboard() });
    const tracks = replacePayload(deps.dispatch);
    expect(spans(tracks[0])).toEqual([[1, 11], [12, 13]]); // grown clip + pushed neighbour
    const merged = tracks[0].clips.find((c) => c.start === 1)!;
    expect(merged.duration).toBe(10);
    expect(merged.selected).toBe(false);
    // The inserted span is the selection: [4..6]
    expect(selectionPayload(deps.dispatch)).toMatchObject({ startTime: 4, endTime: 6, tracks: [0] });
    const wf = merged.waveform!;
    expect(wf[20]).toBe(1);   // before the insert
    expect(wf[40]).toBe(-1);  // the inserted 2 s
    expect(wf[70]).toBe(1);   // the clip's own later audio, moved along
    // Envelope: the point after the insert rides with its audio (4 → 6)
    expect(merged.envelopePoints.map((p) => p.time)).toEqual([1, 6, 9]);
  });

  it('a RANGE larger than the clipboard: the selection is replaced inside the clip, which SHRINKS; push pulls the neighbour back', () => {
    const state = mergeState();
    state.timeSelection = { startTime: 3, endTime: 7, tracks: [0] };
    const deps = makeDeps(state, { mode: 'pushes', pushScope: 'same-track', asNewClip: false });
    handlePaste({ ...deps, clipboard: negClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // [3..7] (4 s) replaced by 2 s → the clip is [1..7]; the neighbour pulls back by 2
    expect(spans(tracks[0])).toEqual([[1, 7], [8, 9]]);
    expect(selectionPayload(deps.dispatch)).toMatchObject({ startTime: 3, endTime: 5 });
  });

  it('a stretched recipient falls back to the NEW-CLIP paste (merging would need a render)', () => {
    const deps = makeDeps(mergeState({ stretchFactor: 2 }), { mode: 'overlaps', asNewClip: false });
    handlePaste({ ...deps, clipboard: negClipboard() });
    const tracks = replacePayload(deps.dispatch);
    // The ON path's carve: [1..4] + pasted [4..6] + [6..9] — three clips
    expect(spans(tracks[0]).slice(0, 3)).toEqual([[1, 4], [4, 6], [6, 9]]);
  });

  it('no clip under the anchor falls back too: pasting onto empty lane makes a new clip', () => {
    const state = mergeState({}, );
    state.playheadPosition = 15; // past everything
    const deps = makeDeps(state, { mode: 'overlaps', asNewClip: false });
    handlePaste({ ...deps, clipboard: negClipboard() });
    const tracks = replacePayload(deps.dispatch);
    expect(spans(tracks[0])).toEqual([[1, 9], [10, 11], [15, 17]]);
  });
});
