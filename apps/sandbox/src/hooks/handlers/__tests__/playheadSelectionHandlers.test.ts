import { describe, it, expect, vi } from 'vitest';
import { handlePlayheadMove, handleBracketEdge } from '../playheadSelectionHandlers';
import { initialState, type TracksState } from '../../../contexts/TracksContext';

const makeState = (o: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, ...o } as TracksState);

const keyEvent = (over: Record<string, unknown> = {}) =>
  ({ key: 'ArrowRight', shiftKey: true, preventDefault: () => {}, ...over } as unknown as KeyboardEvent);

const makeDeps = (state: TracksState) => ({
  state,
  dispatch: vi.fn(),
  selectionAnchorRef: { current: null as number | null },
  selectionEdgesRef: { current: null as { startTime: number; endTime: number } | null },
  scrollPlayheadIntoView: () => {},
});

const tsPayloads = (dispatch: ReturnType<typeof vi.fn>) =>
  dispatch.mock.calls.filter((c) => c[0].type === 'SET_TIME_SELECTION').map((c) => c[0].payload);

describe('handlePlayheadMove — scope stamping', () => {
  it('Shift+ArrowRight selection creation stamps the focused track as scope and does not touch track selection', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [] },
        { id: 2, name: 't2', clips: [] },
      ] as TracksState['tracks'],
      focusedTrackIndex: 1,
      playheadPosition: 5,
      selectedTrackIndices: [],
    });
    const deps = makeDeps(state);
    handlePlayheadMove(keyEvent(), false, 0.1, deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([1]);
    const types = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('SET_SELECTED_TRACKS');
  });

  it('a fresh Shift+ArrowRight range inherits the built track selection as its scope (Shift+Down then Shift+Right must not shrink the footprint)', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [] },
        { id: 2, name: 't2', clips: [] },
        { id: 3, name: 't3', clips: [] },
      ] as TracksState['tracks'],
      focusedTrackIndex: 2, // Shift+Down left focus on the last track
      playheadPosition: 5,
      selectedTrackIndices: [0, 1, 2], // ...after selecting all tracks
    });
    const deps = makeDeps(state);
    handlePlayheadMove(keyEvent(), false, 0.1, deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([0, 1, 2]);
  });

  it('Shift+ArrowRight keeps an existing scope that contains the focused track (2026-10-13: a focused track outside it takes the range over — see below)', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [] },
        { id: 2, name: 't2', clips: [] },
      ] as TracksState['tracks'],
      focusedTrackIndex: 1,
      playheadPosition: 5,
      timeSelection: { startTime: 2, endTime: 5, tracks: [0, 1] },
    });
    const deps = makeDeps(state);
    handlePlayheadMove(keyEvent(), false, 0.1, deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([0, 1]);
    const types = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('SET_SELECTED_TRACKS');
  });
});


describe('handleBracketEdge — [ ] walk the clip edges, Shift grows the selection edge by edge (2026-10-13)', () => {
  const tracks = [
    { id: 1, name: 't1', clips: [{ id: 1, start: 1, duration: 2 }] }, // 1..3
    { id: 2, name: 't2', clips: [{ id: 4, start: 0.5, duration: 1 }, { id: 2, start: 3, duration: 1 }, { id: 3, start: 6, duration: 1 }] }, // 0.5..1.5, 3..4, 6..7
  ] as unknown as TracksState['tracks'];
  const playheadOf = (dispatch: ReturnType<typeof vi.fn>) =>
    dispatch.mock.calls.filter((c) => c[0].type === 'SET_PLAYHEAD_POSITION').map((c) => c[0].payload);

  it('] parks the playhead on the next edge of the FOCUSED track, [ on the previous; every track when none is focused; nothing past the last', () => {
    const deps = makeDeps(makeState({ tracks, playheadPosition: 2, focusedTrackIndex: 0 }));
    handleBracketEdge(keyEvent({ shiftKey: false }), false, deps);
    expect(playheadOf(deps.dispatch as ReturnType<typeof vi.fn>)).toEqual([3]); // t1's end
    const depsFocused = makeDeps(makeState({ tracks, playheadPosition: 3, focusedTrackIndex: 0 }));
    handleBracketEdge(keyEvent({ shiftKey: false }), false, depsFocused);
    expect(depsFocused.dispatch).not.toHaveBeenCalled(); // t1 has no edge past 3; t2's 4 is not t1's
    const deps2 = makeDeps(makeState({ tracks, playheadPosition: 3, focusedTrackIndex: null }));
    handleBracketEdge(keyEvent({ shiftKey: false }), false, deps2);
    expect(playheadOf(deps2.dispatch as ReturnType<typeof vi.fn>)).toEqual([4]); // no focus: every track, and past the edge it sits on
    const deps3 = makeDeps(makeState({ tracks, playheadPosition: 3.5, focusedTrackIndex: null }));
    handleBracketEdge(keyEvent({ shiftKey: false }), true, deps3);
    expect(playheadOf(deps3.dispatch as ReturnType<typeof vi.fn>)).toEqual([3]);
    const deps4 = makeDeps(makeState({ tracks, playheadPosition: 7, focusedTrackIndex: null }));
    handleBracketEdge(keyEvent({ shiftKey: false }), false, deps4);
    expect(deps4.dispatch).not.toHaveBeenCalled();
    expect(tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>)).toEqual([]); // no selection touched
  });

  it('Shift+] grows a selection from the playhead to the next edge, and again on every press; Shift+[ grows the start backwards', () => {
    // The store is mocked, so each press sees the state the previous
    // press would have produced (the edges ref carries across, as it does)
    const deps = makeDeps(makeState({ tracks, playheadPosition: 2, focusedTrackIndex: 1, selectedTrackIndices: [] }));
    handleBracketEdge(keyEvent({ shiftKey: true }), false, deps);
    const first = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>)[0];
    expect(first).toMatchObject({ startTime: 2, endTime: 3, tracks: [1] });
    const deps2 = { ...makeDeps(makeState({ tracks, playheadPosition: 2, focusedTrackIndex: 1, timeSelection: first })), selectionEdgesRef: deps.selectionEdgesRef };
    handleBracketEdge(keyEvent({ shiftKey: true }), false, deps2);
    const second = tsPayloads(deps2.dispatch as ReturnType<typeof vi.fn>)[0];
    expect(second).toMatchObject({ startTime: 2, endTime: 4, tracks: [1] });
    const deps3 = { ...makeDeps(makeState({ tracks, playheadPosition: 2, focusedTrackIndex: 1, timeSelection: second })), selectionEdgesRef: deps.selectionEdgesRef };
    handleBracketEdge(keyEvent({ shiftKey: true }), true, deps3);
    // ⇧[ from a start at 2 on the focused t2: its previous edge is 1.5 (t1's 1 is not t2's)
    expect(tsPayloads(deps3.dispatch as ReturnType<typeof vi.fn>)[0]).toMatchObject({ startTime: 1.5, endTime: 4 });
    // The playhead follows the start when it moves
    expect(playheadOf(deps3.dispatch as ReturnType<typeof vi.fn>)).toEqual([1.5]);
  });
});

