import { describe, it, expect, vi } from 'vitest';
import { computeProjectEnd, handleHomeEnd, handleTrackFocus } from '../navigationHandlers';
import { initialState, type TracksState } from '../../../contexts/TracksContext';

const makeState = (o: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, ...o } as TracksState);

const keyEvent = (over: Record<string, unknown> = {}) =>
  ({ key: 'Home', shiftKey: true, preventDefault: () => {}, ...over } as unknown as KeyboardEvent);

const makeDeps = (state: TracksState) => ({
  state,
  dispatch: vi.fn(),
  selectionAnchor: null,
  setSelectionAnchor: () => {},
  selectionAnchorRef: { current: null as number | null },
  selectionEdgesRef: { current: null as { startTime: number; endTime: number } | null },
  isFlatNavigation: false,
  scrollPlayheadIntoView: () => {},
  trackSelectionMode: 'classic' as const,
});

const tsPayloads = (dispatch: ReturnType<typeof vi.fn>) =>
  dispatch.mock.calls.filter((c) => c[0].type === 'SET_TIME_SELECTION').map((c) => c[0].payload);

describe('handleHomeEnd — scope stamping', () => {
  it('Shift+Home stamps the focused track as scope and does not touch track selection', () => {
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
    handleHomeEnd(keyEvent(), deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([1]);
    const types = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('SET_SELECTED_TRACKS');
  });

  it('Shift+Home preserves an existing scope instead of restamping', () => {
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
    deps.selectionAnchorRef.current = 5;
    handleHomeEnd(keyEvent(), deps);

    const [payload] = tsPayloads(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(payload.tracks).toEqual([1]);
  });
});

describe('handleHomeEnd — plain Home/End are selection-neutral skips', () => {
  const tracksWithContent = [
    { id: 1, name: 't1', clips: [{ id: 1, name: 'a', start: 1, duration: 3, envelopePoints: [] }] },
    { id: 2, name: 'm', type: 'midi', clips: [], midiClips: [{ id: 2, name: 'mc', start: 4, duration: 2.5, trimStart: 0, notes: [] }] },
  ] as TracksState['tracks'];

  it('plain Home moves the playhead to 0 without clearing the time selection', () => {
    const state = makeState({
      tracks: tracksWithContent,
      playheadPosition: 3,
      timeSelection: { startTime: 1, endTime: 2 },
    });
    const deps = makeDeps(state);
    handleHomeEnd(keyEvent({ shiftKey: false }), deps);

    const types = deps.dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('SET_PLAYHEAD_POSITION');
    expect(deps.dispatch.mock.calls.find((c) => c[0].type === 'SET_PLAYHEAD_POSITION')![0].payload).toBe(0);
    // Persistent-selection model: playhead moves never destroy a selection
    expect(types).not.toContain('SET_TIME_SELECTION');
    // Shift-extend anchors still reset so the next Shift+Arrow starts fresh
    expect(deps.selectionAnchorRef.current).toBeNull();
  });

  it('plain End moves the playhead to the project end (audio + MIDI), selection kept', () => {
    const state = makeState({
      tracks: tracksWithContent,
      playheadPosition: 0,
      timeSelection: { startTime: 1, endTime: 2 },
    });
    const deps = makeDeps(state);
    handleHomeEnd(keyEvent({ key: 'End', shiftKey: false }), deps);

    const posCall = deps.dispatch.mock.calls.find((c) => c[0].type === 'SET_PLAYHEAD_POSITION')!;
    expect(posCall[0].payload).toBe(6.5); // MIDI clip ends latest: 4 + 2.5
    expect(deps.dispatch.mock.calls.map((c) => c[0].type)).not.toContain('SET_TIME_SELECTION');
  });

  it('computeProjectEnd covers audio and MIDI clips', () => {
    expect(computeProjectEnd(tracksWithContent)).toBe(6.5);
    expect(computeProjectEnd([])).toBe(0);
  });
});


describe('handleTrackFocus — folder headers are never a focus stop', () => {
  const folderTracks = () =>
    [
      { id: 1, name: 't1', clips: [] },
      { id: 10, name: 'G', type: 'folder', clips: [] },
      { id: 2, name: 't2', folderId: 10, clips: [] },
      { id: 3, name: 't3', folderId: 10, clips: [] },
      { id: 4, name: 't4', clips: [] },
    ] as unknown as TracksState['tracks'];

  const focusPayloads = (dispatch: ReturnType<typeof vi.fn>) =>
    dispatch.mock.calls.filter((c) => c[0].type === 'SET_FOCUSED_TRACK').map((c) => c[0].payload);

  it('ArrowDown from above a folder lands on its first child, not the header', () => {
    const deps = makeDeps(makeState({ tracks: folderTracks(), focusedTrackIndex: 0 }));
    handleTrackFocus(keyEvent({ key: 'ArrowDown', shiftKey: false }), deps);
    expect(focusPayloads(deps.dispatch as ReturnType<typeof vi.fn>)).toEqual([2]);
  });

  it('ArrowUp from the first child steps over the header to the row above', () => {
    const deps = makeDeps(makeState({ tracks: folderTracks(), focusedTrackIndex: 2 }));
    handleTrackFocus(keyEvent({ key: 'ArrowUp', shiftKey: false }), deps);
    expect(focusPayloads(deps.dispatch as ReturnType<typeof vi.fn>)).toEqual([0]);
  });

  it('a collapsed folder is skipped whole', () => {
    const tracks = folderTracks();
    (tracks[1] as { collapsed?: boolean }).collapsed = true;
    const deps = makeDeps(makeState({ tracks, focusedTrackIndex: 0 }));
    handleTrackFocus(keyEvent({ key: 'ArrowDown', shiftKey: false }), deps);
    expect(focusPayloads(deps.dispatch as ReturnType<typeof vi.fn>)).toEqual([4]);
  });

  it('with no focus yet, the first stop is the first FOCUSABLE row even when the list starts with a folder', () => {
    const tracks = folderTracks().slice(1); // folder first
    const deps = makeDeps(makeState({ tracks, focusedTrackIndex: null }));
    handleTrackFocus(keyEvent({ key: 'ArrowDown', shiftKey: false }), deps);
    expect(focusPayloads(deps.dispatch as ReturnType<typeof vi.fn>)).toEqual([1]);
  });
});
