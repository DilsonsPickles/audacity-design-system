# Custom toolbars / authored workspaces — design (in progress)

**Date:** 2026-11-09
**Status:** 🟢 Increment 1 BUILT (2026-11-09, third session — "let's see it
in the build. But, I want division lines between cols and rows"): the
layout model, the tool registry, `ToolbarDock` (wrapping rows with dividers
between bars and between rows, vertical side docks), persistent grips with
the bar-level drag, the status bar as the bottom dock, one layout per
workspace in the preferences. See the CLAUDE.md rule "THE TOOLBARS ARE DOCKS
OF BARS WITH PERSISTENT GRIPS". Increment 2, FIRST PASS, BUILT 2026-11-10:
the edit mode from the cog's "Rearrange tools…" — tools inert and
draggable, a tool JOINS a bar (short caret) or gets a NEW bar beside one
(full-height line), Reset layout, Done / Escape. ROWS, BUILT 2026-11-10: the
model is docks of ROWS of bars; a bar (by its grip) or a tool (in the edit
mode) dropped on the line between two rows, or at a horizontal dock's edge,
gets a NEW ROW, shown by a horizontal accent line; a row lives while it
holds a bar. GRIPS IN THE GAP, BUILT 2026-11-10: the 17px gutter between
two bars is the later bar's grip (the line at rest, the dots on hover), and
the seeds are six Audacity 3-sized bars instead of ten small ones. SIZING,
BUILT 2026-11-10: a bar's width (horizontal dock) or height (vertical) is
set by its trailing edge; stretchy tools (the meters, the info line) take
or give room first, then tools overflow behind a chevron that opens them
in a flyout; a double-click or a release on the natural size resets.
METERS IN THE DOCK SYSTEM, BUILT 2026-11-10: a meter tool is horizontal in
the top / bottom dock and vertical in a side dock; the separate fixed meter
columns are gone; the meters' Position pickers move the tool between docks.
The docked vertical meter is the original MasterMeterVertical (its own head
button, 72px wide). SIDE-DOCK COLUMNS, BUILT 2026-11-10: a side dock's rows
are columns side by side, made by a drop at a column's edge.
NOT YET: the tray of
hidden tools, hold-to-enter, the keyboard Move-to menu, the Flexible space
tool, floating bars, user-named workspaces. Questions 4–8 below are
still the assistant's positions; increment 1 took 4 and 5 as stated.
**Next step when resuming:** the mockup exists — a WORKING mock at
https://claude.ai/code/artifact/da61130f-76fc-4337-907a-16002b1e0496 (wrap,
persistent grips, side and bottom docks, the status bar as a dock, edit mode
with tray and labelled zones, jiggle vs grip-and-shadow toggle, the keyboard
Move-to menu); its source is not in the repo. Finish open questions 4–8 below,
THEN hand to `superpowers:writing-plans`. Nothing is built until this doc is
approved.

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

## Decided 2026-11-09 (second session) — the dock and the authoring interaction

### The dock (was open question 1)
- Regions: **top, bottom, left, right**, plus **floating** (free x/y, today's
  detach). **THE BOTTOM DOCK IS THE STATUS BAR** (author, later the same
  session: "I want the bottom toolbar items to also be customisable" —
  superseding the first cut, a bottom dock above an untouchable status bar):
  the status bar's own items are TOOLS like any other — the playback cue, the
  info line, the Selection timecodes, the Duration — seeded as two bars
  ("Status": cue + info line; "Selection": timecodes + duration), each with a
  grip; any can be hidden to the tray, reordered, or moved to another dock,
  and any tool can be dropped beside them. The bottom row's right-alignment
  comes from the info line GROWING (a tool with `flex: 1`) rather than from a
  fixed two-sided layout; a **"Flexible space"** tool in the tray (macOS's
  toolbar item) gives the same push anywhere, and is a supply: it stays in the
  tray however many are placed. None of the status items has a vertical form.
  The `SelectionToolbar` component therefore dissolves into tools, as
  `TransportToolbar` does; the Status/Info bar spec's two slots become the
  seed layout's first two tools.
