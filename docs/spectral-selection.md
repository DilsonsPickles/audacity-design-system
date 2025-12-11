# Spectral Selection (Spectral Marquee)

This document describes the complete behavior and implementation details of the spectral selection system in the Audacity Design System.

## Overview

Spectral selection (also known as "spectral marquee") allows users to select a specific frequency range within a time region of an audio clip when in spectrogram or split view mode. This creates a 2D selection with both time (horizontal) and frequency (vertical) dimensions, appearing as a rectangular marquee overlaid on the spectrogram.

## Core Concepts

### Selection Dimensions

A spectral selection has four boundaries:
- **Time**: `startTime` to `endTime` (in seconds)
- **Frequency**: `minFrequency` to `maxFrequency` (normalized 0-1)

```typescript
interface SpectralSelection {
  trackIndex: number;      // Which track contains the selection
  clipId: number;          // Which clip contains the selection
  startTime: number;       // Left edge (seconds)
  endTime: number;         // Right edge (seconds)
  minFrequency: number;    // Bottom edge (0-1, normalized)
  maxFrequency: number;    // Top edge (0-1, normalized)
}
```

### Frequency Normalization

Frequencies are normalized to 0-1 range:
- **0**: Lowest frequency (bottom of spectrogram)
- **1**: Highest frequency (top of spectrogram)
- **Inverted Y-axis**: Higher frequencies appear at the top visually

The actual frequency values depend on the sample rate and FFT size, but the selection works in normalized space.

### View Mode Requirements

Spectral selection is only available when tracks are in specific view modes:
- **Spectrogram mode**: Full spectrogram view, spectral selection spans full width
- **Split view**: Top half shows spectrogram, bottom half shows waveform
  - Spectral selection only allowed in **top half** (spectrogram area)
  - Dragging into bottom half (waveform area) converts to time selection

Spectral selection is **disabled** in waveform-only mode.

## Interaction Model

### Creating a Selection

**Click and Drag on Spectrogram:**
1. Click within a clip's spectrogram area
2. Drag to create a rectangular marquee
3. Selection is constrained to the clip boundaries
4. Time selection (if present) is cleared when spectral selection starts

**Visual Feedback:**
- Dashed border rectangle (3px dash, 2px gap)
- Semi-transparent fill (`rgba(255, 255, 255, 0.15)`)
- Corner handles for resizing (6x6 pixel squares)
- Center line for moving (horizontal line through middle)

### Stereo Channel Constraints

For **stereo clips in spectrogram mode**, the selection is constrained to the channel where the drag started:
- **L Channel (top half)**: Frequencies 0.5-1.0
- **R Channel (bottom half)**: Frequencies 0.0-0.5

The selection **cannot cross the channel boundary** during creation or resizing.

**Detection Logic:**
- If drag starts with frequency ≥ 0.5 → constrain to L channel
- If drag starts with frequency < 0.5 → constrain to R channel
- Both `freq1` and `freq2` are clamped to the appropriate channel range

### Resizing a Selection

Once a selection exists, it can be resized by dragging edges or corners:

#### Edge Handles (6-pixel threshold)

**Edges:**
- **Left edge**: Resize `startTime` (ew-resize cursor)
- **Right edge**: Resize `endTime` (ew-resize cursor)
- **Top edge**: Resize `maxFrequency` (ns-resize cursor)
- **Bottom edge**: Resize `minFrequency` (ns-resize cursor)

**Corners:**
- **Top-left**: Resize `startTime` + `maxFrequency` (nwse-resize cursor)
- **Top-right**: Resize `endTime` + `maxFrequency` (nesw-resize cursor)
- **Bottom-left**: Resize `startTime` + `minFrequency` (nesw-resize cursor)
- **Bottom-right**: Resize `endTime` + `minFrequency` (nwse-resize cursor)

#### Center Line (Move Handle)

**Horizontal line through middle of selection:**
- Displays when hovering (semi-transparent white)
- 6-pixel vertical hit zone above/below the line
- Allows moving entire selection both horizontally (time) and vertically (frequency)
- Movement is constrained to keep selection within clip bounds
- Uses 'move' cursor

**Move Constraints:**
- Selection width/height remain constant during move
- Cannot move outside clip time boundaries
- Cannot move outside 0-1 frequency range

### Inverse Resizing (Top/Bottom Edges)

