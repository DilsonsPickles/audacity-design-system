import { describe, it, expect, vi } from 'vitest';
import type { SetStateAction } from 'react';
import { handleCopy, handleCut, handlePaste } from '../clipboardHandlers';
import { initialState, type TracksState, type Clip } from '../../../contexts/TracksContext';
import type { ClipboardState } from '../../useKeyboardShortcuts';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: '',
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const makeDeps = (state: TracksState) => {
  let clipboard: ClipboardState | null = null;
  const setClipboard = vi.fn((v: SetStateAction<ClipboardState | null>) => {
    clipboard = typeof v === 'function' ? v(clipboard) : v;
  });
  return {
    deps: {
      state,
      dispatch: vi.fn(),
      clipboard,
      setClipboard,
      audioManagerRef: { current: null as unknown as AudioPlaybackManager },
    },
    getClipboard: () => clipboard,
  };
};

const stateWith = (tracks: TracksState['tracks'], extra: Partial<TracksState> = {}): TracksState =>
  ({ ...initialState, tracks, ...extra } as TracksState);

describe('handleCopy — wholeGroupIds capture', () => {
  it('copying every member of a group records it whole', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, selected: true, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual(['g1']);
  });

  it('copying part of a group records nothing (partial -> ungrouped on paste)', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual([]);
  });

  it('time-selection copy: group whole only when all members covered untrimmed', () => {
    // Members at [0,1) and [2,3). Selection [0,2.5) slices the second -> not whole.
    const state = stateWith(
      [
        { id: 1, name: 't', clips: [
          clip({ id: 10, groupId: 'g1' }),
          clip({ id: 11, groupId: 'g1', start: 2 }),
        ] },
      ],
      { timeSelection: { startTime: 0, endTime: 2.5 }, selectedTrackIndices: [0] },
    );
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.timeSelection).toBeDefined();
    expect(getClipboard()?.wholeGroupIds).toEqual([]);
  });

  it('time-selection copy covering all members whole records the group', () => {
    const state = stateWith(
      [
        { id: 1, name: 't', clips: [
          clip({ id: 10, groupId: 'g1' }),
          clip({ id: 11, groupId: 'g1', start: 2 }),
        ] },
      ],
      { timeSelection: { startTime: 0, endTime: 3 }, selectedTrackIndices: [0] },
    );
    const { deps, getClipboard } = makeDeps(state);
    handleCopy(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual(['g1']);
  });
});

describe('handleCut — wholeGroupIds capture + source dissolution', () => {
  it('cutting whole group records it whole and removes the clips', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, selected: true, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps, getClipboard } = makeDeps(state);
    handleCut(deps);
    expect(getClipboard()?.wholeGroupIds).toEqual(['g1']);
    expect(deps.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REPLACE_TRACKS_EDIT' })
    );
  });

  it('cutting one member dissolves the survivors below 2 (source-side corollary)', () => {
    const state = stateWith([
      { id: 1, name: 't', clips: [
        clip({ id: 10, selected: true, groupId: 'g1' }),
        clip({ id: 11, groupId: 'g1', start: 2 }),
      ] },
    ]);
    const { deps } = makeDeps(state);
    handleCut(deps);
    const replace = (deps.dispatch as ReturnType<typeof vi.fn>).mock.calls
      .find(c => c[0].type === 'REPLACE_TRACKS_EDIT')![0];
    const survivor = replace.payload[0].clips.find((c: Clip) => c.id === 11);
    expect(survivor.groupId).toBeUndefined();
  });
});

describe('handlePaste — regrouping', () => {
  const groupedClipboardState = () => stateWith(
    [
      { id: 1, name: 't', clips: [
        clip({ id: 10, groupId: 'g1' }),
        clip({ id: 11, groupId: 'g1', start: 2 }),
      ] },
    ],
    { focusedTrackIndex: 0, playheadPosition: 10 },
  );

  const clipboardWith = (wholeGroupIds?: string[]): ClipboardState => ({
    clips: [
      { ...clip({ id: 10, groupId: 'g1' }), trackIndex: 0 },
      { ...clip({ id: 11, groupId: 'g1', start: 2 }), trackIndex: 0 },
    ],
    operation: 'copy',
    ...(wholeGroupIds !== undefined ? { wholeGroupIds } : {}),
  });

  const pastedClips = (dispatch: ReturnType<typeof vi.fn>): Clip[] => {
    const replace = dispatch.mock.calls.find(c => c[0].type === 'REPLACE_TRACKS_EDIT')![0];
    // Pasted copies are the clips whose ids did not exist before (ids 10/11 are the originals).
    return replace.payload[0].clips.filter((c: Clip) => c.id > 11);
  };

  it('whole group in clipboard -> pasted copies share a fresh group', () => {
    const state = groupedClipboardState();
    const { deps } = makeDeps(state);
    handlePaste({ ...deps, clipboard: clipboardWith(['g1']) });
    const pasted = pastedClips(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(pasted).toHaveLength(2);
    expect(pasted[0].groupId).toBeDefined();
    expect(pasted[0].groupId).toBe(pasted[1].groupId);
    expect(pasted[0].groupId).not.toBe('g1');
  });

  it('partial group in clipboard -> pasted copies ungrouped', () => {
    const state = groupedClipboardState();
    const { deps } = makeDeps(state);
    const partial: ClipboardState = {
      clips: [{ ...clip({ id: 10, groupId: 'g1' }), trackIndex: 0 }],
      operation: 'copy',
      wholeGroupIds: [],
    };
    handlePaste({ ...deps, clipboard: partial });
    const pasted = pastedClips(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(pasted).toHaveLength(1);
    expect(pasted[0].groupId).toBeUndefined();
  });

  it('clipboard without wholeGroupIds (legacy/context-menu) -> ungrouped', () => {
    const state = groupedClipboardState();
    const { deps } = makeDeps(state);
    handlePaste({ ...deps, clipboard: clipboardWith(undefined) });
    const pasted = pastedClips(deps.dispatch as ReturnType<typeof vi.fn>);
    expect(pasted.every(c => c.groupId === undefined)).toBe(true);
  });

  it('pasting twice mints two independent fresh groups', () => {
    const state = groupedClipboardState();
    const first = makeDeps(state);
    handlePaste({ ...first.deps, clipboard: clipboardWith(['g1']) });
    const second = makeDeps(state);
    handlePaste({ ...second.deps, clipboard: clipboardWith(['g1']) });
    const a = pastedClips(first.deps.dispatch as ReturnType<typeof vi.fn>)[0].groupId;
    const b = pastedClips(second.deps.dispatch as ReturnType<typeof vi.fn>)[0].groupId;
    expect(a).toBeDefined();
    expect(a).not.toBe(b);
  });
});
