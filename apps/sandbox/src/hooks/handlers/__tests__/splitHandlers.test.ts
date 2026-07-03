import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleSplitAtPlayhead, handleSplitAllTracks } from '../splitHandlers';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const keyEvent = (over = {}) =>
  ({ key: 'i', metaKey: true, ctrlKey: false, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

afterEach(() => { document.body.innerHTML = ''; });

describe('handleSplitAtPlayhead', () => {
  it('splits the focused clip at the playhead (dispatches APPLY_CLIP_PLACEMENT)', () => {
    // A track with one clip spanning the playhead.
    const state = makeState({
      playheadPosition: 2,
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'c', start: 0, duration: 5, envelopePoints: [] },
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
    handleSplitAtPlayhead(keyEvent(), { state, dispatch });

    const types = dispatch.mock.calls.map(c => c[0].type);
    expect(types).toContain('APPLY_CLIP_PLACEMENT');

    // Concrete payload assertion: the mutation must be type 'split' for clip id 10.
    // Source: splitHandlers.ts lines 126-132 — mutations.push({ type: 'split', clipId: clip.id, ... })
    const placementCall = dispatch.mock.calls.find(c => c[0].type === 'APPLY_CLIP_PLACEMENT');
    const mutation = placementCall![0].payload.mutations[0];
    expect(mutation.type).toBe('split');
    expect(mutation.clipId).toBe(10);
  });
});

describe('handleSplitAllTracks', () => {
  it('splits clips on all tracks at the playhead (dispatches APPLY_CLIP_PLACEMENT with split mutations for each track)', () => {
    // Two tracks, each with a clip spanning the playhead at position 3.
    // handleSplitAllTracks does NOT read document.activeElement — no DOM staging needed.
    const state = makeState({
      playheadPosition: 3,
      tracks: [
        { id: 1, name: 'track-a', clips: [
          { id: 10, name: 'clip-a', start: 0, duration: 8, envelopePoints: [] },
        ] },
        { id: 2, name: 'track-b', clips: [
          { id: 20, name: 'clip-b', start: 1, duration: 10, envelopePoints: [] },
        ] },
      ],
    });

    const dispatch = vi.fn();
    handleSplitAllTracks(keyEvent({ shiftKey: true }), { state, dispatch });

    const types = dispatch.mock.calls.map(c => c[0].type);
    expect(types).toContain('APPLY_CLIP_PLACEMENT');

    // Concrete payload assertion: one mutation per clip, each with type: 'split'
    // and leftEnd / rightStart equal to the playhead (3).
    // Source: splitHandlers.ts lines 181-188 — mutations.push({ type: 'split', clipId: c.id, leftEnd: playhead, rightStart: playhead })
    const placementCall = dispatch.mock.calls.find(c => c[0].type === 'APPLY_CLIP_PLACEMENT');
    const mutations = placementCall![0].payload.mutations as Array<{ type: string; clipId: number; leftEnd: number; rightStart: number }>;

    expect(mutations).toHaveLength(2);

    const mutForClip10 = mutations.find(m => m.clipId === 10);
    expect(mutForClip10).toBeDefined();
    expect(mutForClip10!.type).toBe('split');
    expect(mutForClip10!.leftEnd).toBe(3);
    expect(mutForClip10!.rightStart).toBe(3);

    const mutForClip20 = mutations.find(m => m.clipId === 20);
    expect(mutForClip20).toBeDefined();
    expect(mutForClip20!.type).toBe('split');
  });
});
