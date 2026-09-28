/**
 * Track folders (v1 2026-09-21, nesting 2026-09-28) — ORGANISATIONAL ONLY.
 *
 * A folder is a `Track` with `type: 'folder'` living in the same FLAT
 * tracks array as everything else (trackIndex stays load-bearing
 * app-wide). Rows reference their folder by TRACK ID (`folderId`), not
 * by index. Folders NEST: a folder row may carry a `folderId` of its
 * own, to any depth. The invariant every operation here preserves is
 * CONTIGUITY — a folder's whole subtree sits directly below its row,
 * in one unbroken run.
 *
 * Everything here is DERIVED: collapse hides a subtree by zeroing its
 * rows' effective height (no state mutation of the children), and
 * folder mute/solo CASCADES down the whole chain at the point of audio
 * consumption. Folder rows produce no audio (guarded like
 * `type: 'label'`), so there are no routing semantics yet — the
 * folder-as-bus layer arrives in a later release, where a nested group
 * becomes a submix.
 */
import {
  ancestorFolderIndices,
  effectiveRowHeight,
  groupsClosingAt,
  rowGapAfter,
  FOLDER_ROW_HEIGHT as CORE_FOLDER_ROW_HEIGHT,
  GROUP_END_PAD as CORE_GROUP_END_PAD,
} from '@audacity-ui/core';

/** Structural track shape so geometry layers can share these helpers
 *  without importing the full TracksContext Track. */
export interface FolderTrackLike {
  id?: number;
  type?: string;
  folderId?: number;
  collapsed?: boolean;
  height?: number;
  muted?: boolean;
  soloed?: boolean;
}

/** Slim rendered height of a folder's own row (canvas + panel).
 *  Re-exported from core, which owns the canonical rule. */
export const FOLDER_ROW_HEIGHT = CORE_FOLDER_ROW_HEIGHT;

/** Extra space below a group's last visible row. Re-exported from
 *  core, which owns the canonical rule. */
export const GROUP_END_PAD = CORE_GROUP_END_PAD;

export const isFolderTrack = (track: FolderTrackLike | undefined): boolean =>
  track?.type === 'folder';

/** The folder a row belongs to DIRECTLY, or null. */
export function parentFolderOf<T extends FolderTrackLike>(tracks: readonly T[], index: number): T | null {
  const folderId = tracks[index]?.folderId;
  if (folderId === undefined) return null;
  return tracks.find((t) => t.type === 'folder' && t.id === folderId) ?? null;
}

/** Every folder containing a row, NEAREST first. */
export function ancestorFolders<T extends FolderTrackLike>(tracks: readonly T[], index: number): T[] {
  return ancestorFolderIndices(tracks, index).map((i) => tracks[i]);
}

/** Indices of a folder's DIRECT children (matched by id, so a
 *  transiently broken order still resolves). */
export function folderChildIndices(tracks: readonly FolderTrackLike[], folderIndex: number): number[] {
  const folder = tracks[folderIndex];
  if (!folder || folder.type !== 'folder' || folder.id === undefined) return [];
  const out: number[] = [];
  tracks.forEach((t, i) => {
    if (t.folderId === folder.id) out.push(i);
  });
  return out;
}

/** Indices of a folder's whole SUBTREE — children, their children, and
 *  so on — excluding its own row. This is "the family": what a header
 *  drags, what a delete takes, what a duplicate copies. */
export function folderDescendantIndices(tracks: readonly FolderTrackLike[], folderIndex: number): number[] {
  if (tracks[folderIndex]?.type !== 'folder') return [];
  const out: number[] = [];
  tracks.forEach((_t, i) => {
    if (i !== folderIndex && ancestorFolderIndices(tracks, i).includes(folderIndex)) out.push(i);
  });
  return out;
}

/** True when the row sits inside a COLLAPSED folder at any depth — it
 *  renders nowhere (zero height, no panel row) but stays fully
 *  functional. */
export function isHiddenByCollapse(tracks: readonly FolderTrackLike[], index: number): boolean {
  return ancestorFolders(tracks, index).some((f) => f.collapsed === true);
}

