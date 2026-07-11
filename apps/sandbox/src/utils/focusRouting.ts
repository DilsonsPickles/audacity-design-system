/**
 * Pure DOM-query helpers for EditorLayout's keyboard focus routing between
 * the track control panel column, the canvas track rows, the vertical
 * rulers, and the selection toolbar.
 *
 * These functions ONLY locate elements — they never call `.focus()` and
 * never dispatch. The caller (EditorLayout.tsx) owns the `.focus()` call,
 * `scrollIntoView`/manual scroll, and any state dispatch that goes with a
 * given focus move. Selector strings and index math are preserved verbatim
 * from the inline walks they replace; see the call-site comments below for
 * exactly where each one was extracted from.
 */

/** All track control panels, in track order (one per `TrackControlPanel`). */
function queryTrackControlPanels(root: ParentNode): NodeListOf<HTMLElement> {
  return root.querySelectorAll<HTMLElement>('[aria-label*="track controls"]');
}

/**
 * The track control panel at `index`, or null if there is no panel there
 * (index out of range, or no panels rendered).
 *
 * Call sites: TrackControlPanel.onReorderVertical (focus the panel at its
 * new position after a Cmd+Arrow reorder) and onNavigateVertical (focus the
 * panel at the next/previous track on Arrow nav).
 */
export function findTrackControlPanelByIndex(root: ParentNode, index: number): HTMLElement | null {
  return queryTrackControlPanels(root)[index] ?? null;
}

/**
 * The first focusable `<button>` inside the track control panel at `index`,
 * or null if the panel is missing or has no buttons.
 *
 * Call sites: onEnterTrackPanel (Enter on a track container drops into its
 * panel) and onTabFromLastClip's "no ruler" fallback (Tab off the last clip
 * skips straight to the next track's panel).
 */
export function findFirstButtonInTrackControlPanel(root: ParentNode, index: number): HTMLElement | null {
  const panel = findTrackControlPanelByIndex(root, index);
  if (!panel) return null;
  return panel.querySelector<HTMLElement>('button');
}

/**
 * The last focusable `<button>` inside the track control panel at `index`,
 * or null if the panel is missing or has no buttons.
 *
 * Call sites: onShiftTabFromTrack and onShiftTabFromRuler's "no clips on
 * this/previous track" fallback (Shift+Tab lands on the last control in
 * that track's panel instead of a clip).
 */
export function findLastButtonInTrackControlPanel(root: ParentNode, index: number): HTMLElement | null {
  const panel = findTrackControlPanelByIndex(root, index);
  if (!panel) return null;
  const buttons = panel.querySelectorAll<HTMLElement>('button');
  return buttons.length > 0 ? buttons[buttons.length - 1] : null;
}

/**
 * Which track control panel index a drag-reorder drop at `clientY` should
 * land on: the panel whose row contains `clientY`, or — if `clientY` is
 * above every panel's top — the first panel it's above. Falls back to the
 * last panel index if no panel matched (including -1 when there are no
 * panels at all, matching the original walk's untouched fallback).
 *
 * Call site: onDragReorderDrop (hit-testing panel rects against the drop
 * point's Y coordinate).
 */
export function resolveTrackDropIndex(root: ParentNode, clientY: number): number {
  const panels = queryTrackControlPanels(root);
  let target = -1;
  for (let i = 0; i < panels.length; i++) {
    const rect = panels[i].getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      target = i;
      break;
    }
    if (clientY < rect.top && target === -1) {
      target = i;
      break;
    }
  }
  if (target === -1) target = panels.length - 1;
  return target;
}

/**
 * The clip marked `data-first-clip="true"` within the element carrying
 * `data-track-index={index}`, or null if that track element isn't found or
 * has no first clip marked (e.g. the track is empty).
 *
 * Call site: TrackControlPanel.onTabOut's has-clips branch (Tab off the
 * panel jumps straight into the track's first clip).
 */
export function findFirstClipInTrack(root: ParentNode, index: number): HTMLElement | null {
  const trackElement = root.querySelector(`[data-track-index="${index}"]`);
  if (!trackElement) return null;
  return trackElement.querySelector<HTMLElement>('[data-first-clip="true"]');
}

/**
 * The last `[data-clip-id]` element within the `.track` row nested inside
 * `.track-wrapper[data-track-index={index}]`, or null if that row isn't
 * found or has no clips.
 *
 * Call sites: onShiftTabFromTrack (previous track's last clip) and
 * onShiftTabFromRuler (this track's last clip).
 */
export function findLastClipInTrack(root: ParentNode, index: number): HTMLElement | null {
  const trackEl = root.querySelector(`.track-wrapper[data-track-index="${index}"] .track`);
  if (!trackEl) return null;
  const clips = trackEl.querySelectorAll<HTMLElement>('[data-clip-id]');
  return clips.length > 0 ? clips[clips.length - 1] : null;
}

/**
 * The vertical ruler element for track `index` (`[data-track-ruler-index]`),
 * or null if not rendered (rulers hidden, or the track is a label/midi
 * track with no ruler).
 *
 * Call sites: TrackControlPanel.onTabOut, onShiftTabFromTrack,
 * onTabFromLastClip, onRulerNavigateVertical, and onRulerActivate.
 */
export function findTrackRulerByIndex(root: ParentNode, index: number): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-track-ruler-index="${index}"]`);
}

/**
 * The `.track` row nested inside `.track-wrapper[data-track-index={index}]`
 * — the focusable track container itself (distinct from
 * `findLastClipInTrack`, which reaches one level deeper for a clip).
 *
 * Call sites: TrackControlPanel.onTabOut/onShiftTabOut, onTabFromLastClip's
 * "no panel found" fallback, and onTabFromRuler.
 */
export function findTrackContainerByIndex(root: ParentNode, index: number): HTMLElement | null {
  return root.querySelector<HTMLElement>(`.track-wrapper[data-track-index="${index}"] .track`);
}

/**
 * The first `[role="group"]` child of `.selection-toolbar`, or null if the
 * toolbar isn't rendered or has no group child.
 *
 * Call sites: TrackControlPanel.onTabOut, onTabFromLastClip, and
 * onTabFromRuler's "last track" fallback (Tab off the last track lands in
 * the selection toolbar).
 */
export function findSelectionToolbarFirstGroup(root: ParentNode): HTMLElement | null {
  const selToolbar = root.querySelector('.selection-toolbar');
  if (!selToolbar) return null;
  return selToolbar.querySelector<HTMLElement>('[role="group"]');
}
