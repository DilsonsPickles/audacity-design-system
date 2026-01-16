# Clip Envelope User Stories

This document provides acceptance criteria for implementing the clip envelope editing system. Following these stories systematically will result in a complete, functional envelope editor matching the current build.

---

## Epic: Clip Envelope Automation System

Enable users to control clip volume over time using visual automation curves with draggable control points.

---

## Story 1: Display Envelope Line on Clips

**As a** user
**I want to** see an envelope line displayed on my audio clips
**So that** I can visualize the volume automation curve

### Acceptance Criteria

1. **Default State - No Envelope Points**
   - [ ] Horizontal line displayed at 0dB position (~2/3 down from clip top)
   - [ ] Line color: Red (`#FF0000`)
   - [ ] Line width: 2 pixels
   - [ ] Line spans entire clip width
   - [ ] Line only visible when envelope mode is enabled

2. **With Envelope Points**
   - [ ] Line connects all envelope points in time order
   - [ ] If first point is not at time=0, line starts at first point's dB value
   - [ ] If last point is before clip end, line extends horizontally at last point's dB value
   - [ ] Line segments are straight (linear interpolation between points)

3. **Visual Positioning**
   - [ ] Uses non-linear dB scale (cubic power curve: x³)
   - [ ] Range: -60dB (bottom) to +12dB (top)
   - [ ] 0dB positioned at approximately 2/3 down from clip top
   - [ ] Bottom 1px represents -∞ dB (silence)

4. **Control Points Visualization**
   - [ ] Points rendered as two-tone circles
   - [ ] Outer circle: Red, 5px radius
   - [ ] Inner circle: White, 3px radius
   - [ ] Points displayed on top of envelope line

### Technical Notes
- Use `dbToYNonLinear()` function for Y positioning
- Envelope rendering in `ClipBody.tsx` using `renderEnvelopeLine()` and `renderEnvelopePoints()`

---

## Story 2: Add Envelope Points by Clicking

**As a** user
**I want to** click near the envelope line to add new control points
**So that** I can shape the volume automation curve

### Acceptance Criteria

1. **Click Detection**
   - [ ] Clicking within 4px of the envelope line creates a new point
   - [ ] Point created at exact mouse cursor position (time and dB)
   - [ ] Clicking >4px away from line does nothing (no envelope interaction)

2. **Point Creation**
   - [ ] New point added to points array
   - [ ] Points automatically sorted by time after creation
   - [ ] Point appears immediately with two-tone circle visual
   - [ ] Envelope line redraws to include new point

3. **Special Constraints**
   - [ ] Cannot add multiple points at time=0 (clip origin)
   - [ ] If point at time=0 exists, clicking at time≈0 does nothing
   - [ ] Can add unlimited points at other time positions

4. **Visual Feedback**
   - [ ] Mouse cursor shows pointer when hovering within 4px of line
   - [ ] No visual feedback when >4px from line

### Technical Notes
- Hit detection in `EnvelopeInteractionLayer.tsx`
- Constant: `ENVELOPE_LINE_FAR_THRESHOLD = 4` (pixels)
- Constant: `TIME_EPSILON = 0.001` (for detecting clip origin)

---

## Story 3: Delete Envelope Points by Clicking

**As a** user
**I want to** click on an existing control point to delete it
**So that** I can remove unwanted automation points

### Acceptance Criteria

1. **Click Detection**
   - [ ] Clicking within 10px of an existing point selects it for deletion
   - [ ] Must be a "clean click" (mouse movement <3px)
   - [ ] If mouse moves >3px, it becomes a drag operation instead

2. **Point Deletion**
   - [ ] Point removed from points array on mouse up
   - [ ] Envelope line redraws immediately without deleted point
   - [ ] If only one point remains, can still delete it (reverts to 0dB line)

3. **Visual Feedback**
   - [ ] Mouse cursor shows pointer when hovering over point
   - [ ] No intermediate visual state during click

4. **Movement Threshold**
   - [ ] Mouse movement <3px = delete operation
   - [ ] Mouse movement ≥3px = drag operation (see Story 4)

