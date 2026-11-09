# Custom toolbars / authored workspaces — design (in progress)

**Date:** 2026-11-09
**Status:** 🟡 Brainstorm in progress — spine decided, interaction detail still open.
**Next step when resuming:** mockups in the visual companion (dock layout + the
drag-to-relocate interaction), finish the open questions below, THEN hand to
`superpowers:writing-plans`. Nothing is built until this doc is approved.

> This file is a resume point written because the author had to switch machines
> mid-brainstorm. It records what's decided, what the codebase looks like today,
> and the questions still to settle. Pick up at "Open questions".

---

## Intent — the why

Let people build **highly customised toolbar layouts**, as an extension of the
existing **workspace** feature. The concrete moments the author wants to serve:

- "I want to move some tools **down to the bottom** toolbar."
- "I want to pull some tools into **their own toolbar** and dock it **left or
  right** in a **vertical** layout."

The payoff isn't reclaiming space or copying another DAW per se — it's that a
**workspace stops being a fixed preset and becomes something a person authors
tool-by-tool.** Custom toolbars are the raw material; the workspace is the saved
result.

## The model (decided)

- **A workspace === a saved layout.** The layout is: the set of **docks**, which
  **toolbars** sit in each dock, and which **tools** (by id) are in each toolbar.
- **The four built-in workspaces become starting points.** Classic / Music /
  Spectral / Modern are seed layouts you can **fork, rearrange, and save as your
  own named workspace.**
- **Switching workspaces swaps the whole layout.**
- **Granularity is the individual tool.** You peel a single tool off one bar and
  either drop it onto another existing bar, or spin it out into a **new** bar
  that you then park in a dock (incl. left/right vertical).

## The core architectural insight

Today **"which tool lives on which bar" is code, not data.** The real lift of
this feature is turning that into a **layout model** — docks hold toolbars,
toolbars hold tool-ids — **rendered generically** and **rearranged by drag**,
then **saved per workspace.** Everything else (drag UX, vertical rendering,
persistence) hangs off that one change. This is a project, not a tweak.

---

## Recon — current state of the codebase (2026-11-09)

What exists, so the next session doesn't re-discover it:

### Workspaces
- `apps/sandbox/src/App.tsx:101` — `type Workspace = 'classic' |
  'spectral-editing' | 'modern' | 'music'`. A hardcoded enum. State at
  `App.tsx:133`.
- `handleWorkspacePick` (`App.tsx:353`) does two things only: toggles
  `SET_SPECTROGRAM_MODE`, and the value is passed down as a prop.
- In `TransportToolbar.tsx` the value **gates which tool groups render** via
  `workspace === 'classic'` / `'music'` / `'spectral-editing'` / `'modern'`
  blocks (lines ~530, 607, 634, 677). Nothing is user-authored or persisted.
- The selector UI lives in `ProjectToolbar.tsx` (`workspaceSelector`, a dropdown;
  compact mode collapses to an icon+context-menu).

### The three bars (all bespoke components)
- **ProjectToolbar** (top row) — tabs, Mixer / Audio setup / Share / Get effects,
  the workspace selector, undo/redo, notification bell.
- **TransportToolbar** (second row) — play/record/transport, tools, zoom, edit,
  timecode, meters. **This is the bar with all the relocatable tools.** Tool
  order/grouping/placement is **hardcoded JSX** here, NOT data.
- **SelectionToolbar** (bottom) — this is the **status / info bar** (Figma
  Status/Info bar spec), two slots + selection timecodes. **It is NOT a
  tool-holding toolbar** — so "move tools to the bottom" has no bottom tool-dock
  to land in yet; one must be created.

### Customise-toolbar (visibility only)
- `CustomiseToolbarMenu` + `CUSTOMISE_TOOLBAR_ENTRIES`
  (`packages/components/src/CustomiseToolbarMenu/CustomiseToolbarMenu.tsx`) — a
  flat, fixed-order list of ~30 tool ids with glyphs/groups.
- The cog toggles each tool in/out via **one preference, `toolbarHiddenTools`**
  (an id array; `TransportToolbarContainer.tsx:87`). `show(id) = !hidden`
  (`TransportToolbar.tsx:334`). It can hide/show but **cannot reorder, regroup,
  or relocate.**

