// Module-scoped set shared across keyboard clip-move call sites.
// Tracks the IDs of tracks created by the current Cmd-hold gesture
// so they can be cleaned up if clips move back off them before Cmd
// is released. Follows the pendingClipMoveResolution pattern.
export const provisionalKeyboardTrackIds = { current: new Set<number>() };
