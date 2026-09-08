/**
 * Module-scoped singleton (same pattern as pendingClipMoveResolution): the
 * timeline time in seconds currently under the mouse pointer, or null while
 * the pointer is off the canvas. Written by useCanvasPointerHandlers'
 * onMouseMove/onMouseLeave; read at keypress time by the B transport handler
 * (AU3 heritage "Play to Selection"), which plays between the pointer
 * position and the playhead cursor. Import it — never recreate it.
 */
export const pointerTimelineTimeRef: { current: number | null } = { current: null };
