import { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingManager } from '../utils/RecordingManager';
import { buildClipWaveforms } from '../utils/clipWaveforms';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

export interface UseRecordingOptions {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  recordingManagerRef: React.MutableRefObject<RecordingManager | null>;
  rollInTimeEnabled?: boolean;
  rollInTime?: number; // seconds, default 3
}

export interface UseRecordingReturn {
  handleRecord: () => Promise<void>;
  handleStopRecording: () => Promise<void>;
  isMicMonitoring: boolean;
  recordingClipId: number | null;
  punchPointPosition: number | null;
}

/**
 * Hook for managing recording behavior
 * Handles mic monitoring, recording start/stop, and waveform capture
 */
export function useRecording(options: UseRecordingOptions): UseRecordingReturn {
  const { state, dispatch, audioManagerRef, recordingManagerRef, rollInTimeEnabled = false, rollInTime = 3 } = options;

  const [isMicMonitoring, setIsMicMonitoring] = useState(false);
  const [_micWaveformData, setMicWaveformData] = useState<number[]>([]);
  const [recordingClipId, setRecordingClipId] = useState<number | null>(null);
  const [punchPointPosition, setPunchPointPosition] = useState<number | null>(null);
  const rollInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRollingInRef = useRef(false);
  const preRecordPlayheadRef = useRef<number | null>(null);

  // Start mic monitoring automatically when component mounts
  useEffect(() => {
    const startAutoMonitoring = async () => {
      try {
        // Create recording manager for monitoring
        recordingManagerRef.current = new RecordingManager({
          onMeterUpdate: (level, peak) => {
            // Only update if we have a focused track
            if (state.focusedTrackIndex !== null) {
              dispatch({
                type: 'UPDATE_RECORDING_METERS',
                payload: { level, peak }
              });
            }
          },
          onPlayheadUpdate: () => {}, // Not used during monitoring
          onRecordingComplete: () => {}, // Not used during monitoring
          onWaveformUpdate: (waveformData) => {
            setMicWaveformData(waveformData);
          },
        });

        await recordingManagerRef.current.startMonitoring();
        setIsMicMonitoring(true);
      } catch (error) {
        // Mic access denied or not available - silently fail
      }
    };

    startAutoMonitoring();
  }, []); // Run once on mount

  // Cleanup recording manager on unmount
  useEffect(() => {
    return () => {
      if (recordingManagerRef.current) {
        recordingManagerRef.current.dispose();
      }
    };
  }, []);

  // Start the actual recording process (shared between direct and roll-in paths)
  const startRecordingAtPosition = useCallback(async (recordingTrackIndex: number, recordingStartPosition: number) => {
    // Create an empty clip immediately for recording
    const clipId = Date.now();
    setRecordingClipId(clipId);
    dispatch({
      type: 'ADD_CLIP',
      payload: {
        trackIndex: recordingTrackIndex,
        clip: {
          id: clipId,
          name: 'Recording',
          start: recordingStartPosition,
          duration: 0,
          waveform: [],
          envelopePoints: [],
          color: state.tracks[recordingTrackIndex]?.color || 'cyan',
        },
      },
    });

    // If monitoring manager exists, dispose it first
    if (recordingManagerRef.current) {
      recordingManagerRef.current.dispose();
    }

    // Create a new recording manager with proper callbacks
    recordingManagerRef.current = new RecordingManager({
      onMeterUpdate: (level, peak) => {
        dispatch({
          type: 'UPDATE_RECORDING_METERS',
          payload: { level, peak }
        });
      },
      onPlayheadUpdate: (position) => {
        dispatch({
          type: 'SET_PLAYHEAD_POSITION',
          payload: position
        });

        // Update the clip duration as we record (non-undoable: the whole
        // recording is one undo entry — the ADD_CLIP)
        const elapsedDuration = position - recordingStartPosition;
        dispatch({
          type: 'UPDATE_RECORDING_CLIP',
          payload: {
            trackIndex: recordingTrackIndex,
            clipId: clipId,
            updates: {
              duration: elapsedDuration,
            },
          },
        });
      },
      onRecordingComplete: (audioBuffer) => {
        // Decimated display waveform + RMS (playback uses the AudioBuffer
        // registered below, never these arrays) — replaces the live-preview
        // waveform accumulated during recording.
        const { waveform, rms: waveformRms } = buildClipWaveforms(
          audioBuffer.getChannelData(0),
        );

        // Update the existing clip with waveform data
        const clipDuration = audioBuffer.duration;

        // Add audio buffer to playback manager
        const audioManager = audioManagerRef.current;
        audioManager.addClipBuffer(clipId, audioBuffer);

        dispatch({
          type: 'UPDATE_RECORDING_CLIP',
          payload: {
            trackIndex: recordingTrackIndex,
            clipId: clipId,
            updates: {
              duration: clipDuration,
              waveform,
              waveformRms,
              // Replace the live-preview pin with the true source length —
              // a stale live fullDuration would mis-map the final waveform.
              fullDuration: clipDuration,
            },
          },
        });

        // Clear recording clip ID
        setRecordingClipId(null);

        // Restart monitoring after recording completes
        const restartMonitoring = async () => {
          try {
            recordingManagerRef.current = new RecordingManager({
              onMeterUpdate: (level, peak) => {
                if (state.focusedTrackIndex !== null) {
                  dispatch({
                    type: 'UPDATE_RECORDING_METERS',
                    payload: { level, peak }
                  });
                }
              },
              onPlayheadUpdate: () => {},
              onRecordingComplete: () => {},
              onWaveformUpdate: (waveformData) => {
                setMicWaveformData(waveformData);
              },
            });

            await recordingManagerRef.current.startMonitoring();
            setIsMicMonitoring(true);
          } catch (error) {
          }
        };

        restartMonitoring();
      },
      onWaveformUpdate: (waveformData) => {
        setMicWaveformData(waveformData);
      },
      onRecordingWaveformUpdate: (waveformData, waveformRms, sampleRate) => {
        // Calculate duration from sample count and sample rate
        const duration = waveformData.length / sampleRate;

        // Send waveform, RMS, and calculated duration (non-undoable)
        dispatch({
          type: 'UPDATE_RECORDING_CLIP',
          payload: {
            trackIndex: recordingTrackIndex,
            clipId: clipId,
            updates: {
              waveform: waveformData,
              waveformRms: waveformRms,
              duration: duration,
              // Pin the render mapping: waveformGeometry's detected sample
              // rate is dataLength / (fullDuration || duration), and the
              // clip's `duration` is ALSO written per-frame from the wall
              // clock (smooth width growth) — without this pin the rate
              // drifted between audio chunks and snapped back on each one,
              // horizontally stretching the live waveform (jitter). Set
              // only here, in the same dispatch as the array it matches.
              fullDuration: duration,
            },
          },
        });
      },
    });

    await recordingManagerRef.current.startRecording(recordingStartPosition);
  }, [state.tracks, state.focusedTrackIndex, dispatch, audioManagerRef]);

  // Handle recording (with optional punch-and-roll)
  const handleRecord = useCallback(async () => {
    // Cancel roll-in phase if active
    if (isRollingInRef.current) {
      isRollingInRef.current = false;
      if (rollInTimerRef.current !== null) {
        clearTimeout(rollInTimerRef.current);
        rollInTimerRef.current = null;
      }
      setPunchPointPosition(null);

      // Stop playback FIRST (before restoring playhead, since stop may reset it)
      const audioManager = audioManagerRef.current;
      if (audioManager.getIsPlaying()) {
        audioManager.stop();
      }

      // Restore playhead to where it was before record was pressed
      if (preRecordPlayheadRef.current !== null) {
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: preRecordPlayheadRef.current });
        preRecordPlayheadRef.current = null;
      }
      return;
    }

    if (state.isRecording) {
      // Stop recording — keep the clip and leave cursor in place
      await handleStopRecording();
    } else {
      // Start recording - find a track to record into
      let trackIndex = state.focusedTrackIndex;

      // If no track is focused, use the first non-label track
      if (trackIndex === null) {
        trackIndex = state.tracks.findIndex(t =>
          !t.name.toLowerCase().includes('label')
        );
      }

      // If still no track found, we need at least one audio track
      if (trackIndex === -1) {
        return;
      }

      const recordingTrackIndex = trackIndex;
      const punchPoint = state.playheadPosition;

      // Remember the playhead position so we can restore it on cancel
      preRecordPlayheadRef.current = punchPoint;

      // Punch and roll: if roll-in is enabled and playhead is not at the start,
      // play back from (punchPoint - rollInTime) so the artist can match their
      // performance, then begin recording at the punch point.
      if (rollInTimeEnabled && punchPoint > 0) {
        const rollBackPosition = Math.max(0, punchPoint - rollInTime);
        const actualRollDuration = punchPoint - rollBackPosition;

        // Show punch point indicator during roll-in
        setPunchPointPosition(punchPoint);

        // Move playhead to roll-back position and start playback
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: rollBackPosition });

        const audioManager = audioManagerRef.current;
        audioManager.loadClips(state.tracks, rollBackPosition);
        await audioManager.play(rollBackPosition);

        // Track that we're in the roll-in phase
        isRollingInRef.current = true;

        // After the roll-in duration, stop playback and start recording
        rollInTimerRef.current = setTimeout(async () => {
          isRollingInRef.current = false;
          rollInTimerRef.current = null;
          audioManager.stop();
          setPunchPointPosition(null);

          // Set playhead to the punch point and begin recording
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: punchPoint });
          dispatch({ type: 'START_RECORDING', payload: { trackIndex: recordingTrackIndex } });
          await startRecordingAtPosition(recordingTrackIndex, punchPoint);
        }, actualRollDuration * 1000);
      } else {
        // Standard recording: start immediately at the current playhead
        dispatch({ type: 'START_RECORDING', payload: { trackIndex: recordingTrackIndex } });
        await startRecordingAtPosition(recordingTrackIndex, punchPoint);
      }
    }
  }, [state.isRecording, state.focusedTrackIndex, state.tracks, state.playheadPosition, state.recordingTrackIndex, recordingClipId, dispatch, audioManagerRef, rollInTimeEnabled, rollInTime, startRecordingAtPosition]);

  // Stop recording and keep the clip (Space key)
  const handleStopRecording = useCallback(async () => {
    if (!state.isRecording) return;

    if (recordingManagerRef.current) {
      await recordingManagerRef.current.stopRecording();
    }
    dispatch({ type: 'STOP_RECORDING' });
    setPunchPointPosition(null);
    preRecordPlayheadRef.current = null;

    const audioManager = audioManagerRef.current;
    if (audioManager.getIsPlaying()) {
      audioManager.stop();
    }
  }, [state.isRecording, dispatch, audioManagerRef]);

  return {
    handleRecord,
    handleStopRecording,
    isMicMonitoring,
    recordingClipId,
    punchPointPosition,
  };
}
