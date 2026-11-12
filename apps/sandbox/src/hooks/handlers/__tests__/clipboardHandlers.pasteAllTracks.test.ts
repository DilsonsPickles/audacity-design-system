/**
 * THE ALL-TRACKS PUSH SCOPE (2026-11-12, written double-checking "I'm
 * unsure of this ripple behaviour when it's across all tracks"): the
 * sync-lock reading, pinned. A point paste splits EVERY scoped track at
 * the paste point and shifts everything after it by exactly the pasted
 * span — verified live to the pixel across four tracks. A range paste's
 * pull-back removes the EXCESS WINDOW on every scoped track: a clip
 * inside the window goes with it, a clip spanning it keeps one clip
 * with a deletedRegions hole (the ripple cut's standing law), and later
 * clips pull back — because "maintain relative positioning" can only be
 * true if removed time is removed everywhere; shifting without removing
 * would slide pulled-back audio into what still sits in the window.
 */
import { describe, it, expect, vi } from 'vitest';
import type { SetStateAction } from 'react';
import { handlePaste, type PastePrefs } from '../clipboardHandlers';
import { initialState, type TracksState, type Clip, type Track } from '../../../contexts/TracksContext';
import type { ClipboardState } from '../../useKeyboardShortcuts';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: `c${o.id}`, start: 0, duration: 1, envelopePoints: [], ...o,
});
const stateWith = (tracks: TracksState['tracks'], extra: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, tracks, ...extra } as TracksState);
const makeDeps = (state: TracksState, pastePrefs?: Partial<PastePrefs>) => ({
  state, dispatch: vi.fn(),
  clipboard: null as ClipboardState | null,
  setClipboard: vi.fn() as unknown as React.Dispatch<SetStateAction<ClipboardState | null>>,
  audioManagerRef: { current: null as unknown as AudioPlaybackManager },
  pastePrefs: { mode: 'pushes', pushScope: 'all-tracks', asNewClip: true, ...pastePrefs } as PastePrefs,
});
const cb = (): ClipboardState => ({
  clips: [{ ...clip({ id: 50, start: 0, duration: 2 }), trackIndex: 0 }],
  operation: 'copy', wholeGroupIds: [],
});
const replacePayload = (dispatch: ReturnType<typeof vi.fn>): Track[] =>
  dispatch.mock.calls.find((c) => c[0].type === 'REPLACE_TRACKS_EDIT')![0].payload;
const spans = (t: Track) => t.clips.map((c) => [
  Math.round(c.start * 1000) / 1000,
  Math.round((c.start + c.duration) * 1000) / 1000,
]).sort((a, b) => a[0] - b[0]);

describe('all-tracks push — the uncovered corners', () => {
  it('RANGE paste, all-tracks pull-back: another track\'s audio INSIDE the excess window', () => {
    // Dest track 0: clip [0..10], selection [2..8], clipboard 2 s →
    // excess window is [4..8]. Track 1 has a clip entirely inside it
    // [5..7], and one after it [9..10].
    const state = stateWith(
      [
        { id: 1, name: 'dest', clips: [clip({ id: 10, start: 0, duration: 10 })] },
        { id: 2, name: 'other', clips: [clip({ id: 20, start: 5, duration: 2 }), clip({ id: 21, start: 9, duration: 1 })] },
      ],
      { focusedTrackIndex: 0, playheadPosition: 2, timeSelection: { startTime: 2, endTime: 8, tracks: [0] } },
    );
    const deps = makeDeps(state);
    handlePaste({ ...deps, clipboard: cb() });
    const tracks = replacePayload(deps.dispatch);
    // Dest: replaced + pulled back, as the same-track case
    expect(spans(tracks[0])).toEqual([[0, 2], [2, 4], [4, 6]]);
    // Other track: the clip INSIDE the excess window is DELETED with it
    // (sync-lock semantics: removing time removes it everywhere), and
    // the later clip pulls back by the excess (4 s): [9..10] → [5..6]
    expect(spans(tracks[1])).toEqual([[5, 6]]);
  });

  it('RANGE paste, all-tracks pull-back: another track\'s clip SPANNING the excess window keeps ONE clip with the span cut out', () => {
    const state = stateWith(
      [
        { id: 1, name: 'dest', clips: [clip({ id: 10, start: 0, duration: 10 })] },
        { id: 2, name: 'other', clips: [clip({ id: 20, start: 3, duration: 7 })] }, // [3..10], spans [4..8]
      ],
      { focusedTrackIndex: 0, playheadPosition: 2, timeSelection: { startTime: 2, endTime: 8, tracks: [0] } },
    );
    const deps = makeDeps(state);
    handlePaste({ ...deps, clipboard: cb() });
    const tracks = replacePayload(deps.dispatch);
    const other = tracks[1].clips;
    // One clip, 4 s shorter, with a deletedRegions hole — the ripple
    // cut's standing in-clip rule
    expect(other).toHaveLength(1);
    expect(other[0].duration).toBe(3);
    expect(other[0].deletedRegions?.length).toBe(1);
  });

  it('MERGE (OFF) push, all-tracks: other tracks split at the anchor and shift, the recipient grows', () => {
    const state = stateWith(
      [
        { id: 1, name: 'dest', clips: [clip({ id: 10, start: 1, duration: 8, trimStart: 0, fullDuration: 8, waveform: Array(80).fill(1) })] },
        { id: 2, name: 'other', clips: [clip({ id: 20, start: 0, duration: 10 })] },
      ],
      { focusedTrackIndex: 0, playheadPosition: 4 },
    );
    const deps = makeDeps(state, { asNewClip: false });
    handlePaste({ ...deps, clipboard: cb() });
    const tracks = replacePayload(deps.dispatch);
    expect(spans(tracks[0])).toEqual([[1, 11]]); // grown recipient, one clip
    expect(spans(tracks[1])).toEqual([[0, 4], [6, 12]]); // split + pushed, in sync
  });
});
