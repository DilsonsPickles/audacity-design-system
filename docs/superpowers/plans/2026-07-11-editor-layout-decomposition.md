# EditorLayout Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the 2170-line EditorLayout.tsx into a ~700-line composition root, net-first: extend integration coverage over the moving blocks before any code moves.

**Architecture:** Phase 0 characterization tests → Phase 1 pure utils + deduplicated presentational components → Phase 2 deps-object hooks → Phase 3 big blocks (drawer, effects panel, track-panel handlers) → docs. Every extraction is a verbatim move.

**Spec (BINDING — read its hazards + preserve-not-fix lists before any task):** `docs/superpowers/specs/2026-07-11-editor-layout-decomposition-design.md`

**Map:** block letters (A–G) and line numbers refer to the decomposition map reproduced in the spec; lines are pre-drift hints — locate by identifier.

## Global Constraints

- Behavior-preserving; verbatim moves; deliberate changes disclosed in commit messages. ZERO product behavior change.
- CLAUDE.md "Working Here" rules bind (gates, landmines, test conventions, profile id).
- The spec's Binding Hazards and Preserve-not-fix sections apply to EVERY task.
- Extracted code imports shared layout constants (`TRACK_GAP`, `CLIP_HEADER_HEIGHT`, `CLIP_CONTENT_OFFSET`, default track height) from one source — find the existing constants module(s) first; never re-hard-code.
- **Gates after every task:** `pnpm --filter @audacity-ui/sandbox test` (all green, no skips), `pnpm --filter @dilsonspickles/components test`, `cd apps/sandbox && npx tsc --noEmit`, `node scripts/check-any.mjs`. Commit per task, repo message style.

---

### Task 0.1: Net extension — drawer + timeline ruler + track management

**Files:**
- Create: `apps/sandbox/src/__tests__/EditorLayout.integration.test.tsx`

