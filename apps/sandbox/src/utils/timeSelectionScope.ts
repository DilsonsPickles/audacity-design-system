// Scope resolution for time-selection operations.
// Spec: docs/superpowers/specs/2026-07-09-time-selection-scope-design.md
// Time selection and track selection are independent axes; the drag's
// vertical scope lives on the TimeSelection itself. Every consumer
// (delete, copy/cut, Cmd+Arrow promote, drag-clip-in) resolves the
// rows to act on through this one chain.

/**
 * 1. `timeSelection.tracks` — populated by the gesture that made the
 *    selection (drag rows / focused track), when DEFINED. An empty
 *    array is meaningful: the user cmd+clicked every spanned track
 *    out of the selection, so the range is ruler-only and operations
 *    act on NO tracks — it must not fall through to the fallbacks.
 * 2. `selectedTrackIndices` — legacy fallback (scope undefined), when
 *    non-empty.
 * 3. `fallback` — caller-specific (all tracks for delete/copy/cut,
 *    focused-track-or-empty for the Cmd+Arrow promote).
 */
export function resolveTimeSelectionScope(
  timeSelection: { tracks?: number[] } | null | undefined,
  selectedTrackIndices: number[],
  fallback: number[],
): number[] {
  if (timeSelection?.tracks) return timeSelection.tracks;
  if (selectedTrackIndices.length > 0) return selectedTrackIndices;
  return fallback;
}