When resizing the **top** or **bottom** edge, the opposite edge moves **inversely** around the center frequency:

**Top edge resize:**
```typescript
const topDelta = currentFreq - initialSelection.maxFrequency;
maxFrequency = currentFreq;
minFrequency = initialSelection.minFrequency - topDelta; // Inverse
```

**Bottom edge resize:**
```typescript
const bottomDelta = currentFreq - initialSelection.minFrequency;
minFrequency = currentFreq;
maxFrequency = initialSelection.maxFrequency - bottomDelta; // Inverse
```

This creates a "squeeze" or "stretch" effect that maintains the center point.

### Conversion to Time Selection

Spectral selection **automatically converts to time selection** when the cursor:
1. Moves **outside the clip horizontally** (left or right edge)
2. Moves **into a different track** (above or below)
3. Moves **into waveform area** of split view (below split line)

**Conversion Behavior:**
- The existing spectral selection **remains visible** on the clip
- A new time selection is created starting from the spectral selection bounds
- Time selection can extend beyond clip boundaries
- The `onConvertToTimeSelection` callback is triggered
- A 100ms flag prevents immediate re-entry to spectral mode

**Preserved State:**
```typescript
// Spectral selection stays on clip (clamped to clip bounds)
const spectralSelectionToKeep: SpectralSelection = {
  trackIndex,
  clipId,
  startTime: clampedSelStartTime,
  endTime: clampedSelEndTime,
  minFrequency,
  maxFrequency,
};

// Time selection uses unclamped times (can extend beyond clip)
onConvertToTimeSelection(
  rawStartTime,
  rawEndTime,
  [trackIndex],
  currentX,
  currentY,
  startX,
  startY,
  spectralSelectionToKeep
);
```

## Visual Rendering

### Marquee Appearance

**Border:**
- White dashed line
- 3px dash length, 2px gap
- 2px line width

**Fill:**
- `rgba(255, 255, 255, 0.15)` - semi-transparent white

**Corner Handles:**
- 6x6 pixel squares at each corner
- White fill, black stroke
- Always visible (not just on hover)

**Center Line (Hover):**
- Horizontal line through center of selection
- Only visible when hovering
- `rgba(255, 255, 255, 0.3)` - semi-transparent white
- 2px line width
- 6px hit zone on each side

### Coordinate Conversion

#### Time to X Position
```typescript
const timeToX = (time: number): number => {
  return CLIP_CONTENT_OFFSET + time * pixelsPerSecond;
};
```

#### X Position to Time
```typescript
const xToTime = (x: number): number => {
  return (x - CLIP_CONTENT_OFFSET) / pixelsPerSecond;
};
```

#### Frequency to Y Position
```typescript
const frequencyToY = (frequency: number, trackIndex: number): number => {
  // Calculate track Y position
  let trackY = initialGap;
  for (let i = 0; i < trackIndex; i++) {
    trackY += (tracks[i].height || defaultTrackHeight) + trackGap;
  }

  const track = tracks[trackIndex];
  const trackHeight = track.height || defaultTrackHeight;
  const clipBodyY = trackY + clipHeaderHeight;
  const clipBodyHeight = trackHeight - clipHeaderHeight;

  // In split view, only use top half for spectrogram
  const spectralAreaHeight = track.viewMode === 'split'
    ? clipBodyHeight / 2
    : clipBodyHeight;
  const spectralAreaTop = clipBodyY;

  // Invert: frequency 1 = top, frequency 0 = bottom
  const yInSpectralArea = (1 - frequency) * spectralAreaHeight;

  return spectralAreaTop + yInSpectralArea;
};
```

#### Y Position to Frequency
```typescript
const yToFrequency = (y: number, trackIndex: number): number => {
  // Calculate track and spectral area positions (same as above)
  // ...

  // Y position within spectral area (0 = top, spectralAreaHeight = bottom)
  const yInSpectralArea = y - spectralAreaTop;

  // Normalize and invert (0 = bottom/low freq, 1 = top/high freq)
  const frequency = 1 - (yInSpectralArea / spectralAreaHeight);

  return Math.max(0, Math.min(1, frequency));
};
```

### Split View Handling

In split view mode:
- **Top half**: Spectrogram (spectral selection area)
- **Bottom half**: Waveform (no spectral selection)
- **Split line**: At `clipBodyY + clipBodyHeight / 2`

