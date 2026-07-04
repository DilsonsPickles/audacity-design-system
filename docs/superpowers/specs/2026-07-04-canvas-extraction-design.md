# Design: Canvas.tsx Conservative Extraction

**Date:** 2026-07-04
**Base branch:** `master`
**Status:** Approved for planning

## Goal

Extract three cohesive pieces out of `apps/sandbox/src/components/Canvas.tsx` (~2,178 lines) into focused, independently-understandable units — behavior-preserving, with targeted characterization tests. Net effect ~300 lines out; Canvas remains the interaction dispatcher / layout coordinator.

## Motivation

Despite its name, `Canvas.tsx` renders **no `<canvas>` element** — pixel rendering (waveforms, spectrograms) is already delegated to `TrackNew` and other child components. It is a DOM-based interaction dispatcher, and it is already heavily decomposed: only 5 `useState`, with 8 custom hooks owning the gesture systems (drag, trim, stretch, marquee, label-drag, selection, container-click, clip-mousedown).

Its bulk lives in a **~935-line track-map loop** that wires 50–70 props per track to `TrackNew`. That glue is not cleanly extractable — relocating the loop only moves the prop-drill; genuinely reducing it needs a Context-slicing architecture change, which is a separate, higher-risk project (out of scope here). What *is* cleanly extractable are three smaller, cohesive pieces.

## Constraints

- **Behavior-preserving.** No observable change to rendering or interaction.
- **Preserve the mouse-dispatch guard chain.** Canvas routes mousedown/move/up/click through an ordered capture→bubble chain (right-click marquee → split-mode → shift-guard → clip mousedown → container click). The split-tool extraction relocates handler *bodies* only; their order, position, and `preventDefault`/`stopPropagation` calls stay identical.
- **Do not touch the race-prone refs.** `didDragRef`, `justSelectedOnMouseDownRef`, `clipTrimStateRef`, `clipStretchStateRef`, and the module-scoped `pendingClipMoveResolution` (overlap-resolution deferral) are landmines; the split tool does not use them and they stay exactly as-is.
- Work on a feature branch off `master`.
- No unrelated refactoring.

## Scope — three extractions (ordered safest-first)

### 1. `GridOverlay` component (low risk)
- Move the measure/beat grid calculation (the `gridLines`/`measureBands` `useMemo`, ~lines 738–814) and its SVG render (~lines 871–897) into a new `apps/sandbox/src/components/GridOverlay.tsx`.
- Fully props-driven: `bpm`, `beatsPerMeasure`, `timeFormat`, `pixelsPerSecond`, `width`, `containerHeight`, `viewportHeight` (and theme via `useTheme` inside, matching how Canvas gets it). Zero state coupling — pure input → SVG.
- Canvas replaces the inline block with `<GridOverlay ... />`.

### 2. Pure geometry helpers (low risk)
- `resolveTrackIndexFromY` (~lines 495–503) and `buildSplitForTrack` (~lines 508–518) currently close over `tracks` (immutable read) and layout helpers.
- Lift them into `apps/sandbox/src/utils/canvasGeometry.ts` as **pure functions** taking `tracks` and the needed layout params (e.g. track heights / `calculateTrackYOffset` inputs) explicitly. Canvas calls the pure versions.
- These become the shared base consumed by the split tool (#3), so they land before it.

### 3. `useSplitTool` hook (medium risk — the careful one)
- Consolidate the split tool's scattered pieces into `apps/sandbox/src/hooks/useSplitTool.ts`:
  - state: `splitHover` (~469), `lastMouseRef` (~474)
  - effects: the Shift keydown/keyup sync (~480–492) and the on-enable hover-compute (~523–538)
  - handlers: the split branches inside `onMouseDownCapture`/`onMouseDown`/`onMouseMove`/`onMouseLeave`/`onClickCapture` (~916–1051)
- The hook consumes the geometry helpers from #2 and takes what it needs (`containerRef`, `tracks`, `pixelsPerSecond`, `leftPadding`, `splitMode`, `dispatch`).
- It returns `splitHover` (the split-preview `div`, ~840–867, **stays in Canvas JSX** reading `splitHover` from the hook) plus a `handlers` object.
- Canvas wires `handlers.onMouseDownCapture`/`onMouseDown`/`onMouseMove`/`onMouseLeave`/`onClickCapture` into the container **at the exact same positions in the guard chain, in the same order, alongside the still-inline branches** (marquee capture, shift-guard, clip mousedown, container click). Nothing that used to fire before/after the split branch changes relative order.

## Testing — hybrid, targeted

No `Canvas.tsx` test exists today; these are the first, and they double as the safety net for the extraction.

- **Geometry helpers:** pure unit tests in `apps/sandbox/src/utils/__tests__/canvasGeometry.test.ts` — e.g. `resolveTrackIndexFromY` returns the right track for a Y in each row and `null` past the end; `buildSplitForTrack` returns a mutation for a time strictly inside a clip and `null` at edges / empty space.
- **GridOverlay:** a render test (`apps/sandbox/src/components/__tests__/GridOverlay.test.tsx`) that renders with a known `bpm`/`pixelsPerSecond`/`width` and asserts the expected number of gridlines / measure-band rects appear (real output, not a snapshot of nothing).
- **useSplitTool:** a characterization test that stages a `tracks` state with a clip spanning a position, invokes the hook's split mousedown handler (via the returned `handlers`, or by testing the underlying pure `buildSplitForTrack` + the dispatch path), and asserts the split action (`APPLY_CLIP_PLACEMENT` with a `split` mutation) is dispatched. The hover-preview/effects are DOM/timing-coupled; assert the dispatch-observable behavior, not the visual hover.

## Verification

- New tests green (characterization — green from the start).
- Full sandbox suite stays green: `pnpm --filter @audacity-ui/sandbox test`.
- Typecheck + production build succeed: `pnpm --filter @audacity-ui/sandbox build` (proves Canvas's wiring and the new units integrate).
- Manual smoke: grid renders correctly at a couple of zoom levels; split tool splits a clip at the cursor, the preview line follows the cursor, Shift extends the preview across all tracks, and split still correctly intercepts before a clip drag starts.

## Explicitly out of scope

- The ~935-line track-map loop / `TrackNew` prop-drilling (needs a Context-slicing architecture change — separate project).
- The race-prone interaction refs and their three-way coupling.
- Renaming `Canvas.tsx` (it renders no canvas; an accurate name would help, but the rename touches many imports and is orthogonal to this decomposition — noted for a future task).
- Any other monolith (`EditorLayout.tsx`, `App.tsx`, `PreferencesModal.tsx`).

## Success criteria

- `GridOverlay` renders the grid from props with no state coupling; Canvas delegates to it.
- The two geometry helpers are pure functions in `utils/canvasGeometry.ts`, unit-tested; Canvas (and the split tool) call the pure versions.
- The split tool lives in `useSplitTool`; Canvas wires its handlers in the same guard-chain order, with no behavior change and the landmine refs untouched.
- Targeted tests cover all three; full suite + build green; manual smoke clean.
