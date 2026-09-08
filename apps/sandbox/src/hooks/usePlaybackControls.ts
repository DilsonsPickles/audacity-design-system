import { useState, useRef, useEffect } from 'react';
import { getAudioPlaybackManager, AudioPlaybackManager } from '@audacity-ui/audio';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { RecordingManager } from '../utils/RecordingManager';

export interface PlayOptions {
  /** Shift+Space: start playback exactly as normal play would (selection
   *  start when the playhead is inside the selection), but WITHOUT the
   *  selection end bound — keep playing past it. */
  ignoreSelectionEnd?: boolean;
  /** B (Play Selection): snap the playhead to the selection start and play
   *  the selected range regardless of where the playhead currently sits.
   *  No-op when there is no usable time selection. */
  snapToSelection?: boolean;
  /** X (Play/Stop and Set Cursor, Audacity heritage): stopping leaves the
   *  playhead where playback stopped instead of returning it to the
   *  playback-start marker. Starting plays exactly like Space. */
  keepCursorOnStop?: boolean;
}

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
  handlePlay: (options?: PlayOptions) => Promise<void>;
  handleStop: () => Promise<void>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  trackMeterLevels: Map<number, number>;
  setTrackMeterLevels: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  /** Master output meter level on a 0-100 scale (post-mix, post-volume). */
  masterMeterLevel: number;
  /** Where the current playback run started (seconds), or null when no
   *  marker is active. Drawn as a ghost line on the canvas; toggling
   *  playback off returns the playhead here (Audacity behavior). */
  playbackStartTime: number | null;
  setPlaybackStartTime: React.Dispatch<React.SetStateAction<number | null>>;
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
  // Master output meter — single post-mix level 0-100.
  const [masterMeterLevel, setMasterMeterLevel] = useState(0);

  // Playback-start marker: set when playback begins, drawn as a ghost line
  // on the canvas; toggling playback off (Space / play button) returns the
  // playhead here and clears it.
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);

  // Ref-mirror (see CLAUDE.md): the playback-complete callback below is
  // registered once in the init effect but must read the live time
  // selection when selection playback finishes.
  const timeSelectionRef = useRef(state.timeSelection);
  useEffect(() => {
    timeSelectionRef.current = state.timeSelection;
  }, [state.timeSelection]);

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

    // Master output meter — fires once per animation frame with the
    // post-mix level. Used by the master playback meter UI.
    audioManager.setMasterMeterUpdateCallback((level) => {
      setMasterMeterLevel(level);
    });

    // Selection playback finished (the manager auto-stopped at the
    // selection's end bound): reflect the stopped transport in React state
    // and return the playhead to the selection start, Audacity-style, so
    // play replays the same range.
    audioManager.setPlaybackCompleteCallback(() => {
      setIsPlaying(false);
      setPlaybackStartTime(null);
      const sel = timeSelectionRef.current;
      if (sel) {
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
      }
    });

    // Cleanup on unmount
    return () => {
      audioManager.cleanup();
    };
  }, [dispatch]);

  // Apply per-track gain/mute to the audio manager after loading clips
  const applyTrackGains = (audioManager: AudioPlaybackManager, tracks: TracksState['tracks']) => {
    tracks.forEach((track, index) => {
      if (track.type === 'label') return;
      const gain = track.gain ?? -6;
      if (track.muted) {
        audioManager.setTrackMuted(index, true);
      } else {
        audioManager.setTrackGain(index, gain);
      }
    });
  };

  // Reload clips for playback whenever tracks change (but not during
  // playback/recording). Deliberately NOT keyed on playheadPosition:
  // loadClips schedules everything at absolute transport times regardless of
  // position, and reloading here on every playhead move meant tearing down
  // and rebuilding every Tone.Player — including a full copy of each clip's
  // audio buffer — on every timeline click.
  useEffect(() => {
    if (!isPlaying && !state.isRecording) {
      const audioManager = audioManagerRef.current;
      audioManager.loadClips(state.tracks);
      applyTrackGains(audioManager, state.tracks);
    }
  }, [state.tracks, isPlaying, state.isRecording]);

  // Handle play/pause transport controls
  const handlePlay = async (options?: PlayOptions) => {
    const audioManager = audioManagerRef.current;

    // Use audio manager's state as source of truth, not React state
    if (audioManager.getIsPlaying()) {
      audioManager.pause();
      setIsPlaying(false);
      // Toggling playback off returns the playhead to where this run
      // started (the marked ghost line), then retires the marker.
      // X (keepCursorOnStop) skips the return — the playhead stays where
      // playback stopped ("set cursor") — but still retires the marker.
      // (Read from the closure, not a setState updater — updaters must be
      // pure, and dispatching inside one warns/misbehaves.)
      if (playbackStartTime !== null && !options?.keepCursorOnStop) {
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: playbackStartTime });
      }
      setPlaybackStartTime(null);
    } else {
      // Players are already loaded (the tracks-change effect above) and are
      // scheduled position-independently — play() just seeks the transport
      // to the current playhead. Reloading here would re-copy every clip's
      // audio buffer into fresh Tone.Players on each play press.
      applyTrackGains(audioManager, state.tracks);

      // With an active time selection, play ONLY the selected range: start
      // at its start, auto-stop at its end (the manager's playback-complete
      // callback then parks the playhead back on the selection start).
      //
      // The selection binds playback only while the playhead sits inside it
      // (inclusive edges — the same containment rule as
      // playheadAfterSelectionFinalize). Moving the playhead OUT of the
      // selection is an explicit "play from here instead" gesture, so play
      // reverts to open-ended from the playhead.
      const sel = state.timeSelection;
      const hasRange = !!sel && sel.endTime - sel.startTime > 1e-6;

      // B (Play Selection): jump to the selection and play it, wherever
      // the playhead was. Without a selection the key does nothing.
      if (options?.snapToSelection) {
        if (!sel || !hasRange) return;
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
        setPlaybackStartTime(sel.startTime);
        if (options.ignoreSelectionEnd) {
          await audioManager.play(sel.startTime);
        } else {
          await audioManager.play(sel.startTime, sel.endTime);
        }
        setIsPlaying(true);
        return;
      }

      const playheadInSelection = !!sel
        && state.playheadPosition >= sel.startTime
        && state.playheadPosition <= sel.endTime;
      if (sel && playheadInSelection && hasRange) {
        setPlaybackStartTime(sel.startTime);
        if (options?.ignoreSelectionEnd) {
          // Shift+Space: same start point, no end bound — play through.
          await audioManager.play(sel.startTime);
        } else {
          await audioManager.play(sel.startTime, sel.endTime);
        }
      } else {
        setPlaybackStartTime(state.playheadPosition);
        await audioManager.play(state.playheadPosition);
      }

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
    setPlaybackStartTime(null);
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
    masterMeterLevel,
    playbackStartTime,
    setPlaybackStartTime,
  };
}