### Technical Notes
- Constant: `CLICK_THRESHOLD = 10` (pixels for point detection)
- Constant: `ENVELOPE_MOVE_THRESHOLD = 3` (pixels to distinguish click from drag)
- Drag state tracking in `dragStateRef.hasMoved`

---

## Story 4: Drag Envelope Points

**As a** user
**I want to** drag existing control points horizontally and vertically
**So that** I can adjust the automation curve shape

### Acceptance Criteria

1. **Drag Initiation**
   - [ ] Click within 10px of a point and move mouse >3px to start drag
   - [ ] Mouse cursor changes to appropriate cursor during drag
   - [ ] Point follows mouse cursor in real-time

2. **Horizontal Movement (Time)**
   - [ ] Point moves horizontally based on mouse X position
   - [ ] Time constrained to clip bounds (0 to clip.duration)
   - [ ] Points automatically re-sort by time during drag
   - [ ] Dragging to time≈0 (within 0.001s) is allowed

3. **Vertical Movement (dB)**
   - [ ] Point moves vertically based on mouse Y position
   - [ ] Uses inverse non-linear scale: `yToDbNonLinear()`
   - [ ] dB value clamped to -60dB to +12dB range
   - [ ] Visual position updates immediately

4. **Drag Completion**
   - [ ] Mouse up ends drag operation
   - [ ] Final point position persisted
   - [ ] Envelope line redraws with new point positions

5. **Multi-Track Behavior**
   - [ ] Each clip's envelope is independent
   - [ ] Dragging point on one clip doesn't affect other clips

### Technical Notes
- Drag state in `EnvelopeInteractionLayer.tsx`
- Update callback: `onEnvelopePointsChange()`
- Points re-sorted after each position update

---

## Story 5: Point Eating (Hiding Points During Drag)

**As a** user
**I want to** see points temporarily disappear when I drag a point over them
**So that** I understand they will be deleted when I release

### Acceptance Criteria

1. **Eating Behavior - Horizontal Drag**
   - [ ] When dragging a point horizontally, points between start and current time are hidden
   - [ ] Hidden points disappear from both line and control point rendering
   - [ ] Dragging backwards makes hidden points reappear
   - [ ] Real-time visual feedback during drag

2. **Special Case - Drag to Origin**
   - [ ] Dragging any point to time≈0 (within 0.001s) hides ALL other points
   - [ ] Only the dragged point remains visible
   - [ ] Provides quick way to reset to single starting point

3. **Visual State During Drag**
   - [ ] Hidden points completely removed from display
   - [ ] Envelope line drawn without hidden points
   - [ ] Only visible points shown as circles

4. **Finalization on Mouse Up**
   - [ ] On mouse up, all hidden points are permanently deleted
   - [ ] Deletion performed in reverse order to maintain indices
   - [ ] Final envelope has only non-hidden points

5. **Cancellation**
   - [ ] No way to cancel mid-drag (would require Esc key - future enhancement)
   - [ ] Dragging back over hidden points makes them reappear

### Technical Notes
- Hidden indices tracked in `dragStateRef.hiddenIndices`
- Callback: `onHiddenPointsChange(hiddenIndices)`
- Parent component filters rendering: `hiddenPointIndices` prop to `ClipBody`
- Deletion on mouse up: filter points excluding hidden indices

---

## Story 6: Horizontal Snapping to Align Points

**As a** user
**I want to** have points gently snap to existing points' time positions
**So that** I can easily create vertical segments (instant dB changes)

### Acceptance Criteria

1. **Snap Behavior**
   - [ ] When dragging within 0.05s (50ms) of another point's time, snap to that time
   - [ ] Only horizontal (time) snapping - no vertical (dB) snapping
   - [ ] Snapping is "gentle" - only within threshold, not magnetic

2. **Visual Feedback**
   - [ ] Point position updates immediately when snapped
   - [ ] No visual indicator of snap zone (subtle behavior)

3. **Snap Targets**
   - [ ] Can snap to any other visible point in the same clip
   - [ ] Cannot snap to hidden points
   - [ ] Multiple snap targets: snaps to nearest point within threshold

4. **Creating Vertical Segments**
   - [ ] Two points at same time create vertical line segment
   - [ ] Useful for instant volume changes (e.g., hard cuts)

