import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleDuplicate } from '../duplicateHandlers';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const keyEvent = (over = {}) =>
  ({ key: 'd', metaKey: false, ctrlKey: true, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

afterEach(() => { document.body.innerHTML = ''; });

describe('handleDuplicate', () => {
  it('duplicates the focused clip (dispatches ADD_CLIP)', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'c', start: 0, duration: 3, envelopePoints: [] },
      ] }],
    });

    // The handler reads document.activeElement, then calls .closest('[data-clip-id]')
    // on it to find the clip wrapper element. From that wrapper element it reads
    // BOTH data-clip-id and data-track-index. Both attributes must be on the same
    // element that .closest('[data-clip-id]') resolves to.
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('data-track-index', '0');
    el.setAttribute('tabindex', '-1');
    document.body.appendChild(el);
    el.focus();

    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const types = dispatch.mock.calls.map(c => c[0].type);
    expect(types).toContain('ADD_CLIP');

    // Concrete payload assertion: the duplicate's `start` equals the source clip's
    // start + duration (i.e. it is placed immediately after the original).
    // Source: duplicateHandlers.ts line 63 — start: clip.start + clip.duration
    // Original clip: start=0, duration=3  →  duplicate start must be 3.
    const addClipCall = dispatch.mock.calls.find(c => c[0].type === 'ADD_CLIP');
    const dupClip = addClipCall![0].payload.clip;
    expect(dupClip.start).toBe(3); // 0 (start) + 3 (duration)
  });

  it('duplicating a whole group yields a FRESH group (not the original id)', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], selected: true, groupId: 'g1' },
        { id: 11, name: 'b', start: 2, duration: 1, envelopePoints: [], selected: true, groupId: 'g1' },
      ] }],
    });
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('data-track-index', '0');
    el.setAttribute('tabindex', '-1');
    document.body.appendChild(el);
    el.focus();

    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const dups = dispatch.mock.calls
      .filter(c => c[0].type === 'ADD_CLIP')
      .map(c => c[0].payload.clip);
    expect(dups).toHaveLength(2);
    expect(dups[0].groupId).toBeDefined();
    expect(dups[0].groupId).toBe(dups[1].groupId);
    expect(dups[0].groupId).not.toBe('g1');
  });

  it('duplicating a focused-out-of-selection grouped clip yields an UNGROUPED copy', () => {
    // Focused clip 10 is NOT selected -> only it is duplicated -> partial group.
    const state = makeState({
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        { id: 11, name: 'b', start: 2, duration: 1, envelopePoints: [], groupId: 'g1' },
      ] }],
    });
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('data-track-index', '0');
    el.setAttribute('tabindex', '-1');
    document.body.appendChild(el);
    el.focus();

    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const dups = dispatch.mock.calls
      .filter(c => c[0].type === 'ADD_CLIP')
      .map(c => c[0].payload.clip);
    expect(dups).toHaveLength(1);
    expect(dups[0].groupId).toBeUndefined();
  });

  it('duplicating a track regroups a same-track group fresh', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      selectedTrackIndices: [],
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        { id: 11, name: 'b', start: 2, duration: 1, envelopePoints: [], groupId: 'g1' },
      ] }],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const added = dispatch.mock.calls.find(c => c[0].type === 'ADD_TRACK')![0].payload;
    expect(added.clips[0].groupId).toBeDefined();
    expect(added.clips[0].groupId).toBe(added.clips[1].groupId);
    expect(added.clips[0].groupId).not.toBe('g1');
  });

  it('duplicating one track of a cross-track group ungroups the copies', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      selectedTrackIndices: [],
      tracks: [
        { id: 1, name: 't1', clips: [
          { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
        { id: 2, name: 't2', clips: [
          { id: 11, name: 'b', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
      ],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const added = dispatch.mock.calls.find(c => c[0].type === 'ADD_TRACK')![0].payload;
    expect(added.clips[0].groupId).toBeUndefined();
  });

  it('duplicating BOTH tracks of a cross-track group keeps the copies grouped (fresh id, spanning both new tracks)', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      selectedTrackIndices: [0, 1],
      tracks: [
        { id: 1, name: 't1', clips: [
          { id: 10, name: 'a', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
        { id: 2, name: 't2', clips: [
          { id: 11, name: 'b', start: 0, duration: 1, envelopePoints: [], groupId: 'g1' },
        ] },
      ],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const addedTracks = dispatch.mock.calls
      .filter(c => c[0].type === 'ADD_TRACK')
      .map(c => c[0].payload);
    expect(addedTracks).toHaveLength(2);
    const [gidA, gidB] = [addedTracks[0].clips[0].groupId, addedTracks[1].clips[0].groupId];
    expect(gidA).toBeDefined();
    expect(gidA).toBe(gidB);
    expect(gidA).not.toBe('g1');
  });
});
