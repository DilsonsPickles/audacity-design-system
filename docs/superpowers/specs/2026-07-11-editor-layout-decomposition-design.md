# EditorLayout Decomposition — Design

**Date:** 2026-07-11
**Status:** Approved (user, 2026-07-11)
**Motivation:** `apps/sandbox/src/components/EditorLayout.tsx` is 2170 lines — the largest, never-examined file in the repo: ~190 lines of setup + one ~1845-line JSX return with every handler inline, no sub-components. Decompose behavior-preservingly under the integration net, extending the net FIRST because the blocks being moved have no automated coverage today.

**Ground truth:** blocks A–G and line numbers throughout this spec and the plan come from a line-indexed decomposition map of the file (2026-07-11); lines are pre-drift hints — always locate by identifier. Block key: A setup/context header (135–324), B effects side panel (330–476), C track control panel + per-track headers (479–952), D timeline ruler row (955–1201), E canvas + scrollable rulers row (1204–1703), F bottom drawer (1709–2055), G menus/modals (2057–2167).

## Goals

1. Extend the integration net to cover the paths this refactor moves (drawer, timeline-ruler interactions, focus routing, track management) BEFORE moving them.
2. Extract: pure utils (focus routing, track id-allocation), deduplicated presentational components (loop stalks, punch-point), deps-object hooks (measured width, ruler flyout, ruler interactions, drawer resize), and the two big blocks (bottom drawer, effects side panel) plus track-panel handler bodies.
3. EditorLayout becomes a composition root (~700 lines): context wiring + layout scaffolding + Canvas/TrackControlPanel prop assembly.

## Non-Goals

- No behavior changes. All preserve-not-fix quirks below stay byte-faithful.
- No decomposition of App.tsx / CanvasTrackList (out of scope).
- No fixing of chipped bugs (`/100` cursor divisor is task_62d5c2a2).

## Architecture (phases)

**Phase 0 — net extension.** New/extended integration tests (same harness, DOM-primary, sabotage-proven): drawer open/tab-switch/close/resize + one mixer channel assertion + one piano-roll note-add; timeline-ruler ArrowLeft/Right playhead nudge + click-to-play (audio-spy secondary); focus routes: Tab out of track control panel, Shift+Tab from track into ruler/timeline, ruler vertical navigation with scroll-sync; track add / duplicate (group-copy invariant holds) / delete.

**Phase 1 — pure logic + dedup.**
- `apps/sandbox/src/utils/focusRouting.ts` — the repeated `querySelectorAll('[aria-label*="track controls"]')` / `data-track-index` focus walks (~8 variants in blocks C and E) as pure, unit-tested functions taking a root element + indices.
- `apps/sandbox/src/utils/trackManagement.ts` — `nextTrackId`, `nextClipId`, `buildDuplicatedTracks` (uses existing `computeWholeGroupIds`/`regroupCopiedClips`; preserves `Math.max(..., 0)` empty guards), name-numbering. Unit-tested.
- `components/editor/LoopRegionStalks.tsx` + `PunchPointIndicator.tsx` — each currently duplicated (ruler row 1109–1155 vs canvas row 1438–1484); one component each with a `variant`/geometry props. Shared layout constants imported from one source, never re-hard-coded.

**Phase 2 — hooks (deps-object convention; ref-mirror where document listeners exist).**
- `useMeasuredWidth(ref)` — the `rulerViewportWidth` ResizeObserver (206–215).
- `useRulerFlyout` — flyout state + `rulerTriggerRef` + `handleRulerContextMenu` hit-testing (245–296, 1618–1702 wiring).
- `useTimelineRulerInteractions` — ruler keydown (Escape/Shift+F10/arrow nudge with snap), mouse cursor tracking, async click-to-play, context menu (968–1081).
- Drawer-resize document-listener (1767–1783) → ref-mirror hook (or self-cleaning attach/remove if that is what the source does — preserve the existing listener lifecycle pattern exactly).

**Phase 3 — big blocks.**
- `components/editor/EditorBottomDrawer.tsx` — block F (1709–2055): tabs, resize, mixer channel building, piano-roll handler wiring. Props: state/dispatch-derived data + `audioManagerRef` + `playMidiNote` + `skipPianoRollScrollRef` + drawer state. `close-mixer-panel` CustomEvent name preserved.
- `components/editor/TrackEffectsPanel.tsx` — block B (330–476) + `markMissing`/id-set pure util.
- Track-panel handler bodies (block C) → `useTrackPanelHandlers` hook(s); `<TrackControlSidePanel>`/`<TrackControlPanel>` JSX wiring stays in EditorLayout.

## Binding hazards (from the map — violating these is a bug)

- Cross-block refs stay owned where both consumers can reach them: `timelineRulerRef` (written in ruler row, read by Canvas's `onShiftTabFromTrack`), `rulerTriggerRef` (written in ruler-activate, read by RulerFlyout), `skipPianoRollScrollRef` (produced by `usePianoRollSmoothScroll`, consumed in drawer's `onAddNote`), `contextMenuClosedTimeRef` (300ms debounce), App-owned `scrollContainerRef` (read AND scrolled by ruler nav).
- Selection-anchor semantics: four closures capture `selectionAnchor` with load-bearing "don't clear anchor on plain nav" comments (819–826, 885–896) — preserve verbatim wherever the code lands.
- `toggleScopeOrTrackSelection` is called from blocks C and E — extract once, share.
- Layout effect ordering: `useMeasuredWidth` must remain a `useLayoutEffect`; `useDrawerTabAutoSwitch` mutates state the drawer reads same-render.
- Magic numbers (`TRACK_GAP=2`, `CLIP_HEADER_HEIGHT=20`, `CLIP_CONTENT_OFFSET=12`, default track height 114) come from one shared constants source in extracted code.

## Preserve-not-fix (assert as contract where tested, never "improve")

Empty no-ops: `onMoveTrackUp/Down`, effects-section `onContextMenu`, `onMoveNotes`. The `close-mixer-panel` window CustomEvent. `/100` cursor divisor (chipped). Shadowed `_isFlatNavigation` + unused `_setSpectrogramScale`/`_controlPanelHasFocus` props (dead props may be removed ONLY as a final disclosed cleanup task with tsc proving App side, else left). `markMissing` renders-only mutation. `timelineWidth` vs `rulerViewportWidth` dual props on TimelineRuler. Justified `as any` casts (647, 1797) move verbatim.

## Testing

Phase 0 tests are characterization: expectations bend to observed behavior. Phases 1–3 are verbatim moves gated by the extended net + unit tests on extracted pure logic + full suite + tsc + guard. Sabotage evidence for the Phase 0 additions (break a focus route / drawer wiring → red). Final: fable whole-branch review; user smoke test before merge (focus/keyboard feel, mixer, piano roll, ruler interactions are the manual sweep).

## Acceptance

- EditorLayout ≤ ~800 lines, composition-root only; all gates green; CI green; integration suite grown by the Phase 0 tests; no behavior change observable in the manual sweep.
- codebase-map + CLAUDE.md architecture notes updated for the new `components/editor/` + hooks.
