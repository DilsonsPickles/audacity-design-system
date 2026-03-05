import { useState, useEffect, useCallback } from 'react';
import { RecordingManager } from '../utils/RecordingManager';
import { generateRmsWaveform } from '../utils/rmsWaveform';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

export interface UseRecordingOptions {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  recordingManagerRef: React.MutableRefObject<RecordingManager | null>;
}

export interface UseRecordingReturn {
  handleRecord: () => Promise<void>;
  isMicMonitoring: boolean;
  recordingClipId: number | null;
}

/**
 * Hook for managing recording behavior
 * Handles mic monitoring, recording start/stop, and waveform capture
 */
export function useRecording(options: UseRecordingOptions): UseRecordingReturn {
  const { state, dispatch, audioManagerRef, recordingManagerRef } = options;

  const [isMicMonitoring, setIsMicMonitoring] = useState(false);
  const [_micWaveformData, setMicWaveformData] = useState<number[]>([]);
  const [recordingClipId, setRecordingClipId] = useState<number | null>(null);

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
        console.log('Microphone monitoring not available:', error);
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

  // Handle recording
  const handleRecord = useCallback(async () => {
    if (state.isRecording) {
      // Stop recording (but keep monitoring active)
      if (recordingManagerRef.current) {
        await recordingManagerRef.current.stopRecording();
      }
      dispatch({ type: 'STOP_RECORDING' });
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

      // Start recording
      dispatch({ type: 'START_RECORDING', payload: { trackIndex } });

      // Capture trackIndex and playhead position for callback closure
      const recordingTrackIndex = trackIndex;
      const recordingStartPosition = state.playheadPosition;

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
            duration: 0, // Will be updated when recording completes
            waveform: [],
            envelopePoints: [],
            color: (state.tracks[recordingTrackIndex]?.color as any) || 'cyan',
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

          // Update the clip duration as we record
          const elapsedDuration = position - recordingStartPosition;
          dispatch({
            type: 'UPDATE_CLIP',
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
          // Generate waveform from audio buffer
          const channelData = audioBuffer.getChannelData(0);
          const waveform = Array.from(channelData);

          // Generate RMS waveform
          const waveformRms = generateRmsWaveform(waveform);

          // Update the existing clip with waveform data
          const clipDuration = audioBuffer.duration;

          // Add audio buffer to playback manager
          const audioManager = audioManagerRef.current;
          audioManager.addClipBuffer(clipId, audioBuffer);

          dispatch({
            type: 'UPDATE_CLIP',
            payload: {
              trackIndex: recordingTrackIndex,
              clipId: clipId,
              updates: {
                duration: clipDuration,
                waveform,
                waveformRms,
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
              console.log('Failed to restart monitoring:', error);
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

          // Send waveform, RMS, and calculated duration
          dispatch({
            type: 'UPDATE_CLIP',
            payload: {
              trackIndex: recordingTrackIndex,
              clipId: clipId,
              updates: {
                waveform: waveformData,
                waveformRms: waveformRms,
                duration: duration,
              },
            },
          });
        },
      });

      await recordingManagerRef.current.startRecording(recordingStartPosition);
    }
  }, [state.isRecording, state.focusedTrackIndex, state.tracks, state.playheadPosition, dispatch, audioManagerRef]);

  return {
    handleRecord,
    isMicMonitoring,
    recordingClipId,
  };
}
