# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Navigation

Start with **`docs/codebase-map.md`** — the canonical "where does X live" index for this monorepo. Prefer it over hunting through directories.

## Working Here — Agent Onboarding

This codebase is deliberately kept agent-ready: typed (no unguarded `any`), tested, and mapped. Keep it that way.

### Gates — run before every commit

```bash
pnpm --filter @audacity-ui/sandbox test        # sandbox suite
pnpm --filter @dilsonspickles/components test  # components suite
npx tsc --noEmit                               # inside whichever package you touched
node scripts/check-any.mjs                     # from repo root
```

**The baseline is fully green** (as of 2026-07-11: sandbox 290 passed, components 75 passed, 0 tsc errors in both, guard 0 violations). If a gate fails, your change caused it — do not assume pre-existing breakage. Every `any` (including `as any`, `Record<string, any>`, etc.) needs a `// justified: <reason>` comment or the guard fails.

### Load-bearing conventions — violating these causes real bugs

- **Ref-mirror for document listeners**: hooks that bind document-level `mousemove`/`mouseup`/`keyup` listeners bind ONCE and mirror frequently-changing props into refs (`useEffect(() => { ref.current = val }, [val])`) so the handler reads live state without re-binding. See the explanatory comment in `apps/sandbox/src/hooks/useClipTrimming.ts` (~lines 85–96). Exception: self-cleaning attach-on-mousedown/remove-on-mouseup handlers (e.g. `useDraggableToolbar`) don't need it.
- **App.tsx hook order is a dependency chain** — never reorder: `recordingManagerRef` → `usePlaybackControls` (creates `audioManagerRef`) → `useRecording` → `useLoopRegion` → `useKeyboardShortcuts`. Also: `useCanvasScrollSync` must come after `useZoomControls`.
- **Provider order**: `PreferencesProvider` sits ABOVE `ThemeProvider` (`preferences.theme` gates `ThemedApp`); `LoopRegionProvider` sits inside `PlaybackProvider` (its consumers use `usePlayback().audioManagerRef`).
- **Canvas Shift+Click time-range logic lives on `click`, not `mousedown`** (it must fire after `useAudioSelection`'s mouseup). In `useCanvasPointerHandlers`, `onMouseMove`/`onMouseLeave` must keep chaining `containerProps.*` or the ew-resize hover cursor strands.
- **ClipBody perf contract**: the pixel redraw is keyed on `useDeferredValue(height)` (`drawHeight`); CSS sizing uses the live `height`. Never swap these. No allocations inside per-pixel draw loops.
- **`useKeyboardShortcuts` is an order-coupled guard chain** — handlers early-return in sequence; insert new handlers deliberately, don't append blindly.
- **`pendingClipMoveResolution`** is a module-scoped singleton ref shared by Canvas, `useCmdArrowMove`, `useTrackKeyboardHandlers`, and `useKeyboardShortcuts` — import it, never recreate it.
- **Accessibility profile ids** are `'au4-tab-groups'` and `'wcag-flat'`. Unknown ids silently fall back to flat navigation — always pass a real id (this exact footgun silently broke the TrackNew tests for months).
- **Preferences persistence**: ONE localStorage key (`'audacity-preferences'`), whole-blob JSON, merge-on-load (`{ ...defaults, ...stored }`). Hot consumers use the domain slice hooks (`useGeneralPrefs` / `useAppearancePrefs` / `useEditingBehaviorPrefs`); the preferences modal uses the full `usePreferences`.

### Refactoring discipline

- Behavior-preserving is the default. Move code VERBATIM; disclose any deliberate change in the commit message.
- Deliberately-unwired UI exists — do not "fix" it in passing: the PreferencesModal footer Reset button is a stub; several EditingPage/AudioSettingsPage/SpectralDisplayPage controls are intentionally not persisted; the Music and Advanced-options nav items have no pages.

### Product rules (user decisions — never violate)

- Time-stretch applies to AUDIO clips only; `MidiClip` never gets `stretchFactor`.
- Clip-group copies never tether to original groups: a fresh group is created iff a whole group is copied whole; otherwise copies are ungrouped.
- Time-selection drags never mutate track selection; the selection's vertical scope lives on `TimeSelection.tracks`, resolved via scope → `selectedTrackIndices` → all tracks.

## Repository Overview

This is a **pnpm monorepo** for the Audacity Design System - a collection of reusable UI components for audio editing applications.

**Current State**: Active monorepo with published packages. The sandbox app (`apps/sandbox/`) is the full Audacity UI implementation and uses components from the packages.

## Apps (`apps/`)

| App | Description |
|-----|-------------|
| `sandbox` | Vite + React 19 dev app — the full Audacity UI implementation lives here. Package name `@audacity-ui/sandbox`. Dev server on port 5173. |
| `desktop` | Electron wrapper that loads the built sandbox (`apps/desktop/src/main.cjs`, `preload.cjs`). |
| `docs` | Storybook site for component documentation. |
| `static-smoke` | Minimal standalone-render regression page. |

## Packages (`packages/`)

| Package | Description |
|---------|-------------|
| `@audacity-ui/core` | Core TypeScript types and accessibility utilities. |
| `@audacity-ui/tokens` | Design tokens (themes, colors). |
| `@dilsonspickles/components` | UI component library (100+ components including ClipDisplay, TrackNew, EnvelopeInteractionLayer, EffectsPanel, etc.). |
| `@audacity-ui/audio` | Tone.js audio playback (`packages/audio/src/AudioPlaybackManager.ts`). |

## Development Commands

### Monorepo (Root)
```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Watch all packages in development mode
pnpm dev

# Run sandbox app only
pnpm sandbox

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

### Sandbox Application
```bash
# Run the sandbox app (port 5173)
cd apps/sandbox
pnpm dev
pnpm build
pnpm lint
```

## Testing

### Commands
```bash
# Run all tests across the monorepo
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Coverage report
pnpm test:coverage

# Run tests for a single package
pnpm --filter @audacity-ui/sandbox test
pnpm --filter @dilsonspickles/components test

# Run a single test file (from inside the package)
npx vitest run TrackNew
```

### Stack
- **Vitest 4** — test runner (configured in each package's `vitest.config.ts`)
- **jsdom** — browser environment for component tests
- **@testing-library/react 16** — React 19 rendering and queries
- **@testing-library/jest-dom** — DOM assertion matchers (imported in setup file)
- **Canvas mock** — `packages/components/src/__tests__/setup.ts` stubs `HTMLCanvasElement.getContext`

### Test File Locations
```
packages/components/src/
  __tests__/setup.ts                           # Global setup (canvas mock, jest-dom)
  utils/__tests__/envelope.test.ts             # Envelope utility functions
  utils/__tests__/spectrogramScales.test.ts    # Spectrogram scale utilities
  Track/__tests__/TrackNew.test.tsx            # TrackNew interaction tests
```

### Writing Component Tests

**Required providers** — Components using hooks (`useContainerTabGroup`, `useTheme`, `usePreferences`, etc.) need context wrappers. IMPORTANT: pass a REAL profile id to `AccessibilityProfileProvider` — omitting it (or passing an unknown id) silently falls back to flat navigation and roving-tabindex assertions will fail mysteriously:
```tsx
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        {children}
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}
```
Components reading preferences additionally need `PreferencesProvider` (outermost — see `packages/components/src/PreferencesModal/__tests__/pages.test.tsx` for a working example).

**Scoped queries** — Always query from the `container` returned by `render()`, not from `document`. React 19 + jsdom does not reliably clean up between tests, so `document.querySelector` can return stale elements from previous renders:
```tsx
// GOOD — scoped to this render
const { container } = render(<Providers><MyComponent /></Providers>);
const el = container.querySelector('[data-clip-id="1"]');

