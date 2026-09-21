/**
 * Crossfade geometry for overlapping clips (v1: edge fades only,
 * 2026-09-21).
 *
 * Clips on a track may overlap; array position is the z-order. The
 * audible/visual rules:
 *  - PARTIAL EDGE overlap (each clip has material outside the shared
 *    region, on opposite sides) = crossfade: the earlier clip fades
 *    out across the shared region while the later one fades in
 *    (equal-power). Symmetric — z does not affect the audio.
 *  - CONTAINMENT (one clip's span entirely inside the other's,
 *    including identical spans) = occlusion: the top (higher-z) clip
 *    simply plays; the covered region of the lower clip is silent.
 *    No fades are synthesized.
 *
 * Everything here is derived from clip geometry — a crossfade has no
 * stored state of its own.
 */

export interface CrossfadeClipLike {
  id: number | string;
  start: number;
  duration: number;
  /** Authored clip fades in seconds. An authored fade OWNS its edge:
   *  a crossfade honours it instead of the overlap-default ramp. */
  fadeIn?: number;
  fadeOut?: number;
  /** Curve shape exponents (default 1 = equal-power). Set by dragging
   *  the crossfade's intersection node: the base curve is raised to
   *  this power, bending the fade without moving its extent. */
  fadeInShape?: number;
  fadeOutShape?: number;
}

export interface CrossfadeRegion {
  /** Shared region, in seconds */
  start: number;
  end: number;
  /** The earlier clip — its tail fades OUT across the region */
  outgoingClipId: number | string;
  /** The later clip — its head fades IN across the region */
  incomingClipId: number | string;
}

const EPSILON = 1e-9;

/** Pairwise edge-overlap crossfade regions for one track's clips. */
export function computeCrossfades(clips: readonly CrossfadeClipLike[]): CrossfadeRegion[] {
  const regions: CrossfadeRegion[] = [];
  for (let i = 0; i < clips.length; i++) {
    for (let j = i + 1; j < clips.length; j++) {
      const a = clips[i];
      const b = clips[j];
      const aEnd = a.start + a.duration;
      const bEnd = b.start + b.duration;
      const s = Math.max(a.start, b.start);
      const e = Math.min(aEnd, bEnd);
      if (e - s <= EPSILON) continue;
      const aInsideB = a.start >= b.start - EPSILON && aEnd <= bEnd + EPSILON;
      const bInsideA = b.start >= a.start - EPSILON && bEnd <= aEnd + EPSILON;
      if (aInsideB || bInsideA) continue; // containment → occlusion, no fade
      const [earlier, later] = a.start <= b.start ? [a, b] : [b, a];
      regions.push({
        start: s,
        end: e,
        outgoingClipId: earlier.id,
        incomingClipId: later.id,
      });
    }
  }
  return regions.sort((x, y) => x.start - y.start);
}

export interface FadeCurveRegion {
  clipId: number | string;
  side: 'in' | 'out';
  /** Timeline seconds */
  start: number;
  end: number;
  /** True when the region is the clip's own fadeIn/fadeOut; false when
   *  it is the overlap-default crossfade ramp. */
  authored: boolean;
  /** Curve shape exponent (1 = equal-power) */
  shape: number;
}

/** ONE fade per clip edge — authored wins, the overlap supplies the
 *  default (2026-09-21 "inherit" decision): every authored fadeIn/
 *  fadeOut yields a region at its own extent, and each edge overlap
 *  contributes a default equal-power ramp only for a side whose clip
 *  has NO authored fade on that edge. This is the drawn mirror of
 *  crossfadeGain.ts in @audacity-ui/audio — keep them in agreement. */