- **A dock holds an ordered list of toolbars, not one** — "two toolbars can
  exist on the same horizontal or vertical slot" (author). A horizontal dock
  lays them left to right, a vertical dock top to bottom. This is Audacity 3's
  dock exactly: several toolbars on a row, each with a grabber.
- **A full row WRAPS** to a second row inside the same dock (Audacity 3's rule;
  a refused drop with no explanation is the worst outcome, and the drop zone
  can show the wrap before the release). Author: "let's try it with wrapping".
- **Every toolbar has a persistent GRIP** at its leading edge, live at all
  times, as the transport bar's gripper is today — a whole bar moves as one
  thing, between docks and along a row, without entering any mode. Author:
  "persistent grippers".
- So there are TWO drag grains: a TOOL moves between bars (inside the edit
  mode, below); a BAR moves between docks and along a row (always).
- Drop zones: between two bars on a row, at the end of a row, in an empty
  dock. Dropping a TOOL between bars or at a row's end makes a NEW BAR there —
  that is the "add new toolbar" gesture; no empty bar is ever made from a menu.
- Watch: tool widths differ a lot (a button 28px, the timecode ~110px, the
  speed control ~160px). The mockup must try a row holding the timecode bar
  beside the speed bar — the case that decides how often wrapping happens.

### The authoring interaction (was open questions 2 and 3)
Two ideas were weighed — an "Add new toolbar" action in the cog menu, and an
iPhone-style hold-and-jiggle — and combined:
- **ONE EDIT MODE**, entered from the cog ("Customise toolbars…") or by a LONG
  PRESS on any tool; exited by Done or Escape; the layout is saved to the
  current workspace on exit. A plain drag on the live bar was rejected: a press
  on a tool already means something (buttons act; sliders, knobs and timecode
  digits already drag), so drag-to-relocate would need a modifier nobody finds
  or a threshold that fights the sliders. A mode avoids all of it — macOS's
  Customize Toolbar sheet is the same model with a palette.
- In the mode, tools get grips and drag between bars and along them; live
  controls go inert; the empty docks and the gaps between bars show as
  LABELLED DROP ZONES; a zone that refuses a tool (a vertical dock for the
  timecode) says so.
- **The cog's list becomes the PALETTE**: hidden tools sit in a TRAY in the
  mode; dragging one out adds it; dragging a tool off every bar onto nothing
  returns it to the tray. `toolbarHiddenTools` folds into the layout model.
  The cog is ABSORBED, not replaced: its menu becomes "Customise toolbars…"
  and "Reset layout".
- **The keyboard has the same powers**: in the mode a focused tool has a menu —
  Move to left toolbar / right toolbar / bottom toolbar / New toolbar — the
  keyboard's way to do what a drop into a zone does. "Add new toolbar" lives
  there, as that menu's last item.
- Open within this: whether the mode's tools JIGGLE (a phone convention) or
  take a subtle grip and a raised shadow (likely better on a desktop) — decide
  in the mockup.

## Open questions (resume here)

Settle these in the visual companion, then finalise the doc. Questions 1–3
are settled above. The assistant's positions on 4–8, offered 2026-11-09 and
not yet accepted or rejected:

4. **Vertical rendering.** — Position: buttons stack as icons; the timecode,
   speed slider, snap and meters have no vertical form and are REFUSED by
   vertical docks, the drop zone saying so.
5. **Fixed vs free tools.** — Position: everything on the transport bar AND
   the status bar moves (the status bar decided, above); the project bar's
   tabs and workspace selector stay out of scope.
6. **Persistence & scope.** — Position: the preferences blob, per user; create,
   rename, delete and reset-to-built-in are all needed, or a fork cannot be
   undone.
