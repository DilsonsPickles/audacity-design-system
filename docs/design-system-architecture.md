# Design System Architecture Plan

## Overview

This document outlines a comprehensive plan for extracting the audio editing components from this prototype into a reusable design system that can feed components to future demos and projects.

## Current State Analysis

### Existing Components

**Core UI Components:**
- `TimelineRuler` - Timeline ruler with time markers
- `Ruler` - Base ruler component
- `Toolbar` - Top toolbar with controls
- `Tooltip` - Tooltip component
- `TrackHeader` - Track identification and controls
- `ResizableRuler` - Ruler with resize capability
- `ResizableTrackHeader` - Track header with resize capability

**Complex Interactive Components:**
- `ClipEnvelopeEditor` - Main editor with drag, selection, and envelope editing
- `TrackCanvas` - Canvas-based track rendering with waveforms and automation

**Shared Resources:**
- `types.ts` - TypeScript interfaces (Clip, Track, EnvelopePoint, etc.)
- `theme.ts` - Comprehensive theme system with light/dark modes
- `automation-overlay-states.md` - Documentation of overlay states
- `clip-styling-states.md` - Documentation of clip styling

### Technology Stack
- **Framework**: Next.js 16.0.2 (React 19.2.0)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Rendering**: HTML5 Canvas for waveforms and automation

### Dependencies
- Minimal external dependencies (React, Next.js, Tailwind)
- Self-contained with custom canvas rendering
- No audio processing libraries (uses mock data)

## Design System Architecture

### Recommended Structure: Monorepo

A monorepo approach using a modern package manager provides the best balance of maintainability and developer experience.

```
audacity-design-system/
├── packages/
│   ├── core/                      # Core primitives and utilities
│   │   ├── src/
│   │   │   ├── types/             # Shared TypeScript interfaces
│   │   │   ├── theme/             # Theme system
│   │   │   ├── utils/             # Utility functions
│   │   │   └── hooks/             # Shared React hooks
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── components/                # UI Component library
│   │   ├── src/
│   │   │   ├── Ruler/
│   │   │   ├── Toolbar/
│   │   │   ├── Tooltip/
│   │   │   ├── TrackHeader/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── audio-components/          # Complex audio editing components
│   │   ├── src/
│   │   │   ├── TrackCanvas/
│   │   │   ├── ClipEnvelopeEditor/
│   │   │   ├── WaveformRenderer/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── tokens/                    # Design tokens (colors, spacing, etc.)
│       ├── src/
│       │   ├── colors.ts
│       │   ├── spacing.ts
│       │   ├── typography.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── docs/                      # Storybook or documentation site
│   │   ├── stories/
│   │   └── package.json
│   │
│   └── demo/                      # Example implementations
│       ├── clip-envelope/         # Current prototype (migrated)
│       └── package.json
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # Workspace configuration (if using pnpm)
├── turbo.json                     # Turborepo configuration (optional)
└── tsconfig.base.json             # Shared TypeScript config
```

## Package Breakdown

### 1. `@audacity-ui/core`

**Purpose**: Foundation layer with shared types, utilities, and theme system

**Exports**:
```typescript
// Types
export * from './types/clip'
export * from './types/track'
export * from './types/envelope'
export * from './types/theme'

// Theme
export { lightTheme, darkTheme, ThemeProvider, useTheme } from './theme'

// Utilities
export { dbToYNonLinear, yToDbNonLinear } from './utils/audio'
export { generateWaveform } from './utils/waveform'

// Hooks
export { useMouseDrag } from './hooks/useMouseDrag'
export { useCanvasSize } from './hooks/useCanvasSize'
```

**Key Features**:
- Zero React dependencies for types and utilities
- Theme system with CSS-in-JS or CSS variables
- Pure functions for audio calculations
- Well-documented TypeScript interfaces

### 2. `@audacity-ui/tokens`

**Purpose**: Design tokens for consistent styling across applications

