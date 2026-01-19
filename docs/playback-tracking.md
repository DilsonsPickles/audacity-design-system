# Playback Tracking and Timeline Ruler Interactions

This document describes the playhead auto-scroll behaviors and timeline ruler interactions during playback.

## Timeline Ruler Context Menu

Right-click on the timeline ruler to access playback tracking options:

### Time Format
- **Minutes & seconds** (default)
- **Beats & measures**

### Playback Tracking Options

#### 1. Update display while playing
**Default: ON** (master toggle for auto-scroll)

- **When ON**: Canvas auto-scrolls to keep playhead visible during playback
- **When OFF**: Playhead moves off screen, no auto-scroll (user can manually scroll)

This is the master control for whether the display follows the playhead. When disabled, the other tracking options have no effect.

#### 2. Pinned play head
**Default: OFF** (only relevant when "Update display while playing" is ON)

Controls which auto-scroll mode is used:

- **When OFF (Page Turn Mode)**:
  - Playhead moves left-to-right across the viewport
  - When playhead reaches the right edge, canvas scrolls forward by one full viewport width
  - The timeline that was at the right edge moves to the left edge
  - Playhead continues its left-to-right journey across the fresh viewport
  - This creates a "page turn" effect

- **When ON (Pinned Mode)**:
  - Playhead moves to center of viewport
  - Once at center, playhead appears "pinned" at that position
  - Canvas scrolls continuously to give the illusion of a stationary playhead
  - Content appears to move from right to left under the fixed playhead

#### 3. Click ruler to start playback
**Default: OFF**

- **When ON**: Clicking anywhere on the timeline ruler will:
  1. Move playhead to the clicked position
  2. Stop current playback (if playing)
  3. Start playback from the clicked position
- **When OFF**: Timeline ruler clicks do not trigger playback

### Loop Region Options
(Placeholders for future implementation)

- Toggle loop region
- Clear loop region
- Set loop region to selection
- Set selection to loop
- Creating a loop also selects audio

### Display Options

- **Show vertical rulers**: Toggle vertical ruler guides

## Implementation Details

### Auto-Scroll Algorithm

Located in [App.tsx:585-629](../apps/sandbox/src/App.tsx#L585-L629)

The auto-scroll effect runs when:
- `isPlaying === true`
- `updateDisplayWhilePlaying === true`
- Valid scroll container ref

**Page Turn Mode:**
```typescript
// Check if playhead is off screen to the right
if (playheadPixelPosition > currentScrollX + containerWidth) {
  // Scroll forward by one viewport width
  const newScrollX = currentScrollX + containerWidth;
  scrollContainerRef.current.scrollLeft = newScrollX;
}
```

**Pinned Mode:**
```typescript
// Keep playhead at center
const centerPosition = containerWidth / 2;
const targetScrollX = Math.max(0, playheadPixelPosition - centerPosition);

// Only scroll if playhead has moved past center
if (playheadPixelPosition > centerPosition && Math.abs(currentScrollX - targetScrollX) > 1) {
  scrollContainerRef.current.scrollLeft = targetScrollX;
}
```

### Preventing Jitter

To ensure smooth playhead tracking without jitter:

1. **Programmatic scroll detection**: Use `isProgrammaticScrollRef` to distinguish between user scrolling and auto-scroll
2. **Fresh DOM values**: Read `scrollLeft` directly from DOM instead of stale state
3. **No circular dependencies**: Auto-scroll effect doesn't depend on `scrollX` state to prevent loops
4. **Threshold for pinned mode**: 1px threshold to avoid micro-adjustments

### Playhead Synchronization

The playhead appears in two places:
1. **Timeline ruler**: Icon at top (in ruler)
2. **Canvas**: Vertical stalk through tracks

Both must stay perfectly aligned. This is achieved by:
- Timeline ruler div uses `transform: translateX(-${scrollX}px)`
- Always updating `scrollX` state in `handleScroll` (even during programmatic scrolls)
- This keeps the ruler's transform in sync with canvas scroll position

### Click Ruler to Start Playback

Located in [App.tsx:1823-1851](../apps/sandbox/src/App.tsx#L1823-L1851)

Clicking the timeline ruler:
1. Calculates clicked time from mouse position
2. Sets playhead position via dispatch
3. Stops current playback if playing
4. Loads clips from new position
5. Starts playback from clicked position

Only active when `clickRulerToStartPlayback === true`.

## User Experience

### Typical Workflow

1. **Start playback**: Press Space or click Play button
2. **Watch playhead track**:
   - Default page turn mode: Playhead moves smoothly across screen
   - When reaching edge: Canvas jumps forward one page width
   - Continue until end of audio or user stops

3. **Toggle pinned mode** (if desired):
   - Right-click timeline ruler
   - Enable "Pinned play head"
   - Playhead now stays at center while content scrolls underneath

4. **Jump to position**:
   - Right-click timeline ruler
   - Enable "Click ruler to start playback"
   - Click anywhere on ruler to jump and play from that position

5. **Disable auto-scroll** (for manual scrolling during playback):
   - Right-click timeline ruler
   - Disable "Update display while playing"
   - Playhead continues playing but doesn't auto-scroll
   - User can manually scroll to view different parts while audio plays

## Related Components

- `TimelineRulerContextMenu` ([packages/components/src/TimelineRulerContextMenu/](../packages/components/src/TimelineRulerContextMenu/))
- `TimelineRuler` ([packages/components/src/TimelineRuler/](../packages/components/src/TimelineRuler/))
- `PlayheadCursor` ([packages/components/src/PlayheadCursor/](../packages/components/src/PlayheadCursor/))

## Constants

```typescript
// Pinned mode: 1px threshold to avoid micro-adjustments
Math.abs(currentScrollX - targetScrollX) > 1

// Click ruler: Offset for clip content area
const CLIP_CONTENT_OFFSET = 12;
```