/** The height a track contributes to vertical layout — DELEGATES to
 *  the canonical rule in @audacity-ui/core so the sandbox, the
 *  components hit-tests and core's own coordinate math can never
 *  disagree (they did once: folder rows counted as full-height tracks
 *  in core's yToTrackIndex and every time-selection click resolved to
 *  the row above). */
export function effectiveTrackHeight(
  tracks: readonly FolderTrackLike[],
  index: number,
  defaultHeight: number,
): number {
  return effectiveRowHeight(tracks, index, defaultHeight);
}

/** The height + gap a track contributes when stacking rows: hidden
 *  children contribute NOTHING (no gap either — otherwise collapsed
 *  folders leak 2px per hidden child into every y computation). */
export function effectiveTrackStride(
  tracks: readonly FolderTrackLike[],
  index: number,
  defaultHeight: number,
  trackGap: number,
): number {
  const h = effectiveTrackHeight(tracks, index, defaultHeight);
  // DELEGATES the gap too: a row that closes groups pays a
  // GROUP_END_PAD per group, and core's yToTrackIndex/trackIndexToY add
  // the same — a fourth private copy of this rule is exactly how folder
  // rows once desynced the columns.
  return h === 0 ? 0 : h + rowGapAfter(tracks, index, trackGap, defaultHeight);
}

/** Folder mute/solo CASCADE down the whole chain (behaviour ganging,
 *  not routing): a row is effectively muted/soloed when it or ANY
 *  folder containing it is. Applied at audio-consumption points. */
export function effectiveTrackMuted(tracks: readonly FolderTrackLike[], index: number): boolean {
  return !!tracks[index]?.muted || ancestorFolders(tracks, index).some((f) => f.muted === true);
}

export function effectiveTrackSoloed(tracks: readonly FolderTrackLike[], index: number): boolean {
  return !!tracks[index]?.soloed || ancestorFolders(tracks, index).some((f) => f.soloed === true);
}

/** How many groups contain the row. */
export function trackDepth(tracks: readonly FolderTrackLike[], index: number): number {
  return ancestorFolderIndices(tracks, index).length;
}

/** How deep a PARENT sits: 0 for the root, 1 for a top-level folder… */
function parentDepth(tracks: readonly FolderTrackLike[], parentId: number | null): number {
  if (parentId === null) return 0;
  const fi = tracks.findIndex((t) => t.type === 'folder' && t.id === parentId);
  return fi < 0 ? 0 : 1 + ancestorFolderIndices(tracks, fi).length;
}

/**
 * The parents a row may take when inserted at `at` (before the row
 * currently there), SHALLOWEST first; `null` is the root. Contiguity
 * decides: the row above offers its whole chain — itself if it is a
 * folder, then each group it sits in, then the root — and the row
 * below cuts that chain off at ITS parent, because landing any
 * shallower would split the group the row below belongs to.
 *
 * One entry means the landing is unambiguous. Several mean a boundary
 * between nested groups, where the same slot can belong to any of
 * them — that is what the drag's horizontal position chooses between.
 */
export function validParentsAt(tracks: readonly FolderTrackLike[], at: number): Array<number | null> {
  const above = tracks[at - 1];
  const below = tracks[at];
  const deepestFirst: Array<number | null> = [];
  if (above) {
    if (above.type === 'folder' && above.id !== undefined) deepestFirst.push(above.id);
    for (const f of ancestorFolders(tracks, at - 1)) {
      if (f.id !== undefined) deepestFirst.push(f.id);
    }
  }
  deepestFirst.push(null);
  const floor = below ? below.folderId ?? null : null;
  const cut = deepestFirst.indexOf(floor);
  const valid = cut === -1 ? [floor] : deepestFirst.slice(0, cut + 1);
  return valid.reverse();
}

/** Who a moved row belongs to where it lands:
 *  - `follow` (default): for a TRACK, the DEEPEST group the slot
 *    allows — the group of the row above, a folder row itself meaning
 *    "first child". For a FOLDER, the parent it already has.
 *  - `leave`: the SHALLOWEST the slot allows — out of every group it
 *    can get out of.
 *  - `{ parentId }`: that folder exactly (`null` = the root), clamped
 *    to what the slot allows. The drag's drop zones use this. */
export type MoveMembership = 'follow' | 'leave' | { parentId: number | null };