**Exports**:
```typescript
export const colors = {
  canvas: { light: '#212433', dark: '#1a1a1a' },
  clipBackground: {
    track1: { base: '#6DB9FF', selected: '#C0D9FF' },
    track2: { base: '#C1BFFE', selected: '#D5D3FE' },
    track3: { base: '#ECA0D9', selected: '#EFD1EA' }
  },
  envelope: {
    line: '#ff6600',
    lineHover: '#ffaa00',
    fill: 'rgba(255, 255, 255, 0.5)',
    fillIdle: 'rgba(255, 255, 255, 0.6)'
  }
  // ... etc
}

export const spacing = {
  clipHeaderHeight: 24,
  infinityZoneHeight: 4,
  // ... etc
}
```

**Key Features**:
- Platform-agnostic token definitions
- Easy to consume in any framework
- Can generate CSS variables or Tailwind config
- Supports theming

### 3. `@audacity-ui/components`

**Purpose**: Basic UI components (non-audio-specific)

**Components**:
- `Ruler` - Timeline ruler
- `Toolbar` - Generic toolbar component
- `Tooltip` - Tooltip component
- `ResizablePanel` - Generic resizable panel
- `Button`, `Input`, etc. (if needed)

**Example Usage**:
```tsx
import { Ruler, Toolbar } from '@audacity-ui/components'

<Toolbar>
  <Button>Play</Button>
</Toolbar>
<Ruler
  startTime={0}
  endTime={10}
  pixelsPerSecond={100}
/>
```

**Key Features**:
- Headless or styled variants
- Composition-based API
- Accessibility built-in
- Fully typed with TypeScript

### 4. `@audacity-ui/audio-components`

**Purpose**: Complex audio editing components

**Components**:
- `TrackCanvas` - Canvas-based track rendering
- `ClipEnvelopeEditor` - Full envelope editing experience
- `WaveformRenderer` - Waveform visualization
- `TimeSelection` - Time selection overlay
- `TrackHeader` - Audio track header

**Example Usage**:
```tsx
import { ClipEnvelopeEditor } from '@audacity-ui/audio-components'
import { useAudioData } from './my-audio-logic'

function MyEditor() {
  const { tracks, updateTrack } = useAudioData()

  return (
    <ClipEnvelopeEditor
      tracks={tracks}
      onTracksChange={updateTrack}
      theme="dark"
    />
  )
}
```

**Key Features**:
- Canvas-based rendering for performance
- Controlled components (state managed by consumer)
- Customizable via props and theming
- Comprehensive event callbacks

## Distribution Strategy

### Package Manager: pnpm + Changesets

**Why pnpm?**
- Fast, efficient disk usage with content-addressable storage
- Strict dependency resolution prevents phantom dependencies
- Built-in workspace support
- Industry standard for monorepos

**Why Changesets?**
- Semantic versioning automation
- Changelog generation
- Coordinate releases across packages
- Great developer experience

### Build Tool: Tsup or Vite Library Mode

**Recommended: Tsup**
```json
// package.json (in each package)
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  }
}
```

**Features**:
- Zero config TypeScript compilation
- CommonJS + ESM dual output
- Type declaration generation
- Fast builds with esbuild

### Publishing Strategy

**Option 1: npm Registry (Public)**
- Publish to npm under `@audacity-ui/*` scope
- Free for open source
- Best for public design systems
- Easy to consume via `npm install`

**Option 2: GitHub Packages (Private)**
- Host on GitHub Packages
- Good for private/internal design systems
- Requires authentication to install
- Free for public repos, paid for private

**Option 3: Verdaccio (Self-hosted)**
- Self-hosted npm registry
- Full control over packages
- Good for air-gapped environments
- Requires infrastructure

**Recommendation**: Start with npm public registry if open source, GitHub Packages if private.

### Versioning Strategy

Use **independent versioning** (each package has its own version):

```bash
# Example versions
@audacity-ui/core@1.2.0
@audacity-ui/tokens@1.0.5
@audacity-ui/components@2.1.0
@audacity-ui/audio-components@0.9.0
```

**Benefits**:
- Packages evolve at their own pace
- Breaking changes don't affect all packages
- Clearer dependency tracking

## Migration Path

### Phase 1: Setup Infrastructure (Week 1)

**Tasks**:
1. Create monorepo structure
   ```bash
   mkdir audacity-design-system
   cd audacity-design-system
   pnpm init
   ```

2. Setup workspace configuration
   ```yaml
   # pnpm-workspace.yaml
   packages:
     - 'packages/*'
     - 'apps/*'
   ```

3. Configure shared TypeScript config
   ```json
   // tsconfig.base.json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "jsx": "react-jsx",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true
     }
   }
   ```