// BAD — can find elements from previous tests
const el = document.querySelector('[data-clip-id="1"]');
```

**Explicit cleanup** — Add `afterEach(cleanup)` at the top of every test file:
```tsx
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
```

**Focus events** — Use `act(() => { element.focus(); })` for focus/blur, not `fireEvent.focus()`. React 19 processes native `focusin`/`focusout` events; `fireEvent.focus` dispatches a non-bubbling `focus` event that React's delegation may miss.

**Keyboard events** — Use `fireEvent.keyDown(element, { key, metaKey, shiftKey })` for keyboard interactions. Works correctly with React 19 event delegation when the target element is within a properly scoped render.

**Conventions:**
- Place tests in `__tests__/` directories adjacent to the code they test
- Use `fireEvent` (not `userEvent`) for direct control over modifier keys (`metaKey`, `shiftKey`, `ctrlKey`)
- Query elements by `data-*` attributes or ARIA roles, not CSS classes
- Each test should be independent — no shared mutable state between tests

## Architecture

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

### Key Components in `apps/sandbox/`

**Main Canvas:**
- `Canvas.tsx` - Rendering coordinator (~770 lines after decomposition — see `docs/codebase-map.md`)
  - Wires interaction hooks together and assembles selection/overlay state
  - Per-track rendering lives in `components/canvas/CanvasTrackList.tsx` (TrackNew wiring + clip handler bodies + ~10 tracks-reducer dispatch types — deliberate, mirrors pre-decomposition Canvas)
  - Overlays are presentational components in `components/canvas/` (SnapGuideline, SplitPreviewLine, MarqueeRect)
  - Wraps labels in overflow container to clip without hiding focus outline

**Custom Hooks (interaction):**
- `useClipDragging.ts` / `useClipTrimming.ts` / `useClipStretching.ts` - Mouse clip editing (ref-mirror pattern)
- `useLabelDragging.ts` - Label drag interactions
- `useCanvasPointerHandlers.ts` - The canvas container's nine mouse handlers (click/selection/context-menu/double-click)
- `useTrackKeyboardHandlers.ts` - Track navigate/reorder keyboard handling
- `useCmdArrowMove.ts` - Cmd/Ctrl-release overlap resolution for keyboard clip moves
- `useCanvasScrollSync.ts` - Wheel-zoom + two-pane scroll echo-absorb sync
- App-level: `useProjectLifecycle`, `useMenuDefinitions`, `useElectronMenuBridge`, `usePlugins`, `useDraggableToolbar`, `useMasterMeter`, `useAudioDeviceMenu` (see codebase-map for the full list)

**Label Rendering:**
- `LabelRenderer.tsx` - Dedicated component for rendering labels
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

### Audio Rendering Architecture

**Non-Linear dB Scale:**
- Uses cubic power curve (x³) for visual dB positioning
- 0dB positioned at ~2/3 down the clip height
- Range: -60dB to +12dB, with -∞ at bottom 1px
- Functions: `dbToYNonLinear()`, `yToDbNonLinear()` — canonical exported versions in `packages/components/src/utils/envelope.ts` (local copies also exist in `Track.tsx` and `EnvelopeInteractionLayer.tsx`)

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

### Envelope Interaction Model

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

**Constants** (in `packages/components/src/EnvelopeInteractionLayer/EnvelopeInteractionLayer.tsx`):
- `CLICK_THRESHOLD = 10` (pixels for detecting clicks on points)
- `ENVELOPE_LINE_FAR_THRESHOLD = 4` (max distance from line for interaction)
- `ENVELOPE_MOVE_THRESHOLD = 3` (pixels to distinguish click from drag)
- `SNAP_THRESHOLD_TIME = 0.05` (snap within 0.05 seconds)
- `TIME_EPSILON = 0.001` (for detecting clip origin)

Other layout constants:
- `CLIP_HEADER_HEIGHT = 20` — local constant in `packages/components/src/Track/Track.tsx`
- `DEFAULT_TRACK_HEIGHT = 114` — in `apps/sandbox/src/constants/canvas.ts`

## Important Patterns

### State Management
- **Tracks reducer domain split**: `TracksContext.tsx` holds the state shape, `TracksProvider`, and the outer `tracksReducer` (undo/redo + coalescing). Domain mutation logic lives in `apps/sandbox/src/contexts/reducers/` (one sub-reducer per domain), routed by `reducers/domains.ts`. See `docs/codebase-map.md` → "Tracks reducer — domain split".
- **Ref-Based Drag State**: All drag operations use refs to avoid re-render during drag
- **Cursor Updates**: `updateCursor()` called on mouse move to set hover states and cursor style

### Theme System
- Centralized in `@audacity-ui/tokens` package
- Themes define colors for every visual state (see `Theme` interface)
- Track-specific colors: Blue (track1), Violet (track2), Magenta (track3)

### Canvas Performance
- Waveforms use high sample counts (50,000 samples per second) for solid appearance
- Canvas cleared and redrawn on every state change
- Drawing optimizations: batch operations, avoid unnecessary clears

## Current Development Status

- ✅ Monorepo infrastructure setup (pnpm workspaces)
- ✅ `@audacity-ui/core` package — types and accessibility utilities
- ✅ `@audacity-ui/tokens` package — theme tokens
- ✅ `@dilsonspickles/components` package — full UI component library
- ✅ `@audacity-ui/audio` package — Tone.js audio playback
- ✅ Sandbox app (`apps/sandbox/`) — full Audacity UI implementation
- ✅ `desktop` app — Electron wrapper of sandbox
- ✅ **Track type system** - Audio vs label tracks properly differentiated
- ✅ **Vertical rulers** - Dual rulers for split view (frequency + amplitude)
- ✅ **Effects panel** - Complete with tab navigation and grid keyboard navigation
- ✅ **Accessibility** - Tab groups, roving tabindex, composite widgets, WCAG compliance
- ✅ **Type campaign** — whole-app `any` elimination, enforced by `scripts/check-any.mjs` (every `any` carries `// justified:`)
- ✅ **Structural decomposition** (fable5-finalize, 2026-07-11) — App.tsx 1864→1244, Canvas.tsx 1959→771, PreferencesModal 1979→210; LoopRegionContext + preference domain slices extracted; per-page modal files
- ✅ **Green test/type baseline** — both packages fully green (no pre-existing failures to work around)

