# Automation Overlay States

This document describes the different visual states of automation curve overlays in the clip envelope editor.

## Overlay States

### 1. Active Automation Overlay (Envelope Mode ON)
- **When**: Clip Envelopes mode is active
- **Behavior**: Follows the automation curve as it's edited in real-time
- **Color**: `theme.envelopeFill` = `rgba(255, 255, 255, 0.5)` (50% white)
- **Location**: Drawn under the automation curve on unselected clip regions

### 2. Idle Automation Overlay (Envelope Mode OFF)
- **When**: Clip Envelopes mode is disabled, but clip has envelope points
- **Behavior**: Shows where automation exists when not actively editing
- **Color**: `theme.envelopeFillIdle` = `rgba(255, 255, 255, 0.6)` (60% white)
- **Location**: Drawn under the automation curve on unselected clip regions

### 3. Selected Clip Automation Overlay
- **When**: Clip is selected (not in time selection context)
- **Behavior**: Shows automation on selected clips
- **Color**: Same as active/idle depending on envelope mode state
- **Location**: Drawn under the automation curve on selected clip background

### 4. Time Selection Overlay - Unselected Clip
- **When**: Time selection exists but clip is not selected
- **Behavior**: Shows automation within time selection region on unselected clips
- **Color**: Currently not separately styled (uses normal selection overlay)
- **Location**: Within time selection boundaries

### 5. Time Selection Overlay - Selected Clip (Envelope Mode ON)
- **When**: Clip is selected AND time selection exists AND envelope mode is ON
- **Behavior**: Shows automation within time selection with track-specific blended colors
- **Colors**:
  - Track 0 (Blue): `#C6E4FF` (base clip color blended with 80% white)
  - Track 1 (Violet): `#E7E6FF` (base clip color blended with 80% white)
  - Track 2 (Magenta): `#F9E6F4` (base clip color blended with 80% white)
- **Location**: Within time selection boundaries on selected clips
- **Implementation**: `drawEnvelopeFillInSelection()` in TrackCanvas.tsx

### 6. Time Selection Overlay - Selected Clip (Envelope Mode OFF / Idle)
- **When**: Clip is selected AND time selection exists AND envelope mode is OFF (but has envelope points)
- **Behavior**: Shows idle automation within time selection
- **Color**: `#FFFFFF` (pure white)
- **Location**: Within time selection boundaries on selected clips
- **Implementation**: `drawEnvelopeFillInSelection()` in TrackCanvas.tsx

## Implementation Notes

- Time selection overlays use different colors than regular overlays to maintain visibility against the time selection background colors
- Time selection backgrounds in envelope mode are darker to provide contrast:
  - Blue: `#50B4E6`
  - Violet: `#7888D6`
  - Magenta: `#B888D6`
- The overlay drawing order matters: envelope fills are drawn before waveforms but after clip backgrounds
- Time selection overlays are drawn on top of time selection backgrounds but under waveforms
