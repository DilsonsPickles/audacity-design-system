# Design: Codebase Navigation Refresh + TracksContext Reducer Split

**Date:** 2026-07-03
**Branch:** `refactor/docs-and-trackscontext`
**Status:** Approved for planning

## Goal

Two coupled outcomes, done in one pass so the refreshed docs describe the improved structure:

1. **Navigation aids** — make the repo legible to agents (and humans) working without deep context, by replacing misleading guidance with accurate guidance.
2. **Pilot refactor** — decompose the `TracksContext.tsx` reducer conservatively, tests-first, as the worked example of how state is organized.

## Motivation

A structural survey found the guidance docs are not merely stale but actively misleading:

| CLAUDE.md claims | Reality (2026-07-03) |
|---|---|
| `Canvas.tsx` is 788 lines, "refactored from 2,121" | 2,178 lines — the refactor fully regrew |
| Main app is `apps/demo/clip-envelope` (git submodule) | Gone; apps are `sandbox`, `desktop` (Electron), `docs`, `astro-website`, `static-smoke` |
| 3 packages | 4 packages — `packages/audio` (Tone.js) is undocumented |
| Specific hook/file line counts throughout | All drifted |

An agent trusting CLAUDE.md navigates to files that don't exist and believes a 2,178-line monolith is an 788-line clean module. Fixing this is the highest-leverage, lowest-risk work available.

The codebase is otherwise **healthier than the docs imply**: `apps/sandbox/src/hooks/` holds many small focused hooks, and `hooks/handlers/` already splits keyboard routing by domain. The monolith problem is concentrated in ~5 files (`EditorLayout` 2,389, `App` 2,186, `Canvas` 2,178, `TracksContext` 2,135, `PreferencesModal` 1,979), not spread everywhere.

## Constraints

- **Prototype fidelity is the priority.** This app exists to preserve intricate interactions. No behavior drift.
- **Thin test coverage** — 16 test files for ~497 source files. Refactoring must add its own safety net first.
- **All work on `refactor/docs-and-trackscontext`**, not `master`.
- No unrelated refactoring. The other 4 monoliths are out of scope for this pass.

## Part A — Navigation aids

### A1. Rewrite CLAUDE.md to match reality
- Correct the apps list (5 apps) and packages list (4 packages, including `packages/audio`).
- Remove the phantom `apps/demo/clip-envelope` submodule references.
- **Remove exact line-count citations** and instead describe each key file's *role and entry points*. Line counts are the specific mechanism by which the doc rotted; describing responsibilities is durable. Where "big file, approach with care" is worth flagging, say "large — see codebase-map.md" rather than a number.
- Keep the accurate, still-valuable sections (testing conventions, provider tree, envelope interaction model) — verify each against current code before retaining.

### A2. Add `docs/codebase-map.md`
A single "start here" index for agents. Sections:
- **Where state lives** — TracksContext (and its new sub-reducers after Part B), other contexts.
- **Where interactions live** — `hooks/` (drag, trim, stretch, marquee…) and `hooks/handlers/` (keyboard by domain).
- **Where rendering happens** — Canvas, TrackNew, ClipBody.
- **The big-and-scary files** — the ~5 monoliths, one line each on why they're big and what they own.
- **Package boundaries** — core / components / audio / tokens and their published names.

CLAUDE.md links to this map as the canonical navigation entry point.

### A3. Remove the astro website; keep the component export package
- **Delete `apps/astro-website/`.** It contains only `dist/`, `public/`, and `node_modules` — no source, no `package.json` — and nothing in the repo imports it. Confirmed safe to remove.
- **Clean the workspace globs** in `pnpm-workspace.yaml`: remove the dead `apps/demo/*` entry (the phantom submodule) at the same time.
- **Explicitly keep `packages/components`** — the component export package (published as `@dilsonspickles/components`) is unaffected by the astro removal and stays exactly as-is. Reflect the reduced app set (now 4 apps) in CLAUDE.md and codebase-map.

### A4. Prune stale root docs
Candidates: `THEME_MIGRATION_TODO.md`, `REMAINING_THEME_MIGRATIONS.md`, `CHANNEL_MAPPING_IMPLEMENTATION.md`, `EAR_SVGS.md`, `KEYBOARD_SHORTCUTS.md`.
- **Verify each is actually complete/superseded before touching it** (grep for referenced code, check if the work landed).
- Done work → delete. Live work → leave and note in codebase-map. Uncertain → leave and flag for the user.

## Part B — TracksContext reducer split (tests-first)

`tracksReducer` is a 75-case `switch` at `apps/sandbox/src/contexts/TracksContext.tsx:522`. Pure `(state, action) => state` logic — the most testable code in the app, needing no DOM/canvas mocks.

### B1. Characterization tests first (red safety net)
Before moving any code, write tests that capture current reducer behavior for a representative action from each domain group. These lock behavior so the extraction can't drift. Tests live in `apps/sandbox/src/contexts/__tests__/tracksReducer.*.test.ts`.

### B2. Extract domain sub-reducers
Split the single switch into domain sub-reducers composed by the top-level reducer. Proposed domains (final grouping decided during planning by reading each case's *noun*, since current cases are named by verb — SET/UPDATE/ADD):
- **clips** — add/update/move/trim/stretch/delete/group/ungroup clip actions
- **tracks** — add/reorder/remove/resize track actions
- **selection** — select/deselect/time-selection actions
- **envelope** — envelope-point actions
- **view / misc** — zoom, scroll, view-mode, reset

Each sub-reducer: `(state, action) => Partial<state>` or full-state, TBD during planning based on how coupled the slices are. The top-level `tracksReducer` delegates by action group and remains the single public entry point — **no consumer changes, no context API changes.**

### B3. Green + verify
- Characterization tests stay green through the extraction.
- Manual smoke in the running app (drag, trim, stretch, group, select, undo if present) since automated coverage is partial.

### B4. Document the result
The new sub-reducer layout becomes the "Where state lives" example in `codebase-map.md`.

## Explicitly out of scope
- Refactoring Canvas, EditorLayout, App, PreferencesModal (noted in codebase-map as known debt).
- Changing the context's public API, action names, or component consumers.
- Adding new features or interactions.

## Success criteria
- CLAUDE.md contains zero claims contradicted by the current tree; a fresh agent can locate state/interaction/render code from it in one hop.
- `docs/codebase-map.md` exists and is accurate.
- `TracksContext.tsx` is decomposed into domain sub-reducers with a characterization-test suite, all green, with no observable behavior change in the app.
- All changes isolated on the feature branch.

## Sequencing
A1–A4 (docs + astro removal) can proceed immediately and independently. Part B lands, then A2/A1 are updated to reflect the new reducer structure (so docs describe the improved code, per "both together").
