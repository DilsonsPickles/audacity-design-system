// Clip-group semantics for copied clips.
// Invariant (docs/superpowers/specs/2026-07-07-clip-group-copy-semantics-design.md):
// copies never share a group with their originals; copies form a fresh
// group of their own iff every member of the original group was copied
// whole — otherwise they are ungrouped.
import type { Clip, Track } from '../contexts/TracksContext';

/** Same minting scheme as GROUP_SELECTED_CLIPS in clipsReducer. */
export function mintGroupId(): string {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Which source groupIds does this copy operation capture whole?
 * A group counts iff every member (across all sourceTracks) is present in
 * copiedClips by id AND — when a timeRange bounds the copy — every member
 * lies entirely inside it. A member that would be sliced is a fragment,
 * not the member, so it disqualifies the group (strict entirety).
 */
export function computeWholeGroupIds(
  copiedClips: Pick<Clip, 'id' | 'groupId'>[],
  sourceTracks: Track[],
  timeRange?: { startTime: number; endTime: number },
): Set<string> {
  const copiedIds = new Set(copiedClips.map(c => c.id));
  const candidateGroups = new Set<string>();
  for (const c of copiedClips) {
    if (c.groupId) candidateGroups.add(c.groupId);
  }

  const whole = new Set<string>();
  for (const gid of candidateGroups) {
    let isWhole = true;
    for (const t of sourceTracks) {
      for (const m of t.clips) {
        if (m.groupId !== gid) continue;
        if (!copiedIds.has(m.id)) { isWhole = false; break; }
        if (timeRange && (m.start < timeRange.startTime || m.start + m.duration > timeRange.endTime)) {
          isWhole = false;
          break;
        }
      }
      if (!isWhole) break;
    }
    if (isWhole) whole.add(gid);
  }
  return whole;
}

/**
 * Re-group a set of copies about to be materialized. Members of
 * whole-copied groups share one fresh groupId per source group; all other
 * copies come out ungrouped. A fresh group that would end up with <2
 * members in `copies` is dissolved instead (mirrors dissolve-below-two).
 */
export function regroupCopiedClips<T extends { groupId?: string }>(
  copies: T[],
  wholeGroupIds: ReadonlySet<string>,
): T[] {
  const memberCounts = new Map<string, number>();
  for (const c of copies) {
    if (c.groupId && wholeGroupIds.has(c.groupId)) {
      memberCounts.set(c.groupId, (memberCounts.get(c.groupId) ?? 0) + 1);
    }
  }
  const freshIds = new Map<string, string>();
  for (const [gid, count] of memberCounts) {
    if (count >= 2) freshIds.set(gid, mintGroupId());
  }
  return copies.map(c => ({
    ...c,
    groupId: c.groupId ? freshIds.get(c.groupId) : undefined,
  }));
}