Characterization tests via `renderApp()` (mock preamble copied from App.integration.test.tsx — `vi.mock('@audacity-ui/audio')` from `./audioMock` + the RecordingManager mock):
- [ ] Drawer: open Mixer (drive the same path the app uses — Mixer toolbar button), assert drawer renders with mixer tab active + one channel per non-label track; open piano roll (double-click a MIDI clip or menu path — read `useAutoOpenPianoRoll`/menu wiring to pick the driveable one); switch tabs; close tab (mixer close fires the `close-mixer-panel` CustomEvent — assert the drawer closes, i.e. App's listener works end-to-end); resize via PanelHeader drag (document mousemove/mouseup; assert `drawerHeight` effect on the drawer element's style).
- [ ] Timeline ruler: focus the ruler wrapper (tabIndex via `useTabOrder('timeline-ruler')`); ArrowRight/ArrowLeft nudge the playhead (assert playhead DOM position/state change, snap per current source); click on ruler → click-to-play path (audio spy `seek`/play as SECONDARY, playhead move as primary).
- [ ] Track management: drive Add-track (TrackControlSidePanel `onAddTrackType` path via its real UI), assert new track with correct next id/name-number; duplicate a track with grouped clips → group-copy invariant (fresh group, copies untethered — imitate clipGroupCopy tests' seeding); delete a track (confirm dialog flow) → track gone, indices remapped.
- [ ] Steps per test: read the source handler FIRST, encode observed behavior; failing-first not required (characterization), but each test must be shown to fail under a deliberate sabotage of its handler (report-only, revert).
- [ ] Gates + commit: `test(sandbox): EditorLayout drawer/ruler/track-management characterization`

### Task 0.2: Net extension — focus routing

**Files:**
- Modify: `apps/sandbox/src/__tests__/EditorLayout.integration.test.tsx` (append)

- [ ] Three routes minimum, chosen from the map's uncovered list (read handlers first; assert `document.activeElement` transitions): (1) `onTabOut` from track control panel → next region; (2) `onShiftTabFromTrack` (Canvas → timeline ruler via `timelineRulerRef`); (3) `onRulerNavigateVertical` between vertical rulers incl. its manual scroll-sync (assert `scrollContainerRef.scrollTop` changed).
- [ ] Sabotage (report-only): break one focus walk selector → its test reds; revert.
- [ ] Gates + commit: `test(sandbox): EditorLayout focus-routing characterization`

### Task 1.1: `focusRouting.ts` utils

**Files:**
- Create: `apps/sandbox/src/utils/focusRouting.ts` + `apps/sandbox/src/utils/__tests__/focusRouting.test.ts`
- Modify: `apps/sandbox/src/components/EditorLayout.tsx`

- [ ] Catalog every DOM-query focus walk in blocks C and E (the `querySelectorAll('[aria-label*="track controls"]')` / `[data-track-index]` variants); design pure functions (root: ParentNode + params → Element | null) covering all variants WITHOUT unifying semantics that differ — one function per distinct behavior, named by intent (e.g. `findTrackControlPanel`, `findTrackByIndex`, `findFirstClipInTrack` — derive real names from usage).
- [ ] TDD the utils (jsdom DOM fixtures); swap each inline walk to the util verbatim-equivalently (the `.focus()` call and surrounding logic stay in place).
- [ ] Gates (incl. Phase 0 focus tests staying green) + commit: `refactor(sandbox): focus-routing DOM walks extracted to tested utils`

### Task 1.2: `trackManagement.ts` utils

**Files:**
- Create: `apps/sandbox/src/utils/trackManagement.ts` + `__tests__/trackManagement.test.ts`
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (blocks C: `onAddTrackType` 491–522, `onDuplicateTrack` 534–588)

- [ ] TDD pure helpers: `nextTrackId(tracks)`, name-numbering, `buildDuplicatedTracks(...)` (reuses `computeWholeGroupIds`/`regroupCopiedClips`; preserves `Math.max(..., 0)` guards). Handler bodies thin to util-call → dispatch.
- [ ] Gates (Phase 0 track tests green) + commit: `refactor(sandbox): track add/duplicate math extracted to tested utils`

### Task 1.3: `LoopRegionStalks` + `PunchPointIndicator` components

**Files:**
- Create: `apps/sandbox/src/components/editor/LoopRegionStalks.tsx`, `apps/sandbox/src/components/editor/PunchPointIndicator.tsx`
- Modify: EditorLayout (ruler copies 1109–1155; canvas copies 1438–1484)

- [ ] Diff the two copies of each first; parameterize ONLY the differences (height math / top anchor) as props; byte-preserve styles otherwise. Replace all four sites. Pure JSX, no hooks (theme values via props) — imitate `components/canvas/SnapGuideline.tsx`.
- [ ] Gates + visual check via integration boot test + commit: `refactor(sandbox): dedupe loop stalks + punch indicator into editor components`

### Task 2.1: `useMeasuredWidth` + `useRulerFlyout`

**Files:**
- Create: `apps/sandbox/src/hooks/useMeasuredWidth.ts`, `apps/sandbox/src/hooks/useRulerFlyout.ts`
- Modify: EditorLayout (206–215; 245–296 + flyout JSX wiring 1618–1702)

- [ ] `useMeasuredWidth(ref)`: the ResizeObserver **useLayoutEffect** verbatim (stays layout-effect — spec hazard). `useRulerFlyout(deps)`: flyout state, `halfWave`, `rulerTriggerRef`, `handleRulerContextMenu` hit-test (imports shared constants), `openFlyout` used by `onRulerActivate`. RulerFlyout JSX stays in EditorLayout consuming the hook's returns.
- [ ] Gates + commit: `refactor(sandbox): measured-width + ruler-flyout hooks`

### Task 2.2: `useTimelineRulerInteractions`

**Files:**
- Create: `apps/sandbox/src/hooks/useTimelineRulerInteractions.ts`
- Modify: EditorLayout (968–1081)

- [ ] Move the ruler wrapper's onKeyDown (Escape/Shift+F10/arrow-swallow/arrow nudge + snap math), onMouseMove/Leave (cursor time — the `/100` quirk moves VERBATIM, do not fix; note the chip in a comment), async onClick click-to-play, onContextMenu. Deps-object in, handler bundle out; spread onto the wrapper.
- [ ] Gates (Phase 0 ruler tests green) + commit: `refactor(sandbox): timeline-ruler interactions hook`

### Task 3.1: `EditorBottomDrawer`

**Files:**
- Create: `apps/sandbox/src/components/editor/EditorBottomDrawer.tsx` (+ `useDrawerResize` hook if the resize listener is cleanest separate)
- Modify: EditorLayout (block F, 1709–2055)

- [ ] Verbatim move of the drawer IIFE: tabs/order/close (CustomEvent name preserved), PanelHeader resize (preserve the existing attach-on-mousedown listener lifecycle exactly), mixer channel building (meter ternary fan-out preserved), piano-roll handler wiring (`skipPianoRollScrollRef` arrives as prop). Props = what block F actually closes over (derive; expect ~state, dispatch, theme, audioManagerRef, playMidiNote, drawer state + setters, activeMenuItem…).
- [ ] Gates (Phase 0 drawer tests green) + commit: `refactor(sandbox): EditorBottomDrawer owns mixer/piano-roll drawer`

### Task 3.2: `TrackEffectsPanel` + missing-effect annotation util

**Files:**
- Create: `apps/sandbox/src/components/editor/TrackEffectsPanel.tsx`, plus pure util for `markMissing`/id-sets (in the component file or utils — implementer's call, tested either way)
- Modify: EditorLayout (block B, 330–476)

- [ ] Verbatim move; `markMissing` stays render-only annotation (never mutates state — assert in its unit test). No-op `onContextMenu` handlers preserved.
- [ ] Gates + commit: `refactor(sandbox): TrackEffectsPanel extracted`

### Task 3.3: Track-panel handler hook

**Files:**
- Create: `apps/sandbox/src/hooks/useTrackPanelHandlers.ts`
- Modify: EditorLayout (block C handler bodies 622–950; JSX wiring stays)

- [ ] Move the per-track handler bodies (mute/solo incl. exclusive Cmd-click audio calls, focus/drag-reorder DOM hit-tests → now via focusRouting utils, reorder/navigate with `flushSync` + selection-anchor semantics VERBATIM, menu/click/selection, tab-out routing). `toggleScopeOrTrackSelection` moves here or to a shared util — one copy, both call sites (C + Canvas wiring in E) consume it.
- [ ] Gates (focus-routing + track tests green) + commit: `refactor(sandbox): track panel handlers hook`

### Task 4: Docs + final verification

- [ ] `wc -l` EditorLayout (target ≤ ~800; report actual). codebase-map: new `components/editor/` + hooks + utils entries (accuracy verified against source — the fabrication incident is the cautionary tale). CLAUDE.md architecture notes if stale.
- [ ] Optional disclosed cleanup (single commit, only if trivial): remove dead `_isFlatNavigation`/`_setSpectrogramScale`/`_controlPanelHasFocus` props end-to-end (App side too), tsc proving it. Skip if anything resists.
- [ ] Full gates + commit: `docs: codebase-map entries for editor decomposition`
- [ ] Final: fable whole-branch review → fixes → user smoke test (focus/keyboard feel, mixer, piano roll, ruler) → merge.
