import { NOTE_NAMES, BLACK_KEY_CLASSES, NOTE_HEIGHT, TOTAL_PITCHES } from '@audacity-ui/components';

/**
 * Convert seconds to beat number at a given BPM.
 */
export function secondsToBeat(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

/**
 * Convert beat number to seconds at a given BPM.
 */
export function beatToSeconds(beat: number, bpm: number): number {
  return (beat * 60) / bpm;
}

/**
 * Snap a time value (in seconds) to the nearest grid position.
 */
export function snapToGrid(
  timeSeconds: number,
  bpm: number,
  subdivision: number,
  triplet?: boolean
): number {
  const beatsPerSecond = bpm / 60;
  const gridUnitsPerSecond = beatsPerSecond * subdivision * (triplet ? 1.5 : 1);
  const gridUnit = 1 / gridUnitsPerSecond;
  return Math.round(timeSeconds / gridUnit) * gridUnit;
}

/**
 * Get note name for a MIDI pitch (e.g., 60 → "C4").
 */
export function pitchToNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const noteClass = pitch % 12;
  return `${NOTE_NAMES[noteClass]}${octave}`;
}

/**
 * Check if a pitch is a black key.
 */
export function isBlackKey(pitch: number): boolean {
  return BLACK_KEY_CLASSES.includes(pitch % 12);
}

/**
 * Convert MIDI pitch to Y position in the grid.
 * Higher pitches are at the top (lower Y).
 */
export function pitchToY(pitch: number, noteHeight: number = NOTE_HEIGHT, scrollY: number = 0): number {
  return (TOTAL_PITCHES - 1 - pitch) * noteHeight - scrollY;
}

/**
 * Convert Y position back to MIDI pitch.
 */
export function yToPitch(y: number, noteHeight: number = NOTE_HEIGHT, scrollY: number = 0): number {
  return TOTAL_PITCHES - 1 - Math.floor((y + scrollY) / noteHeight);
}

/**
 * Get beat grid line positions within a time range.
 * Returns array of { time, isMeasure, isBeat } objects.
 */
export function getGridLines(
  startTime: number,
  endTime: number,
  bpm: number,
  beatsPerMeasure: number,
  subdivision: number,
  triplet?: boolean
): Array<{ time: number; type: 'measure' | 'beat' | 'subdivision' }> {
  const lines: Array<{ time: number; type: 'measure' | 'beat' | 'subdivision' }> = [];
  const beatDuration = 60 / bpm;
  const subDivisions = subdivision * (triplet ? 1.5 : 1);
  const gridStep = beatDuration / subDivisions;

  const firstGrid = Math.floor(startTime / gridStep) * gridStep;
  for (let t = firstGrid; t <= endTime; t += gridStep) {
    if (t < startTime) continue;
    const beat = t / beatDuration;
    const beatRound = Math.round(beat * 1000) / 1000;
    if (Math.abs(beatRound - Math.round(beatRound)) < 0.001) {
      const wholeBeat = Math.round(beatRound);
      if (wholeBeat % beatsPerMeasure === 0) {
        lines.push({ time: t, type: 'measure' });
      } else {
        lines.push({ time: t, type: 'beat' });
      }
    } else {
      lines.push({ time: t, type: 'subdivision' });
    }
  }
  return lines;
}
