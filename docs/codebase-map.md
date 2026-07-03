# Codebase Map

"Start here" navigation index — answers "where does X live?" for a context-free agent.
For background on any section, follow the deep-dive doc links at the bottom.

---

## Packages (`packages/`)

| Published name | Directory | What it owns |
|---|---|---|
| `@audacity-ui/core` | `packages/core/` | Shared TypeScript interfaces and accessibility utilities (tab groups, roving tabindex, a11y profiles) |
| `@audacity-ui/tokens` | `packages/tokens/` | Design tokens — theme definitions, color palettes, typography values |
| `@dilsonspickles/components` | `packages/components/` | 100+ UI components: ClipDisplay, TrackNew, EnvelopeInteractionLayer, EffectsPanel, rulers, overlays, etc. |
| `@audacity-ui/audio` | `packages/audio/` | Tone.js-backed audio playback; entry point is `packages/audio/src/AudioPlaybackManager.ts` |

---

## Apps (`apps/`)

| App | Directory | What it owns |
|---|---|---|
| `@audacity-ui/sandbox` | `apps/sandbox/` | Vite + React 19 full UI — the primary development and testing target; dev server on port 5173; run tests with `pnpm --filter @audacity-ui/sandbox test` |
| Desktop | `apps/desktop/` | Electron wrapper around the built sandbox; main process entry is `apps/desktop/src/main.cjs` |
| `@audacity-ui/docs` | `apps/docs/` | Storybook component documentation site |
| `@dilsonspickles/static-smoke` | `apps/static-smoke/` | Standalone-render regression page for smoke-testing component output without the full app |

---

## Where State Lives (`apps/sandbox/src/contexts/`)

| File | What it owns |
|---|---|
| `TracksContext.tsx` | Hub for all track/clip state — large reducer pattern with 28+ state props and 68+ actions; most audio-editing state flows through here |
| `DialogContext.tsx` | Dialog open/close state (wraps `useDialogState` hook); replaces prop drilling of ~15 dialog states |
| `ContextMenuContext.tsx` | Context-menu visibility and positioning (wraps `useContextMenuState` hook); manages 8 menu types |
| `SpectralSelectionContext.tsx` | Spectral selection read/write — 6 properties |
| `AudioEngineContext.tsx` | Audio engine service (refs + methods, no React state) |

User preferences state is the exception — it lives in the components package, not here: `packages/components/src/contexts/PreferencesContext.tsx` (consumed app-wide via `usePreferences`; not yet decomposed into domain-specific contexts — see known debt).

---

## Where Interactions Live

### Drag / gesture hooks (`apps/sandbox/src/hooks/`)

| File | What it owns |
|---|---|
| `useClipDragging.ts` | Clip drag with multi-select support |
| `useClipTrimming.ts` | Clip left/right edge trimming |
| `useClipStretching.ts` | Clip time-stretching |
| `useMarqueeSelection.ts` | Rubber-band marquee selection |
| `useZoomControls.ts` | Zoom in/out, fit-to-window |
| `useGrabToPan.ts` | Middle-click / grab-to-pan scrolling |
| `useLoopRegion.ts` | Loop region drag and resize |
| `useLabelDragging.ts` | Label drag interactions |
| `useKeyboardShortcuts.ts` | **Keyboard routing hub** — delegates to domain handlers below |

### Keyboard handlers (`apps/sandbox/src/hooks/handlers/`)

| File | What it owns |
|---|---|
| `clipboardHandlers.ts` | Cut / copy / paste / duplicate |
| `deleteHandlers.ts` | Delete / clear selection |
| `navigationHandlers.ts` | Arrow keys, Home/End, J/K clip-edge nav |
| `playheadSelectionHandlers.ts` | Playhead move, selection extend |
| `transportHandlers.ts` | Space/play/stop/record transport keys |

---

## Where Rendering Happens

| File | What it owns |
|---|---|
| `packages/components/src/Track/TrackNew.tsx` | Component-based track renderer — lays out clips, positions EnvelopeInteractionLayer overlays |
| `packages/components/src/ClipBody/ClipBody.tsx` | Canvas-based clip body — waveform, spectrogram, and envelope fill drawing |
| `apps/sandbox/src/components/Canvas.tsx` | Main rendering coordinator — manages track layout, time/spectral selection, coordinates TrackNew components and label rendering (see also: known debt below) |

---

## Big-and-Scary Files (Known Debt)

These are not-yet-decomposed monoliths. They work but are prime targets for future extraction.

| File | What it owns |
|---|---|
| `apps/sandbox/src/App.tsx` | Application root — wires up provider tree and top-level routing; accumulates bootstrap concerns |
| `apps/sandbox/src/components/EditorLayout.tsx` | Full editor chrome — toolbar, track panel, ruler, transport bar all in one component; not yet split by region |
| `apps/sandbox/src/components/Canvas.tsx` | Track/clip/label rendering coordinator and interaction dispatcher; multiple concerns not yet separated |
| `apps/sandbox/src/contexts/TracksContext.tsx` | Monolithic tracks reducer; all track and clip mutations live here; decomposition into domain reducers is planned |
| `packages/components/src/PreferencesModal/PreferencesModal.tsx` | Preferences UI; all preference panels in one file |

---

## Existing Deep-Dive Docs (`docs/`)

| File | What it covers |
|---|---|
| `accessibility-architecture.md` | Roving tabindex hooks, tab group system, keyboard navigation patterns, WCAG compliance |
| `keyboard-handlers-map.md` | Complete map of every keyboard handler and where it lives |
| `automation-overlay-states.md` | 6 automation overlay visual states (envelope mode × selection × time-selection) |
| `clip-styling-states.md` | 10 combined clip visual states (selection × hover × time-selection × envelope mode) |
| `label-interactions.md` | Label selection, deletion, track expansion, and drag behavior |
| `spectral-selection.md` | Spectral selection model and rendering |
| `waveform-envelope-scaling.md` | How the envelope curve scales waveform rendering; non-linear dB math |
| `track-view-navigation.md` | Track view keyboard navigation and scroll behavior |
| `design-system-architecture.md` | Monorepo design system roadmap and package structure plan |
| `clip-interactions.md` | Clip interaction model (drag, trim, stretch, selection) |
| `debugging-protocol.md` | Debugging workflow and conventions |
| `playback-tracking.md` | Playhead and playback position tracking |
