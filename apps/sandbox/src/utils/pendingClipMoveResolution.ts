// Module-scoped flag shared across code paths that dispatch a keyboard
// clip move (Cmd+Arrow) — the focused-clip flow in Canvas via
// onClipMove / onClipMoveToTrack, AND the "time selection covers
// clips" flow in useKeyboardShortcuts. Canvas's Cmd/Ctrl keyup
// handler reads it to decide whether to run resolveOverlap on the
// selected clips' final positions. Kept as an object so listeners
// can share the same reference without React state plumbing.
export const pendingClipMoveResolution = { current: false };
