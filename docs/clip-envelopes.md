# Clip Envelope Editing

This document describes the complete behavior and implementation details of the clip envelope editing system in the Audacity Design System.

## Overview

Clip envelopes allow users to control the volume (gain) of audio clips over time by creating and manipulating control points along an automation curve. The envelope is displayed as a line overlaid on the waveform, with control points that can be added, moved, and removed.

## Core Concepts

### dB Scale and Visual Mapping

The envelope uses a **non-linear cubic power curve (x³)** for visual dB positioning to provide better control in the most commonly used range:

- **Range**: -60dB to +12dB
- **0dB position**: Approximately 2/3 down from the top of the clip
- **-∞ dB (silence)**: Bottom 1 pixel of the clip
- **Visual mapping**: Uses `dbToYNonLinear()` and `yToDbNonLinear()` functions

### Control Points

- Each clip can have 0 or more envelope points
- Points are stored as `{ time: number, db: number }` where:
  - `time`: Position within the clip (0 to clip.duration)
  - `db`: Gain value in decibels (-60 to +12)
- Points are always sorted by time
- **Special constraint**: Only one point allowed at clip origin (time = 0)

### Default Behavior

- Clips without envelope points default to 0dB (unity gain)
- The envelope line is drawn from clip start to end
- If first point is not at time = 0, the line starts at 0dB
- If last point is before clip end, the line extends at the last point's dB value

## Interaction Model

### Envelope Mode

Envelope editing is enabled when `envelopeMode` is `true` (controlled by the "Clip Envelopes" toggle in the toolbar).

### Hit Detection Zones

The envelope has three interaction zones based on distance from the envelope line:

1. **0-3 pixels**: Click on existing control point (for dragging or removal)
2. **3-8 pixels**: Click on line segment (adds new point)
3. **>8 pixels**: No envelope interaction

**Constants:**
```typescript
CLICK_THRESHOLD = 15  // pixels - for detecting clicks on control points
ENVELOPE_LINE_FAR_THRESHOLD = 8  // pixels - maximum distance for line interaction
```

### Interaction Behaviors

#### 1. Adding Points

**Single Click on Line (3-8px from line):**
- Creates a new control point at the clicked position
- Point is placed at the cursor's time and dB position
- **Exception**: Cannot add a second point at time = 0 (clip origin)
- Points are automatically sorted by time after insertion

#### 2. Removing Points

**Click on Control Point (without dragging):**
- Click within 15 pixels of an existing control point
- If mouse doesn't move more than 3 pixels, the point is deleted on mouse up
- If mouse moves >3 pixels, it becomes a drag operation instead

#### 3. Dragging Points

**Click and Drag on Control Point:**
- Click within 15 pixels of a control point and drag
- Point follows the mouse horizontally (time) and vertically (dB)
- Point is constrained to clip bounds (0 to clip.duration)
- dB value is clamped to -60dB to +12dB

**Movement Threshold:**
- 3 pixels - determines whether it's a click (remove) or drag (move)

#### 4. Point Eating Behavior

When dragging a control point, it can "eat" other points it passes over:

**During Drag:**
- Points between the original time and current time are visually hidden
- Hidden points are tracked in `hiddenPointIndices` array
- If you drag back, hidden points reappear
- Points remain in the data array (not deleted yet)

**On Mouse Up:**
- Hidden points are permanently deleted from the array
- Uses reverse-order splice to maintain correct indices

**Special Case - Dragging to Clip Origin:**
- If a point is dragged to time = 0 (within 0.001 seconds), ALL other points are hidden
- This allows quick reset to a single starting point
- On mouse up, all other points are deleted

#### 5. Horizontal Snapping

**Gentle Time Snapping:**
- Threshold: 0.05 seconds (50ms)
- When dragging a point, if it comes within 0.05s of another point's time, it snaps to align
- Helps create vertical segments (instant dB changes)
- Only snaps to time position, not dB value

### Visual Feedback

#### Hit Area Visualization (Debug Mode)

A semi-transparent red overlay can be shown to visualize the 8-pixel hit area around the envelope line. This is controlled by the `showHitArea` prop on the Track component.

#### Control Point Rendering

- **Size**: 8-pixel diameter circles
- **Fill**: White with black stroke
- **Hover**: Currently no special hover state (points are small enough)

#### Envelope Line

