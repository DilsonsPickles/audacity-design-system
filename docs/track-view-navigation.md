# Track View Navigation
#Audacity

## Overview
Allows User to access all clip-based functions using their keyboard only.

The application supports two switchable accessibility navigation profiles, selectable from the **Debug Panel > Accessibility** dropdown. The active profile is persisted to `localStorage` under the key `audacity-accessibility-profile`.

---

## Navigation Profiles

### Audacity 4 — Tab Groups (`au4-tab-groups`)

The default profile. Follows the WAI-ARIA composite widget pattern (roving tabindex).

| Aspect | Behaviour |
|--------|-----------|
| Focus management | **Roving** — one element per group is in the tab order (`tabIndex={0}`), the rest are `tabIndex={-1}` |
| Tab key | Moves focus **between groups** (hierarchical) |
| Arrow keys | Navigate **within** a group; wrapping enabled |
| Clip/label shortcuts | All enabled (move, trim-extend, trim-reduce, delete) |

**Tab order** (defined in `tabOrder` on the profile — single source of truth):

| Group ID | tabIndex |
|----------|----------|
| `file-menu` | 1 |
| `project-toolbar` | 2 |
| `project-toolbar-actions` | 3 |
| `project-toolbar-workspace` | 4 |
| `tool-toolbar` | 5 |
| `effects-panel` | 6 |
| `add-track` | 99 |
| `tracks` | 100 (base) |
| `selection-toolbar` | 200 |

Within the canvas area, track control panels receive `trackBase + index * 2` (e.g. 100, 102, 104) and clips receive `trackBase + 1 + index * 2` (e.g. 101, 103, 105), where `trackBase` comes from `useTabOrder('tracks')`.

### WCAG 2.1 — Flat Navigation (`wcag-flat`)

A simpler, standards-baseline profile where every interactive element is its own tab stop.

| Aspect | Behaviour |
|--------|-----------|
| Focus management | **Sequential** — every element has `tabIndex={0}` |
| Tab key | Moves through **all elements** in DOM order |
| Arrow keys | **Disabled** within groups |
| Clip/label shortcuts | All disabled (move, trim, delete) — Tab-only exploration |

`tabOrder` is empty `{}` — all elements use `tabIndex={0}` and navigation follows natural DOM order.

### Profile comparison at a glance

| Feature | AU4 Tab Groups | WCAG Flat |
|---------|---------------|-----------|
| Tab stops per toolbar | 1 (roving) | Every button |
| Arrow navigation | Yes (with wrap) | No |
| Clip move (`Cmd+Arrow`) | Yes | No |
| Clip trim (`Shift+Arrow`, `Cmd+Shift+Arrow`) | Yes | No |
| Label delete (`Delete`) | Yes | No |
| Track panel tabIndex | Roving (100, 102, ...) | 0 (all) |

---

## Tab Groups

Both profiles define the same set of tab groups. Each group's behaviour (roving vs sequential, arrows on/off, wrap on/off) is determined by the active profile.

### Application-level groups

| Group ID | Location | Items |
|----------|----------|-------|
| `transport-toolbar` | Tools toolbar | Play, Stop, Record, Step back/fwd, Loop |
| `tool-toolbar` | Tools toolbar | Automation, Zoom controls, Cut/Copy/Paste, Trim, Silence, Timecode |
| `project-toolbar` | Project toolbar | Home, Project, Export, Audio Setup, Share, Get Effects, Workspace, Undo/Redo |
| `selection-toolbar` | Bottom bar | Timecode inputs |
| `effects-panel` | Left sidebar | Track and master effects (arrows disabled, Enter to open) |

### Settings / Preferences groups

| Group ID | Location |
|----------|----------|
| `preferences-sidebar` | Preferences sidebar nav |
| `preferences-content` | Preferences content area |
| `inputs-outputs` | Audio Settings — Inputs & Outputs |
| `buffer-latency` | Audio Settings — Buffer & Latency |
| `sample-rate` | Audio Settings — Sample Rate |
| `playback-performance` | Playback/Recording — Performance |
| `cursor-movement` | Playback/Recording — Cursor Movement |
| `recording-behavior` | Playback/Recording — Recording Behaviour |
| `solo-behavior-tab` | Playback/Recording — Solo Behaviour |
| `spectral-colours` | Spectral Display — Colours |
| `spectral-algorithm` | Spectral Display — Algorithm |

### Export Modal groups

| Group ID | Location |
|----------|----------|
| `export-type` | Export type selector |
| `file` | Filename, folder, format |
| `audio-options` | Channels, sample rate, encoding |
| `rendering` | Rendering options |
| `footer` | Edit metadata, Cancel, Export |
| `dialog-footer` | Generic dialog footer buttons |

---

## Implementation Architecture

### Source files

