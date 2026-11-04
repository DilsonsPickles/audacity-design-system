import { useState, useCallback, useMemo } from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

export interface UseMasterMeterOptions {
  /** Post-mix, post-master-volume level on a 0-100 scale from the audio engine. */
  masterMeterLevel: number;
  /** The held recent peak, 0–100 (2026-11-04) */
  masterMeterPeak?: number;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
}

export interface UseMasterMeterReturn {
  masterVolume: number;
  handleMasterVolumeChange: (vol: number) => void;
  masterLevelLeft: number;
  masterLevelRight: number;
  /** The held recent peak in dB, undefined at silence (2026-11-04) */
  masterRecentPeak: number | undefined;
}

/**
 * Hook for managing the master output meter and master volume control.
 * Reads directly from the dedicated master Tone.Meter in the audio engine
 * (post-mix, post-master-volume) and derives display-ready dB levels.
 */
export function useMasterMeter(options: UseMasterMeterOptions): UseMasterMeterReturn {
  const { masterMeterLevel, masterMeterPeak = 0, audioManagerRef } = options;

  const [masterVolume, setMasterVolume] = useState(1);
  const handleMasterVolumeChange = useCallback((vol: number) => {
    setMasterVolume(vol);
    audioManagerRef.current.setMasterVolume(vol);
  }, [audioManagerRef]);

  // Master meter — read directly from the dedicated master Tone.Meter in
  // the audio engine (post-mix, post-master-volume). The audio engine
  // applies its own smoothing, so the displayed value tracks the audio
  // continuously instead of dipping to −60 between samples.
  const masterLevelLeft = useMemo(() => {
    if (masterMeterLevel <= 0) return -60;
    const db = (masterMeterLevel / 100) * 60 - 60;
    return Math.max(-60, Math.min(0, db));
  }, [masterMeterLevel]);
  // Slight stereo simulation until the audio engine exposes per-channel
  // levels — same dB, 0.5 dB attenuated on the right.
  const masterLevelRight = useMemo(() => Math.max(-60, masterLevelLeft - 0.5), [masterLevelLeft]);
  // The held recent peak in dB, for the meter's tick; none at silence
  const masterRecentPeak = useMemo(
    () => (masterMeterPeak <= 0 ? undefined : Math.max(-60, Math.min(0, (masterMeterPeak / 100) * 60 - 60))),
    [masterMeterPeak],
  );

  return {
    masterVolume,
    handleMasterVolumeChange,
    masterLevelLeft,
    masterLevelRight,
    masterRecentPeak,
  };
}
