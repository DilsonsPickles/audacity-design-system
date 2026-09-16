# Label Interactions

The interaction model for label markers, as implemented by the 2026-09 label
rewrite (`LabelRenderer.tsx` + `components/labels/`). The old
Canvas-inline model this doc used to describe is gone.

## Anatomy

A label is a **banner** (the strap holding the text), two **ears**
(triangular resize handles flanking it), and **stalks** (1px vertical lines
under each ear, with a 9px hit zone). Point labels have one stalk and a
flag-shaped banner; region labels span a time range.

All geometry derives from the label text size via
`getLabelMetrics(fontSizePx)` in `utils/labelLayout.ts` — the hand-tuned
"Scaling" table (banner = `max(20, round(1.5×text))`, 4px-grid row gaps,
text-derived horizontal padding and point-flag gap). Constants that never
scale: ears 10×20, stalk 1px, corner radius 2px. The size preference is
`labelTextSizePt` (default 9pt = classic 12px; ramp 9/10/12/14/18/24/36/48),
settable in Preferences → Appearance and the label track's ⋯ menu.

Colors come from the real build's `clip_color_1..9` palette
(`labels/labelColors.ts`) with state ladders built as
`color-mix(in srgb, clipColor N%, white)`: strap default 50 / hover 70 /
selected 30; ears+stalks default solid / hover 30 / selected 40 /
selected-hover 10. The strap is always LIGHTER than the ears (standing
design decision). In the build's own vocabulary the default strap is
`ui.blendColors(white_color, labelColor, 0.5)`.

## Gestures

- **Banner drag** moves the label (3px threshold). The banner is the ONLY
  element whose press selects the label — resizing never selects.
- **Ears always stretch** (AU3 semantics): the anchor is the opposite edge
  at drag start, and dragging past it swaps min/max
  (`SelectedRegion::ensureOrdering`). A 6px detent snaps a region closed
  into a point label; edges magnetically snap to other labels' edges (8px,
  `snapTargets` from the renderer).
- **Double-click on the banner** opens the inline editor (input in place;
  Enter/blur commits, Escape reverts), parks the playhead at the label's
  start, and cancels the pending expand toggle (below). Newly added empty
  labels auto-open the editor. There is no placeholder text.
- **Single click on an already-selected region label** (no movement)
  toggles the expand-to-all-tracks time selection, deferred 250ms so a
  double-click never also yanks track selection: expand sets a
  `SET_TIME_SELECTION` spanning the label with `tracks` = all rows +
  selects all tracks; a second click collapses back to the label's track.
- **Adjacent region labels** (edges within `EDGE_EPS`, same packing row)
  share ONE junction stalk owned by the right label, with no inner ears.
  The junction stalk is always a both-mover (drags both boundaries,
  clamped inside the pair). Selecting one of the pair reasserts its own
  ears + stalk; its boundary ear then stretches only itself — the
  unlink gesture.
- **Hover**: an ear lights that side's ear+stalk pair; hovering a STALK
  lights the stalk and BOTH ears.
- **Playhead isolation**: label gestures never move the playhead —
  `useContainerClick` early-returns for events originating on
  `data-label-banner/ear/stalk`, and `labelDragTracker`'s 75ms
  `labelDragJustEnded()` window swallows the click that ends a drag.

## Clipboard

Cmd+C / Cmd+X / Cmd+V operate on selected labels at **priority 0** in
`hooks/handlers/clipboardHandlers.ts` (above clips and time ranges). Paste
targets the focused-or-first label track, placing the earliest copied label
at the playhead with fresh ids, and selects the pasted labels.

## Deletion (Delete/Backspace priority chain)

Unchanged from before the rewrite: selected labels delete first (plus a
combined time-cut when all tracks are selected with a time selection),
then selected clips, then the time selection, then the focused track.

## Tall scripts

Display text and the editing input live in a ~2.2em line box
(`inkAllowance`) centered on the strap, with no `overflow: hidden` on the
banner — Thai/Khmer/Devanagari/Vietnamese ascenders and descenders render
un-clipped; ellipsis clips horizontally only.

## Related Files

- `apps/sandbox/src/components/LabelRenderer.tsx` — coordinator (metrics, editing state, adjacency, snap targets)
- `apps/sandbox/src/components/labels/LabelItem.tsx` — one label: all gesture handlers and state colors
- `apps/sandbox/src/components/labels/labelColors.ts` — the build's clip-color palette
- `apps/sandbox/src/components/labels/labelDragTracker.ts` — drag-end click suppression singleton
- `apps/sandbox/src/utils/labelLayout.ts` — metrics engine, row packing, hit testing
- `apps/sandbox/src/hooks/useContainerClick.ts` — the label-originated-click guard
- `apps/sandbox/src/hooks/handlers/clipboardHandlers.ts` — label copy/cut/paste
- Tests: `apps/sandbox/src/components/labels/__tests__/LabelRenderer.test.tsx`, `apps/sandbox/src/utils/__tests__/labelLayout.test.ts`
