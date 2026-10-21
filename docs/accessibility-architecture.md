# Accessibility Architecture

This document describes the keyboard navigation and roving tabindex system used across the application.

## Overview

The app uses an **accessibility profile system** that supports two modes:
- **AU4 Tab Groups** (`au4-tab-groups`) — Roving tabindex with arrow key navigation within groups, Tab moves between groups
- **WCAG Flat** (`wcag-flat`) — Sequential tabindex, all elements get `tabIndex=0`, no arrow key grouping

Profiles are defined in `packages/core/src/accessibility/profiles.ts` and consumed via `AccessibilityProfileContext`.

## Roving Tabindex Hooks

There are two companion hooks, both reading from the same `AccessibilityProfileContext`:

### `useTabGroup` (per-item hook)
**File:** `packages/components/src/hooks/useTabGroup.ts`

Used when each item in the group is a known React component that can receive hook props directly.

**Used by:**
- `ProjectToolbar` — toolbar tabs (Home, Project, Export)
- `EffectsPanel` — effect grid cells

**API:** Each item calls the hook with its `itemIndex` and `totalItems`. The hook returns `tabIndex`, `onKeyDown`, `onFocus`, `onBlur` for that item.

**Features:**
- Arrow key navigation with wrapping
- Home/End keys
- Hidden element skipping
- Blur reset (focus returns to first item when re-entering group)
- Focus-on-entry reset (entering from outside always starts at first item)

### `useContainerTabGroup` (container-level hook)
**File:** `packages/components/src/hooks/useContainerTabGroup.ts`

Used when the container receives dynamic children and discovers focusable elements at runtime via DOM queries.

**Used by:**
- `Toolbar.tsx` — transport toolbar, tool toolbar
- `SelectionToolbar.tsx` — bottom selection toolbar with timecodes
- `TrackNew.tsx` — clip-to-clip cycling within a track

**API:**
```typescript
const { onKeyDown, onBlur, containerProps, initTabIndices, startTabIndex } = useContainerTabGroup({
  containerRef,           // Ref to container element
  groupId,                // Looked up in profile's tabGroups config
  selector,               // CSS selector for focusable elements (default: 'button, select, input, [role="group"]')
  filter,                 // Optional filter function to exclude elements
  ariaLabel,              // aria-label for the container
  startTabIndex,          // Override (default: resolved from profile tabOrder[groupId])
});
```

**Features:**
- Arrow key navigation (Left/Right and Up/Down treated equivalently) with wrapping
- Home/End keys
- Hidden element skipping (via `getComputedStyle` check)
- Blur reset (first element gets `startTabIndex`, rest get `-1`)
- `defaultPrevented` check — skips if a child already handled the event
- Falls back to default roving behavior (wrap=true, arrows=true) when groupId isn't in the profile config

**Lifecycle:** Call `initTabIndices()` on mount and whenever children change to set initial tabIndex values.

## Tab Group Configuration

Each group is configured in the profile's `tabGroups` map:

```typescript
interface TabGroupConfig {
  tabindex: 'roving' | 'sequential';  // Strategy
  arrows: boolean;                      // Enable arrow key navigation
  wrap: boolean;                        // Wrap from last to first
}
```

Tab ordering is defined in `tabOrder`:

```typescript
tabOrder: {
  'file-menu':                 1,
  'project-toolbar':           2,
  'project-toolbar-actions':   3,
  'project-toolbar-workspace': 4,
  'tool-toolbar':              5,
  'dock-tabs-start':           7,  // LEFT dock: its tabs, then what it holds
  'effects-panel':             8,
  'macros-panel-actions':      9,  // Macro manager: header actions…
  'macros-panel':             10,  // …then the macro list
  'add-track':                99,
  'tracks':                  100,  // base — stride of 3 per track
  'dock-tabs-end':           197,  // RIGHT dock / bottom drawer: after the tracks
  'macros-panel-actions-end': 198,
  'macros-panel-end':         199,
  'selection-toolbar':        200,
}
```

