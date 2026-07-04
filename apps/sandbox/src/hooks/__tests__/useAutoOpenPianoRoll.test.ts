// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useAutoOpenPianoRoll } from '../useAutoOpenPianoRoll';
import { initialState } from '../../contexts/TracksContext';

afterEach(cleanup);

describe('useAutoOpenPianoRoll', () => {
  it('dispatches SET_PIANO_ROLL_OPEN when a MIDI track becomes focused', () => {
    const dispatch = vi.fn();
    const midiState = {
      ...initialState,
      focusedTrackIndex: 0,
      tracks: [
        {
          id: 1,
          name: 't',
          type: 'midi' as const,
          clips: [],
          midiClips: [],
        },
      ],
    };
    renderHook(() => useAutoOpenPianoRoll({ state: midiState as any, dispatch }));
    expect(dispatch.mock.calls.some((c) => c[0].type === 'SET_PIANO_ROLL_OPEN')).toBe(true);
  });

  it('does not dispatch when the focused track is not MIDI', () => {
    const dispatch = vi.fn();
    const audioState = {
      ...initialState,
      focusedTrackIndex: 0,
      tracks: [
        {
          id: 1,
          name: 't',
          type: 'audio' as const,
          clips: [],
        },
      ],
    };
    renderHook(() => useAutoOpenPianoRoll({ state: audioState as any, dispatch }));
    expect(dispatch.mock.calls.some((c) => c[0].type === 'SET_PIANO_ROLL_OPEN')).toBe(false);
  });
});
