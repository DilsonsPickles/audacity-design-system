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
  /** User-set clip fades in seconds (equal-power, same curves as
   *  overlap crossfades). Absent/0 = none. */
  fadeIn?: number;
  fadeOut?: number;
  /** Exponent on the equal-power base (1 = equal-power, 2 = S-curve),
   *  'linear', or a handle the S-curve is bent through. Absent = the
   *  default for the kind of fade the edge is wearing:
   *  DEFAULT_QUICK_FADE_SHAPE or DEFAULT_CROSSFADE_SHAPE.
   *  Mirrors components/utils/clipCrossfades.ts — same values, same
   *  curves; the two must agree. */
  fadeInShape?: FadeShape;
  fadeOutShape?: FadeShape;
}

/** The point a quick fade's S-curve passes through: `t` along the fade
 *  (0 = its start), `g` the gain there. MUST MATCH `FadeHandle` in
 *  components/utils/clipCrossfades.ts. */
export interface FadeHandle {
  t: number;
  g: number;
}

export type FadeShape = number | 'linear' | FadeHandle;

const LN_HALF = Math.log(0.5);

/** The S-curve through a handle, for a fade IN, at position t (0..1):
 *  time bent so the handle lands on the S's midpoint, the raised
 *  cosine, then gain bent so that midpoint has the handle's gain.
 *  MUST MATCH `handleCurveGain` in components/utils/clipCrossfades.ts,
 *  where the reasoning is; a sandbox test holds the two together. */
export function handleCurveGain(t: number, handle: FadeHandle): number {
  const u = Math.max(0, Math.min(1, t));
  const ht = Math.max(0.01, Math.min(0.99, handle.t));
  const hg = Math.max(0.01, Math.min(0.99, handle.g));
  const w = ht < 0.5
    ? 1 - (1 - u) ** (LN_HALF / Math.log(1 - ht))
    : u ** (LN_HALF / Math.log(ht));
  const s = (1 - Math.cos(Math.PI * w)) / 2;
  return s / ((1 / hg - 2) * (1 - s) + 1);
}

/** What a fade's shape is when none is stored: a clip's own QUICK FADE
 *  is an S-curve (exponent 2 = raised cosine), a CROSSFADE is
 *  equal-power (exponent 1). MUST MATCH the constants of the same name
 *  in components/utils/clipCrossfades.ts, where the reasoning is — this
 *  package cannot import that one, so a sandbox test holds them
 *  together. */
export const DEFAULT_QUICK_FADE_SHAPE = 2;
export const DEFAULT_CROSSFADE_SHAPE = 1;

export interface ClipGainSegment {
  /** Segment bounds in SOURCE seconds (trimStart-inclusive) */
  startSec: number;
  endSec: number;
  shape: 'fadeOut' | 'fadeIn' | 'mute';
  /** Curve shape for fade segments, resolved (stored, else the default
   *  for its kind). Left off when it is 1 — equal-power, which is what
   *  `applyGainSegmentsToChannel` applies to a segment without one. */
  curve?: FadeShape;
}

const EPSILON = 1e-9;