(The table above is illustrative — `profiles.ts` holds the real numbers.)

### Track Tab Order (stride = 3)

Each track gets three tab stops, offset from the `tracks` base (100):

| Track | Container | Panel | Clips |
|-------|-----------|-------|-------|
| 0 | 100 | 101 | 102 |
| 1 | 103 | 104 | 105 |
| 2 | 106 | 107 | 108 |

- **Container** — the `.track` div. ArrowUp/Down navigates to the same stop on adjacent tracks.
- **Panel** — the `TrackControlPanel`. ArrowUp/Down navigates between panels; ArrowLeft/Right enters children.
- **Clips** — roving tabindex over clip `[role="button"]` elements within the track.

## Component Navigation Patterns

### Toolbars (Toolbar.tsx, SelectionToolbar.tsx)

Uses `useContainerTabGroup`. Container has `role="toolbar"`.

| Key | Action |
|-----|--------|
| ArrowLeft/Up | Previous item |
| ArrowRight/Down | Next item |
| Home | First item |
| End | Last item |
| Tab | Leave toolbar (move to next tab stop) |

**Filter:** Toolbar.tsx filters out elements inside `role="group"` containers (e.g., TimeCode's internal buttons are treated as a single tab stop).

### Track Control Panel (TrackControlPanel.tsx)

Manual keyboard handling (not using hooks). Container has `role="group"`.

Two-level navigation:
1. **Panel level** (outer div focused): ArrowUp/Down moves between track headers, ArrowLeft/Right enters children
2. **Child level** (button focused): All four arrows cycle through children, Escape returns to panel

| Key | Panel focused | Child focused |
|-----|--------------|---------------|
| ArrowUp | Previous track header | Previous child |
| ArrowDown | Next track header | Next child |
| ArrowLeft | Focus last child | Previous child |
| ArrowRight | Focus first child | Next child |
| Escape | — | Return to panel |
| Enter | Toggle track selection | — |
| Tab | — | Navigate out to clips |
| Shift+ArrowUp/Down | Range select tracks | — |

### Clip Navigation (TrackNew.tsx)

Uses `useContainerTabGroup` on the track container for ArrowLeft/Right cycling between clips.

Individual clips handle their own shortcuts (Delete, Enter, Cmd+arrows, etc.) and call `e.preventDefault()` so the container hook skips those events.

| Key | Action |
|-----|--------|
| ArrowLeft/Right | Cycle between clips (via hook) |
| ArrowUp/Down | Navigate to adjacent track (via `onClipNavigateVertical`) |
| Home | First clip (via hook) |
| End | Last clip (via hook) |
| Enter | Toggle clip selection |
| Delete | Delete clip |
| Cmd+Arrow | Move clip |
| Shift+Arrow | Extend/trim clip |

### Macro manager (MacrosPanel.tsx)

Three Tab stops under the tab-groups profile, in reading order: the
dock's **tab** ("Macro manager" — see Dock panel tabs below), the
**header actions** (New macro, panel menu — `useContainerTabGroup`,
`role="toolbar"`), then the **macro list**. The list is ONE stop however
many macros it holds.

The list is a grid: **Down / Up go down and up it**, macro to macro;
**Left / Right go along a macro's row** (name, Run, menu). This is the
one tab group where Down and Right differ — in a toolbar they are the
same key — because a list of rows has a "down" that a row of buttons
does not. Settled 2026-09-28 after trying a single toolbar-style
sequence in which Down did what Right does: it was consistent, and
wrong for a list. Do not "fix" Down to match Right.

**It is an ARIA grid too** (2026-10-21, "proper cell navigation
accessibility"): the list is `role="grid"` (`aria-rowcount`,
`aria-colcount="3"`), each row a `role="row"` named after its macro,
each of its three buttons — the name (which opens the macro), Run, and
the menu — inside its own `role="gridcell"`. So a screen reader hears a
table ("3 rows, 3 columns"), the position of every cell, and can use
its own table navigation on it; the keyboard below is the grid pattern
(one Tab stop, arrows between cells). The row is never itself a button:
a button that contains buttons is invalid, and hides Run and the menu
from a screen reader. With no macros the grid holds one row of one cell
spanning it, carrying the hint — a grid's only children are rows.

| Key | Action |
|-----|--------|
| ArrowUp / ArrowDown | Previous / next macro, same column. Cycles: Down from the last macro is the first |
| ArrowLeft / ArrowRight | Along the row: name → Run → menu. Cycles |
| Home / End | First / last macro |
| PageUp / PageDown | A screenful of macros. Stops at the ends — a jump that wrapped would land somewhere unpredictable |
| Enter | Presses what has focus. On the name it opens the macro **at once** — the mouse's double-click wait does not apply |
| Cmd/Ctrl+Enter | Run the macro on the project, from any cell |
| F2 | Rename, from any cell |
| Shift+F10 / Menu key | Open the row's menu, from any cell |
| Tab / Shift+Tab | Leave the list |

**The list remembers where you were.** Its tab stop is kept by macro ID
and is NOT reset when focus leaves, unlike the toolbar hook: returning
to a list of fifty macros should put you back on the one you left.

**Focus after an action** — it must never fall to the page:

| After | Focus goes to |
|-------|---------------|
| Deleting a macro | The macro that takes its place (the next, else the previous, else New macro) |
| Closing Rename (either way) | The macro's name |
| Cancelling New macro | The New macro button |
| Closing the Edit macro window | The macro it was opened from — only if focus was IN the window; it is non-modal, and someone who has moved on to the project must not be pulled back (`AppDialogs`) |
| Closing a menu with Escape | The cell the menu was opened from (`ContextMenu`) |

**Keys the panel does not take.** These stay with the app, as they do
from every other control that is not a text field:

- **Space** is play/pause. It does not press the focused button.
- **Delete / Backspace** act on the PROJECT's selection. They do not
  delete a macro — that is in the row's menu.
- **Shift / Cmd / Alt + arrows** are the app's chords.

Every key the panel DOES use is stopped from reaching the app's
document-level shortcuts (`stopPropagation`), including when it goes
nowhere (a list of one macro, PageUp at the top) — otherwise the key
would move the track focus instead. Whether the arrows cycle is the
profile's `wrap` for the group, as for every other group.

**Placement.** `placement="start"` (docked left) uses the groups before
the tracks; `placement="end"` (docked right or bottom) their `-end`
twins, after the tracks. The tracks route Tab themselves rather than
leaving it to tabindex order, so `findAfterTracksFocusTarget` (sandbox
`utils/focusRouting.ts`) names what follows the last track: a dock's tab
strip first, so you arrive at the name of the panel before its contents.

**Flat profile.** Every control is its own Tab stop and the arrows do
nothing. Enter, Cmd/Ctrl+Enter, F2 and Shift+F10 still work.

### Edit macro window (MacroBuilderDialog.tsx)

Six Tab stops, however many commands and steps there are (it was 322
with 280 commands and 12 steps — every command and every step control
was its own stop):

| # | Stop | Inside it |
|---|------|-----------|
| 1 | Search field | Down drops into the command list; Enter adds the first match |
| 2 | Command list | A listbox — arrows, below |
| 3 | Splitter | Arrows resize, below |
| 4 | Macro menu button | Enter opens the menu |
| 5 | Step table | Starts on the head's first cell; arrows, below |
| 6 | Footer | Run / Run on files… / Done (`useContainerTabGroup`) |

The window floats outside the app's numbered Tab order: its stops are
`tabindex=0`, as every dialog's are.

**Tab goes round the window** (`Dialog`'s `loopTab`, 2026-09-29): past
the footer is the title bar's Close, then search again; Shift+Tab goes
the other way. The window is still non-modal — the app behind is a
click away — but Tab alone never leaves it. `Dialog` takes EVERY Tab
while the window is in use, on `window` in the capture phase, because
the app has Tab handlers of its own on document-capture
(`useTimeSelectionTabHandler`, `useFlatNavTabRouter`) that would carry
focus out to a clip or a track.

**Escape closes the window** whenever the window is the one in use:
focus inside it, or focus nowhere and the pointer's last press inside
it. The second half matters — a click on a blank part of the window
focuses nothing, and the window used to stop answering Escape from then
on. While the APP is in use, Escape is still the app's.

Being NON-MODAL also means the app's document-level shortcuts are still
listening,
so every key a list uses is stopped from reaching them; before this the
arrows and Home/End moved the project's playhead, Down on a step threw
focus out to a track, and Delete on a step opened "Delete track?".

**Command list** — `role="listbox"`, ONE command selected at a time
(multi-select and its "N selected · Clear · Add" bar were removed
2026-09-29). One column.

| Key | Action |
|-----|--------|
| ArrowDown / ArrowUp | Next / previous command; selection follows focus. Cycles |
| Home / End | First / last command |
| PageUp / PageDown | A screenful. Stops at the ends |
| Enter | Add the focused command. It stays selected, so Enter again adds it again; the add is announced |
| ArrowLeft / ArrowRight | Nothing — but kept from the playhead |
| Shift+arrows | The same as the plain arrows: there is no range to grow |

With the mouse: click selects; double-click, or the **+ button** the
selected command carries, adds it to the end; and a command can be
**dragged into the step list** to put it where it is
wanted. A drag does not touch the selection — it is reaching past the
list to the steps, not choosing in the list (selecting on pick-up was
tried, 2026-09-29). Over the steps it is shown as a GHOST
STEP in the list, where it would land, with the steps below it
renumbered — the list shows the result, as a reordered track does. The
ghost looks exactly like a step being reordered (the same row at half
opacity, grip and action icons drawn): to the eye both are a step in
flight.
Outside the steps it is a chip at the pointer. Nothing is added until
the drop (let go anywhere else, or press Escape, to abandon it).

The ghost step is `aria-hidden` and carries no `data-step-index`: it is
not a step, and neither the keyboard nor the drag's own hit test may
take it for one.

The drag's keyboard equivalent is two moves, not one: **Enter** adds the
command to the end, then **Cmd/Ctrl+ArrowUp** on the new step carries it
up to its place. The + is a ghost icon button on the SELECTED row only (showing it on
hover as well was tried and not kept — 2026-09-29). It is the mouse's:
out of the Tab order and `aria-hidden`, because an option cannot hold a
control and the keyboard already has Enter. For the same reason a
command row is a `div`, not a `button`.

Going to the search field — a click or the keyboard — lets go of the
selection, and so does a search that hides the selected command. So
nothing is selected while the field has focus, and Enter there always
adds the FIRST result: never something out of sight, never something
picked before the search began.

The list stays ONE stop driven by the arrows under the flat profile too:
a listbox is a single control, and 280 Tab stops serve nobody.

**Step table** — a DATA GRID (2026-10-21, "I was expecting tab focus to
start on top left cell (table header) and then arrow keys move through.
Enter/Space to enter cell (if it's editable)"; until then the row and
its two buttons took focus in turn, as the Macro manager's cells do).
The table's wrapper is `role="grid"` named "Macro steps" (`aria-rowcount`
counts the head, `aria-colcount="4"`), the visible head is its first
`role="row"` of `columnheader`s (Reorder — the grip column's, unlabelled
on screen — Step, Command, Actions), the scrolling list a `rowgroup`,
every step a `role="row"` (`aria-rowindex` from 2) of four `gridcell`s.
THE GRIP IS THE FIRST COLUMN (the same day, "first column should be
tabbable, we need to be able to reorder and you do that by stepping
into first column"): the mouse drags it, and the keyboard steps INTO
it — Enter / Space on a step's Reorder cell PICKS THE STEP UP (the
row takes the drag's half-opacity look, "a step in flight";
`reorderingIndex`, `data-reordering` on the cell), Up / Down carry it,
focus and the look going with it, and Enter, Space or Escape LET GO —
so does focus leaving the cell, or any other key, which then does what
it does. THE CELLS TAKE THE FOCUS (`data-grid-row` / `data-grid-col`;
the row itself never does), the head's included, and the table's one
Tab stop STARTS ON THE HEAD'S FIRST CELL — the top left, the Reorder
header — then remembers the cell you were on. The hint shown with no
steps is one row of one cell spanning the table; the ghost step stays
`aria-hidden`, so it is no row.

| Key | Action |
|-----|--------|
| ArrowDown / ArrowUp | Next / previous row, same column — the head row included. Cycles |
| ArrowLeft / ArrowRight | Next / previous cell along the row: Reorder → Step → Command → Actions. Cycles |
| Home / End | The row's first / last cell |
| Cmd/Ctrl+Home / End | The table's corners: the head's Reorder cell / the last step's Actions |
| PageUp / PageDown | A screenful of rows. Stops at the ends |
| Enter / Space | INTO the cell. Reorder: pick the step up (below). Command: open the step's editor. Actions: focus its first control (the pencil). Step number and the head cells: nothing — but Space is the table's, never play/pause |
| Carrying a step (its Reorder cell entered) | ArrowUp / ArrowDown move it, focus with it; Enter / Space / Escape let go — Escape stays the cell's (`data-owns-escape="self"` while carrying, so the window does not close); leaving the cell lets go |
| Inside the Actions cell | ArrowLeft / ArrowRight go between the pencil and the menu (cycling); ArrowUp / ArrowDown keep the control, in the row above / below; Escape comes back out to the cell — the window's Escape yields to it because the cell is marked `data-owns-escape` (`Dialog` skips an Escape from a control INSIDE such an element, and from the element ITSELF when the value is `self`; on the cell itself otherwise Escape closes the window as anywhere else); Enter / Space are the button's own |
| Cmd/Ctrl+ArrowDown / Up | Carry the step down / up from ANY cell, without picking it up (as Cmd+Arrow reorders a track). Focus goes with it, in the same cell |
| Delete / Backspace | Delete the step, from any cell of its row |
| Shift+F10 / Menu key | Open the step's menu, from any cell of its row |

Flat profile: every cell AND every control is a Tab stop and the arrows
do nothing; Enter / Space, Escape, Cmd/Ctrl+arrow, Delete and Shift+F10
still work.

**Splitter** — a focusable `role="separator"` with `aria-valuenow` /
`min` / `max` in pixels.

| Key | Action |
|-----|--------|
| ArrowLeft / ArrowRight | Narrow / widen the command list by 16px (Shift: 64px) |
| Home / End | Its narrowest / widest |
| Enter | Reset to the default — the mouse's double-click |

**Focus after an action:**

| After | Focus goes to |
|-------|---------------|
| Moving a step (key or menu) | The step, in its new place, on the control it was moved from |
| Deleting a step | The step that takes its place, else the one before, in the same cell; the head's first cell when it was the last — the table is still there |
| Closing a step's editor | The step's Command cell — the cell Enter opened it from |
| Removing all steps | The search field |
| Closing Rename | The macro menu button |
| Deleting the macro (the window closes) | The macro that takes its place in the Macro manager (`AppDialogs`) |
| Closing the window | The macro it was opened from, if focus was in the window (`AppDialogs`) |

Adding, moving and deleting steps are announced (`announce`): focus is
often in the OTHER pane from the change, where it would be silent.

### Dock panel tabs (PanelHeader.tsx)

A strip is ONE Tab stop — the active tab — placed BEFORE the content it
names. It is opt-in: the host passes `tabGroupId` (`DockPanel` does from
its side: left = `dock-tabs-start`, right = `dock-tabs-end`; the bottom
drawer passes `dock-tabs-end`). Without it every tab is `tabindex=0`,
which under the tab-groups profile puts the strip after everything else
in the app — you would reach a panel's contents before its name.

| Key | Action |
|-----|--------|
| ArrowLeft / ArrowRight | Move focus along the strip (wraps). Does not switch tab |
| Home / End | First / last tab |
| Enter | Switch to the focused tab |
| Shift+F10 / Menu key | Open the ACTIVE tab's menu (dock side, open in window, close) |

Leaving the strip hands its stop back to the active tab. The menu button
inside a tab is out of the Tab order by design (one stop per tab), so
the menu key is its only keyboard route.

Not opted in: `MixerPanel`, `PianoRollPanel` and `FloatingPanel` render
their own `PanelHeader` and keep `tabindex=0` tabs.

### Application Header / File Menu (ApplicationHeader.tsx)

Manual keyboard handling. Container has `role="menubar"`.

| Key | Action |
|-----|--------|
| ArrowLeft/Right | Navigate between menu items |

## Global ArrowUp/Down Guard

**File:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts`

The global keyboard handler moves the track focus outline on ArrowUp/Down. To prevent this from firing when the user is navigating within a tab group, it checks:

```typescript
if (target.closest('[role="toolbar"], [role="group"], [role="menubar"]')) {
  return; // Let the component handle it
}
```

This ensures that pressing ArrowUp/Down inside any toolbar, track header panel, or menubar does NOT move the track focus outline.

## Dialogs Own the Keyboard

**File:** `apps/sandbox/src/utils/focusRouting.ts` → `dialogOwnsKeyboard`,
called first thing in `useKeyboardShortcuts`' handler.

No key pressed in a dialog may reach the project: not the arrows (they
move the playhead), not Space (it plays), not Delete (it deletes the
selection), not Cmd+Z (user decision 2026-09-29 — the arrows were moving
the playhead from the Edit macro window's Close button).

A dialog owns a key when the key was pressed inside one, or when focus
is nowhere and either a modal dialog is open or a non-modal window is
the one in use. `Dialog` says so in the DOM, because the app's handler
is a native listener that sees only the event:

| Attribute on the dialog | Means |
|-------------------------|-------|
| `data-owns-keyboard` | This is a `Dialog` — keys pressed in it are its own |
| `aria-modal="true"` | The app behind is out of reach, wherever focus is |
| `data-window-in-use="true"` | Non-modal: the pointer's last press was inside it |

Consequences inside a dialog:
- **Space presses the focused button**, as in any dialog. Outside one it
  is still play/pause from every control that is not a text field.
- The lists in the Edit macro window still stop their own keys
  (`stopPropagation`) — belt and braces, and they predate this.

**Not every `role="dialog"` owns the keyboard.** `FloatingPanel` (a
panel in a window of its own — the mixer) and `EffectDialog` carry the
role without the marker, so the transport keys still work from them.
Give a window `data-owns-keyboard` only if nothing in it should ever
drive the project.

## Adding a New Tab Group

1. **Add config** to both profiles in `packages/core/src/accessibility/profiles.ts`:
   ```typescript
   // AU4 profile
   'my-new-group': { tabindex: 'roving', arrows: true, wrap: true },
   // WCAG flat profile
   'my-new-group': { tabindex: 'sequential', arrows: false, wrap: false },
   ```

2. **Add tab order** (AU4 profile only):
   ```typescript
   tabOrder: { ..., 'my-new-group': 7 }
   ```

3. **Choose hook:**
   - Known items at render time → `useTabGroup` (per-item)
   - Dynamic children discovered via DOM → `useContainerTabGroup` (container-level)

4. **Ensure ARIA role:** The container should have `role="toolbar"` (or `role="group"` for composite widgets) so the global ArrowUp/Down guard recognizes it.

## Related Documentation

- [keyboard-handlers-map.md](./keyboard-handlers-map.md) — Complete keyboard handler location reference
- [export-modal-accessibility.md](./export-modal-accessibility.md) — Export modal tab group details
- [design-system-architecture.md](./design-system-architecture.md) — Overall design system architecture
