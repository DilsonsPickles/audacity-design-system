# Accessibility Handbook Section — Design

**Date:** 2026-07-13
**Status:** Approved by user (brainstorming session)

## Problem

A developer implementing the accessibility behaviour refuses to reverse-engineer it from the prototype alone — reasonably, since keyboard behaviour is hard to discover exhaustively by playing with the app. They expect a handbook-style reference, modelled on MuseScore's accessibility handbook page (https://handbook.musescore.org/navigation/accessibility).

## Decision summary (user-confirmed)

| Question | Decision |
|---|---|
| Audience | **Dev spec, handbook-styled** — primary reader is the implementing developer; behaviour-complete; format allows later graduation into user docs |
| Placement | **New "Accessibility" section** in the astro-audacity manual (`src/content/manual/accessibility/`). The existing EGAT stub (sectionOrder 140) is left untouched |
| Profiles | **AU4 Tab Groups only** documented as THE product behaviour; `wcag-flat` gets a single debug-mode callout |
| Coverage | **Full sweep** of keyboard behaviour: global tab order, toolbars, track view (tracks/clips/labels), effects panel, selection toolbar, modals, context menus. No mouse-interaction spec; no ARIA/screen-reader section (possible future page) |
| Structure | **Section with per-surface pages** (4 pages) |

## Deliverables

### In astro-audacity (`/Users/alexdawsonsmac/Documents/Audacity/Website/astro-audacity`)

New content directory `src/content/manual/accessibility/` with four MDX pages, section `"Accessibility"`, `sectionOrder: 160` (existing sections end at 150). Pages render via the existing `[...slug].astro` route and section nav — no layout or routing work.

1. **`navigation-model.mdx` — How keyboard navigation works** (`order: 1`)
   - Tab-group concept: Tab moves between groups; arrow keys move within a group; one roving tab stop per group (`tabIndex 0` / `-1`); wrap-around; Home/End; focus-on-entry reset (entering a group from outside always lands on its first item)
   - Complete global tab order table: `file-menu` (1) → `project-toolbar` (2) → `project-toolbar-actions` (3) → `project-toolbar-workspace` (4) → `tool-toolbar` (5) → `effects-panel` (6) → `add-track` (99) → `tracks` (100 base) → `selection-toolbar` (200)
   - Track-area interleave formula: track control panels at `base + index·2` (100, 102, …), clips at `base + 1 + index·2` (101, 103, …)
   - One callout: `wcag-flat` exists as a debug/comparison profile (every element `tabIndex 0`, no arrow grouping, clip shortcuts disabled); not product behaviour

2. **`track-view.mdx` — Tracks, clips and labels** (`order: 2`)
   - Focus model: track panel ↔ clip cycling within a track (container-level roving tabindex); ArrowLeft/Right cycles clips
   - Shortcut tables: Enter (toggle clip selection), Shift+F10 / ContextMenu key (clip context menu), Cmd+Left/Right (move clip 0.1s), Cmd+Up/Down (move clip to adjacent track), Shift+Left/Right (extend edges), Cmd+Shift+Left/Right (reduce edges), ArrowUp/Down (navigate to first clip on adjacent track), Delete/Backspace (labels)
   - Behavioural notes tables can't carry: Cmd+Arrow overlap resolution fires on Cmd **release** (`pendingClipMoveResolution` singleton); boundary behaviour at first/last track; arrow keys handled by the track container, clips only `preventDefault` their own shortcuts and the container checks `e.defaultPrevented`
   - Label keyboard move/trim is **dead code** in the prototype (`useLabelKeyboardHandling` not wired) — excluded from the handbook, listed in the discrepancy report

3. **`toolbars-and-panels.mdx` — Toolbars and panels** (`order: 3`)
   - Transport toolbar, tool toolbar (container tab groups); project toolbar tabs (per-item tab group); selection toolbar incl. timecode fields; effects panel grid (2-D arrow navigation); add-track button group

4. **`modals-and-menus.mdx` — Modals and menus** (`order: 4`)
   - Export modal (source: `docs/export-modal-accessibility.md`); preferences modal navigation; context menus (open/close/navigate); focus trap and focus-restore behaviour

### Format conventions (per MuseScore model + existing manual)

- Three-column shortcut tables: **Shortcut / Action / Notes**, keys wrapped in `<kbd>`
- Numbered lists for multi-step flows; existing `Callout` component for warnings and notes
- Each page ends with an **Implementation notes** block calling out load-bearing behaviours (the things that break if implemented naively)
- Frontmatter matches existing manual pages: `title`, `description`, `section: "Accessibility"`, `sectionOrder: 160`, `order`

### Back to the user

A short **discrepancy report**: everything the prototype docs claim that the code does not do (or vice versa), found during verification.

## Content pipeline (trust-critical)

1. **Extract** claimed behaviour from the prototype docs: `docs/track-view-navigation.md`, `docs/keyboard-handlers-map.md`, `docs/accessibility-architecture.md`, `docs/export-modal-accessibility.md`
2. **Verify every shortcut against live code** — actual handlers in `packages/components/src/Track/TrackNew.tsx`, `useContainerTabGroup` / `useTabGroup`, the `useKeyboardShortcuts` guard chain, `apps/sandbox/src/hooks/handlers/*`, profile definitions in `packages/core/src/accessibility/profiles.ts`. Documented-but-dead behaviour is excluded from the handbook and recorded in the discrepancy report
3. **Spot-check interactively** — run the sandbox (preview tools) and confirm a sample of tricky behaviours: global tab order, clip cycling, Cmd+Arrow move + release resolution, effects panel grid
4. **Write the MDX pages** following the conventions above
5. **Preview the built astro site** — section appears in nav, all four pages render, tables and kbd styling correct

## Non-goals

- No mouse/pointer interaction spec (drag, trim, envelope editing)
- No ARIA/screen-reader documentation (candidate future page in this section)
- No changes to the EGAT stub or any existing manual content
- No prototype code changes (this is documentation only; discrepancies are reported, not fixed)

## Success criteria

- Dev can implement keyboard accessibility from the handbook section alone, without touching the prototype
- Every shortcut in the handbook is code-verified against the prototype (not copied from possibly-stale docs)
- Section renders correctly in the astro-audacity manual nav alongside existing sections