- **Color**: White (`#ffffff`)
- **Width**: 2 pixels
- **Style**: Solid line connecting all control points

#### Waveform Scaling

The waveform is visually scaled by the envelope curve:
- Each sample's amplitude is multiplied by the envelope value at that time
- Creates visual feedback showing how the volume changes over time
- Waveform "dips" where envelope is below 0dB
- Waveform "grows" where envelope is above 0dB

## Implementation Architecture

### File Structure

```
apps/sandbox/src/
├── components/
│   └── Canvas.tsx                    # Main canvas, handles all envelope interactions
├── contexts/
│   └── TracksContext.tsx             # State management, EnvelopeDragState type
└── utils/
    ├── envelopeInteraction.ts        # Hit detection and interaction logic
    └── envelopeUtils.ts              # dB conversion functions

packages/components/src/
└── Track/
    └── Track.tsx                     # Renders envelope line and points
```

### State Management

#### Drag State (Canvas.tsx)

```typescript
// Ref-based drag state to avoid re-renders during drag
const envelopeDragStateRef = useRef<EnvelopeDragState | null>(null);

interface EnvelopeDragState {
  clip: Clip;
  pointIndex: number;           // Index of the point being dragged
  trackIndex: number;
  clipX: number;                // Clip position and dimensions for calculations
  clipWidth: number;
  clipY: number;
  clipHeight: number;
  startX: number;               // Initial mouse position
  startY: number;
  originalTime: number;         // Original time of the point (for eating logic)
  hiddenPointIndices: number[]; // Points currently being eaten
  hasMoved: boolean;            // True if moved >3px (drag vs click)
}
```

#### Hidden Points State

```typescript
const [envelopeHiddenPoints, setEnvelopeHiddenPoints] = useState<{
  trackIndex: number;
  clipId: number;
  hiddenIndices: number[];
} | null>(null);
```

This state is passed to the Track component to filter out hidden points during rendering.

### Event Flow

#### Mouse Down (`handleEnvelopeMouseDown`)

1. Call `handleEnvelopeClick()` to determine interaction type
2. Result types:
   - `'point-drag'`: Clicked on existing point → set `envelopeDragStateRef`
   - `'segment-drag'`: Clicked on line segment (not used in alt mode)
   - `'add-point'`: Clicked near line → add point immediately
   - `'none'`: No envelope interaction → pass through to audio selection
3. Set `envelopeInteractionOccurredRef = true` to prevent playhead movement
4. Call `e.stopPropagation()` to prevent click event

#### Mouse Move (inside `useEffect`)

1. Check if `envelopeDragStateRef.current` exists
2. Calculate new time and dB from mouse position
3. Check if moved >3 pixels → set `hasMoved = true`
4. Apply horizontal snapping (0.05s threshold)
5. Calculate which points should be hidden:
   - If time < 0.001: hide ALL other points
   - Otherwise: hide points between `originalTime` and current `time`
6. Update `hiddenPointIndices` in drag state
7. Update visual state with `setEnvelopeHiddenPoints()`
8. Update point position in tracks state
9. Re-sort points by time
10. Find new index of dragged point (may have changed due to sorting)

#### Mouse Up (inside `useEffect`)

1. Check if `envelopeDragStateRef.current` exists
2. If `!hasMoved`:
   - Remove the clicked point (click to delete)
3. Else if `hiddenPointIndices.length > 0`:
   - Permanently delete all hidden points (reverse order splice)
4. Clear `envelopeHiddenPoints` state
5. Clear `envelopeDragStateRef`

### Rendering (Track.tsx)

The envelope is rendered in the `drawEnvelopeLine()` function:

```typescript
function drawEnvelopeLine(
  ctx: CanvasRenderingContext2D,
  clip: TrackClip,
  x: number,
  y: number,
  clipWidth: number,
  clipHeight: number,
  hiddenPointIndices: number[] = []
)
```

**Rendering order:**
1. Filter out hidden points: `visiblePoints = points.filter((_, i) => !hiddenPointIndices.includes(i))`
2. Draw the envelope line segments
3. Draw control points (white circles with black stroke)
4. Optionally draw hit area overlay (semi-transparent red)