/** THE move. A folder row carries its whole subtree; any row's
 *  MEMBERSHIP is decided by where it lands (see MoveMembership), and a
 *  folder can land inside another — that is how groups nest.
 *  `toIndex` names a row of the ORIGINAL array: moving down, the block
 *  ENDS there; moving up, it STARTS there. `tracks.length` means
 *  "after the last row". Pure, so the drag PREVIEW and the committed
 *  move are computed by the same code and can never disagree. Callers
 *  apply normalizeFolders afterwards. */
export function moveTrackWithFolders<T extends FolderTrackLike>(
  tracks: readonly T[],
  fromIndex: number,
  toIndex: number,
  membership: MoveMembership = 'follow',
): { tracks: T[]; landedIndex: number } {
  const source = tracks[fromIndex];
  const next = [...tracks];
  if (!source) return { tracks: next, landedIndex: fromIndex };

  const size = source.type === 'folder' ? 1 + folderDescendantIndices(tracks, fromIndex).length : 1;
  const block = next.splice(fromIndex, size);
  let at = Math.max(0, Math.min(next.length, toIndex > fromIndex ? toIndex - size + 1 : toIndex));

  // A GROUP moved with no say in the matter (the menu's Move up/down,
  // any caller older than nesting) keeps the parent it has: reordering
  // a group must not quietly file it inside its neighbour. If the slot
  // it was sent to can't honour that — it is inside another family —
  // the slot rises until it can, which puts the group ABOVE that
  // family. Tracks still join what they land in; that is how the
  // keyboard moves a track into and out of groups.
  let ask: MoveMembership = membership;
  if (membership === 'follow' && source.type === 'folder') {
    const keep = source.folderId ?? null;
    while (at > 0 && !validParentsAt(next, at).includes(keep)) at -= 1;
    ask = { parentId: keep };
  }

  // Shallowest first, never empty.
  const valid = validParentsAt(next, at);
  let parent: number | null;
  if (ask === 'follow') parent = valid[valid.length - 1];
  else if (ask === 'leave') parent = valid[0];
  else if (valid.includes(ask.parentId)) parent = ask.parentId;
  else {
    // Asked for a parent this slot can't give: take the nearest depth.
    const wanted = parentDepth(next, ask.parentId) - parentDepth(next, valid[0]);
    parent = valid[Math.max(0, Math.min(valid.length - 1, wanted))];
  }

  const head = block[0];
  if (parent === null) {
    if (head.folderId !== undefined) {
      const { folderId: _left, ...rest } = head;
      block[0] = rest as T;
    }
  } else if (head.folderId !== parent) {
    block[0] = { ...head, folderId: parent };
  }
  next.splice(at, 0, ...block);
  return { tracks: next, landedIndex: at };
}

/**
 * Where a dragged row lands, from the row under the pointer.
 *
 * The zones follow what a group DRAWS — its header, its strip, its
 * floor:
 *   upper half of a header          → before the group, beside it
 *   lower half of an open header    → its first child
 *   lower half of a closed header   → inside it, as its last child
 *   lower half of a group's last
 *     visible row                   → after that group, one level out
 *   anywhere else on a row          → that row's slot, at its depth
 *   `'end'` (below the last row)    → the bottom slot, at the root
 *
 * Where nested groups end together the same slot could belong to any
 * of them, so the zone only picks a DEFAULT; `depthShift` steps out
 * (negative) or in (positive) from it, clamped to what the slot
 * allows. With one level of grouping there is never a choice and this
 * is exactly the v1 behaviour.
 *
 * Returns null when the pointer is over the dragged block itself —
 * its own ghost — so the caller holds the current preview.
 */