### Technical Notes
- Constant: `SNAP_THRESHOLD_TIME = 0.05` (50ms / 0.05 seconds)
- Implemented in drag handler during mouse move
- Only affects time position, not dB value

---

## Story 7: Waveform Visual Scaling by Envelope

**As a** user
**I want to** see the waveform amplitude visually scaled by the envelope curve
**So that** I get immediate visual feedback of the automation effect

### Acceptance Criteria

1. **Gain Application**
   - [ ] Each waveform pixel column scaled by envelope gain at that time
   - [ ] Gain calculated using formula: `gain = 10^(dB/20)`
   - [ ] Linear interpolation between envelope points in dB space

2. **Visual Effects**
   - [ ] Waveform "dips" (shrinks) where envelope is below 0dB
   - [ ] Waveform "grows" (expands) where envelope is above 0dB
   - [ ] At 0dB: waveform displays at original amplitude
   - [ ] At -60dB: waveform nearly invisible (0.1% size)
   - [ ] At +12dB: waveform ~4x original size

3. **All Rendering Modes**
   - [ ] Applied to mono waveform (full view)
   - [ ] Applied to mono waveform (split view - bottom half)
   - [ ] Applied to stereo L channel (full and split views)
   - [ ] Applied to stereo R channel (full and split views)
   - [ ] Applied to RMS overlay (if present)

4. **Default Behavior**
   - [ ] No envelope points: waveform at unity gain (unchanged)
   - [ ] Envelope disabled: waveform at unity gain (unchanged)
   - [ ] Only applies when `showEnvelope=true` and envelope points exist

5. **Real-Time Updates**
   - [ ] Waveform scaling updates during point drag
   - [ ] Smooth visual feedback as envelope changes

### Technical Notes
- Function: `getEnvelopeGainAtTime()` in `utils/envelope.ts`
- Applied in `ClipBody.tsx` waveform rendering loops
- Per-pixel calculation: `pixelTime = clipTrimStart + (px / pixelsPerSecond)`

---

## Story 8: Envelope Mode Toggle

**As a** user
**I want to** toggle envelope editing mode on/off
**So that** I can switch between envelope editing and other interactions

### Acceptance Criteria

1. **Toggle Button**
   - [ ] Button in toolbar labeled "Clip Envelopes"
   - [ ] Toggle state: ON (active) / OFF (inactive)
   - [ ] Visual indication of current state (button highlight/pressed state)

2. **Envelope Mode ON**
   - [ ] Envelope line and control points visible on all clips
   - [ ] Can add, delete, and drag envelope points
   - [ ] Envelope interaction takes priority over clip selection
   - [ ] Automation overlay fill visible (50% white)

3. **Envelope Mode OFF**
   - [ ] Envelope line and points still visible if points exist
   - [ ] Cannot add, delete, or drag points
   - [ ] Clicking clip selects it (normal selection behavior)
   - [ ] Automation overlay fill dimmer (60% white - "idle" state)

4. **State Persistence**
   - [ ] Envelope points persist when toggling mode off/on
   - [ ] Mode state persists across clips
   - [ ] Default mode: OFF

### Technical Notes
- State managed at application level
- Passed as `enabled` prop to `EnvelopeInteractionLayer`
- Visual styling managed by theme: `envelopeFill` vs `envelopeFillIdle`

---

## Story 9: Automation Overlay Fill

**As a** user
**I want to** see a semi-transparent fill below the envelope curve
**So that** I can clearly see the automation area

### Acceptance Criteria

1. **Active State (Envelope Mode ON)**
   - [ ] Fill color: `rgba(255, 255, 255, 0.5)` (50% white)
   - [ ] Fill drawn from envelope line down to bottom of clip
   - [ ] Follows envelope curve exactly
   - [ ] Visible on all clips with envelope points

2. **Idle State (Envelope Mode OFF)**
   - [ ] Fill color: `rgba(255, 255, 255, 0.6)` (60% white - slightly more opaque)
   - [ ] Same fill area as active state
   - [ ] Indicates envelope exists but not currently editable

3. **Time Selection Overlay States**
   - [ ] Within time selection + envelope ON: Track-specific blended colors
     - Blue track: `#C6E4FF`
     - Violet track: `#E7E6FF`
     - Magenta track: `#F9E6F4`
   - [ ] Within time selection + envelope OFF: Pure white `#FFFFFF`

