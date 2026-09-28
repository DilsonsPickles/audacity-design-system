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

Each row is a `role="group"` named after its macro,
holding three real buttons — the name (which opens the macro), Run, and
the menu. The row is never itself a button: a button that contains
buttons is invalid, and hides Run and the menu from a screen reader.

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

Seven Tab stops, however many commands and steps there are (it was 322
with 280 commands and 12 steps — every command and every step control
was its own stop):

| # | Stop | Inside it |
|---|------|-----------|
| 1 | Search field | Down drops into the command list; Enter adds the first match |
| 2 | Command list | A listbox — arrows, below |
| 3 | Add bar | Clear / Add (`useContainerTabGroup`). A stop only once something is selected |
| 4 | Splitter | Arrows resize, below |
| 5 | Macro menu button | Enter opens the menu |
| 6 | Step list | Arrows, below |
| 7 | Footer | Run / Run on files… / Done (`useContainerTabGroup`) |

The window floats outside the app's numbered Tab order: its stops are
`tabindex=0`, as every dialog's are. It is NON-MODAL, which has two
consequences. Tab is not trapped — past the footer it leaves the window
for the app. And the app's document-level shortcuts are still listening,
so every key a list uses is stopped from reaching them; before this the
arrows and Home/End moved the project's playhead, Down on a step threw
focus out to a track, and Delete on a step opened "Delete track?".

**Command list** — `role="listbox"`, multi-select. One column.

| Key | Action |
|-----|--------|
| ArrowDown / ArrowUp | Next / previous command; selection follows focus. Cycles |
| Shift+ArrowDown / Up | Grow the selection from where it began. Stops at the ends — a range has two |
| Home / End | First / last command |
| PageUp / PageDown | A screenful. Stops at the ends |
| Enter | Add what is selected (or the focused command). Focus stays put; the add is announced |
| ArrowLeft / ArrowRight | Nothing — but kept from the playhead |

It stays ONE stop driven by the arrows under the flat profile too: a
listbox is a single control, and 280 Tab stops serve nobody.

**Step list** — the same two moves as the Macro manager's list.

| Key | Action |
|-----|--------|
| ArrowDown / ArrowUp | Next / previous step, same control. Cycles |
| ArrowLeft / ArrowRight | Along the row: the step → its edit button → its menu. Cycles |
| Home / End, PageUp / PageDown | By steps, same control. Stop at the ends |
| Enter | On the step: open its editor. On a button: that button |
| Cmd/Ctrl+ArrowDown / Up | Carry the step down / up (as Cmd+Arrow reorders a track). Focus goes with it |
| Delete / Backspace | Delete the step, from any control of its row |
| Shift+F10 / Menu key | Open the step's menu, from any control of its row |

Flat profile: every control of every step is a Tab stop and the arrows
do nothing; Enter, Cmd/Ctrl+arrow, Delete and Shift+F10 still work.

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
| Deleting a step | The step that takes its place, else the one before, else the search field |
| Closing a step's editor | The step |
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