export function resolveDropLanding<T extends FolderTrackLike>(
  tracks: readonly T[],
  fromIndex: number,
  target: number | 'end',
  lowerHalf: boolean,
  depthShift = 0,
  defaultHeight = 114,
): { toIndex: number; parentId: number | null } | null {
  const source = tracks[fromIndex];
  if (!source) return null;
  const size = source.type === 'folder' ? 1 + folderDescendantIndices(tracks, fromIndex).length : 1;
  const inBlock = (i: number) => i >= fromIndex && i < fromIndex + size;
  if (target !== 'end' && inBlock(target)) return null;

  // Everything is decided on the list WITHOUT the dragged block: that
  // is the list the block is inserted into.
  const rest = tracks.filter((_t, i) => !inBlock(i));
  const inRest = (i: number) => (i < fromIndex ? i : i - size);

  let slot: number; // insert before this row of `rest`
  let wanted: number | null;
  if (target === 'end') {
    slot = rest.length;
    wanted = null;
  } else {
    const r = inRest(target);
    const row = rest[r];
    if (row.type === 'folder') {
      if (!lowerHalf) {
        slot = r;
        wanted = row.folderId ?? null;
      } else {
        // An open header takes it as the first child; a closed one
        // can't show where it went, so it joins at the end.
        slot = row.collapsed ? r + 1 + folderDescendantIndices(rest, r).length : r + 1;
        wanted = row.id ?? null;
      }
    } else if (lowerHalf && groupsClosingAt(rest, r, defaultHeight) > 0) {
      slot = r + 1;
      wanted = parentFolderOf(rest, r)?.folderId ?? null;
    } else {
      // The dragged row takes this row's slot, pushing it toward where
      // the drag came from.
      slot = fromIndex < target ? r + 1 : r;
      wanted = row.folderId ?? null;
    }
  }

  const valid = validParentsAt(rest, slot);
  const base = parentDepth(rest, wanted) - parentDepth(rest, valid[0]);
  const pick = Math.max(0, Math.min(valid.length - 1, base + depthShift));
  // Back to moveTrackWithFolders' terms: a slot at or above the block
  // is where it STARTS; below it, the row it ENDS on.
  const toIndex = slot <= fromIndex ? slot : slot + size - 1;
  return { toIndex, parentId: valid[pick] };
}

/**
 * The landing for a row that STAYS WHERE IT IS and only changes level:
 * the pointer is resting on the dragged rows themselves and moving
 * sideways. Same slot; `depthShift` steps out (negative) or in
 * (positive) from the group the row is in now, within the levels that
 * slot has. Same return shape as `resolveDropLanding`.
 */
export function resolveInPlaceLanding<T extends FolderTrackLike>(
  tracks: readonly T[],
  fromIndex: number,
  depthShift = 0,
): { toIndex: number; parentId: number | null } | null {
  const source = tracks[fromIndex];
  if (!source) return null;
  const size = source.type === 'folder' ? 1 + folderDescendantIndices(tracks, fromIndex).length : 1;
  const rest = tracks.filter((_t, i) => i < fromIndex || i >= fromIndex + size);
  const valid = validParentsAt(rest, fromIndex);
  const base = Math.max(0, valid.indexOf(source.folderId ?? null));
  const pick = Math.max(0, Math.min(valid.length - 1, base + depthShift));
  return { toIndex: fromIndex, parentId: valid[pick] };
}

/** Drop dangling folderIds (folder deleted) and dissolve folders with
 *  nothing left in them — repeatedly, since emptying an inner group
 *  can empty the group around it. Identity-preserving. */
export function normalizeFolders<T extends FolderTrackLike>(tracks: T[]): T[] {
  let current = tracks;
  // Each pass removes at least one row or settles, so this terminates.
  for (let pass = 0; pass <= tracks.length; pass++) {
    const folderIds = new Set(
      current.filter((t) => t.type === 'folder' && t.id !== undefined).map((t) => t.id as number),
    );
    const childCounts = new Map<number, number>();
    for (const t of current) {
      if (t.folderId !== undefined && folderIds.has(t.folderId)) {
        childCounts.set(t.folderId, (childCounts.get(t.folderId) ?? 0) + 1);
      }
    }
    let changed = false;
    const next: T[] = [];
    for (const t of current) {
      if (t.type === 'folder' && (childCounts.get(t.id as number) ?? 0) === 0) {
        changed = true; // empty folder dissolves
        continue;
      }
      if (t.folderId !== undefined && !folderIds.has(t.folderId)) {
        changed = true;
        const { folderId: _dropped, ...rest } = t;
        next.push(rest as T);
        continue;
      }
      next.push(t);
    }
    if (!changed) return current;
    current = next;
  }
  return current;
}