4. Setup build tools (tsup, changeset)
   ```bash
   pnpm add -Dw tsup @changesets/cli
   pnpm changeset init
   ```

### Phase 2: Extract Core & Tokens (Week 1-2)

**Tasks**:
1. Create `@audacity-ui/core` package
   - Extract `types.ts` → `src/types/`
   - Extract utility functions (dB calculations, etc.)
   - Setup build configuration

2. Create `@audacity-ui/tokens` package
   - Extract `theme.ts` → token definitions
   - Organize by category (colors, spacing, etc.)
   - Generate TypeScript + CSS variable outputs

3. Write unit tests
   - Test utility functions
   - Test type guards
   - Validate token outputs

### Phase 3: Extract UI Components (Week 2-3)

**Tasks**:
1. Create `@audacity-ui/components` package
   - Extract `Ruler`, `Toolbar`, `Tooltip`
   - Make components composition-friendly
   - Add prop interfaces and documentation

2. Setup Storybook for component documentation
   ```bash
   cd apps/docs
   npx storybook@latest init
   ```

3. Write stories for each component
   - Showcase different states
   - Document props and variants
   - Add accessibility notes

### Phase 4: Extract Audio Components (Week 3-4)

**Tasks**:
1. Create `@audacity-ui/audio-components` package
   - Extract `TrackCanvas` with all rendering logic
   - Extract `ClipEnvelopeEditor` as controlled component
   - Separate concerns (rendering vs. state management)

2. Refactor to controlled components
   ```tsx
   // Before (uncontrolled)
   function ClipEnvelopeEditor() {
     const [tracks, setTracks] = useState(initialTracks)
     // ...
   }

   // After (controlled)
   function ClipEnvelopeEditor({ tracks, onTracksChange }) {
     // Consumer manages state
   }
   ```

3. Add comprehensive prop callbacks
   - `onEnvelopePointAdd`
   - `onEnvelopePointMove`
   - `onEnvelopePointDelete`
   - `onClipSelect`
   - `onTimeSelection`

### Phase 5: Migrate Prototype to Consume Design System (Week 4)

**Tasks**:
1. Create `apps/demo/clip-envelope` using current prototype as base
2. Replace local components with design system imports
   ```tsx
   // Before
   import { ClipEnvelopeEditor } from './components/ClipEnvelopeEditor'

   // After
   import { ClipEnvelopeEditor } from '@audacity-ui/audio-components'
   ```
3. Validate functionality is preserved
4. Document any breaking changes or improvements

### Phase 6: Documentation & Publishing (Week 5)

**Tasks**:
1. Write comprehensive README files for each package
2. Create migration guide for future demos
3. Setup CI/CD for automated publishing
   ```yaml
   # .github/workflows/release.yml
   name: Release
   on:
     push:
       branches: [main]
   jobs:
     release:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: pnpm/action-setup@v2
         - run: pnpm install
         - run: pnpm build
         - run: pnpm changeset publish
   ```
4. Publish first versions to registry

## Usage in Future Demos

### Example: New Audio Feature Demo

```bash
# Create new Next.js app
npx create-next-app@latest my-audio-demo

# Install design system packages
cd my-audio-demo
pnpm add @audacity-ui/core @audacity-ui/audio-components @audacity-ui/tokens

# Start building
```

```tsx
// app/page.tsx
'use client'
import { ClipEnvelopeEditor } from '@audacity-ui/audio-components'
import { lightTheme } from '@audacity-ui/tokens'
import { useState } from 'react'

export default function Demo() {
  const [tracks, setTracks] = useState([
    {
      id: 1,
      name: 'Track 1',
      clips: [/* ... */]
    }
  ])

  return (
    <ClipEnvelopeEditor
      tracks={tracks}
      onTracksChange={setTracks}
      theme={lightTheme}
    />
  )
}
```

### Benefits for Future Demos

1. **Faster Development**: Reuse battle-tested components
2. **Consistency**: All demos use same visual language
3. **Maintainability**: Fix bugs once, benefit everywhere
4. **Documentation**: Storybook provides interactive examples
5. **Type Safety**: Full TypeScript support across packages
6. **Flexibility**: Compose components for different use cases

## Component API Design Principles