**Next Steps (per roadmap):**
1. Setup Storybook stories in `apps/docs/` for component documentation
2. Publish packages to npm registry

**When Extracting Components:**
- Prefer controlled component pattern (consumer manages state)
- Export both component and prop types
- Use composition over configuration
- Provide sensible defaults but allow full customization

## Key Files Reference

**Core Packages:**
- `packages/core/src/types/index.ts` - All TypeScript interfaces
- `packages/core/src/accessibility/` - Accessibility utilities (tab groups, profiles)
- `packages/components/src/hooks/useTabGroup.ts` - Per-item roving tabindex hook (ProjectToolbar, EffectsPanel)
- `packages/components/src/hooks/useContainerTabGroup.ts` - Container-level roving tabindex hook (Toolbar, SelectionToolbar, TrackNew clips)
- `packages/tokens/src/index.ts` - Theme definitions and tokens
- `packages/audio/src/AudioPlaybackManager.ts` - Tone.js audio playback manager

**Sandbox Application:**
- `apps/sandbox/src/App.tsx` - Application shell: context header, routing state, provider tree, JSX assembly (~1244 lines; orchestration extracted to hooks — see codebase-map)
- `apps/sandbox/src/components/Canvas.tsx` - Canvas coordinator (~770 lines); per-track render in `components/canvas/CanvasTrackList.tsx`
- `apps/sandbox/src/components/LabelRenderer.tsx` - Label rendering component
- `apps/sandbox/src/components/{Transport,Project}ToolbarContainer.tsx` - Toolbar wiring containers
- `apps/sandbox/src/hooks/` - Interaction + app-orchestration hooks (deps-object + typed-return convention; see codebase-map for the full table)
- `apps/sandbox/src/utils/labelLayout.ts` - Label layout utilities
- `apps/sandbox/src/contexts/TracksContext.tsx` - Track state (shape + provider + undo wrapper); domain logic in `contexts/reducers/`
- `apps/sandbox/src/contexts/PlaybackContext.tsx` / `LoopRegionContext.tsx` - Value-provider contexts (App calls the hook, provides the return object)
- `apps/sandbox/src/constants/canvas.ts` - Canvas layout constants (e.g. `DEFAULT_TRACK_HEIGHT`)

