import type React from 'react';
import { buildClipWaveforms } from './clipWaveforms';
import type { TracksState, TracksAction } from '../contexts/TracksContext';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { toast } from '@audacity-ui/components';

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

      // Display waveforms are decimated peak/RMS arrays (see clipWaveforms);
      // playback reads the AudioBuffer registered above, never these.
      const left = buildClipWaveforms(audioBuffer.getChannelData(0));
      const right = isStereo ? buildClipWaveforms(audioBuffer.getChannelData(1)) : null;
      const startTime = state.playheadPosition;

      const clipName = file.name.replace(/\.[^/.]+$/, '');

      const newClip = right ? {
        id: newClipId,
        name: clipName,
        start: startTime,
        duration,
        waveformLeft: left.waveform,
        waveformRight: right.waveform,
        waveformLeftRms: left.rms,
        waveformRightRms: right.rms,
        envelopePoints: [],
        fullDuration: duration,
      } : {
        id: newClipId,
        name: clipName,
        start: startTime,
        duration,
        waveform: left.waveform,
        waveformRms: left.rms,
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
