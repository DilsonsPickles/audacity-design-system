# Clip Interaction Behaviors

## Click Interactions

### Clip Header
**Location**: The top 20px bar of a clip containing the clip name and menu button

**Behaviors**:
- **Regular Click**: Selects the clip exclusively (deselects all other clips) and selects the parent track. Creates a time selection spanning the clip's duration.
- **Shift+Click**: Toggles the clip's selection state (multi-select). Creates a time selection spanning all selected clips from earliest start to latest end. Selects the parent track.
- **Click on Menu Button**: Opens the clip context menu (does not select the clip)

### Clip Body
**Location**: The main waveform/envelope area below the header

**Behaviors**:
- **Click**: No selection behavior - used for envelope editing when envelope mode is active
- **Envelope Mode ON**: Clicking near the envelope line adds/removes/drags envelope points
- **Envelope Mode OFF**: Click has no effect on selection

## Keyboard Interactions

### Enter Key (on focused clip)
- **Enter**: Same as regular click on clip header - selects clip exclusively
- **Shift+Enter**: Same as shift+click on clip header - toggles clip selection

## Selection States

### Single Clip Selected
- Clip shows selected border
- Parent track is selected
- Time selection shows in timeline ruler spanning the clip's duration

### Multiple Clips Selected (Shift+Click)
- All selected clips show selected border
- Parent track of most recently clicked clip is selected
- Time selection shows in timeline ruler spanning from earliest clip start to latest clip end

### No Clips Selected
- No selected borders
- No time selection in timeline ruler

## Time Selection Calculation

**Single Clip**:
```
startTime = clip.start
endTime = clip.start + clip.duration
```

**Multiple Clips**:
```
startTime = Math.min(...selectedClips.map(c => c.start))
endTime = Math.max(...selectedClips.map(c => c.start + c.duration))
```

## Implementation Details

- Clip selection is handled by `onClipClick` callback in `TrackNew` component
- Callback signature: `onClipClick(clipId, shiftKey)`
- Canvas.tsx dispatches:
  - `SELECT_CLIP` action when `shiftKey === false` (exclusive selection)
  - `TOGGLE_CLIP_SELECTION` action when `shiftKey === true` (multi-select)
- Both actions also dispatch `SELECT_TRACK` to select the parent track
- TracksContext reducers calculate and set the `timeSelection` state
- Timeline ruler displays the time selection as a highlighted region
