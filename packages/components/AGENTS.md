# Building an Audacity-style UI with `@dilsonspickles/components`

This file is written for AI coding agents working in a consumer repo. It is the playbook for assembling a full Audacity-style audio editor UI out of the components this package ships. Read top-to-bottom for first-time setup; jump to sections by name for targeted tasks.

**Source of truth.** The working reference implementation is `apps/sandbox` in the source repo (https://github.com/DilsonsPickles/audacity-design-system). When the recipes here are not enough, read those files — they are how the package authors themselves use the library.

---

## 1. What this package is

A React component library for building DAW-style audio editing UIs. It ships:

- **Layout primitives**: `ApplicationHeader`, `ProjectToolbar`, `Toolbar`, `EditorLayout` building blocks, `SidePanel`, `ResizablePanel`, `PanelHeader`
- **Audio surfaces**: `Track` / `TrackNew`, `Clip`, `ClipBody`, `ClipHeader`, `TimelineRuler`, `VerticalRuler`, `PlayheadCursor`, `EnvelopeCurve`, `WaveformPreview`
- **Selection overlays**: `TimeSelectionCanvasOverlay`, `SpectralSelectionOverlay`, `SelectionToolbar`
- **Transport / control**: `TransportButton`, `TransportToolbar`-compatible primitives, `ToolButton`, `ToggleToolButton`
- **Dialogs**: `Dialog`, `PreferencesModal`, `ExportModal`, `SaveProjectModal`, `WelcomeDialog`, `PluginBrowserDialog`, `EffectDialog`, `AlertDialog`
- **Tabs / home**: `HomeTab`, `ProjectThumbnail`, `Carousel`, `TabList` / `Tab` / `TabItem`
- **MIDI**: `PianoRoll`, `NoteRect`, `MidiClipBody`
- **Effects**: `EffectsPanel`, `MixerPanel`, `MixerChannel`, `MixerFader`, `MasterMeter`, `TrackMeter`

What it does **not** ship: the audio engine, project persistence, keyboard shortcut dispatcher, undo/redo stack. Those are application concerns the consumer brings.

---

## 2. Install

```bash
pnpm add @dilsonspickles/components
# peer deps the package does not bundle:
pnpm add react@^18 react-dom@^18
```

Stylesheet (required — components are unstyled without it):

```ts
import '@dilsonspickles/components/style.css';
```

The MusescoreIcon font ships inside `dist/` and is auto-referenced from the stylesheet — no extra setup needed.

---

## 3. Provider tree

Two providers are **required** for most components to render without throwing:

```tsx
import {
  ThemeProvider,
  AccessibilityProfileProvider,
  PreferencesProvider,
  darkTheme,
} from '@dilsonspickles/components';

<PreferencesProvider>
  <ThemeProvider theme={darkTheme}>
    <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
      {/* app */}
    </AccessibilityProfileProvider>
  </ThemeProvider>
</PreferencesProvider>
```

- `ThemeProvider` — required. Theme tokens drive every component's colors.
- `AccessibilityProfileProvider` — required for keyboard navigation primitives (roving tabindex, focus management). Without it, hooks like `useContainerTabGroup` fall back to defaults but tab navigation will be flat sequential.
- `PreferencesProvider` — required if you render `PreferencesModal` or use `usePreferences`. Otherwise optional.

Both `useTheme()` and `useAccessibilityProfile()` return safe defaults when called outside their providers (added in 0.2.0) so isolated components rendered without a provider tree will not crash. This is the "standalone mode" — useful for static rendering / SSR / docs sites.

Themes available out of the box: `lightTheme`, `darkTheme`. To customize, pass any object matching `ThemeTokens` (typed export). Common pattern (from the sandbox):

```tsx
function ThemedApp() {
  const { preferences } = usePreferences();
  const theme = preferences.theme === 'dark' ? darkTheme : lightTheme;
  return <ThemeProvider theme={theme}>{/* … */}</ThemeProvider>;
}
```

---

## 4. Layout shell — the four pillars

A full editor view stacks four regions vertically inside a `100vh` flex column. Skeleton:

```tsx
import {
  ApplicationHeader,
  ProjectToolbar,
  HomeTab,
  ToastContainer,
} from '@dilsonspickles/components';

export function EditorShell() {
  const [activeMenuItem, setActiveMenuItem] = useState<'home' | 'project' | 'export' | 'debug'>('home');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <ApplicationHeader os="mac" menuDefinitions={menuDefinitions} />
      <ProjectToolbar activeItem={activeMenuItem} onMenuItemClick={setActiveMenuItem} />

      {activeMenuItem === 'home' && <HomeTab projects={projects} {/* … */} />}
      {activeMenuItem === 'project' && <YourEditorView />}

      <ToastContainer />
    </div>
  );
}
```

**Pillar responsibilities:**

1. **`ApplicationHeader`** — OS-style menu bar. `menuDefinitions` is a `MenuDefinition[]` describing the top-level menus and their items. Wire callbacks per item. Sandbox uses a `createMenuDefinitions({ onSave, onExport, … })` factory pattern — copy that approach.
2. **`ProjectToolbar`** — the left side-rail with Home / Project / Export tabs. Controlled by `activeItem` and `onMenuItemClick`.
3. **The active surface** — your editor view (tracks + transport) when on the project tab; `<HomeTab>` for the home tab.
4. **`ToastContainer`** — render once, anywhere visible. Call `toast.success(msg)` / `toast.error(msg)` from anywhere to push notifications.

---

## 5. Core data shapes

These are the types the audio surfaces consume. The consumer owns state; the components are rendering-only.

```ts
interface Track {
  id: number;
  name: string;
  clips: Clip[];
  height?: number;
  channelSplitRatio?: number; // 0..1, stereo top-channel ratio
}

interface Clip {
  id: number;
  name: string;
  startTime: number;       // seconds
  duration: number;        // seconds
  waveform: number[];      // sample amplitudes, -1..1
  envelopePoints: EnvelopePoint[];
  selected?: boolean;
  deletedRegions?: DeletedRegion[];
}

interface EnvelopePoint {
  time: number; // seconds, relative to clip start
  db: number;   // -Infinity..+12
}

interface Label {
  id: string;
  trackIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  lowFrequency?: number;   // present = spectral label
  highFrequency?: number;
  selected?: boolean;
}

interface TimeSelection {
  startTime: number;
  endTime: number;
  trackIndex?: number; // omit for "all tracks"
}

interface SpectralSelection {
  startTime: number;
  endTime: number;
  minFrequency: number; // 0..1, normalized
  maxFrequency: number;
  trackIndex: number;
  clipId?: number;
}
```

Import the full set from `@dilsonspickles/components` (or the underlying `@audacity-ui/core` if you need the raw types only).

**State management is unopinionated.** The sandbox happens to use React Context + `useReducer` (`TracksProvider`, `TracksContext`) — fine to copy. But the components don't require it; pass arrays/objects however you manage them. Required pattern: tracks live in *one* source of truth that gets mutated through actions (add clip, move clip, edit envelope, etc.), then re-rendered. Don't sprinkle state across components.

---

## 6. Building each main surface

### 6a. Home tab (project picker)

```tsx
import { HomeTab } from '@dilsonspickles/components';

<HomeTab
  projects={projects}                    // your project list
  onNewProject={handleNewProject}
  onOpenProject={(id) => loadProject(id)}
  onDeleteProject={handleDelete}
/>
```

`HomeTab` has built-in sections for new/recent projects and an Audio.com account card. Authoritative prop list is in `dist/index.d.ts`.

### 6b. Editor view — tracks + transport

The editor view is *not* a single component; it's a composition of the audio surfaces. Recipe:

```tsx
<>
  <TransportToolbar {/* play / stop / record buttons + time code */} />

  <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
    {/* Left: track headers (control panels) */}
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tracks.map(track => (
        <TrackControlPanel key={track.id} track={track} {/* mute, solo, pan, fader */} />
      ))}
    </div>

    {/* Right: timeline + canvases, scrollable */}
    <div style={{ flex: 1, overflow: 'auto' }} onScroll={handleScroll}>
      <TimelineRuler pixelsPerSecond={pps} duration={duration} />
      {tracks.map((track, i) => (
        <TrackNew
          key={track.id}
          clips={track.clips}
          trackIndex={i}
          width={canvasWidth}
          height={track.height ?? 114}
          pixelsPerSecond={pps}
          envelopeMode={envelopeMode}
          onClipClick={handleClipClick}
          onClipHeaderClick={handleClipHeaderClick}
        />
      ))}
      <PlayheadCursor position={playhead} pixelsPerSecond={pps} height={totalHeight} />
      <TimeSelectionCanvasOverlay selection={timeSelection} pixelsPerSecond={pps} {/* … */} />
    </div>
  </div>
</>
```

**`Track` vs `TrackNew`** — `TrackNew` is the modern component-based renderer (clips are React components, envelope edits use a transparent overlay). `Track` is the older canvas-only path. Use `TrackNew` for new work.

### 6c. Effects panel (right side rail)

```tsx
<SidePanel side="right" defaultWidth={320}>
  <EffectsPanel
    track={selectedTrack}
    effects={track.effects}
    onAddEffect={openPickerMenu}
    onRemoveEffect={removeEffect}
  />
</SidePanel>
```

`EffectsPanel` is purely rendering — open the actual VST UI through `EffectDialog`. Plug-in browsing goes through `PluginBrowserDialog`.

### 6d. Preferences modal

```tsx
<PreferencesModal
  isOpen={isPrefsOpen}
  onClose={() => setIsPrefsOpen(false)}
  activePage={activePage}
  onPageChange={setActivePage}
/>
```

Built-in pages: general, appearance, audio, recording, midi, keyboard. The authoritative prop list is in `dist/index.d.ts`.

### 6e. Dialogs + context menus

Treat these as portaled overlays that don't affect layout. The sandbox uses a `<DialogProvider>` + `<ContextMenuProvider>` pattern with hooks (`useDialogs()`, `useContextMenus()`) to centralize open/close state. Copy that pattern — having dialog state in a context makes it trivial to open dialogs from menu items, keyboard shortcuts, or context menus without prop-drilling.

```tsx
<AppDialogs />          {/* mounts: PreferencesModal, ExportModal, SaveProjectModal, … */}
<AppContextMenus />     {/* mounts: ClipContextMenu, TrackContextMenu, … */}
```

`AppDialogs` and `AppContextMenus` are not exported by the package — they're consumer code. Build them as thin wrappers that subscribe to your dialog/menu state and render the matching component. See `apps/sandbox/src/components/AppDialogs.tsx` and `AppContextMenus.tsx` for the pattern.

---

## 7. Extending

A few built-in surfaces accept render-slot props so consumers can inject UI without forking the component (e.g. `Dialog` accepts `headerContent`). Check `dist/index.d.ts` for each component's prop surface before forking. If a slot you need does not exist, raise it upstream rather than wrapping the component.

---

## 8. State patterns worth copying from the sandbox

These are not exported, but they are well-tested patterns. Read the sandbox files and copy them:

- **`apps/sandbox/src/contexts/TracksContext.tsx`** — track state with a typed reducer. Actions include `ADD_CLIP`, `MOVE_CLIP`, `TRIM_CLIP_LEFT`, `EDIT_ENVELOPE`, etc. The reducer pattern keeps mutations debuggable.
- **`apps/sandbox/src/hooks/useClipDragging.ts`** — multi-select clip drag with snapping. Composes with `TrackNew`.
- **`apps/sandbox/src/hooks/useClipTrimming.ts`** — edge-handle trim with snap-to-grid.
- **`apps/sandbox/src/hooks/useLabelDragging.ts`** — label drag with overlap detection.
- **`apps/sandbox/src/hooks/useKeyboardShortcuts.ts`** — central keymap, dispatches to handler modules under `hooks/handlers/`.
- **`apps/sandbox/src/hooks/useZoomControls.ts`** — pixels-per-second zoom with anchored zooming.

When implementing one of these capabilities, start by reading the sandbox file. Adapt — do not reinvent — unless you have a concrete reason.

---

## 9. Accessibility notes

- The accessibility profile system supports two modes: `'au4-tab-groups'` (composite-widget roving tabindex — Tab moves *between* groups, arrow keys move *within*) and `'au3-sequential'` (Tab moves linearly through every focusable). Choose via `<AccessibilityProfileProvider initialProfileId="…">`.
- Components that participate in tab groups use the `useContainerTabGroup` hook internally. If you build a custom focusable region that should join the same scheme, use `useContainerTabGroup` or `useTabGroup` from `@dilsonspickles/components`.
- Focus outlines render via CSS `:focus-visible` against `theme.border.focus`. Make sure your custom theme defines that token.

---

## 10. Build / bundler notes

- The package is dual-published (CJS + ESM). Vite, webpack 5, Next.js, and Astro should pick up the ESM build automatically.
- CSS is a separate file (`dist/index.css`). Import once at app entry.
- Workspace siblings (`@audacity-ui/core`, `@audacity-ui/tokens`) are bundled into `dist` and not declared as runtime dependencies — consumers do not need to install them. Types from `@audacity-ui/core` are re-exported via this package.
- React 18 and React 19 both work as peer deps. The smoke tests in CI cover React 18.

---

## 11. When something breaks

1. **"Invalid hook call" / null `useContext`** — two copies of React in resolution. Common in monorepos. Check `node_modules/react` is singular; check the dev server isn't symlinking the package against a different React than your app uses.
2. **Components render without styles** — `import '@dilsonspickles/components/style.css'` missing or imported after another stylesheet that resets it.
3. **Icons render as boxes** — the MusescoreIcon font is in `dist/`; check your bundler isn't stripping `.ttf` files from the publish or the CSS `url()` reference.
4. **Tab navigation feels wrong** — wrong `AccessibilityProfileProvider initialProfileId`. Try `'au4-tab-groups'` (roving) or `'au3-sequential'` (flat).
5. **Canvas blurry on Retina** — should not happen as of 0.2.1. If it does, the component bypassed `devicePixelRatio` scaling — file a bug.

---

## 12. Where to look next

- **Working app**: `apps/sandbox/` in the source repo. Run it (`pnpm dev` from `apps/sandbox`) to see every surface composed together.
- **Storybook**: `apps/docs/` — per-component examples in isolation. Run with `pnpm storybook`.
- **Type definitions**: `dist/index.d.ts` ships in the published package — your editor's go-to-definition is authoritative on prop shapes.
