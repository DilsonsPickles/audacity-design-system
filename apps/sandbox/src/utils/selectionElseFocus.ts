/**
 * SELECTION, ELSE FOCUS (user decision 2026-10-13, the shortcut review:
 * "one rule for what destructive and clipboard commands take"): Delete,
 * Copy, Cut and Duplicate act on the SELECTED clips when there are any,
 * else on the clip with the keyboard FOCUS. Focus is the implicit
 * selection of one; it never adds to a real selection, and a focused
 * clip outside the selection is not what the command takes — the
 * selection is. (Until then Delete and Duplicate ran "Model 3": a
 * focused clip outside the selection was taken ALONE, the selection
 * ignored; Copy and Cut took the selection only, so a focused clip
 * could be deleted but not copied.)
 */
export function selectionElseFocus<T>(selected: ReadonlyArray<T>, focused: T | null | undefined): T[] {
  if (selected.length > 0) return [...selected];
  return focused ? [focused] : [];
}
