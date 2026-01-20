# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **pnpm monorepo** for the Audacity Design System - a collection of reusable UI components for audio editing applications. The repository is transitioning from a single prototype to a modular design system architecture.

**Current State**: Early-stage monorepo with foundational packages. The main demo (`apps/demo/clip-envelope/`) has not yet been migrated to consume the packages.

## Development Commands

### Monorepo (Root)
```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Watch all packages in development mode
pnpm dev

# Lint all packages
pnpm lint
```

### Individual Packages
```bash
# Build a specific package
cd packages/core
pnpm build

# Watch mode for a package
cd packages/tokens
pnpm dev
```

### Demo Application
```bash
# Run the clip envelope demo
cd apps/demo/clip-envelope
npm install  # Note: Uses npm, not pnpm (legacy)
npm run dev  # Runs on http://localhost:3000
npm run build
npm run lint
```

## Architecture

### Monorepo Structure

- **`packages/`** - Published npm packages (use tsup for builds)
  - `@audacity-ui/core` - Core TypeScript types and interfaces
  - `@audacity-ui/tokens` - Design tokens (themes, colors)
  - `@audacity-ui/components` - UI components (ClipDisplay, TrackNew, EnvelopeInteractionLayer, etc.)
  - *(Planned)* `@audacity-ui/audio-components` - Complex audio editing components

- **`apps/demo/clip-envelope/`** - Next.js 16 demo application
  - Self-contained prototype showcasing clip envelope editing
  - Uses React 19, TypeScript 5, Tailwind CSS 4
  - Currently does NOT import from `packages/` (planned migration)

- **`docs/`** - Architecture documentation
  - `design-system-architecture.md` - Complete design system roadmap
  - `automation-overlay-states.md` - Visual state documentation
  - `clip-styling-states.md` - Clip styling state matrix
  - `label-interactions.md` - Label selection, deletion, and track expansion behavior

### Key Components in `packages/components/`

**Clip Rendering:**
- `ClipDisplay.tsx` - Composite clip component (ClipHeader + ClipBody)
  - Manages header hover states and truncation mode
  - Passes props through to child components
- `ClipHeader.tsx` - Clip header with name and context menu button
- `ClipBody.tsx` - Clip body rendering (waveform, spectrogram, envelope)
  - Canvas-based rendering using HTML5 Canvas API
  - Filters hidden points during envelope eating behavior

**Track Rendering:**
- `TrackNew.tsx` - Component-based track renderer
  - Renders clips using ClipDisplay components
  - Positions EnvelopeInteractionLayers at track level as siblings to clips
  - Tracks hidden points per clip during drag (eating behavior)
  - ~200 lines (vs ~1000 in old canvas-based Track component)

**Envelope Interaction:**
- `EnvelopeInteractionLayer.tsx` - Transparent overlay for envelope editing
  - Handles all envelope mouse interactions (add, drag, delete points)
  - Implements eating behavior: calculates and reports hidden points during drag
  - Positioned absolutely at track level over clips
  - Uses non-linear dB scale for vertical positioning
  - Constants: `CLICK_THRESHOLD = 10px`, `ENVELOPE_LINE_FAR_THRESHOLD = 4px`, `SNAP_THRESHOLD_TIME = 0.05s`

**Selection:**
- `useAudioSelection` - Composite hook for time, track, clip, and spectral selection
- `TimeSelectionCanvasOverlay.tsx` - Renders time selection overlay
- `SpectralSelectionOverlay.tsx` - Renders spectral selection overlay

**Rulers:**
- `VerticalRuler.tsx` - Amplitude ruler for waveform view (linear scale)
- `FrequencyRuler.tsx` - Frequency ruler for spectrogram view (Mel scale)
- `VerticalRulerPanel.tsx` - Ruler panel with automatic mode switching
  - Single amplitude ruler for waveform mode
  - Single frequency ruler for spectrogram mode
  - Dual rulers (frequency on top, amplitude on bottom) for split view mode
  - Dual amplitude rulers (left/right channels) for stereo waveform mode

