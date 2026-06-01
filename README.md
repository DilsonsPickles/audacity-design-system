# Audacity Design System

A monorepo containing reusable UI components for audio editing applications, built with React, TypeScript, and modern tooling.

## 📦 Packages

### `@audacity-ui/core`
Core types and utilities for the Audacity Design System.

```bash
pnpm add @audacity-ui/core
```

**Exports:**
- TypeScript interfaces: `Clip`, `Track`, `EnvelopePoint`, `TimeSelection`, etc.
- Drag state types: `DragState`, `EnvelopeDragState`, `EnvelopeSegmentDragState`

### `@audacity-ui/tokens`
Design tokens including colors, themes, and styling constants.

```bash
pnpm add @audacity-ui/tokens
```

**Exports:**
- `lightTheme` - Light theme configuration
- `darkTheme` - Dark theme configuration
- `Theme` interface

### `@dilsonspickles/components`
UI component library with track controls and interface elements.

```bash
pnpm add @dilsonspickles/components
```

**Components:**
- `TrackControlPanel` - Complete track control interface with volume, mute/solo, and effects

## 🏗️ Structure

```
audacity-design-system/
├── packages/
│   ├── core/                 # Core types and utilities
│   ├── tokens/               # Design tokens and themes
│   └── components/           # UI component library
│       └── TrackControlPanel # Track control panel component
├── apps/
│   └── demo/
│       └── clip-envelope/    # Clip envelope editing demo
├── docs/                     # Architecture documentation
└── CLAUDE.md                 # AI assistant guidance
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Installation

```bash
# Install pnpm if you haven't
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode (watch mode)
pnpm dev
```

### Working with Packages

**Build a specific package:**
```bash
cd packages/core
pnpm build
```

**Watch mode for development:**
```bash
cd packages/core
pnpm dev
```

## 📖 Documentation

- [Design System Architecture](docs/design-system-architecture.md) - Comprehensive plan for the design system
- [Automation Overlay States](docs/automation-overlay-states.md) - Documentation of automation overlay states
- [Clip Styling States](docs/clip-styling-states.md) - Complete clip styling state matrix

## 🎯 Current Demo

The clip envelope prototype demonstrates:

- **Multi-track canvas** with draggable clips
- **Clip envelope editing** with visual control points
- **Real-time waveform gain visualization**
- **Time selection** across single or multiple tracks
- **Track selection** with visual feedback
- **Envelope visualization** with translucent fill showing applied gain

### Running the Demo

```bash
cd apps/demo/clip-envelope
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the prototype.

## 🛠️ Tech Stack

- **Framework**: React 19, Next.js 16
- **Language**: TypeScript 5
- **Build Tool**: tsup (esbuild)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS 4
- **Rendering**: HTML5 Canvas

## 🔮 Roadmap

- [x] Setup monorepo infrastructure
- [x] Create `@audacity-ui/core` package
- [x] Create `@audacity-ui/tokens` package
- [x] Create `@dilsonspickles/components` (basic UI components)
  - [x] TrackControlPanel component
- [ ] Create `@audacity-ui/audio-components` (complex audio components)
- [ ] Setup Storybook for component documentation
- [ ] Migrate demo to use published packages
- [ ] Setup CI/CD for automated publishing
- [ ] Publish to npm registry

## 📝 License

MIT

## 🤝 Contributing

This is currently a prototype project for Audacity development.

---

**Built with ❤️ for the Audacity community**
