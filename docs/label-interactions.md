# Label Interactions

This document describes the interaction model for label markers in the Audacity Design System.

## Label Types

- **Point Labels**: Markers at a single point in time
- **Region Labels**: Markers with a start and end time, defining a time range

## Selection Behavior

### Single Click
- First click on a label: Selects the label and creates a time selection matching the label's time range
- For point labels: Creates a zero-width time selection at that point
- For region labels: Creates a time selection from label start to end

### Multi-Selection
- **Shift+Click**: Toggles label selection (allows selecting multiple labels across tracks)
- Time selection expands to cover all selected labels (min start time to max end time)

### Track Expansion (Region Labels Only)
When a region label is already selected, clicking it again (without Shift) will:
1. Keep the label selected
2. Select all tracks
3. Expand the time selection across all tracks

This allows quick selection of a time range across the entire project.

## Deletion Behavior

The Delete/Backspace key has priority-based behavior:

### Priority 1: Label Deletion
If one or more labels are selected:
- Deletes all selected labels
- **Bonus**: If ALL tracks are selected AND a time selection exists:
  - Also performs a time deletion (cut operation) across all selected tracks
  - Removes audio content within the time range
  - Uses current cut mode (split or ripple)
  - Shows combined success message

### Priority 2: Clip Deletion
If no labels selected but clips are selected:
- Deletes all selected clips

### Priority 3: Time Deletion
If no labels/clips selected but time selection exists:
- Performs cut operation on selected tracks
- If no tracks selected, applies to all tracks

### Priority 4: Track Deletion
If nothing else is selected but a track has keyboard focus:
- Deletes the focused track

## Cut Operations Edge Cases

### Clip Alignment with Time Selection
When a clip's start time exactly aligns with the deletion start time (`clip.start === timeSelection.start`):
- The clip IS included in the deletion (uses `<=` comparison, not `<`)
- In split mode: Clip is trimmed from the beginning
- In ripple mode: Clip is trimmed and shifted left

This ensures consistent behavior regardless of floating-point precision or exact time alignment.

## Label Movement (Keyboard)

**Note**: Keyboard shortcuts for moving labels (Cmd+Arrow) are temporarily disabled due to React hooks architecture constraints. This functionality will be restored in a future update by extracting labels to a separate component.

## Related Files

- `apps/sandbox/src/App.tsx` - Delete key handler with priority logic
- `apps/sandbox/src/components/Canvas.tsx` - Label rendering and click handlers
- `packages/components/src/LabelMarker/LabelMarker.tsx` - Label marker component
- `apps/sandbox/src/utils/cutOperations.ts` - Cut/deletion logic for time ranges
- `apps/sandbox/src/contexts/TracksContext.tsx` - State management for labels and selections
