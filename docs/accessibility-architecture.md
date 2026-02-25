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
  'effects-panel':             6,
  'add-track':                99,
  'tracks':                  100,  // base — stride of 3 per track
  'selection-toolbar':        200,
}
```

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
