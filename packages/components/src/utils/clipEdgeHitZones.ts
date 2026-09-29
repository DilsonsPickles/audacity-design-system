/**
 * Where a clip's EDGE can be grabbed to trim it (user decision
 * 2026-09-29): a strip ON the edge — half of it outside the clip, half
 * inside — not a strip inside the clip. This is how an UNSELECTED clip
 * is trimmed; a selected clip has its trim handles.
 *
 * Pure geometry, in pixels along the track (0 = time zero; the caller
 * adds its content offset). Three rules decide what each edge gets:
 *
 *  1. An edge lying UNDER a higher clip is not there to grab — no zone.
 *  2. Two zones never overlap. Where they would (clips that touch, or
 *     sit a few pixels apart) the ground between the two edges is split
 *     down the middle; at a butt joint that is the joint itself, so each
 *     clip keeps exactly its own side.
 *  3. The inside half stops at the clip's middle, so a very short clip's
 *     two zones do not cross.
 *
 * Every visible edge claims its ground under rule 2, including the edges
 * of clips that get no zone of their own (`eligible` = false, e.g. a
 * selected clip) — otherwise a neighbour's zone would reach into them.
 *
 * The fade handles live further in: their hit box starts
 * EDGE_HIT_INSIDE_PX from the clip's edge (TrackNew positions them), so
 * a zone and a fade handle meet and never overlap.
 */

export const EDGE_HIT_OUTSIDE_PX = 4;
export const EDGE_HIT_INSIDE_PX = 4;

export interface EdgeZoneClipLike {
  id: number | string;
  start: number;
  duration: number;
}

export interface EdgeHitZone {
  clipId: number | string;
  edge: 'left' | 'right';
  /** The edge itself, px */
  edgeX: number;
  /** The zone, px: [left, left + width) */
  left: number;
  width: number;
}

export interface EdgeHitZoneOptions {
  pixelsPerSecond: number;
  /** Stacking order; higher = on top. Defaults to array position. */
  zOf?: (clip: EdgeZoneClipLike, index: number) => number;
  /** Clips that get a zone. Others still claim their ground. Default: all. */
  eligible?: (clip: EdgeZoneClipLike) => boolean;
}

const EPSILON = 1e-9;

export function computeEdgeHitZones(
  clips: readonly EdgeZoneClipLike[],
  options: EdgeHitZoneOptions,
): EdgeHitZone[] {
  const { pixelsPerSecond, zOf = (_clip, index) => index, eligible = () => true } = options;

  interface Claim extends EdgeHitZone { right: number; eligible: boolean }
  const claims: Claim[] = [];

  clips.forEach((clip, index) => {
    const z = zOf(clip, index);
    const startX = clip.start * pixelsPerSecond;
    const endX = (clip.start + clip.duration) * pixelsPerSecond;
    const inside = Math.min(EDGE_HIT_INSIDE_PX, Math.max(0, (endX - startX) / 2));
    // Rule 1: strictly inside a higher clip's span = buried
    const buried = (t: number) => clips.some((other, otherIndex) =>
      other !== clip
      && zOf(other, otherIndex) > z
      && other.start < t - EPSILON
      && t < other.start + other.duration - EPSILON);

    if (!buried(clip.start)) {
      claims.push({
        clipId: clip.id, edge: 'left', edgeX: startX,
        left: startX - EDGE_HIT_OUTSIDE_PX, right: startX + inside, width: 0,
        eligible: eligible(clip),
      });
    }
    if (!buried(clip.start + clip.duration)) {
      claims.push({
        clipId: clip.id, edge: 'right', edgeX: endX,
        left: endX - inside, right: endX + EDGE_HIT_OUTSIDE_PX, width: 0,
        eligible: eligible(clip),
      });
    }
  });

  // Rule 2. Left to right; where two edges share a position, the RIGHT
  // edge comes first — its clip is the one to the left of the joint.
  claims.sort((a, b) => (a.edgeX - b.edgeX) || (a.edge === b.edge ? 0 : a.edge === 'right' ? -1 : 1));
  for (let i = 0; i + 1 < claims.length; i++) {
    const a = claims[i];
    const b = claims[i + 1];
    if (a.clipId === b.clipId) continue; // one clip's own two edges: rule 3 has dealt with it
    if (a.right <= b.left) continue;
    const mid = (a.edgeX + b.edgeX) / 2;
    a.right = Math.min(a.right, mid);
    b.left = Math.max(b.left, mid);
  }

  return claims
    .filter((c) => c.eligible && c.right - c.left > EPSILON)
    .map(({ clipId, edge, edgeX, left, right }) => ({ clipId, edge, edgeX, left, width: right - left }));
}
