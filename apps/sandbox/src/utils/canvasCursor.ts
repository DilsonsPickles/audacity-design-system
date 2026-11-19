/**
 * The canvas's cursor (2026-11-19, "if we hover cursor on edge of selection,
 * we should be able to grab the edge of the selection to change it … this is
 * in real audacity build"): the text cursor, unless the selection hook asks
 * for another — its `ew-resize` over a time-selection edge. Canvas spread the
 * hook's style and then set `cursor: 'text'` after it, so the resize cursor
 * never showed.
 */
export function canvasCursor(hookCursor: string | undefined): string {
  return hookCursor && hookCursor !== 'default' && hookCursor !== 'text' ? hookCursor : 'text';
}