**Documentation:**
- `docs/codebase-map.md` - Canonical "where does X live" index (see Navigation section above)
- `docs/design-system-architecture.md` - Design system plan
- `docs/automation-overlay-states.md` - 6 automation overlay states
- `docs/clip-styling-states.md` - 10 clip styling states
- `docs/label-interactions.md` - Label selection, deletion, and track expansion behavior
- `docs/accessibility-architecture.md` - Roving tabindex hooks, tab group system, keyboard navigation patterns
- `docs/keyboard-handlers-map.md` - Complete keyboard handler location reference

## Build System

- **Packages**: Use tsup (esbuild-based) for fast TypeScript compilation
  - Outputs: CJS (`dist/index.js`), ESM (`dist/index.mjs`), Types (`dist/index.d.ts`)
  - Config in each `package.json` via `build` script

- **Sandbox**: Vite + React 19 (`apps/sandbox/vite.config.ts`)

- **Desktop**: Electron wrapping the built sandbox output

## Version Control

- Repository originally named `clip-envelopes-prototype`
- Default branch: `master`
- `.gitignore` excludes: `node_modules/`, `dist/`, `pnpm-lock.yaml`, `.claude/`

## Package Publishing (Future)

Packages will be published under their current scoped names to the npm registry:
- `@audacity-ui/core`
- `@audacity-ui/tokens`
- `@dilsonspickles/components`
- `@audacity-ui/audio`

Use independent versioning (each package has its own version number).