**Spectral area calculation:**
```typescript
const spectralAreaHeight = track.viewMode === 'split'
  ? clipBodyHeight / 2
  : clipBodyHeight;
```

**Y boundary check for split view:**
```typescript
if (track.viewMode === 'split') {
  const splitY = clipBodyY + clipBodyHeight / 2;
  return y > splitY; // Below split line = outside spectral area
}
```

## Implementation Architecture

### File Structure

```
packages/components/src/
├── hooks/
│   └── useSpectralSelection.ts       # Main interaction logic
├── SpectralSelectionOverlay/
│   ├── SpectralSelectionOverlay.tsx  # Container component
│   ├── SpectralSelectionCanvas.tsx   # Canvas rendering
│   ├── utils.ts                      # Coordinate helpers
│   └── types.ts                      # Type definitions
└── hooks/
    └── useAudioSelection.ts          # Composite hook (includes spectral)
```

### State Management

#### Hook State (`useSpectralSelection`)

```typescript
const dragStateRef = useRef<DragState | null>(null);
const [isDragging, setIsDragging] = useState(false);
const [cursorStyle, setCursorStyle] = useState('default');
const wasDraggingRef = useRef(false);
const justConvertedRef = useRef(false);

interface DragState {
  isDragging: boolean;
  mode: ResizeMode;              // 'create' | 'move' | 'resize-*'
  trackIndex: number;
  clipId: number;
  startX: number;                // Initial mouse position
  startY: number;
  currentX: number;              // Current mouse position
  currentY: number;
  initialSelection: SpectralSelection | null; // For resize modes
}
```

#### Resize Modes

```typescript
type ResizeMode =
  | 'create'          // Creating new selection
  | 'move'            // Moving entire selection
  | 'resize-left'     // Resizing left edge
  | 'resize-right'    // Resizing right edge
  | 'resize-top'      // Resizing top edge
  | 'resize-bottom'   // Resizing bottom edge
  | 'resize-tl'       // Top-left corner
  | 'resize-tr'       // Top-right corner
  | 'resize-bl'       // Bottom-left corner
  | 'resize-br'       // Bottom-right corner
```

### Event Flow

#### Mouse Down (`startDrag`)

1. Check if disabled or just converted (100ms cooldown)
2. Detect if clicking on existing selection edge/corner
   - If yes: Start resize mode with `initialSelection` snapshot
3. Otherwise, find clip at position
   - Must be in spectrogram or split view
   - For split view, must be in top half
4. Start 'create' mode
5. Clear any existing time selection
6. Set `isDragging = true`

#### Mouse Move (`handleMouseMove`)

**For 'create' mode:**
1. Check if cursor is outside clip bounds (X or Y)
2. If yes: Convert to time selection
   - Calculate selection bounds (clamped to clip)
   - Create spectral selection to keep on clip
   - Trigger `onConvertToTimeSelection` with unclamped times
   - Set `justConvertedRef = true` for 100ms
   - Clear drag state
3. Otherwise: Update selection bounds
   - Clamp times to clip boundaries
   - Convert Y positions to frequencies
   - For stereo: constrain to starting channel
   - Trigger `onSpectralSelectionChange`

**For resize modes:**
1. Calculate current time and frequency from mouse position
2. Update appropriate edges based on resize mode:
   - `move`: Translate entire selection, constrain to clip bounds
   - `resize-left/right`: Update `startTime` or `endTime`
   - `resize-top/bottom`: Update frequencies with inverse motion
   - `resize-tl/tr/bl/br`: Update corresponding edges
3. Clamp frequencies to 0-1 range
4. For stereo: constrain to initial selection's channel
5. Clamp times to clip boundaries
6. Ensure proper ordering (swap if inverted)
7. Trigger `onSpectralSelectionChange`

#### Mouse Up (`endDrag`)

1. Calculate if actually dragged (>2 pixel movement)
2. If dragged:
   - Set `wasDraggingRef = true` for 10ms
   - Trigger `onSpectralSelectionFinalized`
3. If just clicked (not dragged):
   - For 'create' mode: Clear spectral selection
   - For resize modes: Keep selection as is
4. Clear drag state
5. Set `isDragging = false`

#### Mouse Move (Not Dragging) (`updateCursor`)