### 1. Composition Over Configuration

**Good**:
```tsx
<TrackCanvas>
  <WaveformLayer />
  <EnvelopeLayer />
  <TimeSelectionLayer />
</TrackCanvas>
```

**Less Good**:
```tsx
<TrackCanvas
  showWaveform={true}
  showEnvelope={true}
  showTimeSelection={true}
/>
```

### 2. Controlled Components

Always let the consumer manage state:

```tsx
function MyEditor() {
  const [tracks, setTracks] = useState(initialTracks)

  return (
    <ClipEnvelopeEditor
      tracks={tracks}
      onTracksChange={setTracks}
    />
  )
}
```

### 3. Escape Hatches

Provide low-level access when needed:

```tsx
<TrackCanvas
  onCanvasRender={(ctx, dimensions) => {
    // Custom rendering if needed
  }}
/>
```

### 4. Sensible Defaults

Make common cases easy:

```tsx
// Minimal usage
<Ruler startTime={0} endTime={10} />

// Advanced usage
<Ruler
  startTime={0}
  endTime={10}
  pixelsPerSecond={100}
  showMilliseconds={true}
  customFormatter={(time) => formatTime(time)}
/>
```

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

```tsx
// packages/audio-components/src/TrackCanvas/TrackCanvas.test.tsx
import { render } from '@testing-library/react'
import { TrackCanvas } from './TrackCanvas'

describe('TrackCanvas', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TrackCanvas tracks={[]} />
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('calls onTrackClick when track is clicked', () => {
    const onTrackClick = jest.fn()
    // ... test implementation
  })
})
```

### Visual Regression Tests (Chromatic or Percy)

Integrate with Storybook to catch visual changes:

```bash
pnpm add -Dw chromatic
pnpm chromatic --project-token=<token>
```

### Integration Tests (Playwright)

Test full workflows in demo apps:

```typescript
// apps/demo/e2e/envelope-editing.spec.ts
import { test, expect } from '@playwright/test'

test('can add envelope point by clicking', async ({ page }) => {
  await page.goto('/')
  await page.click('.clip-canvas', { position: { x: 100, y: 50 } })
  await expect(page.locator('.envelope-point')).toHaveCount(1)
})
```

## Future Enhancements

### 1. Audio Engine Integration

Currently uses mock data. Future version could integrate real audio:

```tsx
import { AudioEngine } from '@audacity/audio-engine'

<ClipEnvelopeEditor
  audioEngine={audioEngine}
  tracks={tracks}
/>
```

### 2. Plugin System

Allow extensions without modifying core:

```tsx
import { VolumePlugin, PanPlugin } from '@audacity-ui/plugins'

<ClipEnvelopeEditor
  tracks={tracks}
  plugins={[VolumePlugin, PanPlugin]}
/>
```

### 3. Accessibility Enhancements

- Keyboard navigation for all interactions
- Screen reader announcements
- ARIA labels and roles
- Focus management

### 4. Performance Optimizations

- Virtual scrolling for many tracks
- Web Workers for heavy calculations
- OffscreenCanvas for background rendering
- Memoization strategies

### 5. Advanced Theming

- Runtime theme switching
- Custom theme builder UI
- Theme interpolation (animated transitions)
- CSS-in-JS vs CSS variables trade-offs

## Conclusion

This design system architecture provides:

✅ **Modularity**: Packages can be consumed independently
✅ **Maintainability**: Clear separation of concerns
✅ **Scalability**: Easy to add new components
✅ **Developer Experience**: Great tooling and documentation
✅ **Reusability**: Perfect for future demos and projects
✅ **Type Safety**: Full TypeScript coverage
✅ **Performance**: Optimized build outputs
✅ **Flexibility**: Composition-based APIs

The migration can be done incrementally over 5 weeks, and the resulting design system will serve as a solid foundation for all future Audacity UI development.

## Next Steps

1. **Review this plan** with stakeholders
2. **Decide on package naming** (`@audacity-ui/*` vs `@audacity/*`)
3. **Choose registry** (npm public, GitHub Packages, or self-hosted)
4. **Create repository** and initialize monorepo structure
5. **Start with Phase 1** (infrastructure setup)
6. **Iterate and refine** based on learnings

---

**Questions or feedback?** Open an issue or start a discussion in the repository.
