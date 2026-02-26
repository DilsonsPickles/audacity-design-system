import { useState, useRef, useEffect } from 'react';
import { getAudioPlaybackManager, AudioPlaybackManager } from '@audacity-ui/audio';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { RecordingManager } from '../utils/RecordingManager';

export interface UsePlaybackControlsOptions {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  recordingManagerRef: React.RefObject<RecordingManager | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerSecond: number;
  updateDisplayWhilePlaying: boolean;
  pinnedPlayHead: boolean;
  isProgrammaticScrollRef: React.MutableRefObject<boolean>;
}

export interface UsePlaybackControlsReturn {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  handlePlay: () => Promise<void>;
  handleStop: () => Promise<void>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  trackMeterLevels: Map<number, number>;
  setTrackMeterLevels: React.Dispatch<React.SetStateAction<Map<number, number>>>;
}

/**
 * Hook for managing audio playback controls
 * Handles play/pause/stop transport, audio manager initialization,
 * clip reloading, and auto-scroll during playback
 */
export function usePlaybackControls(options: UsePlaybackControlsOptions): UsePlaybackControlsReturn {
  const {
    state,
    dispatch,
    recordingManagerRef,
    scrollContainerRef,
    pixelsPerSecond,
    updateDisplayWhilePlaying,
    pinnedPlayHead,
    isProgrammaticScrollRef,
  } = options;

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioManagerRef = useRef(getAudioPlaybackManager());

  // Track meter levels during playback (trackIndex -> level 0-100)
  const [trackMeterLevels, setTrackMeterLevels] = useState<Map<number, number>>(new Map());

  // Initialize audio playback manager
  useEffect(() => {
    const audioManager = audioManagerRef.current;

    // Initialize Tone.js
    audioManager.initialize();

    // Set up position update callback to sync playhead with audio
    audioManager.setPositionUpdateCallback((position) => {
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: position });
    });

    // Set up meter update callback to display playback levels
    audioManager.setMeterUpdateCallback((trackIndex, level) => {
      setTrackMeterLevels(prev => {
        const next = new Map(prev);
        next.set(trackIndex, level);
        return next;
      });
    });

    // Cleanup on unmount
    return () => {
      audioManager.cleanup();
    };
  }, [dispatch]);

  // Reload clips for playback whenever tracks change (but not during playback/recording)
  useEffect(() => {
    if (!isPlaying && !state.isRecording) {
      const audioManager = audioManagerRef.current;
      audioManager.loadClips(state.tracks, state.playheadPosition);
    }
  }, [state.tracks, isPlaying, state.isRecording, state.playheadPosition]);

  // Handle play/pause transport controls
  const handlePlay = async () => {
    const audioManager = audioManagerRef.current;

    // Use audio manager's state as source of truth, not React state
    if (audioManager.getIsPlaying()) {
      audioManager.pause();
      setIsPlaying(false);
    } else {
      // Always use the current playhead position (which the user may have
      // repositioned via ,/. keys or clicking the timeline)
      audioManager.loadClips(state.tracks, state.playheadPosition);
      await audioManager.play(state.playheadPosition);

      setIsPlaying(true);
    }
  };

  const handleStop = async () => {
    // Stop recording if active
    if (state.isRecording && recordingManagerRef.current) {
      await recordingManagerRef.current.stopRecording();
      dispatch({ type: 'STOP_RECORDING' });
    }

    // Stop playback
    const audioManager = audioManagerRef.current;
    audioManager.stop();
    setIsPlaying(false);
    setTrackMeterLevels(new Map()); // Reset all meter levels to 0
  };

  // Auto-scroll to keep playhead in view during playback
  useEffect(() => {
    // Only auto-scroll if playing and "Update display while playing" is enabled
    if (!isPlaying || !updateDisplayWhilePlaying || !scrollContainerRef.current) return;

    const playheadPixelPosition = state.playheadPosition * pixelsPerSecond;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const currentScrollX = scrollContainerRef.current.scrollLeft;

    if (pinnedPlayHead) {
      // Pinned playhead mode: keep playhead at center, scroll canvas continuously
      const centerPosition = containerWidth / 2;
      const targetScrollX = Math.max(0, playheadPixelPosition - centerPosition);

      // Only scroll if playhead has moved past center and scroll position needs updating
      if (playheadPixelPosition > centerPosition && Math.abs(currentScrollX - targetScrollX) > 1) {
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = targetScrollX;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    } else {
      // Page turn mode: playhead moves across screen, jumps when off screen
      // Check if playhead is off screen to the right
      if (playheadPixelPosition > currentScrollX + containerWidth) {
        // Page turn: scroll forward by one viewport width
        const newScrollX = currentScrollX + containerWidth;
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = newScrollX;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
      // Check if playhead is off screen to the left
      else if (playheadPixelPosition < currentScrollX) {
        // Scroll to position playhead at 1/4 from the left edge
        const newScrollX = Math.max(0, playheadPixelPosition - containerWidth / 4);
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = newScrollX;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    }
  }, [state.playheadPosition, isPlaying, pixelsPerSecond, updateDisplayWhilePlaying, pinnedPlayHead]);

  return {
    isPlaying,
    setIsPlaying,
    handlePlay,
    handleStop,
    audioManagerRef,
    trackMeterLevels,
    setTrackMeterLevels,
  };
}
