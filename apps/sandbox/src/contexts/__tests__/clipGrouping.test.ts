import { describe, it, expect } from 'vitest';
import { expandSelectionToGroups, tracksReducer, type Track, type TracksState, type Clip } from '../TracksContext';

const track = (clips: Array<Partial<{ id: number; selected: boolean; groupId: string }>>): Track => ({
  id: 1,
  name: 't',
  clips: clips.map((c, i) => ({
    id: c.id ?? i + 1,
    name: '',
    start: 0,
    duration: 1,
    envelopePoints: [],
    selected: c.selected,
    groupId: c.groupId,
  } as any)),
} as Track);

describe('expandSelectionToGroups', () => {
  it('returns input unchanged when no clip is selected', () => {
    const tracks: Track[] = [
      track([{ id: 1, groupId: 'g1' }, { id: 2, groupId: 'g1' }]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result).toEqual(tracks);
  });

  it('returns input unchanged when selected clips have no groupId', () => {
    const tracks: Track[] = [
      track([{ id: 1, selected: true }, { id: 2 }]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result[0].clips[0].selected).toBe(true);
    expect(result[0].clips[1].selected).toBeFalsy();
  });

  it('expands selection to all clips in the same group on the same track', () => {
    const tracks: Track[] = [
      track([
        { id: 1, selected: true, groupId: 'g1' },
        { id: 2, groupId: 'g1' },
        { id: 3, groupId: 'g2' },
      ]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(result[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(result[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });

  it('expands selection across tracks', () => {
    const tracks: Track[] = [
      track([{ id: 1, selected: true, groupId: 'g1' }]),
      track([{ id: 2, groupId: 'g1' }, { id: 3 }]),
    ];
    const result = expandSelectionToGroups(tracks);
    expect(result[1].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(result[1].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });

  it('is idempotent (running on already-expanded selection changes nothing)', () => {
    const tracks: Track[] = [
      track([
        { id: 1, selected: true, groupId: 'g1' },
        { id: 2, selected: true, groupId: 'g1' },
      ]),
    ];
    const once = expandSelectionToGroups(tracks);
    const twice = expandSelectionToGroups(once);
    expect(twice).toEqual(once);
  });
});

const baseState = (clips: Partial<Clip>[]): TracksState => ({
  tracks: [{
    id: 1,
    name: 't',
    clips: clips.map((c, i) => ({
      id: i + 1,
      name: '',
      start: 0,
      duration: 1,
      envelopePoints: [],
      ...c,
    } as Clip)),
  }],
} as unknown as TracksState);

describe('GROUP_SELECTED_CLIPS', () => {
  it('assigns a fresh groupId to all selected clips', () => {
    const state = baseState([
      { id: 1, selected: true },
      { id: 2, selected: true },
      { id: 3 },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const clip1 = next.tracks[0].clips.find(c => c.id === 1)!;
    const clip2 = next.tracks[0].clips.find(c => c.id === 2)!;
    const clip3 = next.tracks[0].clips.find(c => c.id === 3)!;
    expect(clip1.groupId).toBeDefined();
    expect(clip1.groupId).toBe(clip2.groupId);
    expect(clip3.groupId).toBeUndefined();
  });

  it('shrinks an old group when some of its members are pulled into a new group', () => {
    const state = baseState([
      { id: 1, selected: true, groupId: 'old' },
      { id: 2, selected: true, groupId: 'old' },
      { id: 3, groupId: 'old' },
      { id: 4, groupId: 'old' },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const c1 = next.tracks[0].clips.find(c => c.id === 1)!;
    const c2 = next.tracks[0].clips.find(c => c.id === 2)!;
    const c3 = next.tracks[0].clips.find(c => c.id === 3)!;
    const c4 = next.tracks[0].clips.find(c => c.id === 4)!;
    expect(c1.groupId).toBe(c2.groupId);
    expect(c1.groupId).not.toBe('old');
    expect(c3.groupId).toBe('old');
    expect(c4.groupId).toBe('old');
  });

  it('dissolves an old group when only 1 member would remain (clears that lone member)', () => {
    const state = baseState([
      { id: 1, selected: true, groupId: 'old' },
      { id: 2, selected: true, groupId: 'old' },
      { id: 3, groupId: 'old' },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const c3 = next.tracks[0].clips.find(c => c.id === 3)!;
    expect(c3.groupId).toBeUndefined();
  });

  it('handles selected clips from multiple existing groups (each old group dissolves or shrinks)', () => {
    const state = baseState([
      { id: 1, selected: true, groupId: 'A' },
      { id: 2, selected: true, groupId: 'B' },
      { id: 3, groupId: 'A' },
      { id: 4, groupId: 'B' },
      { id: 5, groupId: 'A' },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    const c1 = next.tracks[0].clips.find(c => c.id === 1)!;
    const c2 = next.tracks[0].clips.find(c => c.id === 2)!;
    const c3 = next.tracks[0].clips.find(c => c.id === 3)!;
    const c4 = next.tracks[0].clips.find(c => c.id === 4)!;
    const c5 = next.tracks[0].clips.find(c => c.id === 5)!;
    expect(c1.groupId).toBe(c2.groupId);
    expect(c1.groupId).not.toBe('A');
    expect(c1.groupId).not.toBe('B');
    expect(c3.groupId).toBe('A');
    expect(c5.groupId).toBe('A');
    expect(c4.groupId).toBeUndefined();
  });

  it('does nothing if fewer than 2 clips are selected', () => {
    const state = baseState([
      { id: 1, selected: true },
      { id: 2 },
    ]);
    const next = tracksReducer(state, { type: 'GROUP_SELECTED_CLIPS' });
    expect(next.tracks[0].clips[0].groupId).toBeUndefined();
  });
});

describe('UNGROUP_CLIPS', () => {
  it('clears groupId on every clip with the matching groupId', () => {
    const state = baseState([
      { id: 1, groupId: 'A' },
      { id: 2, groupId: 'A' },
      { id: 3, groupId: 'A' },
    ]);
    const next = tracksReducer(state, { type: 'UNGROUP_CLIPS', payload: { groupId: 'A' } });
    expect(next.tracks[0].clips.every(c => c.groupId === undefined)).toBe(true);
  });

  it('leaves clips in other groups untouched', () => {
    const state = baseState([
      { id: 1, groupId: 'A' },
      { id: 2, groupId: 'A' },
      { id: 3, groupId: 'B' },
      { id: 4, groupId: 'B' },
    ]);
    const next = tracksReducer(state, { type: 'UNGROUP_CLIPS', payload: { groupId: 'A' } });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.groupId).toBeUndefined();
    expect(next.tracks[0].clips.find(c => c.id === 3)?.groupId).toBe('B');
    expect(next.tracks[0].clips.find(c => c.id === 4)?.groupId).toBe('B');
  });

  it('is a no-op when no clip has the target groupId', () => {
    const state = baseState([
      { id: 1, groupId: 'A' },
    ]);
    const next = tracksReducer(state, { type: 'UNGROUP_CLIPS', payload: { groupId: 'nonexistent' } });
    expect(next.tracks[0].clips[0].groupId).toBe('A');
  });
});

describe('SELECT_CLIP auto-expansion', () => {
  it('selecting a grouped clip selects all members in the same group on the same track', () => {
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3 },
    ]);
    const next = tracksReducer(state, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });

  it('selecting a grouped clip expands selection across tracks', () => {
    const state: TracksState = {
      tracks: [
        { id: 1, name: 't1', clips: [
          { id: 1, name: '', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' } as any,
        ] },
        { id: 2, name: 't2', clips: [
          { id: 2, name: '', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' } as any,
        ] },
      ],
    } as unknown as TracksState;

    const next = tracksReducer(state, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips[0].selected).toBe(true);
    expect(next.tracks[1].clips[0].selected).toBe(true);
    expect(next.selectedTrackIndices).toEqual(expect.arrayContaining([0, 1]));
  });

  it('selecting an ungrouped clip behaves as before (single selection)', () => {
    const state = baseState([
      { id: 1 },
      { id: 2, groupId: 'g1' },
      { id: 3, groupId: 'g1' },
    ]);
    const next = tracksReducer(state, {
      type: 'SELECT_CLIP',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBeFalsy();
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });
});

describe('TOGGLE_CLIP_SELECTION auto-expansion', () => {
  it('toggling a grouped clip into selected expands to all group members', () => {
    const state = baseState([
      { id: 1, groupId: 'g1' },
      { id: 2, groupId: 'g1' },
      { id: 3 },
    ]);
    const next = tracksReducer(state, {
      type: 'TOGGLE_CLIP_SELECTION',
      payload: { trackIndex: 0, clipId: 1 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBeFalsy();
  });
});

describe('SELECT_CLIP_RANGE auto-expansion', () => {
  it('range selection that includes a grouped clip expands to its group members', () => {
    const seeded: TracksState = {
      ...baseState([
        { id: 1, groupId: 'g1' },
        { id: 2 },
        { id: 3, groupId: 'g1' },
      ]),
      lastSelectedClip: { trackIndex: 0, clipId: 1 },
    } as TracksState;

    const next = tracksReducer(seeded, {
      type: 'SELECT_CLIP_RANGE',
      payload: { trackIndex: 0, clipId: 2 },
    });
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 3)?.selected).toBe(true);
  });
});
