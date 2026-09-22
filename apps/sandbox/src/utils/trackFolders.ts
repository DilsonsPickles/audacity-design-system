/**
 * Track folders v1 (2026-09-21) — ORGANISATIONAL ONLY.
 *
 * A folder is a `Track` with `type: 'folder'` living in the same FLAT
 * tracks array as everything else (trackIndex stays load-bearing
 * app-wide). Children reference their folder by TRACK ID (`folderId`),
 * not by index, and sit contiguously below their folder row — the
 * GROUP_SELECTED_TRACKS reducer establishes contiguity and the
 * folder-aware MOVE_TRACK preserves it. One nesting level: folders
 * never carry a folderId.
 *
 * Everything here is DERIVED: collapse hides children by zeroing their
 * effective height (no state mutation of the children), and folder
 * mute/solo CASCADES to children at the point of audio consumption.
 * Folder rows produce no audio (guarded like `type: 'label'`), so v1
 * has zero routing semantics — the folder-as-bus layer arrives in a
 * later release.
 */
import { effectiveRowHeight, FOLDER_ROW_HEIGHT as CORE_FOLDER_ROW_HEIGHT } from '@audacity-ui/core';

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

export const isFolderTrack = (track: FolderTrackLike | undefined): boolean =>
  track?.type === 'folder';

/** The folder track a child belongs to, or null. */
export function parentFolderOf<T extends FolderTrackLike>(tracks: readonly T[], index: number): T | null {
  const folderId = tracks[index]?.folderId;
  if (folderId === undefined) return null;
  return tracks.find((t) => t.type === 'folder' && t.id === folderId) ?? null;
}

/** Indices of a folder's children (contiguous below it by invariant,
 *  but matched by id so a transiently broken order still resolves). */
export function folderChildIndices(tracks: readonly FolderTrackLike[], folderIndex: number): number[] {
  const folder = tracks[folderIndex];
  if (!folder || folder.type !== 'folder' || folder.id === undefined) return [];
  const out: number[] = [];
  tracks.forEach((t, i) => {
    if (t.folderId === folder.id) out.push(i);
  });
  return out;
}

/** True when the track is a child of a COLLAPSED folder — it renders
 *  nowhere (zero height, no panel row) but stays fully functional. */
export function isHiddenByCollapse(tracks: readonly FolderTrackLike[], index: number): boolean {
  return parentFolderOf(tracks, index)?.collapsed === true;
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
  return h === 0 ? 0 : h + trackGap;
}

/** Folder mute/solo CASCADE to children (behaviour ganging, not
 *  routing): a child is effectively muted/soloed when it or its
 *  folder is. Applied at audio-consumption points. */
export function effectiveTrackMuted(tracks: readonly FolderTrackLike[], index: number): boolean {
  return !!tracks[index]?.muted || parentFolderOf(tracks, index)?.muted === true;
}

export function effectiveTrackSoloed(tracks: readonly FolderTrackLike[], index: number): boolean {
  return !!tracks[index]?.soloed || parentFolderOf(tracks, index)?.soloed === true;
}

/** Indent depth for panel rendering (v1: 0 or 1). */
export function trackDepth(tracks: readonly FolderTrackLike[], index: number): number {
  return tracks[index]?.folderId !== undefined ? 1 : 0;
}

/** THE move. Folder rows carry their whole family; a plain track's
 *  MEMBERSHIP follows its landing spot (it joins the folder of the row
 *  above — a folder row itself meaning "first child" — and leaves when
 *  it lands under a plain track or at the top). Pure, so the drag
 *  PREVIEW and the committed move are computed by the same code and
 *  can never disagree. Callers apply normalizeFolders afterwards. */
export function moveTrackWithFolders<T extends FolderTrackLike>(
  tracks: readonly T[],
  fromIndex: number,
  toIndex: number,
): { tracks: T[]; landedIndex: number } {
  const source = tracks[fromIndex];
  const next = [...tracks];

  if (source?.type === 'folder') {
    const blockSize = 1 + folderChildIndices(tracks, fromIndex).length;
    const block = next.splice(fromIndex, blockSize);
    // Clamp the landing index so the family stays inside the array and
    // never lands INSIDE another folder's family (no nesting in v1)
    let insert = Math.max(
      0,
      Math.min(next.length, toIndex > fromIndex ? toIndex - blockSize + 1 : toIndex),
    );
    const landingOn = next[insert];
    if (landingOn?.folderId !== undefined) {
      while (
        insert > 0
        && next[insert - 1]
        && (next[insert - 1].folderId === landingOn.folderId
          || (next[insert - 1].type === 'folder' && next[insert - 1].id === landingOn.folderId))
      ) {
        insert -= 1;
      }
    }
    next.splice(insert, 0, ...block);
    return { tracks: next, landedIndex: insert };
  }

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  const above = next[toIndex - 1];
  const nextFolderId = above
    ? (above.type === 'folder' ? above.id : above.folderId)
    : undefined;
  if (nextFolderId === undefined) {
    const { folderId: _left, ...rest } = moved;
    next[toIndex] = rest as T;
  } else if (moved.folderId !== nextFolderId) {
    next[toIndex] = { ...moved, folderId: nextFolderId };
  }
  return { tracks: next, landedIndex: toIndex };
}

/** Drop dangling folderIds (folder deleted) and dissolve folders with
 *  no children left. Identity-preserving. */
export function normalizeFolders<T extends FolderTrackLike>(tracks: T[]): T[] {
  const folderIds = new Set(
    tracks.filter((t) => t.type === 'folder' && t.id !== undefined).map((t) => t.id as number),
  );
  const childCounts = new Map<number, number>();
  for (const t of tracks) {
    if (t.folderId !== undefined && folderIds.has(t.folderId)) {
      childCounts.set(t.folderId, (childCounts.get(t.folderId) ?? 0) + 1);
    }
  }
  let changed = false;
  const next: T[] = [];
  for (const t of tracks) {
    if (t.type === 'folder' && (childCounts.get(t.id) ?? 0) === 0) {
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
  return changed ? next : tracks;
}
