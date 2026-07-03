import { describe, it, expect, vi } from 'vitest';
import { handleTrackCreation } from '../trackCreationHandlers';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const keyEvent = (over: Partial<KeyboardEvent>) =>
  ({ metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

describe('handleTrackCreation', () => {
  it('Cmd+T adds a mono audio track', () => {
    const dispatch = vi.fn();
    handleTrackCreation(keyEvent({ key: 't', metaKey: true }), { state: makeState(), dispatch });
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_TRACK');
    expect(action.payload.type).toBe('audio');
    expect(action.payload.channelSplitRatio).toBeUndefined();
  });

  it('Cmd+Shift+T adds a stereo audio track (channelSplitRatio 0.5)', () => {
    const dispatch = vi.fn();
    handleTrackCreation(keyEvent({ key: 't', metaKey: true, shiftKey: true }), { state: makeState(), dispatch });
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_TRACK');
    expect(action.payload.type).toBe('audio');
    expect(action.payload.channelSplitRatio).toBe(0.5);
  });

  it('Cmd+Shift+L adds a label track', () => {
    const dispatch = vi.fn();
    handleTrackCreation(keyEvent({ key: 'l', metaKey: true, shiftKey: true }), { state: makeState(), dispatch });
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_TRACK');
    expect(action.payload.type).toBe('label');
  });
});