| File | Purpose |
|------|---------|
| `packages/core/src/accessibility/types.ts` | Type definitions (`AccessibilityProfile`, `TabGroupConfig`, `KeyboardShortcutsConfig`, etc.) |
| `packages/core/src/accessibility/profiles.ts` | Profile definitions (`AU4_TAB_GROUPS_PROFILE`, `WCAG_FLAT_PROFILE`) and `getProfileById()` |
| `packages/components/src/contexts/AccessibilityProfileContext.tsx` | React context provider and `useAccessibilityProfile()` hook |
| `packages/components/src/hooks/useTabGroup.ts` | `useTabGroup()` hook — manages tabIndex, arrow keys, focus tracking per group |
| `apps/sandbox/src/components/DebugPanel.tsx` | Profile switcher dropdown in the Debug Panel |
| `apps/sandbox/src/App.tsx` | Reads `activeProfile`, derives `isFlatNavigation`, passes to `EditorLayout` and `useKeyboardShortcuts` |
| `apps/sandbox/src/components/EditorLayout.tsx` | Consumes `isFlatNavigation` to set track panel tabIndex values |

### Data flow

```
DebugPanel (Accessibility dropdown)
  |  onAccessibilityProfileChange(profileId)
  v
AccessibilityProfileContext.setProfile()
  |  saves to localStorage, updates state
  v
useAccessibilityProfile() → activeProfile
  |
  ├─> App.tsx
  |     isFlatNavigation = activeProfile.config.tabNavigation === 'sequential'
  |     → passed to EditorLayout (track panel tabIndex)
  |     → passed to useKeyboardShortcuts (enable/disable shortcuts)
  |
  └─> useTabGroup(groupId, itemIndex, ...)
        → reads activeProfile.config.tabGroups[groupId]
        → returns { tabIndex, onKeyDown, onFocus, onBlur }
```

### Key type definitions

```typescript
type TabIndexStrategy = 'roving' | 'sequential';
type FocusManagementStrategy = 'roving' | 'sequential';
type TabNavigationPattern = 'hierarchical' | 'sequential';

interface TabGroupConfig {
  tabindex: TabIndexStrategy;
  arrows: boolean;
  wrap: boolean;
}

interface AccessibilityProfile {
  id: string;
  name: string;
  description: string;
  config: {
    focusManagement: FocusManagementStrategy;
    tabNavigation: TabNavigationPattern;
    tabGroups: { [groupId: string]: TabGroupConfig };
    tabOrder: Record<string, number>;
    keyboardShortcuts?: KeyboardShortcutsConfig;
  };
}
```

---

## Main Tab Flow

### Project toolbar
- Group 1
  - Home
  - Project
  - Export
- Group 2
  - Audio setup
  - Share audio
  - Get effects
- Group 3
  - Workspace dropdown
  - Undo Redo

### Tools toolbar
- Group 1
  - Play
  - Stop
  - Record
  - Step backwards
  - Step forwards
  - Loop
  - Automation
  - Zoom in
  - Zoom out
  - Fit zoom to selection
  - Fit project
  - Zoom toggle
  - Cut
  - Copy
  - Paste
  - Trim
  - Silence
  - Timecode

### Add new track
- Group 1
  - Add new track

### Canvas area
- Group 1
  - Track 1 header
    - Icon
    - Track name
    - Context menu
    - Pan knob
    - Slider
    - Mute
    - Solo
    - Effects button
  - Track 1 Clip 1
  - Track 1 Clip 2
  - Track 1 Clip 3
- Group 2
  - Track 2 header
    - Etc
  - Track 2 Clip 1
  - Etc
- Etc

---

## Track Area Interactions

### Global shortcuts
These shortcuts work regardless of which navigation profile is active and whether or not we're using accessibility tabbing:
- Press **arrow up/down** to move track focus outline up/down to the next track
- Press **shift + arrow up/down** to extend/reduce multi-track selection up/down
- Press **left/right arrow** scroll viewport left/right

### Track panel header in focus
With tab focus on *entire* track header the User can:
- Press **enter** to toggle track selection
- Press **down arrow** to move focus down to next track header (if available)
- Press **right arrow** to move tab focus to first child item of track header
- Press **left arrow** to move tab focus back to last child item of track header
- Press **shift + f10** to open track header context menu and move tab focus to first item in context menu list
- User can use **shift + up/down arrows** to expand and contract their track selection up and down the track list (works both with and without tab focus on track header)

### Clip
With tab focus on clip the User can:
- Press **shift + tab** to return tab focus back to parent track header
- Press **tab** to progress tab focus on to next track header (if available) or, down to bottom bar selection timecode
- Press **enter** to toggle clip selection
- Press **left/right arrow** to cycle tab focus through available clips
- Press **shift + f10** to open clip context menu and move tab focus to first item in context menu list
- Press **F2** to rename clip

The following shortcuts are only active in the **AU4 Tab Groups** profile (disabled in Flat Navigation):
- Press **Cmd + left arrow** to move clip back by one increment
- Press **Cmd + right arrow** to move clip forward by one increment
- Press **Cmd + shift + left arrow** to trim right side of clip over to the left (reduce)
- Press **Cmd + shift + right arrow** to trim left side of clip over to the right (reduce)
- Press **Shift + left arrow** to trim left side of clip to the left (expand)
- Press **Shift + right arrow** to trim right side of clip to the right (expand)
- Press **Delete** to delete the clip (and any other selected clips)

