import { useState, useEffect, useCallback } from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

export interface UseLoopRegionOptions {
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
  timeSelection?: { startTime: number; endTime: number } | null;
  bpm: number;
  beatsPerMeasure: number;
}

export interface UseLoopRegionReturn {
  loopRegionEnabled: boolean;
  setLoopRegionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  loopRegionStart: number | null;
  setLoopRegionStart: React.Dispatch<React.SetStateAction<number | null>>;
  loopRegionEnd: number | null;
  setLoopRegionEnd: React.Dispatch<React.SetStateAction<number | null>>;
  loopRegionInteracting: boolean;
  setLoopRegionInteracting: React.Dispatch<React.SetStateAction<boolean>>;
  loopRegionHovering: boolean;
  setLoopRegionHovering: React.Dispatch<React.SetStateAction<boolean>>;
  toggleLoopRegion: () => void;
}

/**
 * Hook for managing loop region state and synchronization with AudioPlaybackManager.
 * Consolidates loop region state declarations, the sync effect, and the duplicated
 * toggle logic from App.tsx into a single reusable hook.
 */
export function useLoopRegion(options: UseLoopRegionOptions): UseLoopRegionReturn {
  const { audioManagerRef, timeSelection, bpm, beatsPerMeasure } = options;

  // Loop region state - defines looping boundaries for playback
  const [loopRegionEnabled, setLoopRegionEnabled] = useState(false);
  const [loopRegionStart, setLoopRegionStart] = useState<number | null>(null);
  const [loopRegionEnd, setLoopRegionEnd] = useState<number | null>(null);
  const [loopRegionInteracting, setLoopRegionInteracting] = useState(false);
  const [loopRegionHovering, setLoopRegionHovering] = useState(false);

  // Sync loop region with AudioPlaybackManager
  useEffect(() => {
    const audioManager = audioManagerRef.current;
    audioManager.setLoopEnabled(loopRegionEnabled);
    audioManager.setLoopRegion(loopRegionStart, loopRegionEnd);
  }, [loopRegionEnabled, loopRegionStart, loopRegionEnd]);

  /**
   * Toggle loop region on/off.
   * When enabling and no loop region exists, creates one from the current time
   * selection (if available) or defaults to a 4-measure region starting at 0.
   * When disabling, the loop region boundaries are preserved (not cleared).
   */
  const toggleLoopRegion = useCallback(() => {
    if (!loopRegionEnabled) {
      // Enabling loop
      if (loopRegionStart === null || loopRegionEnd === null) {
        // No existing loop region - create one
        if (timeSelection) {
          // Use time selection if available
          setLoopRegionStart(timeSelection.startTime);
          setLoopRegionEnd(timeSelection.endTime);
        } else {
          // Create default 4-measure loop region
          const secondsPerBeat = 60 / bpm;
          const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
          const loopDuration = secondsPerMeasure * 4; // 4 measures
          setLoopRegionStart(0);
          setLoopRegionEnd(loopDuration);
        }
      }
      // If loop region already exists, just enable it without changing start/end
    }
    // Toggle enabled state (doesn't clear the loop region)
    setLoopRegionEnabled(!loopRegionEnabled);
  }, [loopRegionEnabled, loopRegionStart, loopRegionEnd, timeSelection, bpm, beatsPerMeasure]);

  return {
    loopRegionEnabled,
    setLoopRegionEnabled,
    loopRegionStart,
    setLoopRegionStart,
    loopRegionEnd,
    setLoopRegionEnd,
    loopRegionInteracting,
    setLoopRegionInteracting,
    loopRegionHovering,
    setLoopRegionHovering,
    toggleLoopRegion,
  };
}