### Precedents we can lean on
- **`useDraggableToolbar`** (`apps/sandbox/src/hooks/useDraggableToolbar.ts`) —
  grab the transport bar's gripper, detach, snap `top` / `bottom` / `floating`.
  Moves the **whole bar**; **no left/right**; a working drag-dock pattern
  (self-cleaning document listeners, generous 1.5×-height snap thresholds).
- **Vertical docking already works** for meters: playback + recording meters
  render as 64px vertical columns on the right (`data-recording-meter-dock`,
  `App.tsx:1375`+). Bespoke per-meter, but proves the right-dock layout slot.

### Layout skeleton (where docks would live)
`App.tsx` editor region: ProjectToolbar (top) → TransportToolbar (2nd row) →
`EditorLayout` (canvas) with optional 64px right meter columns beside it →
SelectionToolbar (bottom). New left/right tool docks would be flex columns beside
`EditorLayout`, like the meter columns; a bottom tool dock would sit above/around
the status bar.

---

## Open questions (resume here)

Settle these in the visual companion, then finalise the doc.

1. **Dock regions.** Confirm the set: top, bottom, left, right. Also **floating**
   (free x/y, like today's detach)? Can a dock hold **multiple** toolbars
   (stacked / side by side)?
2. **Authoring interaction.** Direct manipulation on the **live** toolbars
   (drag a tool straight off the bar, drop zones light up) vs a dedicated
   **customise/edit mode** (enter a mode, rearrange, exit). Leaning direct —
   confirm.
3. **Relationship to the Customise cog.** Does drag-to-relocate **replace** the
   cog, **absorb** it (the cog becomes "add a tool / reset layout"), or sit
   **beside** it? `toolbarHiddenTools` likely becomes part of the layout model.
4. **Vertical rendering.** When a tool sits in a vertical (left/right) dock, how
   does it render — icon-only stack? Do composite tools (timecode, meters,
   speed slider, snap) have a vertical form, or are some tools **not allowed**
   in vertical docks?
5. **Fixed vs free tools.** Are any tools pinned to a home (e.g. Play/Record
   transport cluster, the timecode, the Project-bar tabs), or can everything be
   moved? Project-bar items (tabs, workspace selector) — in scope or out?
6. **Persistence & scope.** A workspace layout is presumably saved in
   preferences (one blob, merge-on-load, like `audacity-preferences`). Per-user,
   not per-project? Can users **create / rename / delete** named workspaces, and
   is there a **reset-to-built-in**?
7. **Groups / dividers.** Within a toolbar, do tools keep the design's grouping
   (dividers), and can the user make/break groups, or is grouping automatic?
8. **Non-goals / anti-goals.** Likely out: redocking the canvas or panels (this
   is toolbars only); multi-window tear-off to a separate OS window; syncing
   layouts across devices. Confirm.

## Rough architecture sketch (not yet decided — for the plan to firm up)

- A **tool registry**: `id → { render(ctx, orientation), defaultGroup, allowedDocks }`.
  TransportToolbar's hardcoded tool JSX is refactored into registry entries so a
  tool can be rendered **anywhere** by id.
- A **layout type**: `Workspace = { id, name, docks: Dock[] }`,
  `Dock = { region, toolbars: Toolbar[] }`, `Toolbar = { id, toolIds: string[] }`.
- A **generic `<ToolbarHost>`** that renders a layout: docks → toolbars → tools
  via the registry, in the dock's orientation.
- **Drag layer**: reuse `useDraggableToolbar`'s self-cleaning-listener pattern,
  extended to per-tool drags and left/right drop zones.
- **Persistence**: the active workspace id + any user-authored workspaces in the
  preferences blob; built-ins remain code as seeds.
- Built-in workspaces are re-expressed **as data** (seed layouts) so the enum's
  `workspace === 'x'` gating in TransportToolbar dissolves into the layout.

---

## Decisions log

- 2026-11-09 — Granularity is per-tool (not whole-bar). Author.
- 2026-11-09 — Vertical left/right docking is in scope (meters already prove it).
  Author.
- 2026-11-09 — A workspace === a saved layout; built-ins are forkable starting
  points; switching swaps the whole layout. Author ("yes").
- 2026-11-09 — Design it properly (written design + plan), not a throwaway spike.
  Author.
