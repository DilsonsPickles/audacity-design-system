import type React from 'react';
import { generateRmsWaveform } from './rmsWaveform';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { toast } from '@dilsonspickles/components';

export interface ImportAudioDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
}

export function importAudio({ state, dispatch, audioManagerRef }: ImportAudioDeps): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const toastId = toast.progress(`Importing ${file.name}...`);

    try {
      const audioManager = audioManagerRef.current;
      await audioManager.initialize();

      toast.updateProgress(toastId, 20, 'Reading file...');
      const arrayBuffer = await file.arrayBuffer();

      toast.updateProgress(toastId, 40, 'Decoding audio...');
      // Use a fresh AudioContext for decoding to avoid issues with Tone.js context state
      const decodeCtx = new AudioContext();
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
      await decodeCtx.close();

      toast.updateProgress(toastId, 70, 'Building waveform...');
      const duration = audioBuffer.duration;
      const isStereo = audioBuffer.numberOfChannels >= 2;

      // Pick a target track — use first selected audio track, or first audio track
      let trackIndex = state.selectedTrackIndices.find(
        i => !state.tracks[i]?.type || state.tracks[i]?.type === 'audio'
      );
      if (trackIndex === undefined) {
        trackIndex = state.tracks.findIndex(t => !t.type || t.type === 'audio');
      }
      if (trackIndex === -1) {
        toast.dismiss(toastId);
        toast.error('No audio track available');
        return;
      }

      const newClipId = Date.now();
      audioManager.addClipBuffer(newClipId, audioBuffer);

      // Use full sample arrays for waveform display (matches recording flow)
      const leftChannel = Array.from(audioBuffer.getChannelData(0)) as number[];
      const startTime = state.playheadPosition;

      const clipName = file.name.replace(/\.[^/.]+$/, '');

      const newClip = isStereo ? {
        id: newClipId,
        name: clipName,
        start: startTime,
        duration,
        waveformLeft: leftChannel,
        waveformRight: Array.from(audioBuffer.getChannelData(1)) as number[],
        waveformLeftRms: generateRmsWaveform(leftChannel),
        waveformRightRms: generateRmsWaveform(Array.from(audioBuffer.getChannelData(1)) as number[]),
        envelopePoints: [],
        fullDuration: duration,
      } : {
        id: newClipId,
        name: clipName,
        start: startTime,
        duration,
        waveform: leftChannel,
        waveformRms: generateRmsWaveform(leftChannel),
        envelopePoints: [],
        fullDuration: duration,
      };

      toast.updateProgress(toastId, 100, 'Done');

      dispatch({
        type: 'ADD_CLIP',
        payload: { trackIndex, clip: newClip },
      });

      setTimeout(() => {
        toast.dismiss(toastId);
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        toast.success('Import complete', `${clipName} (${mins}:${secs.toString().padStart(2, '0')}) added to track`);
      }, 500);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Import failed', err instanceof Error ? err.message : 'Could not decode audio file');
    }
  };
  input.click();
}