1. Detect resize mode at current position
2. Update cursor style based on mode:
   - `move`: 'move'
   - Horizontal edges: 'ew-resize'
   - Vertical edges: 'ns-resize'
   - Diagonal corners: 'nwse-resize' or 'nesw-resize'
   - Default: 'default'

### Rendering (SpectralSelectionCanvas)

The spectral selection is rendered on an HTML5 canvas overlay:

```typescript
// 1. Calculate selection bounds in pixel coordinates
const leftX = timeToX(startTime);
const rightX = timeToX(endTime);
const topY = frequencyToY(maxFrequency, trackIndex);
const bottomY = frequencyToY(minFrequency, trackIndex);

// 2. Draw semi-transparent fill
ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
ctx.fillRect(leftX, topY, width, height);

// 3. Draw dashed border
ctx.setLineDash([3, 2]);
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2;
ctx.strokeRect(leftX, topY, width, height);

// 4. Draw corner handles (6x6 squares)
ctx.fillStyle = '#ffffff';
ctx.strokeStyle = '#000000';
// Draw at: (leftX, topY), (rightX, topY), (leftX, bottomY), (rightX, bottomY)

// 5. Draw center line (if hovering)
if (isHoveringCenterLine) {
  const centerY = (topY + bottomY) / 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX, centerY);
  ctx.lineTo(rightX, centerY);
  ctx.stroke();
}
```

## Key Constants

```typescript
// useSpectralSelection.ts
const EDGE_THRESHOLD = 6;     // Pixels from edge to detect resize
const CORNER_SIZE = 6;        // Size of corner handle areas
const DRAG_THRESHOLD = 2;     // Pixels to distinguish click from drag

// Split view
const SPLIT_RATIO = 0.5;      // Top half = spectrogram, bottom half = waveform

// Stereo channels (normalized frequency)
const CHANNEL_BOUNDARY = 0.5; // L channel: 0.5-1.0, R channel: 0.0-0.5

// Conversion cooldown
const CONVERSION_COOLDOWN = 100; // ms after conversion before allowing new drag
```

## Boundary Constraints

### Clip Boundaries (Time)

```typescript
const clampTimeToClip = (time: number, trackIndex: number, clipId: number): number => {
  const clip = tracks[trackIndex].clips.find(c => c.id === clipId);
  if (!clip) return time;

  const clipStart = clip.start;
  const clipEnd = clip.start + clip.duration;

  return Math.max(clipStart, Math.min(clipEnd, time));
};
```

Times are always clamped to `[clip.start, clip.start + clip.duration]`.

### Frequency Boundaries

Frequencies are always clamped to `[0, 1]`:

```typescript
minFrequency = Math.max(0, Math.min(1, minFrequency));
maxFrequency = Math.max(0, Math.min(1, maxFrequency));
```

### Stereo Channel Boundaries

For stereo clips in spectrogram mode:

```typescript
// Determine initial channel
const wasInLChannel = initialSelection.minFrequency >= 0.5
  || initialSelection.maxFrequency > 0.5;

if (wasInLChannel) {
  // Constrain to L channel (0.5-1.0)
  minFrequency = Math.max(0.5, Math.min(1.0, minFrequency));
  maxFrequency = Math.max(0.5, Math.min(1.0, maxFrequency));
} else {
  // Constrain to R channel (0.0-0.5)
  minFrequency = Math.max(0.0, Math.min(0.5, minFrequency));
  maxFrequency = Math.max(0.0, Math.min(0.5, maxFrequency));
}
```

### Split View Boundaries

Y position must be in top half:

```typescript
if (track.viewMode === 'split') {
  const clipBodyY = trackY + clipHeaderHeight;
  const clipBodyHeight = trackHeight - clipHeaderHeight;
  const splitY = clipBodyY + clipBodyHeight / 2;

  // Below split line = invalid for spectral selection
  if (y > splitY) return false;
}
```

## Integration with Time Selection

Spectral selection and time selection can **coexist**:
- Creating a spectral selection **clears** time selection
- Dragging spectral selection outside bounds **creates** time selection
- The spectral selection **remains visible** on the clip after conversion
- Time selection can span multiple tracks; spectral is single-clip only

**Conversion triggers:**
```typescript
const yOutsideBounds = isYOutsideClipBounds(y, trackIndex);
const xOutsideBounds = isXOutsideClipBounds(x, trackIndex, clipId);

if ((yOutsideBounds || xOutsideBounds) && onConvertToTimeSelection) {
  // Perform conversion...
}
```

