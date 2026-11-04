import type { TracksState, TracksAction } from '../TracksContext';

export function recordingReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        recordingTrackIndex: action.payload.trackIndex,
        recordingStartTime: Date.now(),
        recordingMeterLevel: 0,
        recordingPeakLevel: 0,
        recordingRecentPeak: 0,
      };

    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
        recordingTrackIndex: null,
        recordingStartTime: 0,
        recordingMeterLevel: 0,
        recordingPeakLevel: 0,
        recordingRecentPeak: 0,
      };

    case 'UPDATE_RECORDING_METERS':
      return {
        ...state,
        recordingMeterLevel: action.payload.level,
        recordingPeakLevel: Math.max(state.recordingPeakLevel, action.payload.peak),
        recordingRecentPeak: action.payload.recentPeak ?? state.recordingRecentPeak,
      };

    default:
      return state;
  }
}
