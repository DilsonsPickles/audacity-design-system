// Choke point for track-delete confirmations. All DELETE_TRACK /
// DELETE_TRACKS dispatch sites route through here so the UX stays
// consistent — one prompt, one place to change the copy.
//
// The App registers a Dialog-based handler at startup via
// setTrackDeleteConfirmHandler; if nothing is registered (e.g. in
// tests, or before mount), we fall back to window.confirm so the
// safety gate is never bypassed.
type ConfirmFn = (count: number, onConfirm: () => void) => void;

let handler: ConfirmFn | null = null;

export function setTrackDeleteConfirmHandler(fn: ConfirmFn | null): void {
  handler = fn;
}

export function confirmTrackDelete(
  count: number,
  onConfirm: () => void,
  options?: { skipDialog?: boolean },
): void {
  // No content on the track(s) → nothing to warn about, run
  // straight through. Prevents the confirm gauntlet for the
  // common "I just added the wrong track, delete it" flow.
  if (options?.skipDialog) {
    onConfirm();
    return;
  }
  if (handler) {
    handler(count, onConfirm);
    return;
  }
  const noun = count === 1 ? 'track' : 'tracks';
  const message = count === 1
    ? 'Delete this track? Any clips on it will be removed.'
    : `Delete ${count} ${noun}? Any clips on them will be removed.`;
  if (window.confirm(message)) onConfirm();
}
