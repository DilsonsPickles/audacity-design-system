/**
 * Z-order normalization for overlapping clips (array position IS the
 * z-order; later = on top).
 *
 * Rule (2026-09-21): in every EDGE-overlapping pair the later-starting
 * (right-most) clip sits on top — the incoming side of the crossfade
 * reads above the outgoing one, whichever clip was moved last.
 * CONTAINMENT pairs keep their current relative order: there z is
 * audible state (the top clip plays, the bottom is occluded) and stays
 * move-controlled.
 *
 * Applied once, in tracksReducer, after every action that changes
 * tracks — moves, trims, paste, generate, project load all funnel
 * through it, so the invariant can't drift.
 */
import type { Clip, Track } from '../contexts/TracksContext';

const EPSILON = 1e-9;

type Kind = 'none' | 'edge' | 'containment';

function overlapKind(a: Clip, b: Clip): Kind {
  const aEnd = a.start + a.duration;
  const bEnd = b.start + b.duration;
  const s = Math.max(a.start, b.start);
  const e = Math.min(aEnd, bEnd);
  if (e - s <= EPSILON) return 'none';
  const aInsideB = a.start >= b.start - EPSILON && aEnd <= bEnd + EPSILON;
  const bInsideA = b.start >= a.start - EPSILON && bEnd <= aEnd + EPSILON;
  return aInsideB || bInsideA ? 'containment' : 'edge';
}

/** Returns the INPUT array when nothing needs to move. Stable for
 *  unconstrained pairs (topological order preferring original index). */
export function normalizeClipZOrder(clips: Clip[]): Clip[] {
  const n = clips.length;
  if (n < 2) return clips;

  // Constraint u -> v: u must stay BELOW v (earlier in the array).
  const succ: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array<number>(n).fill(0);
  let any = false;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const kind = overlapKind(clips[i], clips[j]);
      if (kind === 'none') continue;
      any = true;
      if (kind === 'containment') {
        // pin the CURRENT order (i is below j today)
        succ[i].push(j);
        indegree[j]++;
      } else {
        // edge overlap: earlier start below, later start on top
        const [below, above] = clips[i].start <= clips[j].start ? [i, j] : [j, i];
        succ[below].push(above);
        indegree[above]++;
      }
    }
  }
  if (!any) return clips;

  // Kahn's algorithm, always taking the smallest available original
  // index — minimal disturbance for everything unconstrained.
  const order: number[] = [];
  const available: number[] = [];
  for (let i = 0; i < n; i++) if (indegree[i] === 0) available.push(i);
  while (available.length > 0) {
    available.sort((x, y) => x - y);
    const u = available.shift() as number;
    order.push(u);
    for (const v of succ[u]) {
      if (--indegree[v] === 0) available.push(v);
    }
  }
  // A cycle can only arise from pathological containment-vs-edge chains;
  // leave the stack as the user built it rather than guessing.
  if (order.length !== n) return clips;

  const changed = order.some((idx, k) => idx !== k);
  return changed ? order.map((idx) => clips[idx]) : clips;
}

/** Identity-preserving map over every track's clips. */
export function normalizeTracksZOrder(tracks: Track[]): Track[] {
  let changed = false;
  const next = tracks.map((track) => {
    const clips = normalizeClipZOrder(track.clips);
    if (clips === track.clips) return track;
    changed = true;
    return { ...track, clips };
  });
  return changed ? next : tracks;
}