### Key Components in `apps/sandbox/` (New Architecture)

**Main Canvas:**
- `Canvas.tsx` - Main rendering coordinator (~788 lines, reduced from 2,121 lines via refactoring)
  - Manages track layout, time selection, spectral selection
  - Coordinates TrackNew components, label rendering, and overlays
  - Uses custom hooks for modular interaction handling
  - Wraps labels in overflow container to clip without hiding focus outline

**Custom Hooks:**
- `useClipDragging.ts` - Handles clip dragging with multi-select support (~180 lines)
- `useClipTrimming.ts` - Handles clip left/right edge trimming (~175 lines)
- `useLabelDragging.ts` - Handles label drag interactions (~100 lines)

**Label Rendering:**
- `LabelRenderer.tsx` - Dedicated component for rendering labels (~420 lines)
  - Renders label ears (resize handles), stalks, and banners
  - Handles all label mouse interactions (resize, drag, selection)
  - Implements label expansion behavior (click to expand to all tracks)
  - Uses absolute positioning with proper z-index management

**Label Utilities:**
- `labelLayout.ts` - Label layout calculation utilities
  - `calculateLabelRows()` - Greedy packing algorithm for label row assignment
  - Sorts labels by start time (left-most label gets row 0 at top)
  - Point labels use fixed 60px width for overlap detection
  - Region labels use actual duration * pixelsPerSecond for width
  - `isPointInLabel()` - Hit testing for label click detection
  - Constants: `EAR_HEIGHT=14`, `LABEL_BOX_GAP=2`, `DEFAULT_POINT_LABEL_WIDTH=60`

**Track Type System:**
- Tracks have `type?: 'audio' | 'label'` property
- Label tracks (`type: 'label'`) hide the 20px clip header recess
- Audio tracks (default) show the darkened clip header area
- Track type determines rendering behavior, not just presence of labels

**Overflow Handling:**
- Labels wrapped in container with `overflow: hidden` to clip overflowing content
- Parent track wrapper uses `overflow: visible` to preserve focus outline
- Focus outline rendered outside element bounds (not clipped by overflow hidden)

### Key Components in `apps/demo/clip-envelope/` (Legacy)

**Main Controller:**
- `ClipEnvelopeEditor.tsx` - Root component managing all state, mouse events, and interactions
  - Manages tracks, clips, selections, drag states
  - Coordinates between TrackCanvas, Toolbar, TrackHeader components
  - Contains all mouse event handlers and state management logic

**Rendering:**
- `TrackCanvas.tsx` - Canvas-based rendering engine (LEGACY - being replaced by TrackNew)
  - Draws waveforms, envelope curves, overlays, time selections
  - Uses HTML5 Canvas API for performance
  - Receives props from ClipEnvelopeEditor (controlled component pattern)

**UI Components:**
- `Toolbar.tsx` - Top toolbar with "Clip Envelopes" toggle
- `ResizableTrackHeader.tsx` - Track labels with resize handles
- `ResizableRuler.tsx` - Timeline ruler with resize
- `TimelineRuler.tsx` - Time markers
- `Tooltip.tsx` - dB value tooltip

**Data:**
- `types.ts` - TypeScript interfaces (Clip, Track, EnvelopePoint, DragState, etc.)
- `theme.ts` - Theme system (light/dark modes)

### Audio Rendering Architecture

**Non-Linear dB Scale:**
- Uses cubic power curve (x³) for visual dB positioning
- 0dB positioned at ~2/3 down the clip height
- Range: -60dB to +12dB, with -∞ at bottom 1px
- Functions: `dbToYNonLinear()`, `yToDbNonLinear()` in ClipEnvelopeEditor.tsx

**Canvas Rendering Order (TrackCanvas.tsx):**
1. Clip background (track-specific colors)
2. Clip header (with rounded corners)
3. Envelope fill (automation overlay)
4. Time selection overlay (if present)
5. Automation overlay within selection (if in envelope mode)
6. Waveform (scaled by envelope curve)
7. Envelope line and control points
8. Clip borders

