/**
 * Track layout utilities
 */
import { effectiveTrackStride, type FolderTrackLike } from './trackFolders';

export type Track = FolderTrackLike;

/**
 * Calculate the Y-offset for a track based on its position in the track list.
 * Folder-aware: folder rows are slim, hidden (collapsed-folder) children
 * contribute nothing — see utils/trackFolders.ts.
 */
export function calculateTrackYOffset(
  trackIndex: number,
  tracks: Track[],
  topGap: number,
  trackGap: number,
  defaultHeight: number = 114
): number {
  let yOffset = topGap;
  for (let i = 0; i < trackIndex; i++) {
    yOffset += effectiveTrackStride(tracks, i, defaultHeight, trackGap);
  }
  return yOffset;
}