4. **Rendering Order**
   - [ ] Drawn after clip background
   - [ ] Drawn before waveform
   - [ ] Drawn before envelope line and points

5. **No Envelope Points**
   - [ ] No fill displayed if clip has zero envelope points
   - [ ] 0dB default line shown but no fill

### Technical Notes
- See `automation-overlay-states.md` for complete state matrix
- 6 total overlay states depending on mode, selection, and time selection
- Implementation in `ClipBody.tsx` rendering pipeline

---

## Story 10: Prevent Playhead Movement During Envelope Interaction

**As a** user
**I want to** interact with envelope points without moving the playhead
**So that** my timeline position stays where I set it

### Acceptance Criteria

1. **Envelope Interactions Don't Move Playhead**
   - [ ] Clicking to add point doesn't move playhead
   - [ ] Clicking to delete point doesn't move playhead
   - [ ] Dragging point doesn't move playhead
   - [ ] Clicking within envelope interaction zones doesn't trigger playhead move

2. **Non-Envelope Clicks Still Work**
   - [ ] Clicking on clip (outside envelope zones) moves playhead normally
   - [ ] Clicking on track background moves playhead normally
   - [ ] Only envelope-specific interactions are prevented

3. **Event Propagation**
   - [ ] Envelope interactions call `e.stopPropagation()`
   - [ ] Prevents click event from bubbling to container
   - [ ] Maintains separation between envelope and playback controls

### Technical Notes
- Event handling in `EnvelopeInteractionLayer.tsx`
- All mouse down events call `e.preventDefault()` and `e.stopPropagation()`
- Container click handler skips playhead update when envelope interaction occurred

---

## Story 11: Non-Linear dB Scale Visual Positioning

**As a** user
**I want to** have more control over the commonly-used dB range
**So that** I can make fine adjustments near 0dB more easily

### Acceptance Criteria

1. **Visual Spacing**
   - [ ] 0dB positioned at ~2/3 down from top of clip (not centered)
   - [ ] More space allocated to -12dB to +12dB range (common range)
   - [ ] Less space allocated to -60dB to -12dB range (rarely used)
   - [ ] Uses cubic power curve (x³) for non-linear mapping

2. **Range Coverage**
   - [ ] Top 1/3 of clip: approximately +12dB to 0dB
   - [ ] Middle 1/3 of clip: approximately 0dB to -12dB
   - [ ] Bottom 1/3 of clip: approximately -12dB to -60dB
   - [ ] Bottom 1px: reserved for -∞ dB (silence)

3. **Conversion Functions**
   - [ ] `dbToYNonLinear(db, y, height)`: Converts dB to Y pixel position
   - [ ] `yToDbNonLinear(yPos, y, height)`: Converts Y pixel position to dB
   - [ ] Both functions use same cubic curve (power 3.0)

4. **User Experience**
   - [ ] Easier to make small adjustments near 0dB (more pixels per dB)
   - [ ] Harder to accidentally create extreme values (compressed range)
   - [ ] Consistent with Audacity's existing automation curves

### Technical Notes
- Implementation in `utils/envelope.ts`
- Formula: `normalized = ((db - minDb) / dbRange) ^ 3.0`
- Constants: `minDb = -60`, `maxDb = 12`, `INFINITY_ZONE_HEIGHT = 1`

---

## Story 12: Envelope Points Data Structure

**As a** developer
**I want to** understand the envelope points data model
**So that** I can implement storage and manipulation correctly

### Acceptance Criteria

1. **Point Structure**
   ```typescript
   interface EnvelopePoint {
     time: number;  // Position in seconds (0 to clip.duration)
     db: number;    // Gain in decibels (-60 to +12)
   }
   ```

2. **Points Array**
   - [ ] Stored as array on clip object: `clip.envelopePoints`
   - [ ] Always sorted by time (ascending)
   - [ ] Empty array `[]` means no envelope (defaults to 0dB)

3. **Sorting Requirement**
   - [ ] Points must be sorted after any add or drag operation
   - [ ] Use: `points.sort((a, b) => a.time - b.time)`
   - [ ] Rendering and interpolation depend on sorted order

