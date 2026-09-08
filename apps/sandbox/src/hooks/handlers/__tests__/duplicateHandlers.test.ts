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

describe('handleDuplicate — time-selection duplicate to new tracks', () => {
  const waveform = [0.1, -0.2, 0.3];
  const addTrackPayloads = (dispatch: ReturnType<typeof vi.fn>) =>
    dispatch.mock.calls.filter((c) => c[0].type === 'ADD_TRACK').map((c) => c[0].payload);

  it('duplicates the selected range of a clip onto a new track below the source', () => {
    const state = makeState({
      tracks: [
        {
          id: 1, name: 'Mono 1',
          clips: [{ id: 7, name: 'clip', start: 0, duration: 10, trimStart: 2, waveform, envelopePoints: [] }],
        },
      ],
      timeSelection: { startTime: 3, endTime: 5 },
      selectedTrackIndices: [],
    });
    const dispatch = vi.fn();
    const preventDefault = vi.fn();
    handleDuplicate(keyEvent({ preventDefault }), { state, dispatch });

    expect(preventDefault).toHaveBeenCalled();
    const [payload] = addTrackPayloads(dispatch);
    expect(payload).toBeDefined();
    expect(payload.name).toBe('Mono 1 copy');
    expect(payload.insertAt).toBe(1);
    expect(payload.id).toBe(2);
    expect(payload.clips).toHaveLength(1);

    const clone = payload.clips[0];
    // Trimmed to the selection: same timeline position, 2 s long,
    // trimStart advanced by the clipped-off left portion (3 s).
    expect(clone.start).toBe(3);
    expect(clone.duration).toBe(2);
    expect(clone.trimStart).toBe(5); // 2 (original) + 3 (left trim)
    expect(clone.fullDuration).toBe(12); // original trimStart 2 + duration 10
    expect(clone.sourceClipId).toBe(7);
    expect(clone.id).not.toBe(7);
    // Waveform shared by REFERENCE — required by the audio engine's
    // buffer-resolution fallback and by memory sanity.
    expect(clone.waveform).toBe(waveform);
    // The persistent selection stays; no clearing dispatch.
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('SET_TIME_SELECTION');
    expect(types).not.toContain('SET_PLAYHEAD_POSITION');
  });

  it('respects the selection track scope and skips non-audio tracks', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 'skipped', clips: [{ id: 1, name: 'c', start: 0, duration: 10, envelopePoints: [] }] },
        { id: 2, name: 'labels', type: 'label', clips: [] },
        { id: 3, name: 'target', clips: [{ id: 2, name: 'c', start: 0, duration: 10, envelopePoints: [] }] },
      ],
      // Scope names tracks 1 (label) and 2 (audio "target") only.
      timeSelection: { startTime: 1, endTime: 2, tracks: [1, 2] },
      selectedTrackIndices: [],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const payloads = addTrackPayloads(dispatch);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].name).toBe('target copy');
    expect(payloads[0].insertAt).toBe(3);
  });

  it('duplicates multiple scoped tracks, inserting below each source', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [{ id: 1, name: 'a', start: 0, duration: 4, envelopePoints: [] }] },
        { id: 2, name: 't2', clips: [{ id: 2, name: 'b', start: 1, duration: 4, envelopePoints: [] }] },
      ],
      timeSelection: { startTime: 1, endTime: 3 },
      selectedTrackIndices: [],
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const payloads = addTrackPayloads(dispatch);
    expect(payloads).toHaveLength(2);
    // Dispatched highest-source-index first so insertAt stays valid.
    expect(payloads[0].name).toBe('t2 copy');
    expect(payloads[0].insertAt).toBe(2);
    expect(payloads[1].name).toBe('t1 copy');
    expect(payloads[1].insertAt).toBe(1);
    // Fresh track ids beyond the existing max.
    expect(payloads.map((p) => p.id).sort()).toEqual([3, 4]);
  });

  it('does nothing (falls through) when the selection captures no audio', () => {
    const state = makeState({
      tracks: [
        { id: 1, name: 't1', clips: [{ id: 1, name: 'c', start: 5, duration: 2, envelopePoints: [] }] },
      ],
      timeSelection: { startTime: 0, endTime: 1 }, // no clip in range
      selectedTrackIndices: [],
      focusedTrackIndex: null,
    });
    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });
    expect(addTrackPayloads(dispatch)).toHaveLength(0);
  });
});
