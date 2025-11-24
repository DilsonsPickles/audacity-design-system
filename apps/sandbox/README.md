# Audacity UI Sandbox

A production-like testing environment for Audacity Design System components.

## Overview

The sandbox provides a complete assembled UI where you can test basic interactivity of all components together in a realistic multitrack audio editor environment.

## Features

- **Resizable Side Panel**: Contains track control panels with volume, pan, mute/solo controls
- **Multi-track Layout**: 3 tracks with different color themes (Blue, Violet, Magenta)
- **Multiple Clips**: 4 pre-configured clips with realistic waveforms and envelope automation
- **Interactive Controls**:
  - Play/pause/stop transport controls
  - Envelope mode toggle
  - Track control panels with volume sliders and pan knobs
  - Track mute/solo buttons
  - Clip selection
- **Visual States**:
  - Clip selection highlighting
  - Envelope mode overlay changes
  - Hover effects on track controls
  - Fade in/out automation curves
- **Status Bar**: Real-time display of selected clip, envelope mode state, and clip count

## Running the Sandbox

From the repository root:

```bash
pnpm sandbox
```

Or from the sandbox directory:

```bash
cd apps/sandbox
pnpm dev
```

The sandbox will start on [http://localhost:3003/](http://localhost:3003/) (or next available port).

## Components Showcased

### Audio Components
- **Clip**: Waveform rendering with clip header, borders, and state management
- **EnvelopePoint**: Control points for automation curves (integrated in clips)
- **EnvelopeCurve**: Envelope line rendering and point management (integrated in clips)

### Layout Components
- **TrackControlSidePanel**: Specialized resizable side panel for track controls with synchronized heights
- **TrackControlPanel**: Full-featured track controls with volume, pan, mute/solo, and effects

### UI Components
- Toolbar with transport controls
- Timeline ruler
- Status bar

## Test Scenarios

### 1. Clip Selection
Click on any clip to select it. The selected clip will show a white border.

### 2. Envelope Mode
Toggle "Envelope Mode" in the toolbar to see automation overlays:
- **OFF**: Shows subtle white overlay on clips with envelope points
- **ON**: Shows enhanced white overlay, making automation more visible

### 3. Pre-configured Clips

- **Clip 1 (Track 1 - Vocals)**: Fade in/out envelope (5 seconds)
- **Clip 2 (Track 1 - Vocals)**: Complex automation curve (4 seconds)
- **Clip 3 (Track 2 - Guitar)**: Simple boost curve (6 seconds)
- **Clip 4 (Track 3 - Bass)**: No automation, basic waveform (8 seconds)

### 4. Theme Comparison
Each track uses a different color theme:
- Track 1: Blue theme
- Track 2: Violet theme
- Track 3: Magenta theme

## Architecture

The sandbox demonstrates the recommended component composition pattern:

```tsx
<TrackControlSidePanel trackHeights={tracks.map(t => t.height)}>
  {tracks.map(track => (
    <TrackControlPanel
      trackName={track.name}
      volume={75}
      pan={0}
      isMuted={trackMuteState[track.id]}
      isSolo={trackSoloState[track.id]}
      state={selectedTrackId === track.id ? 'active' : 'idle'}
    />
  ))}
</TrackControlSidePanel>
```

**Key Features:**
- TrackControlSidePanel synchronizes track control heights with timeline track heights
- Default width: 268px (matches TrackControlPanel design spec)
- Resizable with constraints (minWidth: 268px, maxWidth: 400px)
- Each track control panel height matches its corresponding timeline track (default: 114px)
- All state management is handled at the app level, with components remaining pure and controlled

## Future Enhancements

- [ ] Drag and drop clip positioning
- [ ] Interactive envelope point editing
- [ ] Time selection tool
- [ ] Zoom controls
- [ ] Track height resizing
- [ ] Real audio playback
- [ ] Keyboard shortcuts

## Development

Built with:
- React 18
- TypeScript 5
- Vite 6
- @audacity-ui/components
- @audacity-ui/core