7. **Groups / dividers.** — Position: automatic, from each tool's default
   group; authoring dividers is a second project.
8. **Non-goals.** — Position: the list below stands.

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
- 2026-11-09 (second session) — A dock holds several toolbars on one row;
  a full row wraps; every toolbar has a persistent grip. Author ("let's try it
  with wrapping and persistent grippers").
- 2026-11-09 (second session) — The status bar is the bottom dock and its
  items are tools; a Flexible space tool handles right-alignment. Author ("I
  want the bottom toolbar items to also be customisable").
- 2026-11-10 — Any number of containers, one tool each if wanted; a tool
  pulled BESIDE a bar shows a line for the new container, distinct from the
  caret for joining a bar. Author ("Let me create as many containers as I
  want right?", "put a line horizontally to show that a new container will
  be created"). First built as the boundary line between bars (vertical
  on a row); the author meant a new ROW — next entry.
- 2026-11-10 — ROWS are the user's: a dock is a list of rows, a row a list
  of bars; a row is made by dropping a bar or a tool on the line between
  rows (or a dock's edge), shown by a horizontal line, and it exists for
  as long as it holds a tool. No "add row" command, no empty rows. A row
  wider than the window still wraps; a wrap is not a row boundary. Author
  ("Yeah I meant I wanted the ability to create new rows. As long as there
  is a tool in each row, it can exist"). Stored flat layouts from the
  first cut are read as one row a dock.
- 2026-11-10 — The grip is the GAP: the gutter between two bars is the
  later bar's handle, dots on hover only; the default bars are merged into
  six bigger ones (a bar is just a grouping now that single tools move).
  Grips shown only in an edit mode were considered and kept in reserve:
  "I'm trying to avoid having to enter a mode like this. But we can keep
  that in our back pocket… we'll probably need it eventually for
  accessibility users." Author ("Try 1 and 2").
- 2026-11-10 — Bars are resizable: width in a horizontal dock, height in a
  vertical one, by the bar's trailing edge. Wider = the stretch tools fill
  (else empty space); narrower = they shrink to their minimum, then tools
  overflow behind a chevron. The meters' own grip goes: the bar's width is
  the meter's. Author ("I want to be able to adjust the width of the
  toolbars when docked horizontally and height when docked vertically");
  the overflow and stretch rules are the assistant's call, flagged.
- 2026-11-10 — The meters join the dock system: the dock decides a meter's
  orientation (vertical in a side dock, filling it); the only state left is
  "on the toolbar or in the flyout", now persisted; the Top bar / Side bar
  pickers move the tool. Author ("pull the horizontal and vertical layouts
  of the meters into the same system").
- 2026-11-10 — The docked vertical meter keeps its original layout (head
  button, padding, width), so a side dock widens for it; and a side dock
  holds several vertical toolbars side by side as columns, as the top dock
  holds rows. Author ("use the vertical layout we already had… Also allow
  me to have multiple vertical toolbars like we do in horizontal").
- 2026-11-10 — An empty dock shows nothing of its own during a drag; the
  side docks' drop zones are the dockable panels' overlay (a subtle band,
  the hovered one previewing the 48px footprint). Author ("don't show side
  panel slot unless they hover over that area. We already have the visuals
  I want (see effect panel drag behaviour)"). This also answers the edit
  mode's "labelled drop zones": use the overlay there too, not in-layout
  zones.
- 2026-11-09 (third session) — Increment 1 built: rows WRAP with a divider
  between bars and a line between rows; grips persistent; floating dropped
  for now. Author ("let's see it in the build. But, I want division lines
  between cols and rows").
- 2026-11-09 (second session) — Authoring is one edit mode (cog or long press),
  with the cog's list as a tray and a keyboard Move-to menu; the cog is
  absorbed. Assistant's combination of the author's two ideas ("Add new
  toolbar" in the cog menu; iPhone-style hold-and-move); accepted by going on
  to the dock decisions, not stated outright — confirm when resuming.