**Automation Overlay States:**
There are 6 distinct overlay states based on envelope mode, selection, and time selection. See `docs/automation-overlay-states.md` for the complete state matrix.

Key states:
- **Active** (envelope mode ON): `rgba(255, 255, 255, 0.5)`
- **Idle** (envelope mode OFF, has points): `rgba(255, 255, 255, 0.6)`
- **Time selection overlays**: Track-specific blended colors or pure white

**Clip Styling States:**
Clips have 10 combined visual states based on:
- Selection (selected/unselected)
- Hover state (idle/hover on header)
- Time selection (present/absent)
- Envelope mode (on/off)

See `docs/clip-styling-states.md` for the complete state matrix.

### Envelope Interaction Model (New Architecture)

**Simplified Interaction Model:**
- **Click near line (0-4px)**: Add new control point at click position
- **Click on existing point**: Delete the point
- **Drag existing point**: Move point, eating (hiding) any points passed over
- **Movement threshold**: 3px to distinguish click from drag

**Point Eating Behavior:**
- When dragging a point horizontally, any points between start and current position are hidden
- Hidden points are visually removed from both the line and control points during drag
- On mouse up, hidden points are permanently deleted
- Special case: dragging to time=0 (clip origin) hides ALL other points

**Horizontal Snapping:**
- Points snap to existing points within 0.05s (50ms)
- Helps align points across clips

**Mouse Event Flow:**
1. `EnvelopeInteractionLayer` handles all envelope mouse events (down, move, up)
2. Maintains drag state in ref: `dragStateRef` (type: 'point' | 'segment')
3. Calculates hidden points during drag and calls `onHiddenPointsChange` callback
4. `TrackNew` tracks hidden points per clip in Map state
5. Passes hidden indices to `ClipDisplay` → `ClipBody`
6. `ClipBody` filters envelope rendering to exclude hidden points

**Constants:**
- `TRACK_HEIGHT = 114` (default)
- `CLIP_HEADER_HEIGHT = 20`
- `CLICK_THRESHOLD = 10` (pixels for detecting clicks on points)
- `ENVELOPE_LINE_FAR_THRESHOLD = 4` (max distance from line for interaction)
- `ENVELOPE_MOVE_THRESHOLD = 3` (pixels to distinguish click from drag)
- `SNAP_THRESHOLD_TIME = 0.05` (snap within 0.05 seconds)
- `TIME_EPSILON = 0.001` (for detecting clip origin)

## Important Patterns

### State Management
- **Controlled Components**: TrackCanvas is fully controlled by ClipEnvelopeEditor
- **Ref-Based Drag State**: All drag operations use refs to avoid re-render during drag
- **Cursor Updates**: `updateCursor()` called on mouse move to set hover states and cursor style

### Theme System
- Centralized in `@audacity-ui/tokens` (package) and `clip-envelope/app/theme.ts` (legacy)
- Themes define colors for every visual state (see `Theme` interface)
- Track-specific colors: Blue (track1), Violet (track2), Magenta (track3)

### Canvas Performance
- Waveforms use high sample counts (50,000 samples per second) for solid appearance
- Canvas cleared and redrawn on every state change
- Drawing optimizations: batch operations, avoid unnecessary clears

## Migration Notes

**Current Migration Status:**
- ✅ Monorepo infrastructure setup (pnpm workspaces)
- ✅ `@audacity-ui/core` package created with types
- ✅ `@audacity-ui/tokens` package created with theme
- ✅ `@audacity-ui/components` package created with UI components
- ✅ Demo moved to `apps/demo/clip-envelope/`
- ✅ Sandbox app (`apps/sandbox/`) uses new component architecture (TrackNew, ClipDisplay, EnvelopeInteractionLayer)
- ✅ Storybook (`apps/docs/`) showcasing all components
- ✅ **Canvas.tsx refactored** - Reduced from 2,121 to 788 lines (62.8% reduction)
  - ✅ Extracted clip dragging logic to `useClipDragging` hook
  - ✅ Extracted clip trimming logic to `useClipTrimming` hook
  - ✅ Extracted label dragging logic to `useLabelDragging` hook
  - ✅ Extracted label rendering to `LabelRenderer` component
  - ✅ Extracted label layout utilities to `labelLayout.ts`
  - ✅ Removed 619 lines of dead code
