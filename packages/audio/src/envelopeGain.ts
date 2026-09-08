/**
 * Envelope gain evaluation for playback/mixdown baking.
 *
 * MUST MATCH packages/components/src/utils/envelope.ts getEnvelopeGainAtTime
 * exactly — that function is what the waveform renderer uses to scale the
 * drawn waveform, and playback has to sound like the canvas looks:
 * point times are in SOURCE time (trimStart-inclusive), interpolation is
 * linear in dB space between bracketing points, flat at the outer points'
 * dB beyond them, converted to a linear multiplier via 10^(dB/20), with
 * the evaluation time clamped to [0, duration].
 */

export interface EnvelopeGainPoint {
  time: number;
  db: number;
}

export function envelopeGainAtTime(
  time: number,
  points: EnvelopeGainPoint[],
  duration: number,
): number {
  if (!points || points.length === 0) {
    return 1.0;
  }

  const t = Math.max(0, Math.min(duration, time));

  let beforePoint: EnvelopeGainPoint | null = null;
  let afterPoint: EnvelopeGainPoint | null = null;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.time <= t) {
      beforePoint = point;
    }
    if (point.time >= t && !afterPoint) {
      afterPoint = point;
    }
  }

  let db: number;
  if (!beforePoint && !afterPoint) {
    db = 0;
  } else if (!beforePoint) {
    db = afterPoint!.db;
  } else if (!afterPoint) {
    db = beforePoint.db;
  } else if (beforePoint.time === afterPoint.time) {
    db = beforePoint.db;
  } else {
    const ratio = (t - beforePoint.time) / (afterPoint.time - beforePoint.time);
    db = beforePoint.db + ratio * (afterPoint.db - beforePoint.db);
  }

  return Math.pow(10, db / 20);
}

/**
 * Bake a clip's envelope into a copy of its channel data. Sample i is
 * multiplied by the envelope gain at source time i / sampleRate — the same
 * time base the renderer uses (pixelTime = trimStart + px/pps), so trimmed
 * clips line up: the audible window [trimStart, trimStart + duration]
 * samples the same envelope segment the canvas draws.
 *
 * Returns a NEW Float32Array; the input is never mutated (it may be the
 * decoded AudioBuffer's live channel data, shared by split siblings).
 */
export function applyEnvelopeToChannel(
  channel: Float32Array,
  points: EnvelopeGainPoint[],
  sampleRate: number,
  duration: number,
): Float32Array {
  const out = new Float32Array(channel.length);
  for (let i = 0; i < channel.length; i++) {
    out[i] = channel[i] * envelopeGainAtTime(i / sampleRate, points, duration);
  }
  return out;
}