4. **Constraints**
   - [ ] `time`: 0 ≤ time ≤ clip.duration
   - [ ] `db`: -60 ≤ db ≤ +12
   - [ ] Only one point allowed at time=0 (enforced by UI)
   - [ ] No automatic constraint on number of points (UI limits)

5. **Default Values**
   - [ ] New clips: `envelopePoints = []`
   - [ ] Clips without points render 0dB line (unity gain)

### Technical Notes
- Type definition in `@audacity-ui/core` package
- Exported as `EnvelopePoint` interface
- Used by `EnvelopeInteractionLayer`, `ClipBody`, and state management

---

## Story 13: Envelope Interaction Layer Component

**As a** developer
**I want to** implement the EnvelopeInteractionLayer component
**So that** envelope editing is properly separated from rendering

### Acceptance Criteria

1. **Component Purpose**
   - [ ] Transparent overlay positioned above clip body
   - [ ] Handles all envelope mouse interactions
   - [ ] Does not render visual elements (handled by ClipBody)

2. **Required Props**
   ```typescript
   interface EnvelopeInteractionLayerProps {
     envelopePoints: EnvelopePoint[];
     onEnvelopePointsChange: (points: EnvelopePoint[]) => void;
     onHiddenPointsChange?: (hiddenIndices: number[]) => void;
     onHoveredPointChange?: (pointIndex: number | null) => void;
     enabled?: boolean;
     width: number;
     height: number;
     duration: number;
     x?: number;
     y?: number;
     hiddenPointIndices?: number[];
   }
   ```

3. **Event Handling**
   - [ ] `onMouseDown`: Detect click on point or line, initiate drag
   - [ ] `onMouseMove`: Update drag position, calculate hidden points
   - [ ] `onMouseUp`: Finalize drag or delete, clear drag state

4. **Positioning**
   - [ ] Positioned absolutely at track level
   - [ ] Covers entire clip body area (excludes header)
   - [ ] Z-index above clip body for interaction capture

5. **State Management**
   - [ ] Uses ref for drag state (avoid re-renders during drag)
   - [ ] Calls parent callbacks for state updates
   - [ ] Parent component manages actual envelope points array

### Technical Notes
- Located in `packages/components/src/EnvelopeInteractionLayer/`
- Used by `TrackNew.tsx` - positioned as sibling to clips
- See implementation for constants and helper functions

---

## Story 14: Clip Body Envelope Rendering

**As a** developer
**I want to** implement envelope rendering in ClipBody
**So that** users can see the automation curve and scaled waveform

### Acceptance Criteria

1. **Rendering Pipeline Order**
   ```
   1. Time selection background overlay (if applicable)
   2. Waveform (with envelope scaling applied)
   3. Automation overlay fill
   4. Envelope line
   5. Envelope control points
   ```

2. **Envelope Line Rendering**
   - [ ] Use `renderEnvelopeLine()` utility function
   - [ ] Filter out hidden points before rendering
   - [ ] Color: Red `#FF0000`
   - [ ] Width: 2px

3. **Control Points Rendering**
   - [ ] Use `renderEnvelopePoints()` utility function
   - [ ] Filter out hidden points
   - [ ] Two-tone circles (outer red, inner white)
   - [ ] Hover state: larger circles (6px outer, 3.5px inner)

4. **Waveform Scaling Application**
   - [ ] For each pixel column: calculate envelope gain
   - [ ] Multiply min/max samples by gain
   - [ ] Applied to all waveform rendering modes
   - [ ] Applied to RMS overlay

5. **Props Required**
   ```typescript
   interface ClipBodyProps {
     // ... other props ...
     envelope?: EnvelopePointData[];
     showEnvelope?: boolean;
     hiddenPointIndices?: number[];
     hoveredPointIndex?: number | null;
   }
   ```

### Technical Notes
- Component: `packages/components/src/ClipBody/ClipBody.tsx`
- Utilities: `packages/components/src/utils/envelope.ts`
- Canvas-based rendering for performance

---

## Story 15: Testing & Quality Assurance

**As a** QA engineer
**I want to** verify all envelope functionality works correctly
**So that** users have a bug-free experience