### Label
With tab focus on label the User can:
- Press **shift + tab** to return tab focus back to parent track header
- Press **tab** to progress tab focus on to next track header (if available) or, down to bottom bar selection timecode
- Press **enter** to toggle label selection
- Press **left/right arrow** to cycle tab focus through available labels
- Press **shift + f10** to open label right click menu and move tab focus to first item in right click menu list
- Press **F2** to rename label

The following shortcuts are only active in the **AU4 Tab Groups** profile (disabled in Flat Navigation):
- Press **Cmd + left arrow** to move label back by one increment
- Press **Cmd + right arrow** to move label forward by one increment
- Press **Cmd + shift + left arrow** to trim right side of label over to the left (reduce)
- Press **Cmd + shift + right arrow** to trim left side of label over to the right (reduce)
- Press **Shift + left arrow** to trim left side of label to the left (expand)
- Press **Shift + right arrow** to trim right side of label to the right (expand)
- Press **Delete** to delete the label (and any other selected labels)

### Playhead cursor
At any time the User can:
- Press **,** to move playhead cursor right one increment
- Press **.** to move playhead cursor left one increment
- Press **shift + ,** to move playhead right one increment *and* expand selection
- Press **shift + .** to move playhead left one increment *and* expand selection
- Press **Cmd + shift + .** to move left selection bound right to reduce selection
- Press **Cmd + shift + ,** to move right selection bound left to reduce selection

If the User has an active time selection they can:
- Using tab focus they can tab to any track header and press enter to expand the time selection to that track (non-linear is possible)
- Without tab focus they can move the track focus up and down and press enter to expand the time selection to that track

---

## TBD / Open Questions

- **Envelope point tabbing**: How does Tab navigate to envelope points? When envelope mode is active, points could be included in the tab hierarchy. A shortcut to jump focus from clip to its envelope points is needed. (See `docs/clip-envelope-specification.md`)
- **Spectral selection keyboard control**: Currently no keyboard mechanism for spectral selection. (See `docs/spectral-selection.md`)
- **Label movement shortcuts**: `Cmd+Left/Right` for label movement is temporarily disabled. (See `docs/label-interactions.md`)

---

## Actual Tab Flow Audit

> Auto-generated by tab-audit skill on 2026-02-25
>
> **Profile:** AU4 Tab Groups (default)
> **Test state:** 4 audio tracks with 1 clip each (via Debug > Generate Tracks)

| # | Tag | Role | aria-label | tabIndex | Text |
|---|-----|------|------------|----------|------|
| 1 | `DIV` | group | Time code | 0 | 00h00m00s |
| 2 | `BUTTON` |  |  | 1 | File |
| 3 | `BUTTON` |  |  | 2 | Home |
| 4 | `BUTTON` |  |  | 3 | Audio setup |
| 5 | `SELECT` |  |  | 4 | ClassicSpectral editing |
| 6 | `BUTTON` |  |  | 5 |  |
| 7 | `BUTTON` |  |  | 99 | Add new |
| 8 | `DIV` | group | Track 1 track controls | 100 | Track 1MSEffects |
| 9 | `DIV` | button | Clip 1 clip | 101 | Clip 1 |
| 10 | `DIV` | group | Track 2 track controls | 102 | Track 2MSEffects |
| 11 | `DIV` | button | Clip 2 clip | 103 | Clip 2 |
| 12 | `DIV` | group | Track 3 track controls | 104 | Track 3MSEffects |
| 13 | `DIV` | button | Clip 3 clip | 105 | Clip 3 |
| 14 | `DIV` | group | Track 4 track controls | 106 | Track 4MSEffects |
| 15 | `DIV` | button | Clip 4 clip | 107 | Clip 4 |
| 16 | `DIV` | group | Time code | 0 | 00h00m00s |

**Total tab stops:** 16 (returns to BODY after stop 16)
**Completed full cycle:** Yes

### Issues Found

- Stop #5: SELECT (Workspace dropdown) has no aria-label
- Stop #6: BUTTON with tabIndex=5 has no aria-label and no text content — unidentified

### Observations

- **Tab order starts at Selection toolbar timecode** (tabIndex=0), not at the top of the page
- Stops #2–4 represent the **menu bar, project toolbar, and second toolbar row** as single roving entry points (tabIndex 1, 2, 3)
- The Workspace dropdown (tabIndex=4) and an unknown button (tabIndex=5) follow
- "Add new" track button has tabIndex=99, placing it just before the track area
- **Track headers** receive roving tabIndex values (100, 102, 104, 106) and **clips** get interleaved odd values (101, 103, 105, 107) — Tab alternates header → clip per track
- Selection toolbar timecode appears as both first and last stop (tabIndex=0), confirming the cycle wraps
- **16 tab stops total** — correct for AU4 Tab Groups profile where Tab moves between groups, not individual buttons
- `data-tab-group` and `data-item-index` attributes are **not set** on any element
