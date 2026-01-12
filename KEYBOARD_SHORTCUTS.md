# Keyboard Shortcuts

## Clip Trimming/Expanding

### Expand (Shift + Arrow)
- **Shift + Arrow Left**: Move left edge left (expand clip on left side)
- **Shift + Arrow Right**: Move right edge right (expand clip on right side)

### Trim (Cmd/Ctrl + Shift + Arrow)
- **Cmd + Shift + Left**: Move right edge left (trim clip from right side)
- **Cmd + Shift + Right**: Move left edge right (trim clip from left side)

## Clip Movement

### Horizontal Movement (Cmd/Ctrl + Arrow)
- **Cmd + Arrow Left**: Move clip left by 0.1 seconds
- **Cmd + Arrow Right**: Move clip right by 0.1 seconds

### Vertical Movement (Cmd/Ctrl + Arrow)
- **Cmd + Arrow Up**: Move clip to track above
- **Cmd + Arrow Down**: Move clip to track below

## Clip Navigation

### Arrow Keys (no modifiers)
- **Arrow Left/Up**: Previous clip on same track (cycles)
- **Arrow Right/Down**: Next clip on same track (cycles)

## Track Navigation

### Arrow Keys (when focused on track control panel)
- **Arrow Up**: Focus previous track
- **Arrow Down**: Focus next track

### Selection
- **Enter**: Toggle track selection (for multi-track selection)

## Tab Navigation

### Track Control Panel
- **Tab**: Navigate to first clip in track
- **Escape**: Return focus to track control panel header
- **Arrow Left/Right**: Navigate between controls in panel (Mute, Solo, Volume, Pan, etc.)

## Label Shortcuts

### Label Selection
- **Click**: Select label and create time selection matching label's time range
  - Point labels: Creates zero-width time selection at that point
  - Region labels: Creates time selection from label start to end
- **Shift + Click**: Toggle label selection (allows multi-selection across tracks)
  - Time selection expands to cover all selected labels (min start to max end)

### Region Label Track Expansion
When a region label is already selected:
- **Click again** (without Shift): Selects all tracks and expands time selection across entire project

### Label Deletion
- **Delete/Backspace**: Deletes all selected labels
  - **Bonus**: If ALL tracks are selected AND time selection exists:
    - Also performs time deletion (cut operation) across all selected tracks
    - Uses current cut mode (split or ripple)

### Label Movement
**Note**: Keyboard shortcuts for moving labels (Cmd+Arrow) are temporarily disabled due to architecture constraints. Will be restored in future update.

## Deletion Priority

The Delete/Backspace key follows this priority order:

1. **Label Deletion** (if labels selected)
2. **Clip Deletion** (if clips selected)
3. **Time Deletion** (if time selection exists)
4. **Track Deletion** (if track has keyboard focus)

## Notes

- All clip trim/expand shortcuts work identically whether focused on:
  - The clip itself
  - The track control panel (applies to selected clips in that track)
- Trim amount: 0.1 seconds per keypress
- Move amount: 0.1 seconds per keypress
