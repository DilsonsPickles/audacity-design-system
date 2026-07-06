import type React from 'react';
import { generateRmsWaveform } from './rmsWaveform';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

export interface GenerateToneDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
}

export async function generateTone({ state, dispatch, audioManagerRef }: GenerateToneDeps): Promise<void> {
  if (state.selectedTrackIndices.length === 0) {
    return;
  }

  const audioManager = audioManagerRef.current;

  for (const trackIndex of state.selectedTrackIndices) {
    const newClipId = Date.now() + trackIndex;
    const duration = 4.0;
    const startTime = state.playheadPosition;
    const track = state.tracks[trackIndex];
    const isStereo = track.channelSplitRatio !== undefined;
    const { buffer, waveformData } = await audioManager.generateTone(duration, 8000, 'sawtooth', isStereo);

    audioManager.addClipBuffer(newClipId, buffer);

    const newClip = isStereo && typeof waveformData === 'object' && 'left' in waveformData ? {
      id: newClipId,
      name: 'Tone',
      start: startTime,
      duration: duration,
      waveformLeft: waveformData.left,
      waveformRight: waveformData.right,
      waveformLeftRms: generateRmsWaveform(waveformData.left),
      waveformRightRms: generateRmsWaveform(waveformData.right),
      envelopePoints: [],
    } : {
      id: newClipId,
      name: 'Tone',
      start: startTime,
      duration: duration,
      waveform: Array.isArray(waveformData) ? waveformData : [],
      waveformRms: Array.isArray(waveformData) ? generateRmsWaveform(waveformData) : [],
      envelopePoints: [],
    };

    dispatch({
      type: 'ADD_CLIP',
      payload: { trackIndex, clip: newClip },
    });
  }

  audioManager.loadClips(state.tracks);
}
