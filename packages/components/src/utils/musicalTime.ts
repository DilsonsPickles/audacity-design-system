/**
 * Musical durations from the project's tempo and time signature — THE ONE
 * RULE for the beats-and-bars ruler, the canvas grid, snapping and the
 * piano roll (2026-11-04, "this obviously needs to effect the beats and bars
 * ruler"), the real build's (`snaptimeformatter.cpp`):
 *
 *   TEMPO COUNTS QUARTER NOTES — `bpm` is quarter notes per minute;
 *   A BEAT IS THE TIME SIGNATURE'S LOWER NOTE — quarter × 4 / lower, so a
 *     6/8 beat is an eighth and a 2/2 beat a half note;
 *   A BAR IS `upper` BEATS;
 *   A SNAP VALUE IS A NOTE — "1/8" is an eighth note, a whole note / 8,
 *     whatever the time signature ("Bar" is the bar).
 *
 * Until then every consumer took the beat as a quarter (`60 / bpm`) and the
 * snap split the BAR by its value, so 3/4's "1/4" landed on thirds of a bar
 * and the lower number did nothing at all.
 */

/** Seconds per quarter note */
export function quarterSeconds(bpm: number): number {
  return 60 / bpm;
}

/** Seconds per beat — the time signature's lower note */
export function beatSeconds(bpm: number, noteValue = 4): number {
  return quarterSeconds(bpm) * 4 / noteValue;
}

/** Seconds per bar — `beatsPerMeasure` beats */
export function barSeconds(bpm: number, beatsPerMeasure: number, noteValue = 4): number {
  return beatSeconds(bpm, noteValue) * beatsPerMeasure;
}

/** Seconds per 1/`division` note — a whole note divided, so 8 = an eighth */
export function noteSeconds(bpm: number, division: number): number {
  return quarterSeconds(bpm) * 4 / division;
}