- ✅ **Track type system** - Audio vs label tracks properly differentiated
- ✅ **Vertical rulers** - Dual rulers for split view (frequency + amplitude)
- ⏳ Legacy demo still uses local types/theme (not importing from packages)
- ⏳ No `@audacity-ui/audio-components` yet

**Next Steps (per roadmap):**
1. Extract basic UI components to `@audacity-ui/components`
2. Extract complex audio components to `@audacity-ui/audio-components`
3. Migrate demo to consume packages instead of local files
4. Setup Storybook in `apps/docs/`
5. Publish packages to npm

**When Extracting Components:**
- Prefer controlled component pattern (consumer manages state)
- Export both component and prop types
- Use composition over configuration
- Provide sensible defaults but allow full customization

## Key Files Reference

**Types & Theme:**
- `packages/core/src/types/index.ts` - All TypeScript interfaces
- `packages/tokens/src/index.ts` - Theme definitions
- `apps/demo/clip-envelope/app/components/types.ts` - Legacy types (to be removed)
- `apps/demo/clip-envelope/app/theme.ts` - Legacy theme (to be removed)

**Sandbox App (New Architecture):**
- `apps/sandbox/src/components/Canvas.tsx` - Main canvas coordinator (~788 lines, down from 2,121)
- `apps/sandbox/src/components/LabelRenderer.tsx` - Label rendering component (~420 lines)
- `apps/sandbox/src/hooks/useClipDragging.ts` - Clip dragging hook (~180 lines)
- `apps/sandbox/src/hooks/useClipTrimming.ts` - Clip trimming hook (~175 lines)
- `apps/sandbox/src/hooks/useLabelDragging.ts` - Label dragging hook (~100 lines)
- `apps/sandbox/src/utils/labelLayout.ts` - Label layout utilities (~130 lines)
- `apps/sandbox/src/contexts/TracksContext.tsx` - Track state management with track type system

**Legacy Demo Components:**
- `apps/demo/clip-envelope/app/components/ClipEnvelopeEditor.tsx` - State management & events (~1200 lines)
- `apps/demo/clip-envelope/app/components/TrackCanvas.tsx` - Canvas rendering (~1000 lines)

**Documentation:**
- `docs/design-system-architecture.md` - Design system plan
- `docs/automation-overlay-states.md` - 6 automation overlay states
- `docs/clip-styling-states.md` - 10 clip styling states
- `docs/label-interactions.md` - Label selection, deletion, and track expansion behavior

## Build System

- **Packages**: Use tsup (esbuild-based) for fast TypeScript compilation
  - Outputs: CJS (`dist/index.js`), ESM (`dist/index.mjs`), Types (`dist/index.d.ts`)
  - Config in each `package.json` via `build` script

- **Demo**: Uses Next.js 16 with Turbopack
  - Config: `apps/demo/clip-envelope/next.config.js`
  - Tailwind CSS 4 via `@tailwindcss/postcss`

## Version Control

- Repository renamed from `clip-envelopes-prototype` to `audacity-design-system`
- Default branch: `master`
- Git submodule: `apps/demo/clip-envelope` (separate git repo)
- `.gitignore` excludes: `node_modules/`, `dist/`, `pnpm-lock.yaml`, `.claude/`

## Package Publishing (Future)

Packages will be published under `@audacity-ui/*` scope to npm registry:
- `@audacity-ui/core`
- `@audacity-ui/tokens`
- `@audacity-ui/components`
- `@audacity-ui/audio-components`

Use independent versioning (each package has own version number).
