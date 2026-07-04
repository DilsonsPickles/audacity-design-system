// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useDrawerTabAutoSwitch } from '../useDrawerTabAutoSwitch';

afterEach(cleanup);

describe('useDrawerTabAutoSwitch', () => {
  it('switches to the mixer tab when showMixer flips true', () => {
    const setDrawerActiveTab = vi.fn();
    const { rerender } = renderHook(
      ({ showMixer }: { showMixer: boolean }) =>
        useDrawerTabAutoSwitch({
          showMixer,
          pianoRollOpen: false,
          drawerActiveTab: 'piano-roll',
          setDrawerActiveTab,
        }),
      { initialProps: { showMixer: false } },
    );
    rerender({ showMixer: true });
    expect(setDrawerActiveTab).toHaveBeenCalledWith('mixer');
  });

  it('switches to the piano-roll tab when pianoRollOpen flips true', () => {
    const setDrawerActiveTab = vi.fn();
    const { rerender } = renderHook(
      ({ pianoRollOpen }: { pianoRollOpen: boolean }) =>
        useDrawerTabAutoSwitch({
          showMixer: false,
          pianoRollOpen,
          drawerActiveTab: 'mixer',
          setDrawerActiveTab,
        }),
      { initialProps: { pianoRollOpen: false } },
    );
    rerender({ pianoRollOpen: true });
    expect(setDrawerActiveTab).toHaveBeenCalledWith('piano-roll');
  });
});
