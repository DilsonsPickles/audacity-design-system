// Module-scoped flag shared across code paths that dispatch a keyboard
// clip move (Cmd+Arrow) — the focused-clip flow in Canvas via
// onClipMove / onClipMoveToTrack, AND the "time selection covers
// clips" flow in useKeyboardShortcuts. Since overlap became legal
// (2026-09-21) nothing is resolved on release any more; the Cmd/Ctrl
// keyup handler reads it only to know a keyboard move happened, so it
// can drop the raised-while-moving visual state and sweep empty
// provisional tracks. Kept as an object so listeners can share the
// same reference without React state plumbing.
export const pendingClipMoveResolution = { current: false };
