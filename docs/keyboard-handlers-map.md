# Keyboard Handlers Map

This document maps ALL keyboard event handlers in the codebase to prevent wasting time looking in the wrong places.

## Quick Reference

**Before modifying keyboard shortcuts:**
1. Search for the shortcut key in this file
2. Go directly to the file listed
3. Do NOT assume handlers are in component packages - check sandbox/demo apps first

## Handler Locations

### Clip Keyboard Shortcuts
**Location:** `packages/components/src/Track/TrackNew.tsx` (clip `onKeyDown`)

**Handlers:**
- **Enter** - Toggle clip selection
- **Shift+F10** or **ContextMenu key** - Open clip context menu (standard keyboard shortcuts)
- **Cmd+Left/Right** - Move clip horizontally by 0.1s
- **Cmd+Up/Down** - Move clip to adjacent track
- **Shift+Left/Right** - Extend clip edges (move left edge left / right edge right)
- **Cmd+Shift+Left/Right** - Reduce clip edges (move right edge left / left edge right)
- **ArrowUp/Down** (no modifiers) - Navigate to first clip on adjacent track (`onClipNavigateVertical`)
- **ArrowLeft/Right** (no modifiers) - Handled by `useContainerTabGroup` on the track container (cycles through clips)

**Callbacks required:**
- `onClipClick` - Selecting/deselecting clips
- `onClipMenuClick` - Opening context menu
- `onClipMove` - Moving clips horizontally
- `onClipMoveToTrack` - Moving clips between tracks
- `onClipTrim` - Trimming/extending clip edges
- `onClipNavigateVertical` - Moving focus between tracks

**Note:** ArrowLeft/Right without modifiers bubble up to the track container where `useContainerTabGroup` handles clip-to-clip cycling. All other handlers call `e.preventDefault()` first, which the container hook checks via `e.defaultPrevented`.

---

### Label Keyboard Shortcuts
**Location:** `apps/sandbox/src/components/Canvas.tsx` (lines ~686-800)

⚠️ **IMPORTANT:** Label keyboard handlers are in the SANDBOX APP, not in the components package!

**Handlers:**
- **Cmd+Left/Right** - Move label horizontally by 0.1s
- **Delete/Backspace** - Delete label
- **Shift+Left** - Move left edge left (EXTEND) for region labels
- **Shift+Right** - Move right edge right (EXTEND) for region labels
- **Cmd+Shift+Left** - Move right edge left (REDUCE) for region labels
- **Cmd+Shift+Right** - Move left edge right (REDUCE) for region labels
- **Arrow keys only** - Navigate between labels

**Dispatch actions:**
- `UPDATE_LABEL` - For moving/trimming labels
- `DELETE_LABEL` - For deleting labels

---

### Track Control Panel Shortcuts
**Location:** `packages/components/src/TrackControlPanel/TrackControlPanel.tsx`

**Handlers (when panel itself is focused):**
- **Enter** - Toggle track selection
- **Shift+F10** or **ContextMenu key** - Open track menu
- **ArrowUp/Down** - Navigate to adjacent track header (`onNavigateVertical`)
- **Shift+ArrowUp/Down** - Extend track range selection (`onNavigateVerticalWithShift`)
- **ArrowRight** - Enter children (focus first button)
- **ArrowLeft** - Enter children (focus last button)

**Handlers (when a child button is focused):**
- **ArrowRight/ArrowDown** - Move to next child; after last child → back to panel
- **ArrowLeft/ArrowUp** - Move to previous child; before first child → back to panel
- **Escape** - Return focus to panel itself
- **Tab** (non-Shift) - Navigate out to clips (`onTabOut`)

---

### Global Keyboard Shortcuts
**Location:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts`

**Handlers:**
- **ArrowUp/Down** - Move track focus outline (only when focus is NOT inside a tab group)
- **Shift+ArrowUp/Down** - Extend track range selection (only when focus is NOT inside a tab group)
- **ArrowLeft/Right** - Move playhead / manipulate time selection
- **Delete/Backspace** - Delete focused clip (reads `data-clip-id` from `document.activeElement`)

**Tab group guard:** The global ArrowUp/Down handler checks `target.closest('[role="toolbar"], [role="group"], [role="menubar"]')` and exits early if focus is inside any tab group. This prevents the track focus outline from moving when the user is navigating within a toolbar, menubar, or track header panel.

---

### Application Header / File Menu
**Location:** `packages/components/src/ApplicationHeader/ApplicationHeader.tsx`

**Handlers:**
- **ArrowLeft/Right** - Navigate between menu items (File, Edit, etc.)
- Container uses `role="menubar"`, guarded by global handler

---

### Toolbar Navigation (All Toolbars)
**Location:** `packages/components/src/hooks/useContainerTabGroup.ts` (shared hook)

**Components using this hook:**
- `Toolbar.tsx` (transport/tool toolbars)
- `SelectionToolbar.tsx` (bottom selection toolbar)
- `TrackNew.tsx` (clip-to-clip cycling within a track)

**Handlers:**
- **ArrowLeft/ArrowUp** - Previous item
- **ArrowRight/ArrowDown** - Next item
- **Home** - First item
- **End** - Last item
- **Blur** (focus leaves container) - Reset first element to `startTabIndex`, rest to `-1`

---

## Debugging Protocol

If keyboard shortcuts aren't working as expected:

1. **Search first, fix second:**
   ```bash
   # Search for all keyboard handlers
   grep -r "onKeyDown\|handleKeyDown" apps/sandbox/src packages/components/src

   # Search for specific key patterns
   grep -r "ArrowLeft\|ArrowRight\|Shift.*Arrow" apps/sandbox/src packages/components/src
   ```

2. **Check this file** to see where handlers are actually defined

3. **Verify you're editing the right file** before making changes

4. **Remember:** Apps (sandbox/demo) can override or extend component behavior

5. **Check event propagation:** Many handlers use `e.preventDefault()` to signal to parent containers that the event was already handled. The `useContainerTabGroup` hook checks `e.defaultPrevented` before acting.

## Edge Mapping Reference

For trim/extend operations (applies to both clips and labels):

### EXTEND mode (Shift only):
- **Shift+Left** = Move LEFT edge LEFT (expand leftward)
- **Shift+Right** = Move RIGHT edge RIGHT (expand rightward)

### REDUCE mode (Cmd+Shift):
- **Cmd+Shift+Left** = Move RIGHT edge LEFT (trim from right)
- **Cmd+Shift+Right** = Move LEFT edge RIGHT (trim from left)

## Notes

- Label handlers are in Canvas.tsx because labels are managed by the app's reducer, not a reusable component
- Clip handlers are in TrackNew.tsx because clips use a controlled component pattern
- The LabelMarker component itself does NOT handle trim shortcuts - that's in Canvas.tsx
- The global ArrowUp/Down handler is deliberately suppressed inside all ARIA role containers to avoid interfering with component-level navigation