describe('Shift+[ ] — the range follows the track you are on (2026-10-13)', () => {
  const tracks = [
    { id: 1, name: 't1', clips: [{ id: 1, start: 1, duration: 2 }] }, // 1..3
    { id: 2, name: 't2', clips: [{ id: 2, start: 3, duration: 1 }, { id: 3, start: 6, duration: 1 }] }, // 3..4, 6..7
    { id: 3, name: 't3', clips: [{ id: 5, start: 5, duration: 1 }] }, // 5..6
  ] as unknown as TracksState['tracks'];
  it('a focused track outside the selection\'s scope takes the range over; one inside it keeps a multi-track scope', () => {
    // A range on t1 (scope [0]); the focus moves to t2 and Shift+] is pressed from inside it
    const onT1 = { startTime: 2, endTime: 3, tracks: [0] };
    const deps = makeDeps(makeState({ tracks, playheadPosition: 2.5, focusedTrackIndex: 1, selectedTrackIndices: [0], timeSelection: onT1 }));
    handleBracketEdge(keyEvent({ shiftKey: true }), false, deps);
    const [p] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(p.tracks).toEqual([1]); // t2's now
    expect(p.endTime).toBe(4); // the range was 2..3; t2's next edge after 3 is 4
    // A multi-track range (scope [0, 1]) with t1 focused keeps both tracks
    const multi = { startTime: 2, endTime: 3, tracks: [0, 1] };
    const deps2 = makeDeps(makeState({ tracks, playheadPosition: 2.5, focusedTrackIndex: 0, selectedTrackIndices: [0, 1], timeSelection: multi }));
    handleBracketEdge(keyEvent({ shiftKey: true }), true, deps2);
    expect(tsPayloads(deps2.dispatch as ReturnType<typeof vi.fn>)[0].tracks).toEqual([0, 1]);
  });
});

describe('Shift+Arrow — the range follows the track you are on too (2026-10-13)', () => {
  it('a focused track outside the selection\'s scope takes the range over', () => {
    const tracks = [
      { id: 1, name: 't1', clips: [] },
      { id: 2, name: 't2', clips: [] },
    ] as unknown as TracksState['tracks'];
    const onT1 = { startTime: 2, endTime: 3, tracks: [0] };
    const deps = makeDeps(makeState({ tracks, playheadPosition: 2.5, focusedTrackIndex: 1, selectedTrackIndices: [0], timeSelection: onT1 }));
    handlePlayheadMove(keyEvent(), false, 0.1, deps);
    const [p] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(p.tracks).toEqual([1]);
  });
});

describe('the track I\'m on is the DOM-focused clip\'s track first (2026-10-13)', () => {
  it('a clip focused on track 2 while track 1 holds the track focus: the brackets walk track 2 and the range selects it', () => {
    const tracks = [
      { id: 1, name: 't1', clips: [{ id: 1, start: 1, duration: 2 }] }, // 1..3
      { id: 2, name: 't2', clips: [{ id: 2, start: 5, duration: 1 }] }, // 5..6
    ] as unknown as TracksState['tracks'];
    const deps = { ...makeDeps(makeState({ tracks, playheadPosition: 0, focusedTrackIndex: 0, selectedTrackIndices: [0] })), trackImOn: () => 1 };
    handleBracketEdge(keyEvent({ shiftKey: false }), false, deps);
    const playheads = deps.dispatch.mock.calls.filter((c) => c[0].type === 'SET_PLAYHEAD_POSITION').map((c) => c[0].payload);
    expect(playheads).toEqual([5]); // t2's first edge, not t1's 1
    handleBracketEdge(keyEvent({ shiftKey: true }), false, deps);
    expect(tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>)[0]).toMatchObject({ startTime: 0, endTime: 5, tracks: [1] });
  });
});
