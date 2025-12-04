'use client';

import ClipEnvelopeEditor from './components/ClipEnvelopeEditor';
import { TracksProvider } from './contexts/TracksContext';
import Script from 'next/script';
import { Track, Clip } from './components/types';

// Initialize sample tracks
function initializeTracks(): Track[] {
  let clipIdCounter = 1;

  const generateWaveform = (duration: number): number[] => {
    const sampleCount = Math.floor(duration * 50000);
    const waveform: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;
      const speechEnvelope =
        Math.abs(Math.sin(t * Math.PI * 3 + Math.random() * 0.5)) *
        (0.3 + Math.abs(Math.sin(t * Math.PI * 0.5)) * 0.7) *
        (0.5 + Math.random() * 0.5);

      const voiceContent =
        Math.sin(t * Math.PI * 200 + Math.random() * 2) * 0.4 +
        Math.sin(t * Math.PI * 500 + Math.random() * 3) * 0.3 +
        Math.sin(t * Math.PI * 1200 + Math.random() * 5) * 0.2 +
        (Math.random() - 0.5) * 0.3;

      const sample = voiceContent * speechEnvelope;
      waveform.push(sample);
    }

    return waveform;
  };

  const createClip = (id: number, name: string, start: number, duration: number): Clip => ({
    id,
    name,
    start,
    duration,
    waveform: generateWaveform(duration),
    envelopePoints: [],
  });

  return [
    {
      id: 1,
      name: 'Track 1',
      clips: [
        createClip(clipIdCounter++, 'Vocal Take 1', 0.5, 4.0),
        createClip(clipIdCounter++, 'Vocal Take 2', 5.0, 3.5),
      ],
    },
    {
      id: 2,
      name: 'Track 2',
      clips: [createClip(clipIdCounter++, 'Guitar', 2.0, 6.0)],
    },
    {
      id: 3,
      name: 'Track 3',
      clips: [
        createClip(clipIdCounter++, 'Drums', 1.0, 3.0),
        createClip(clipIdCounter++, 'Percussion', 5.5, 1.5),
      ],
    },
  ];
}

export default function Home() {
  const initialTracks = initializeTracks();

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" />
      <TracksProvider initialTracks={initialTracks}>
        <ClipEnvelopeEditor />
      </TracksProvider>
    </>
  );
}
