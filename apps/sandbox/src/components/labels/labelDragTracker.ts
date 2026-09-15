/**
 * Module-scoped singleton (same pattern as pendingClipMoveResolution):
 * timestamp of the last label drag's mouseup. The canvas container's click
 * handler consults it because the browser synthesizes a `click` after the
 * release, and that click must not move the playhead — moving/stretching a
 * label is a label gesture, not a playhead gesture. Import it — never
 * recreate it.
 */
const lastLabelDragEndRef = { current: 0 };

export function markLabelDragEnd(): void {
  lastLabelDragEndRef.current = performance.now();
}

/** True within the post-release click window (75ms). */
export function labelDragJustEnded(): boolean {
  return performance.now() - lastLabelDragEndRef.current < 75;
}