## Common Patterns

### Creating a Spectral Selection

```typescript
const newSelection: SpectralSelection = {
  trackIndex,
  clipId,
  startTime: Math.min(time1, time2),
  endTime: Math.max(time1, time2),
  minFrequency: Math.min(freq1, freq2),
  maxFrequency: Math.max(freq1, freq2),
};

onSpectralSelectionChange(newSelection);
```

### Clearing Spectral Selection

```typescript
onSpectralSelectionChange(null);
```

### Moving Selection (Constrained)

```typescript
const deltaTime = currentTime - xToTime(startX);
let newStartTime = initialSelection.startTime + deltaTime;
let newEndTime = initialSelection.endTime + deltaTime;

// Constrain to clip bounds
const clip = tracks[trackIndex].clips.find(c => c.id === clipId);
const clipStart = clip.start;
const clipEnd = clip.start + clip.duration;
const selectionDuration = initialSelection.endTime - initialSelection.startTime;

if (newStartTime < clipStart) {
  newStartTime = clipStart;
  newEndTime = clipStart + selectionDuration;
} else if (newEndTime > clipEnd) {
  newEndTime = clipEnd;
  newStartTime = clipEnd - selectionDuration;
}
```

### Detecting Stereo Channel

```typescript
const isStereo = clip.waveformLeft && clip.waveformRight;
const isSpectrogramMode = track.viewMode === 'spectrogram';

if (isSpectrogramMode && isStereo) {
  const startedInLChannel = freq1 >= 0.5;
  // Apply channel constraints...
}
```

## Testing Checklist

When rebuilding or modifying spectral selection behavior, verify:

- [ ] Can create spectral selection in spectrogram mode
- [ ] Can create spectral selection in split view (top half only)
- [ ] Cannot create spectral selection in waveform mode
- [ ] Cannot create spectral selection in split view bottom half
- [ ] Selection is constrained to clip time boundaries
- [ ] Selection is constrained to 0-1 frequency range
- [ ] For stereo clips, selection stays within starting channel
- [ ] Can resize selection by dragging edges
- [ ] Can resize selection by dragging corners
- [ ] Top/bottom edge resize moves opposite edge inversely
- [ ] Can move selection by dragging center line
- [ ] Movement is constrained to clip bounds
- [ ] Cursor changes based on hover position
- [ ] Dragging outside clip horizontally converts to time selection
- [ ] Dragging into different track converts to time selection
- [ ] Dragging into waveform area of split view converts to time selection
- [ ] Spectral selection remains visible on clip after conversion
- [ ] Time selection can extend beyond clip boundaries
- [ ] Creating spectral selection clears time selection
- [ ] Single click (no drag) clears new selection
- [ ] Single click (no drag) keeps existing selection when resizing
- [ ] Visual appearance matches spec (dashed border, corner handles, center line)

## Future Enhancements

Potential improvements not yet implemented:

1. **Multiple spectral selections**: Allow non-contiguous frequency selections
2. **Spectral selection across clips**: Extend selection across multiple clips in a track
3. **Spectral selection keyboard shortcuts**: Arrow keys to nudge edges, Delete to clear
4. **Snap to frequency bands**: Snap to specific frequency values (e.g., musical notes)
5. **Spectral selection presets**: Save and apply common frequency ranges
6. **Visual frequency labels**: Show actual Hz values during selection
7. **Audio playback of selection**: Play only the selected frequency range
8. **Spectral editing**: Apply effects only to selected frequencies
9. **Logarithmic frequency scale**: Option for log scale instead of linear
10. **Selection inversion**: Invert to select everything except the marquee

## Known Limitations

1. **Single clip only**: Selection cannot span multiple clips
2. **Single track only**: Selection cannot span multiple tracks (converts to time selection)
3. **No partial clip**: Selection must be fully within one clip's time range
4. **Linear frequency scale**: No logarithmic or mel scale options
5. **No multi-select**: Cannot have multiple spectral selections simultaneously
6. **No undo/redo**: No granular undo of spectral selection changes
7. **Fixed visual style**: Cannot customize marquee appearance
8. **Conversion is one-way**: Cannot convert time selection back to spectral
9. **No keyboard control**: Mouse-only interaction
10. **Stereo channel lock**: Cannot select frequencies across stereo channels in spectrogram mode
