/**
 * Crossfade / occlusion gain baking for overlapping clips (v1 rules,
 * 2026-09-21).
 *
 * MUST MATCH packages/components/src/utils/clipCrossfades.ts — that
 * module draws the X the user sees; playback has to sound like the
 * canvas looks:
 *  - a PARTIAL EDGE overlap between two clips is an equal-power
 *    crossfade (earlier clip cos-fades out, later clip sin-fades in),
 *    regardless of z-order;
 *  - CONTAINMENT (one span inside the other, incl. identical spans)
 *    is occlusion: the top clip (later in array — array position IS
 *    the z-order) plays untouched, the bottom clip is muted across
 *    the shared region. No fades are synthesized.
 *
 * Gains are BAKED into the clip's channel data, like the envelope
 * (see envelopeGain.ts): baked audio survives every transport
 * operation with zero scheduling. Segment times are in SOURCE time —
 * the same base the envelope bake uses (clip-relative time t lives at
 * source time trimStart + t).
 */

export interface OverlapClipLike {
  id: number | string;
  start: number;
  duration: number;
  trimStart?: number;
}

export interface ClipGainSegment {
  /** Segment bounds in SOURCE seconds (trimStart-inclusive) */
  startSec: number;
  endSec: number;
  shape: 'fadeOut' | 'fadeIn' | 'mute';
}

const EPSILON = 1e-9;

/** Per-clip gain segments for one track's clips (array order = z). */
export function computeClipGainSegments(
  clips: readonly OverlapClipLike[],
): Map<string, ClipGainSegment[]> {
  const out = new Map<string, ClipGainSegment[]>();
  const push = (clip: OverlapClipLike, startAbs: number, endAbs: number, shape: ClipGainSegment['shape']) => {
    const key = String(clip.id);
    const trimStart = clip.trimStart ?? 0;
    const list = out.get(key) ?? [];
    list.push({
      startSec: trimStart + (startAbs - clip.start),
      endSec: trimStart + (endAbs - clip.start),
      shape,
    });
    out.set(key, list);
  };

  for (let i = 0; i < clips.length; i++) {
    for (let j = i + 1; j < clips.length; j++) {
      const lower = clips[i]; // earlier in array = below in z
      const upper = clips[j];
      const lowerEnd = lower.start + lower.duration;
      const upperEnd = upper.start + upper.duration;
      const s = Math.max(lower.start, upper.start);
      const e = Math.min(lowerEnd, upperEnd);
      if (e - s <= EPSILON) continue;

      const lowerInsideUpper = lower.start >= upper.start - EPSILON && lowerEnd <= upperEnd + EPSILON;
      const upperInsideLower = upper.start >= lower.start - EPSILON && upperEnd <= lowerEnd + EPSILON;
      if (lowerInsideUpper || upperInsideLower) {
        // Occlusion: the bottom clip is silent across the shared region
        push(lower, s, e, 'mute');
        continue;
      }

      const [earlier, later] = lower.start <= upper.start ? [lower, upper] : [upper, lower];
      push(earlier, s, e, 'fadeOut');
      push(later, s, e, 'fadeIn');
    }
  }
  return out;
}

/** Multiply a copy of the channel data by the segments' gains.
 *  Sample i sits at source time i / sampleRate (envelope-bake parity).
 *  Segments multiply cumulatively, so a clip that is both crossfaded
 *  and occluded elsewhere composes correctly. Never mutates input. */
export function applyGainSegmentsToChannel(
  channel: Float32Array,
  segments: readonly ClipGainSegment[],
  sampleRate: number,
): Float32Array {
  const out = new Float32Array(channel);
  for (const seg of segments) {
    const from = Math.max(0, Math.floor(seg.startSec * sampleRate));
    const to = Math.min(out.length, Math.ceil(seg.endSec * sampleRate));
    const span = seg.endSec - seg.startSec;
    if (to <= from || span <= EPSILON) continue;
    for (let i = from; i < to; i++) {
      if (seg.shape === 'mute') {
        out[i] = 0;
        continue;
      }
      const t = Math.max(0, Math.min(1, (i / sampleRate - seg.startSec) / span));
      const gain = seg.shape === 'fadeOut'
        ? Math.cos((t * Math.PI) / 2)
        : Math.sin((t * Math.PI) / 2);
      out[i] *= gain;
    }
  }
  return out;
}
