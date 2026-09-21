/**
 * Track-row vertical geometry (folders v1). The CANONICAL rule lives in
 * `@audacity-ui/core` (utils/coordinates.ts) — this module only
 * re-exports it so components-package call sites can't drift from the
 * core hit-test math they share a coordinate space with.
 */
export {
  FOLDER_ROW_HEIGHT,
  effectiveRowHeight,
} from '@audacity-ui/core';

export type { RowHeightTrackLike as RowGeometryTrackLike } from '@audacity-ui/core';
