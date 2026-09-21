/**
 * Track-row vertical geometry, folder-aware (folders v1, 2026-09-21).
 *
 * MUST MATCH apps/sandbox/src/utils/trackFolders.ts — the sandbox is
 * the source of truth for the rules: a `type: 'folder'` track renders
 * as a slim FOLDER_ROW_HEIGHT row; a child (carries `folderId`) of a
 * COLLAPSED folder contributes zero height and zero gap.
 */
export interface RowGeometryTrackLike {
  id?: number | string;
  type?: string;
  folderId?: number;
  collapsed?: boolean;
  height?: number;
}

export const FOLDER_ROW_HEIGHT = 28;

export function effectiveRowHeight(
  tracks: readonly RowGeometryTrackLike[],
  index: number,
  defaultHeight: number,
): number {
  const track = tracks[index];
  if (!track) return 0;
  if (track.type === 'folder') return FOLDER_ROW_HEIGHT;
  if (track.folderId !== undefined) {
    const folder = tracks.find((t) => t.type === 'folder' && t.id === track.folderId);
    if (folder?.collapsed) return 0;
  }
  return track.height || defaultHeight;
}