### Acceptance Criteria - Basic Functionality

1. **Adding Points**
   - [ ] Click on envelope line creates point at cursor position
   - [ ] Point appears immediately with correct visual style
   - [ ] Cannot add second point at time=0

2. **Deleting Points**
   - [ ] Click on point (without dragging) deletes it
   - [ ] Point disappears immediately
   - [ ] Envelope line updates correctly

3. **Dragging Points**
   - [ ] Point follows mouse cursor smoothly
   - [ ] Constrained to clip bounds
   - [ ] dB clamped to -60 to +12 range

4. **Point Eating**
   - [ ] Dragging over points hides them
   - [ ] Hidden points disappear from display
   - [ ] Dragging back makes them reappear
   - [ ] Mouse up deletes hidden points permanently

5. **Horizontal Snapping**
   - [ ] Points snap when within 0.05s of another point
   - [ ] Only time snaps, not dB
   - [ ] Can create vertical segments

### Acceptance Criteria - Edge Cases

6. **Single Point**
   - [ ] Can create first point
   - [ ] Can delete last point (reverts to 0dB line)
   - [ ] Single point at time=0 works correctly

7. **Many Points**
   - [ ] Can create 20+ points without performance issues
   - [ ] All points remain interactive
   - [ ] Sorting works correctly with many points

8. **Extreme dB Values**
   - [ ] Can create point at -60dB (bottom)
   - [ ] Can create point at +12dB (top)
   - [ ] Waveform scaling works at extremes

9. **Clip Boundaries**
   - [ ] Can create point at time=0
   - [ ] Can create point at time=clip.duration
   - [ ] Cannot drag point outside clip bounds

10. **Mode Switching**
    - [ ] Points persist when toggling mode off/on
    - [ ] Cannot edit in idle mode
    - [ ] Visual style changes correctly (overlay opacity)

### Acceptance Criteria - Visual Quality

11. **Rendering Quality**
    - [ ] Envelope line is smooth and anti-aliased
    - [ ] Control points are crisp circles
    - [ ] No visual glitches during drag
    - [ ] Waveform scaling is smooth and continuous

12. **Performance**
    - [ ] 60fps during point drag
    - [ ] No lag when adding/deleting points
    - [ ] Smooth interaction with 5+ clips visible

13. **Cross-Browser**
    - [ ] Works in Chrome
    - [ ] Works in Firefox
    - [ ] Works in Safari
    - [ ] Works in Edge

### Technical Notes
- Reference sandbox demo for expected behavior
- Test on various screen sizes and DPI settings
- Verify keyboard accessibility where applicable (future enhancement)

---

## Reference Implementation

- **Sandbox Demo**: `/apps/sandbox` - Full working implementation
- **Components**: `/packages/components/src/`
  - `EnvelopeInteractionLayer/` - Mouse interaction handling
  - `ClipBody/` - Visual rendering with waveform scaling
  - `utils/envelope.ts` - Utility functions
- **Documentation**: `/docs/`
  - `clip-envelopes.md` - Complete technical details
  - `waveform-envelope-scaling.md` - Scaling algorithm
  - `automation-overlay-states.md` - Visual states

---

## Success Metrics

Implementation is complete when:

- ✅ All 15 user stories have acceptance criteria met
- ✅ Visual match with sandbox demo (pixel-perfect not required, behavior match required)
- ✅ All edge cases tested and passing
- ✅ Performance: 60fps during all interactions
- ✅ Code review approved
- ✅ Documentation updated

---

## Glossary

- **Envelope**: Automation curve controlling clip volume over time
- **Control Point**: Draggable point on the envelope curve defining dB at a specific time
- **dB (Decibels)**: Logarithmic unit for measuring sound intensity (-60 to +12 range)
- **Unity Gain**: 0dB, no volume change (gain = 1.0)
- **Point Eating**: Temporarily hiding points during drag, deleted on mouse up
- **Horizontal Snapping**: Gentle time alignment to nearby points (0.05s threshold)
- **Non-Linear Scale**: Cubic power curve giving more space to commonly-used dB range
- **Automation Overlay**: Semi-transparent fill below envelope curve showing affected area
