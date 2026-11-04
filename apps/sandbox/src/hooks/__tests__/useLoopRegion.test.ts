// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { useLoopRegion } from '../useLoopRegion';

afterEach(cleanup);

function makeAudioManagerStub() {
  return {
    setLoopEnabled: vi.fn(),
    setLoopRegion: vi.fn(),
  };
}

function makeAudioManagerRef(stub: ReturnType<typeof makeAudioManagerStub>) {
  // justified: shape-only test stub — useLoopRegion only calls setLoopEnabled/setLoopRegion on the ref
  return { current: stub as unknown as AudioPlaybackManager };
}

describe('useLoopRegion', () => {
  it('toggleLoopRegion defaults to a 4-measure region from bpm when no time selection', () => {
    const stub = makeAudioManagerStub();
    const audioManagerRef = makeAudioManagerRef(stub);
    const { result } = renderHook(() =>
      useLoopRegion({ audioManagerRef, timeSelection: null, bpm: 120, beatsPerMeasure: 4, noteValue: 4 })
    );

    act(() => {
      result.current.toggleLoopRegion();
    });

    expect(result.current.loopRegionEnabled).toBe(true);
    expect(result.current.loopRegionStart).toBe(0);
    // secondsPerBeat = 60/120 = 0.5; secondsPerMeasure = 0.5 * 4 = 2; loopDuration = 2 * 4 measures = 8
    expect(result.current.loopRegionEnd).toBeCloseTo(8);
  });

  it('toggleLoopRegion adopts the active time selection instead of the bpm default', () => {
    const stub = makeAudioManagerStub();
    const audioManagerRef = makeAudioManagerRef(stub);
    const { result } = renderHook(() =>
      useLoopRegion({
        audioManagerRef,
        timeSelection: { startTime: 2, endTime: 5 },
        bpm: 120,
        beatsPerMeasure: 4,
        noteValue: 4,
      })
    );

    act(() => {
      result.current.toggleLoopRegion();
    });

    expect(result.current.loopRegionEnabled).toBe(true);
    expect(result.current.loopRegionStart).toBe(2);
    expect(result.current.loopRegionEnd).toBe(5);
  });

  it('toggling off preserves the existing loop region boundaries', () => {
    const stub = makeAudioManagerStub();
    const audioManagerRef = makeAudioManagerRef(stub);
    const { result } = renderHook(() =>
      useLoopRegion({ audioManagerRef, timeSelection: null, bpm: 120, beatsPerMeasure: 4, noteValue: 4 })
    );

    act(() => {
      result.current.toggleLoopRegion(); // on: creates default region
    });
    act(() => {
      result.current.toggleLoopRegion(); // off: region should be preserved
    });

    expect(result.current.loopRegionEnabled).toBe(false);
    expect(result.current.loopRegionStart).toBe(0);
    expect(result.current.loopRegionEnd).toBeCloseTo(8);
  });

  it('syncs enabled state and region to the audio manager on every change', () => {
    const stub = makeAudioManagerStub();
    const audioManagerRef = makeAudioManagerRef(stub);
    const { result } = renderHook(() =>
      useLoopRegion({ audioManagerRef, timeSelection: null, bpm: 120, beatsPerMeasure: 4, noteValue: 4 })
    );

    // Initial mount sync: disabled, no region yet.
    expect(stub.setLoopEnabled).toHaveBeenCalledWith(false);
    expect(stub.setLoopRegion).toHaveBeenCalledWith(null, null);

    act(() => {
      result.current.setLoopRegionEnabled(true);
    });

    expect(stub.setLoopEnabled).toHaveBeenLastCalledWith(true);
  });
});