export function computeFadeCurves(clips: readonly CrossfadeClipLike[]): FadeCurveRegion[] {
  const regions: FadeCurveRegion[] = [];
  for (const c of clips) {
    const fadeIn = Math.max(0, c.fadeIn ?? 0);
    const fadeOut = Math.max(0, c.fadeOut ?? 0);
    if (fadeIn > EPSILON) {
      regions.push({ clipId: c.id, side: 'in', start: c.start, end: c.start + Math.min(fadeIn, c.duration), authored: true, shape: c.fadeInShape ?? 1 });
    }
    if (fadeOut > EPSILON) {
      regions.push({ clipId: c.id, side: 'out', start: c.start + Math.max(0, c.duration - fadeOut), end: c.start + c.duration, authored: true, shape: c.fadeOutShape ?? 1 });
    }
  }
  for (const r of computeCrossfades(clips)) {
    const outClip = clips.find((c) => c.id === r.outgoingClipId);
    const inClip = clips.find((c) => c.id === r.incomingClipId);
    if (outClip && Math.max(0, outClip.fadeOut ?? 0) <= EPSILON) {
      regions.push({ clipId: outClip.id, side: 'out', start: r.start, end: r.end, authored: false, shape: outClip.fadeOutShape ?? 1 });
    }
    if (inClip && Math.max(0, inClip.fadeIn ?? 0) <= EPSILON) {
      regions.push({ clipId: inClip.id, side: 'in', start: r.start, end: r.end, authored: false, shape: inClip.fadeInShape ?? 1 });
    }
  }
  return regions.sort((a, b) => a.start - b.start || String(a.clipId).localeCompare(String(b.clipId)));
}

export interface CrossfadeIntersection {
  /** Timeline seconds of the curves' crossing */
  time: number;
  /** Gain (0..1) both sides carry at the crossing */
  gain: number;
}

/** The X's crossing point. The out-curve is 1 before its region and 0
 *  after (its region always ENDS at the outgoing clip's tail = the
 *  overlap end); the in-curve is 0 before its region (which always
 *  STARTS at the incoming clip's head = the overlap start) — so their
 *  difference is strictly decreasing across the overlap and crosses
 *  zero exactly once. Bisection; both curves may be authored fades
 *  with extents different from the overlap. */
export function crossfadeIntersection(
  outRegion: { start: number; end: number; shape?: number },
  inRegion: { start: number; end: number; shape?: number },
  overlapStart: number,
  overlapEnd: number,
): CrossfadeIntersection {
  const gainOut = (x: number) => {
    if (x <= outRegion.start) return 1;
    if (x >= outRegion.end) return 0;
    return fadeOutGain((x - outRegion.start) / (outRegion.end - outRegion.start), outRegion.shape ?? 1);
  };
  const gainIn = (x: number) => {
    if (x <= inRegion.start) return 0;
    if (x >= inRegion.end) return 1;
    return fadeInGain((x - inRegion.start) / (inRegion.end - inRegion.start), inRegion.shape ?? 1);
  };
  let lo = overlapStart;
  let hi = overlapEnd;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (gainOut(mid) - gainIn(mid) > 0) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return { time: t, gain: (gainOut(t) + gainIn(t)) / 2 };
}

/** Gain for the OUTGOING side at normalized position t (0..1).
 *  `shape` bends the equal-power base curve (1 = equal-power). */
export function fadeOutGain(t: number, shape = 1): number {
  return Math.cos((Math.max(0, Math.min(1, t)) * Math.PI) / 2) ** shape;
}

/** Gain for the INCOMING side at normalized position t (0..1). */
export function fadeInGain(t: number, shape = 1): number {
  return Math.sin((Math.max(0, Math.min(1, t)) * Math.PI) / 2) ** shape;
}

/** SVG path (0..100 × 0..100 viewBox, y=0 is full gain) for one side
 *  of the X. Sampled polyline stretched to the region via
 *  `preserveAspectRatio="none"`. A bent shape exponent concentrates
 *  all the curvature near one end, so the sample count must be high
 *  enough that no segment reads as an angle. */
export function fadeCurvePath(side: 'out' | 'in', samples = 64, shape = 1): string {
  const pts: string[] = [];
  for (let k = 0; k <= samples; k++) {
    const t = k / samples;
    const gain = side === 'out' ? fadeOutGain(t, shape) : fadeInGain(t, shape);
    const xPos = t * 100;
    const yPos = (1 - gain) * 100;
    pts.push(`${xPos.toFixed(2)},${yPos.toFixed(2)}`);
  }
  return `M ${pts.join(' L ')}`;
}
