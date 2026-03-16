import type { MidiNote, MidiClip } from '@audacity-ui/core';

/**
 * C-Am-F-G chord progression (4 measures at 120 BPM)
 * Each measure = 2 seconds at 120 BPM
 */

const BPM = 120;
const BEAT = 60 / BPM; // 0.5s per beat
const MEASURE = BEAT * 4; // 2s per measure

let nextId = 1;
function note(pitch: number, startBeat: number, durationBeats: number, velocity = 100): MidiNote {
  return {
    id: nextId++,
    pitch,
    startTime: startBeat * BEAT,
    duration: durationBeats * BEAT,
    velocity,
  };
}

// Measure 1: C major chord (C3 bass + C4-E4-G4)
// Measure 2: A minor chord (A2 bass + A3-C4-E4)
// Measure 3: F major chord (F2 bass + F3-A3-C4)
// Measure 4: G major chord (G2 bass + G3-B3-D4)
const chordNotes: MidiNote[] = [
  // Measure 1 — C major
  note(48, 0, 4, 80),   // C3 bass
  note(60, 0, 4, 90),   // C4
  note(64, 0, 4, 85),   // E4
  note(67, 0, 4, 85),   // G4

  // Measure 2 — A minor
  note(45, 4, 4, 80),   // A2 bass
  note(57, 4, 4, 90),   // A3
  note(60, 4, 4, 85),   // C4
  note(64, 4, 4, 85),   // E4

  // Measure 3 — F major
  note(41, 8, 4, 80),   // F2 bass
  note(53, 8, 4, 90),   // F3
  note(57, 8, 4, 85),   // A3
  note(60, 8, 4, 85),   // C4

  // Measure 4 — G major
  note(43, 12, 4, 80),  // G2 bass
  note(55, 12, 4, 90),  // G3
  note(59, 12, 4, 85),  // B3
  note(62, 12, 4, 85),  // D4
];

// Melodic eighth-note line over the chords
const melodyNotes: MidiNote[] = [
  // Measure 1 melody (over C)
  note(72, 0, 1, 95),    // C5
  note(74, 1, 1, 90),    // D5
  note(76, 2, 1, 95),    // E5
  note(74, 3, 1, 85),    // D5

  // Measure 2 melody (over Am)
  note(72, 4, 1, 90),    // C5
  note(69, 5, 1, 85),    // A4
  note(72, 6, 1.5, 95),  // C5 (dotted)
  note(71, 7.5, 0.5, 80), // B4

  // Measure 3 melody (over F)
  note(69, 8, 1, 95),    // A4
  note(72, 9, 1, 90),    // C5
  note(76, 10, 2, 100),  // E5 (held)

  // Measure 4 melody (over G)
  note(74, 12, 1, 95),   // D5
  note(76, 13, 1, 90),   // E5
  note(74, 14, 1, 85),   // D5
  note(72, 15, 1, 95),   // C5
];

export const demoMidiNotes: MidiNote[] = [...chordNotes, ...melodyNotes];

export const demoMidiClip: MidiClip = {
  id: 1,
  name: 'Demo MIDI',
  start: 0,
  trimStart: 0,
  duration: MEASURE * 4, // 8 seconds (4 measures)
  notes: demoMidiNotes,
};

export const DEMO_BPM = BPM;
export const DEMO_BEATS_PER_MEASURE = 4;
