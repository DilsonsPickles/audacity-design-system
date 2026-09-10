import { describe, it, expect, vi } from 'vitest';
import { handlePlayheadMove, handleSetSelectionBoundary } from '../playheadSelectionHandlers';
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

  it('Shift+ArrowRight preserves an existing scope instead of restamping', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [] },
        { id: 2, name: 't2', clips: [] },
      ] as TracksState['tracks'],
      focusedTrackIndex: 0,
      playheadPosition: 5,
      timeSelection: { startTime: 2, endTime: 5, tracks: [1] },
    });
    const deps = makeDeps(state);
    handlePlayheadMove(keyEvent(), false, 0.1, deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([1]);
    const types = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('SET_SELECTED_TRACKS');
  });
});

describe('handleSetSelectionBoundary — [ and ] set edges at the playhead', () => {
  const twoTracks = () => [
    { id: 1, name: 't1', clips: [] },
    { id: 2, name: 't2', clips: [] },
  ] as TracksState['tracks'];

  it('] extends the right edge to a playhead beyond it, keeping the scope', () => {
    const state = makeState({
      tracks: twoTracks(),
      playheadPosition: 8,
      timeSelection: { startTime: 2, endTime: 5, tracks: [0, 1] },
    });
    const deps = makeDeps(state);
    handleSetSelectionBoundary('right', deps);
    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload).toMatchObject({ startTime: 2, endTime: 8, tracks: [0, 1] });
  });

  it('] with the playhead inside the range shrinks from the right', () => {
    const state = makeState({
      tracks: twoTracks(),
      playheadPosition: 4,
      timeSelection: { startTime: 2, endTime: 5, tracks: [0] },
    });
    const deps = makeDeps(state);
    handleSetSelectionBoundary('right', deps);
    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload).toMatchObject({ startTime: 2, endTime: 4 });
  });

  it('[ past the right edge swaps the edges instead of clamping', () => {
    const state = makeState({
      tracks: twoTracks(),
      playheadPosition: 9,
      timeSelection: { startTime: 2, endTime: 5, tracks: [1] },
    });
    const deps = makeDeps(state);
    handleSetSelectionBoundary('left', deps);
    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload).toMatchObject({ startTime: 5, endTime: 9, tracks: [1] });
  });

  it('with no selection, creates a zero-width range at the playhead seeded from the track selection', () => {
    const state = makeState({
      tracks: twoTracks(),
      playheadPosition: 3,
      selectedTrackIndices: [0, 1],
      timeSelection: null,
    });
    const deps = makeDeps(state);
    handleSetSelectionBoundary('left', deps);
    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload).toMatchObject({ startTime: 3, endTime: 3, tracks: [0, 1] });
    expect(deps.selectionEdgesRef.current).toEqual({ startTime: 3, endTime: 3 });
  });
});