/** Per-clip gain segments for one track's clips (array order = z). */
export function computeClipGainSegments(
  clips: readonly OverlapClipLike[],
): Map<string, ClipGainSegment[]> {
  const out = new Map<string, ClipGainSegment[]>();
  const crossfadedIn = new Set<string>();
  const crossfadedOut = new Set<string>();
  // Free-window bounds per clip (crossfades consume the edges; quick
  // fades must live inside — MUST MATCH quickFadeWindows in
  // clipCrossfades.ts)
  const headConsumedTo = new Map<string, number>();
  const tailConsumedFrom = new Map<string, number>();
  const push = (
    clip: OverlapClipLike,
    startAbs: number,
    endAbs: number,
    shape: ClipGainSegment['shape'],
    /** Which default an edge with no stored shape takes */
    kind: 'crossfade' | 'quick' = 'crossfade',
  ) => {
    const key = String(clip.id);
    const trimStart = clip.trimStart ?? 0;
    const fallback = kind === 'quick' ? DEFAULT_QUICK_FADE_SHAPE : DEFAULT_CROSSFADE_SHAPE;
    const curve = shape === 'fadeOut' ? (clip.fadeOutShape ?? fallback)
      : shape === 'fadeIn' ? (clip.fadeInShape ?? fallback)
      : undefined;
    const list = out.get(key) ?? [];
    list.push({
      startSec: trimStart + (startAbs - clip.start),
      endSec: trimStart + (endAbs - clip.start),
      shape,
      ...(curve !== undefined && curve !== 1 ? { curve } : {}),
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
      // ONE fade per clip edge — the CROSSFADE wins ("consume",
      // 2026-09-21, reversing the earlier inherit rule): both sides
      // always ramp over the shared region; an authored quick fade on
      // a crossfaded edge is SUPPRESSED below (stored value untouched
      // — separating the clips brings it back). Shape exponents still
      // apply via `push`.
      crossfadedOut.add(String(earlier.id));
      crossfadedIn.add(String(later.id));
      tailConsumedFrom.set(String(earlier.id), Math.min(tailConsumedFrom.get(String(earlier.id)) ?? Infinity, s));
      headConsumedTo.set(String(later.id), Math.max(headConsumedTo.get(String(later.id)) ?? -Infinity, e));
      push(earlier, s, e, 'fadeOut');
      push(later, s, e, 'fadeIn');
    }
  }

  // User-set per-clip fades on FREE edges — same audible primitive, no
  // neighbour required. Fades may not overlap EACH OTHER on a clip
  // (MUST MATCH effectiveFades in clipCrossfades.ts): a clip that
  // shrank under its fades plays them proportionally scaled to fit,
  // stored values untouched.
  for (const clip of clips) {
    const key = String(clip.id);
    // Quick fades live in the FREE WINDOW: crossfade regions consume
    // the clip's edges, and quick fades may not overlap them
    const windowStart = Math.max(clip.start, headConsumedTo.get(key) ?? clip.start);
    const windowEnd = Math.min(clip.start + clip.duration, tailConsumedFrom.get(key) ?? clip.start + clip.duration);
    const windowLen = Math.max(0, windowEnd - windowStart);
    let fadeIn = crossfadedIn.has(key) ? 0 : Math.min(Math.max(0, clip.fadeIn ?? 0), windowLen);
    let fadeOut = crossfadedOut.has(key) ? 0 : Math.min(Math.max(0, clip.fadeOut ?? 0), windowLen);
    const sum = fadeIn + fadeOut;
    if (sum > windowLen && sum > 0) {
      const scale = windowLen / sum;
      fadeIn *= scale;
      fadeOut *= scale;
    }
    if (fadeIn > EPSILON) {
      push(clip, clip.start, clip.start + fadeIn, 'fadeIn', 'quick');
    }
    if (fadeOut > EPSILON) {
      push(clip, clip.start + clip.duration - fadeOut, clip.start + clip.duration, 'fadeOut', 'quick');
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
      if (seg.curve === 'linear') {
        out[i] *= seg.shape === 'fadeOut' ? 1 - t : t;
        continue;
      }
      if (typeof seg.curve === 'object') {
        // A fade out is the fade in played backwards, handle and all
        out[i] *= seg.shape === 'fadeOut'
          ? handleCurveGain(1 - t, { t: 1 - seg.curve.t, g: seg.curve.g })
          : handleCurveGain(t, seg.curve);
        continue;
      }
      const base = seg.shape === 'fadeOut'
        ? Math.cos((t * Math.PI) / 2)
        : Math.sin((t * Math.PI) / 2);
      out[i] *= base ** (seg.curve ?? 1);
    }
  }
  return out;
}