**Line Drawing Logic:**
- If no points: draw horizontal 0dB line
- Draw from clip start to first point (0dB if first point > time 0)
- Draw segments between consecutive visible points
- Draw from last point to clip end (at last point's dB value)

## Preventing Playhead Movement

When interacting with envelope points, the playhead cursor should not move:

```typescript
// Ref to track if envelope interaction occurred
const envelopeInteractionOccurredRef = useRef<boolean>(false);

// In handleEnvelopeMouseDown - set flag for all interaction types
envelopeInteractionOccurredRef.current = true;

// In handleContainerClick - skip playhead update if flag is set
if (envelopeInteractionOccurredRef.current) {
  envelopeInteractionOccurredRef.current = false;
  return;
}
```

## Key Constants

```typescript
// Canvas.tsx
const TIME_EPSILON = 0.001;              // For detecting clip origin (time = 0)
const SNAP_THRESHOLD_TIME = 0.05;        // Horizontal snapping threshold (50ms)
const ENVELOPE_MOVE_THRESHOLD = 3;       // Pixels to distinguish click from drag

// envelopeInteraction.ts
const CLICK_THRESHOLD = 15;              // Pixels to detect point clicks
const CLIP_HEADER_HEIGHT = 20;           // Height of clip header

// Track.tsx
const ENVELOPE_LINE_FAR_THRESHOLD = 8;   // Max distance for line interaction
```

## Common Patterns

### Adding a Point

```typescript
const newPoint = { time: relativeTime, db: calculatedDb };
const newPoints = [...currentClip.envelopePoints, newPoint]
  .sort((a, b) => a.time - b.time);

dispatch({
  type: 'UPDATE_CLIP_ENVELOPE_POINTS',
  payload: { trackIndex, clipId, envelopePoints: newPoints },
});
```

### Removing a Point

```typescript
const newPoints = [...currentClip.envelopePoints];
newPoints.splice(pointIndex, 1);

dispatch({
  type: 'UPDATE_CLIP_ENVELOPE_POINTS',
  payload: { trackIndex, clipId, envelopePoints: newPoints },
});
```

### Removing Multiple Points (Eating)

```typescript
// Remove in reverse order to maintain indices
const newPoints = [...currentClip.envelopePoints];
hiddenIndices.sort((a, b) => b - a).forEach(i => {
  newPoints.splice(i, 1);
});

dispatch({
  type: 'UPDATE_CLIP_ENVELOPE_POINTS',
  payload: { trackIndex, clipId, envelopePoints: newPoints },
});
```

## Testing Checklist

When rebuilding or modifying envelope behavior, verify:

- [ ] Can add points by clicking on the envelope line
- [ ] Can remove points by clicking them (without dragging)
- [ ] Can drag points horizontally and vertically
- [ ] Points snap gently to align with other points' time positions
- [ ] Dragging a point "eats" points it passes over
- [ ] Dragged point can "eat back" by reversing direction
- [ ] Dragging to clip origin (time = 0) hides all other points
- [ ] Mouse up permanently deletes hidden points
- [ ] Cannot add multiple points at time = 0
- [ ] Can add multiple points at other time positions
- [ ] Playhead does not move when clicking/dragging envelope points
- [ ] Waveform scales correctly with envelope curve
- [ ] Envelope line renders correctly with 0, 1, 2, and many points
- [ ] Points are always sorted by time after any operation

## Future Enhancements

Potential improvements not yet implemented:

1. **Ctrl+Click to delete**: Alternative deletion method without drag threshold
2. **Multi-point selection**: Select and drag multiple points simultaneously
3. **Undo/Redo**: Full undo stack for envelope changes
4. **Copy/Paste envelope**: Copy envelope from one clip to another
5. **Envelope presets**: Save and apply common envelope shapes
6. **Bezier curves**: Smooth curves between points instead of linear segments
7. **Point hover state**: Visual feedback when hovering over points
8. **Keyboard shortcuts**: Arrow keys to nudge points, Delete to remove selected point
9. **Value display**: Show current dB value while dragging
10. **Vertical snapping**: Snap to 0dB or other common values

## Known Limitations

1. **No multi-point editing**: Can only drag one point at a time
2. **Linear interpolation only**: No curve smoothing between points
3. **Single undo**: No granular undo/redo of individual point operations
4. **No point selection**: Points cannot be selected independently of dragging
5. **Fixed hit zones**: Cannot customize interaction sensitivity per user preference
