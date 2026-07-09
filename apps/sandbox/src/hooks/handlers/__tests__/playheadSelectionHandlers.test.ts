import { describe, it, expect, vi } from 'vitest';
import { handlePlayheadMove } from '../playheadSelectionHandlers';
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
