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

/** Equal-power gain for the OUTGOING side at normalized position t (0..1). */
export function fadeOutGain(t: number): number {
  return Math.cos((Math.max(0, Math.min(1, t)) * Math.PI) / 2);
}

/** Equal-power gain for the INCOMING side at normalized position t (0..1). */
export function fadeInGain(t: number): number {
  return Math.sin((Math.max(0, Math.min(1, t)) * Math.PI) / 2);
}

/** SVG path (0..100 × 0..100 viewBox, y=0 is full gain) for one side
 *  of the X. Sampled polyline — smooth enough at clip sizes, and
 *  `preserveAspectRatio="none"` stretches it to the region. */
export function fadeCurvePath(side: 'out' | 'in', samples = 16): string {
  const pts: string[] = [];
  for (let k = 0; k <= samples; k++) {
    const t = k / samples;
    const gain = side === 'out' ? fadeOutGain(t) : fadeInGain(t);
    const xPos = t * 100;
    const yPos = (1 - gain) * 100;
    pts.push(`${xPos.toFixed(2)},${yPos.toFixed(2)}`);
  }
  return `M ${pts.join(' L ')}`;
}
