# Keyboard Handlers Map

This document maps ALL keyboard event handlers in the codebase to prevent wasting time looking in the wrong places.

## Quick Reference

**Before modifying keyboard shortcuts:**
1. Search for the shortcut key in this file
2. Go directly to the file listed
3. Do NOT assume handlers are in component packages - check sandbox/demo apps first

## Handler Locations

### Clip Keyboard Shortcuts
**Location:** `packages/components/src/Track/TrackNew.tsx` (lines ~264-340)

**Handlers:**
- **Enter** - Toggle clip selection
- **Shift+F10** or **ContextMenu key** - Open clip context menu (standard keyboard shortcuts)
- **Cmd+Left/Right** - Move clip horizontally by 0.1s
- **Cmd+Up/Down** - Move clip to adjacent track
- **Shift+Left/Right** - Extend clip edges (move left edge left / right edge right)
- **Cmd+Shift+Left/Right** - Reduce clip edges (move right edge left / left edge right)
- **Arrow keys only** - Navigate between clips

**Callbacks required:**
- `onClipClick` - Selecting/deselecting clips
- `onClipMenuClick` - Opening context menu
- `onClipMove` - Moving clips horizontally
- `onClipMoveToTrack` - Moving clips between tracks
- `onClipTrim` - Trimming/extending clip edges

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

**Handlers:**
- Currently no keyboard shortcuts (only mouse interactions)

---

## Debugging Protocol

If keyboard shortcuts aren't working as expected:

1. **Search first, fix second:**
   ```bash
   # Search for all keyboard handlers
   grep -r "onKeyDown\|handleKeyDown" apps/sandbox/src apps/demo/clip-envelope/app packages/components/src

   # Search for specific key patterns
   grep -r "ArrowLeft\|ArrowRight\|Shift.*Arrow" apps/sandbox/src apps/demo/clip-envelope/app
   ```

2. **Check this file** to see where handlers are actually defined

3. **Verify you're editing the right file** before making changes

4. **Remember:** Apps (sandbox/demo) can override or extend component behavior

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
