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
| `TracksContext.tsx` | Hub for all track/clip state. Holds the state shape, the `TracksProvider`, and the outer `tracksReducer` (which owns UNDO/REDO + undo-history coalescing). Domain mutation logic is **not** here — it lives in `contexts/reducers/` (see below). Most audio-editing state flows through here |
| `DialogContext.tsx` | Dialog open/close state (wraps `useDialogState` hook); replaces prop drilling of ~15 dialog states |
| `ContextMenuContext.tsx` | Context-menu visibility and positioning (wraps `useContextMenuState` hook); manages 8 menu types |
| `SpectralSelectionContext.tsx` | Spectral selection read/write — 6 properties |
| `AudioEngineContext.tsx` | Audio engine service (refs + methods, no React state) |
| `PlaybackContext.tsx` | Value-provider for playback (`usePlayback()`): App calls `usePlaybackControls` and provides its return — consumers read `audioManagerRef`/`isPlaying`/etc. from context instead of drilled props |
| `LoopRegionContext.tsx` | Value-provider for loop-region drag/resize (`useLoopRegionContext()`): App calls `useLoopRegion` (needs App-local `timeSelection`/`bpm`/`beatsPerMeasure`) and provides its return, same pattern as `PlaybackContext` |

User preferences state is the exception — it lives in the components package, not here: `packages/components/src/contexts/PreferencesContext.tsx` (consumed app-wide via `usePreferences`). It's now split into domain-slice hooks over the same provider — `useGeneralPrefs()`, `useAppearancePrefs()`, `useEditingBehaviorPrefs()` — so consumers that only need one slice don't re-render on unrelated preference changes; `usePreferences()` still returns the full value for existing callers.

### Tracks reducer — domain split (`apps/sandbox/src/contexts/reducers/`)

`tracksReducer` is two layers: the **outer** wrapper in `TracksContext.tsx` (undo/redo + coalescing) delegates all domain logic to `innerReducer`, which is pure routing — it maps each action to one domain via `domains.ts` and calls that domain's sub-reducer. To change how an action behaves, edit its domain reducer; to add an action, add it to the `TracksAction` union, map it in `domains.ts` (the `Record<TracksAction['type'], Domain>` type fails the build if you forget), and handle it in the domain reducer.

| File | Domain / responsibility |
|---|---|
| `domains.ts` | `ACTION_DOMAIN` — the action→domain routing table (compiler-enforced exhaustive) |
| `tracksDomainReducer.ts` | Track add/update/delete/move/height/view/ruler/spectrogram |
| `clipsReducer.ts` | Clip add/update/delete/move/trim/stretch/placement, group/ungroup, labels, time-range cut |
| `selectionReducer.ts` | Clip/track/label selection, focus, hovered point |
| `envelopeReducer.ts` | Envelope points + envelope mode toggles |
| `effectsReducer.ts` | Track + master effects chains |
| `midiReducer.ts` | Piano-roll + MIDI note/clip actions |
| `viewReducer.ts` | View modes, playhead, time selection, cut mode, snap |
| `recordingReducer.ts` | Recording start/stop/meters |

Behavior is locked by `__tests__/tracksReducer.characterization.test.ts` and `__tests__/reducerRouting.test.ts`.

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
| `useSplitTool.ts` | Split-mode click-to-split tool — state, Shift-sync + hover effects, and the split mouse-handler branches (extracted from Canvas; wired back into Canvas's guard chain in order) |
| `useCanvasPointerHandlers.ts` | Canvas's nine mouse handlers (mousedown/move/up/contextmenu across clips, labels, marquee, split) — extracted verbatim from Canvas |
| `useDragHighlightIds.ts` | Derives `draggingClipIds` (mouse-drag ghosting) / `raisedClipIds` (Cmd+Arrow z-index lift) that Canvas uses to highlight clips mid-drag |
| `useTrackKeyboardHandlers.ts` | Track-level vertical navigation + selection keyboard handling |
| `useCmdArrowMove.ts` | Cmd/Ctrl-release overlap resolution for Cmd+Arrow clip moves — listens for keyup, reconciles final clip positions against neighbors |
| `useDraggableToolbar.ts` | Transport toolbar gripper-drag: floating position + top/bottom dock snapping |
| `useKeyboardShortcuts.ts` | **Keyboard routing hub** — delegates to domain handlers below |

**EditorLayout effect hooks** (extracted from EditorLayout; each a self-contained `useEffect`):
| File | What it owns |
|---|---|
| `usePianoRollSmoothScroll.ts` | RAF ease-out scroll to the selected MIDI clip; returns `skipPianoRollScrollRef` |
| `useAutoOpenPianoRoll.ts` | Opens the piano roll when a MIDI track gains focus |
| `useDrawerTabAutoSwitch.ts` | Switches the bottom-drawer tab when mixer/piano-roll open/close |
| `useTimeSelectionTabHandler.ts` | Global keydown: Tab behavior during a time selection |
| `useFlatNavTabRouter.ts` | Global keydown: flat-nav Tab interception + DOM-ordered focus routing |

**EditorLayout interaction hooks** (deps-object convention — take an explicit deps object, return handlers/state; extracted from EditorLayout):
| File | What it owns |
|---|---|
| `useMeasuredWidth.ts` | `ResizeObserver`-backed `clientWidth` of a ref'd element (`useLayoutEffect`, so the value is settled before first paint); feeds `TimelineRuler`'s `viewportWidth` |
| `useRulerFlyout.ts` | Vertical-ruler flyout state + hit-testing — right-click-anywhere context menu (`handleRulerContextMenu`) and per-track keyboard/click activation (`openRulerFlyoutForTrack`); owns `rulerTriggerRef` (read by `<RulerFlyout>` for focus restoration on close) |
| `useTimelineRulerInteractions.ts` | Handler bundle for the timeline-ruler wrapper: Escape/Shift+F10 context menu, Arrow-key playhead nudge (with snap math), mouse-cursor time tracking, async click-to-play, right-click context menu |
| `useTrackPanelHandlers.ts` | Per-track control-panel handlers factored out of EditorLayout's `state.tracks.map(...)` render loop — mute/solo (plain + Cmd/Ctrl-exclusive), focus/reorder/vertical-nav, add-label, menu, click/range-selection, Tab/Shift+Tab routing. Exports `toggleScopeOrTrackSelection`, the single copy shared by the track panel's `onToggleSelection` and Canvas's `onContainerEnter` Cmd/Ctrl+Enter branch |

**App effect/state hooks** (extracted from App.tsx): `useFocusDebugger`, `useMixerPanelListener`, `useTimeCodeFormats`, `useLocalStorageBackedState<T>`, `useInitialTrackSelection`, `useProjectAutoSave`, `useCloudProjectCleanup` — each a self-contained state/effect cluster. Big handler flows (side-effectful — DOM/network/toasts/IndexedDB; take explicit deps objects) live in `utils/`: `generateTone.ts`, `importAudio.ts`, `saveCloudProject.ts`.

**App.tsx orchestration hooks** (later extraction pass — the cloud-load flow, menu wiring, and scroll/zoom sync that used to be inline in App.tsx):
| File | What it owns |
|---|---|
| `useProjectLifecycle.ts` | New/open/close/delete project flow, including cloud-project loading and the missing-plugins scan on open |
| `useMenuDefinitions.ts` | Builds the in-app menu definition tree (File/Edit/View/etc.) from current app state and callbacks |
| `useElectronMenuBridge.ts` | Routes native Electron menu clicks to the same handlers the in-app menu uses, by label lookup; desktop-only |
| `useCanvasScrollSync.ts` | Wheel-zoom and two-pane (canvas + track-header) scroll sync |
| `useMasterMeter.ts` | Master output meter + master volume, reading the audio engine's dedicated master `Tone.Meter` |
| `useAudioDeviceMenu.ts` | "Audio setup" menu anchor + selected recording/playback device + available `MediaDeviceInfo` lists |
| `usePlugins.ts` | Plugin list state, syncing installed/disabled effects, missing-plugin detection on project load |

Pure geometry helpers used by Canvas + the split tool live in `apps/sandbox/src/utils/canvasGeometry.ts` (`resolveTrackIndexFromY`, `buildSplitForTrack`). Other extracted `utils/`: `canvasLayout.ts` (Canvas layout math), `snapGuideline.ts` (snap-guideline time calculation for trim/stretch), `clipKeyboardEdit.ts` (keyboard trim/stretch batch + announcement text, used by `CanvasTrackList`), `envelopePointSizes.ts` (projects an `EnvelopePointStyle` profile down to the size fields Canvas needs), `findMissingEffects.ts` (scans a project for effects the user doesn't have installed), `cloudProjects.ts` (loads a cloud project into the `StoredProject` shape). `packages/components/src/ClipBody/waveformGeometry.ts` holds the equivalent pure waveform-pixel-geometry helpers for `ClipBody`.

EditorLayout's focus routing and track-management math are extracted the same way: `focusRouting.ts` — pure DOM-query helpers (`findTrackControlPanelByIndex`, `findFirstButtonInTrackControlPanel`, `findLastButtonInTrackControlPanel`, `resolveTrackDropIndex`, `findFirstClipInTrack`, `findLastClipInTrack`, `findTrackRulerByIndex`, `findTrackContainerByIndex`, `findSelectionToolbarFirstGroup`) that only locate elements — they never call `.focus()` or dispatch, leaving that to the caller. `trackManagement.ts` — pure id/name allocation + duplication math for `onAddTrackType`/`onDuplicateTrack` (`nextTrackId`, `nextClipId`, `buildNewTrack`, `buildDuplicatedTracks`; the latter applies the clip-group copy invariant across the union of every track duplicated in one operation).

### Keyboard handlers (`apps/sandbox/src/hooks/handlers/`)

| File | What it owns |
|---|---|
| `clipboardHandlers.ts` | Cut / copy / paste |
| `deleteHandlers.ts` | Delete / clear selection |
| `navigationHandlers.ts` | Arrow keys, Home/End, J/K clip-edge nav |
| `playheadSelectionHandlers.ts` | Playhead move, selection extend |
| `transportHandlers.ts` | Space/play/stop/record transport keys |
| `trackCreationHandlers.ts` | Cmd+T / Shift+T / Shift+L — new mono/stereo/label track |
| `splitHandlers.ts` | Cmd+I / Cmd+Shift+I — split clip(s) at the playhead |
| `duplicateHandlers.ts` | Cmd/Ctrl+D — duplicate focused clip(s)/track(s) |
| `effectsPanelHandlers.ts` | E — toggle effects panel with focus capture/restore |

`useKeyboardShortcuts.ts` remains the dispatcher: one ordered `keydown` guard chain that delegates to these modules. Escape, Cmd+Arrow clip-move, and ArrowUp/Down are still inline (order-coupled focus logic, deferred).

---

## Where Rendering Happens

| File | What it owns |
|---|---|
| `packages/components/src/Track/TrackNew.tsx` | Component-based track renderer — lays out clips, positions EnvelopeInteractionLayer overlays |
| `packages/components/src/ClipBody/ClipBody.tsx` | Canvas-based clip body — waveform, spectrogram, and envelope fill drawing. Pure pixel-geometry math split into `packages/components/src/ClipBody/waveformGeometry.ts` |
| `apps/sandbox/src/components/GridOverlay.tsx` | Beat/measure grid SVG overlay (extracted from Canvas); exports pure `computeGrid` |
| `apps/sandbox/src/components/Canvas.tsx` | Main rendering coordinator — manages track layout, time/spectral selection, coordinates `CanvasTrackList` and overlay rendering (see also: known debt below) |
| `apps/sandbox/src/components/canvas/CanvasTrackList.tsx` | Owns the per-track render loop — maps `tracks` to `TrackNew` + `LabelRenderer`, wiring clip/label/envelope props and ~10 tracks-reducer dispatch types directly (deliberate: mirrors how Canvas.tsx did it pre-refactor, not a new coupling). Extracted verbatim from Canvas.tsx; see also: known debt below |
| `apps/sandbox/src/components/canvas/MarqueeRect.tsx` | Right-drag marquee-selection rectangle overlay |
| `apps/sandbox/src/components/canvas/SnapGuideline.tsx` | 1px vertical guideline shown at the snap target during trim/stretch |
| `apps/sandbox/src/components/canvas/SplitPreviewLine.tsx` | Split-tool hover preview line (single track, or all tracks with Shift held) |
| `apps/sandbox/src/components/editor/LoopRegionStalks.tsx` | Two vertical stalks marking loop-region start/end; used in both the timeline ruler row and the canvas row of `EditorLayout.tsx` (differ only in `height`) |
| `apps/sandbox/src/components/editor/PunchPointIndicator.tsx` | 1px vertical line marking the punch-in (roll-in recording) point; same ruler/canvas dedup as `LoopRegionStalks` |
| `apps/sandbox/src/components/editor/EditorBottomDrawer.tsx` | Unified tabbed drawer (Mixer + Piano Roll) docked to the bottom of the editor — extracted verbatim from `EditorLayout.tsx`. Owns tab defs/order/close (mixer close fires the `close-mixer-panel` window `CustomEvent`; piano-roll close dispatches `SET_PIANO_ROLL_OPEN`), the `PanelHeader` resize drag (self-cleaning `document` `mousemove`/`mouseup` listeners attached on `mousedown`), mixer channel building (one `MixerPanelChannel` per non-label track, passed as `channels`; Master is a separate `masterChannel` prop that `MixerPanel` renders last, after `channels`), and ~15 piano-roll MIDI handlers (`onAddNote` writes `skipPianoRollScrollRef`, owned by `usePianoRollSmoothScroll`; `onMoveNotes` is an intentional no-op). `state` arrives as a single prop — the same `TracksState` object `EditorLayout` reads, not re-derived; `dispatch` comes from `useTracksDispatch()` inside the component |
| `apps/sandbox/src/components/editor/TrackEffectsPanel.tsx` | Sidebar effects panel (track effects chain + master effects chain below) — verbatim extraction of `EditorLayout`'s former inline "Effects Panel" block. Renders `<EffectsPanel mode="sidebar">`; `markMissing`/`buildEffectIdSets` (also exported from here) annotate effect names with "(missing)"/"(sign in to use)" when the underlying plugin isn't installed/signed-in — a render-only, non-mutating annotation. `dispatch` comes from `useTracksDispatch()` inside the component; `effectsPanel`/picker/dialog/marketplace state stays lifted in `EditorLayout` and is passed down as setters |
| `apps/sandbox/src/components/ProjectToolbarContainer.tsx` | Wires `ProjectToolbar` — project menu (home/project/export/debug), mixer/audio-setup/marketplace triggers |
| `apps/sandbox/src/components/TransportToolbarContainer.tsx` | Wires `TransportToolbar` — playback/mode toggles, zoom, snap, timecode, master meter, toolbar-gripper drag |
| `packages/components/src/PreferencesModal/PreferencesModal.tsx` | 210-line scaffold — tab list + active-page routing — delegating to 10 page components in `PreferencesModal/pages/` (`GeneralPage`, `AppearancePage`, `AudioSettingsPage`, `PlaybackRecordingPage`, `SpectralDisplayPage`, `EditingPage`, `PluginsPage`, `CloudPage`, `ShortcutsPage`, `PlaceholderPage`) plus shared `TabGroupField.tsx`, `types.ts`, `menuItems.ts` |

---

## `any` Guardrail (`scripts/check-any.mjs`)

A dependency-free Node script that enforces a zero-untracked-`any` policy across `apps/sandbox/src/**` and `packages/*/src/**` (excluding `__tests__`, `*.test.*`, `dist`, and `node_modules`). It flags lines matching `: any\b`, `as any\b`, or `<any[,>]` unless the line also carries a `// justified:` comment explaining why the `any` is intentional (e.g. `// justified: Tone.js types incomplete — pending audio-package sweep`). A clean tree exits 0 and prints a file-count summary; violations exit 1 with `file:line: <line>` output and the message `every \`any\` needs a \`// justified:\` comment — see docs/codebase-map.md`. Run it with `pnpm guard:any` from the repo root. The script is also chained into `apps/sandbox`'s `test` script so it runs on every `pnpm test` invocation. ESLint adoption (`@typescript-eslint/no-explicit-any`) is the natural next step but is out of scope for this slice.

---

## Integration Tests

The sandbox app contains two integration test suites driven by a shared harness — both render real component trees (real reducer, real DOM) rather than isolated units.

| File | What it covers |
|---|---|
| `apps/sandbox/src/__tests__/integrationHarness.tsx` | Shared harness. `installJsdomStubs()` patches browser APIs jsdom lacks (`ResizeObserver`, `matchMedia`, `scrollTo`, `scrollIntoView`) that the app touches during a render. `renderApp()` renders the real `App` tree — clears `localStorage`, seeds `showWelcomeDialog: false` so the WelcomeDialog doesn't cover the chrome tests need, then renders. `renderCanvas()` renders `Canvas` inside a real provider stack (`PreferencesProvider`, `ThemeProvider`, `AccessibilityProfileProvider` with the real `'au4-tab-groups'` profile, `TracksProvider` seeded via `initialTracks`, `SpectralSelectionProvider`). Also imports `'fake-indexeddb/auto'` (registers a global IndexedDB shim, deliberately not in the shared vitest `setupFiles` so unit tests stay unaffected). |
| `apps/sandbox/src/__tests__/audioMock.ts` | `vi.mock('@audacity-ui/audio', () => audioMockFactory())` factory — kept in its own module (not `integrationHarness.tsx`) to avoid a circular-import deadlock with that file's `import App from '../App'`. Builds a self-populating `Proxy` of `vi.fn()`s: methods the app depends on for a sane return shape (`getIsPlaying`, `getClipBuffer`, `exportBuffersAsWav`, `mixdown`, `generateTone`, etc.) are pre-seeded with typed stubs; any other method the app calls gets a bare `vi.fn()` on first access, so the mock surface can't silently drift from what the app actually calls. No `Tone.Synth`/`Tone.Sampler` stubs — the real `@audacity-ui/audio` package (and Tone.js) is replaced wholesale, not partially stubbed. |
| `apps/sandbox/src/__tests__/App.integration.test.tsx` | Full-app seam suite via `renderApp()` — 5 tests: app boot (renders project chrome), Preferences modal (Cmd+, opens it, every nav page renders), Theme (switching to Dark re-themes the tree and persists to `localStorage`), Loop (toggling Loop drives the audio stub and marks the button active), and Transport toolbar positions (gripper-drag through docked-top → floating → docked-bottom → docked-top). |
| `apps/sandbox/src/__tests__/Canvas.integration.test.tsx` | Canvas/track/clip seam suite via `renderCanvas()` — 6 tests: clip selection (header click selects, body click on an unselected clip deselects), Shift+Click time-selection scope (extends a selection scoped to the tracks the gesture spans), track ArrowDown navigation (focus moves to the next track), Cmd+ArrowDown reorder + Meta-release overlap resolution (moves the selected clip to the next track, then trims the overlapped neighbor), keyboard trim (`[` shrinks the focused clip by the 0.1s step), and Tab roving between clips. |

Run both suites with `pnpm --filter @audacity-ui/sandbox test` (alongside the rest of the sandbox unit tests); run everything including `@dilsonspickles/components` with `pnpm test` from the repo root.

---

## Big-and-Scary Files (Known Debt)

These are not-yet-decomposed monoliths. They work but are prime targets for future extraction.

| File | What it owns |
|---|---|
| `apps/sandbox/src/App.tsx` (1244 lines) | Application root — provider tree, routing, and remaining orchestration. The cloud-load flow, menu wiring, and wheel-zoom/scroll sync that used to be inline here are now extracted (`useProjectLifecycle`, `useMenuDefinitions` + `useElectronMenuBridge`, `useCanvasScrollSync` — see "App.tsx orchestration hooks" above), along with `PlaybackContext`, `LoopRegionContext`, `useMasterMeter`, `useAudioDeviceMenu`, `usePlugins`, and the toolbar prop-wiring in `ProjectToolbarContainer`/`TransportToolbarContainer`. Remaining bulk is provider-tree assembly and the local state that still fans out to those extracted pieces |
| `apps/sandbox/src/components/EditorLayout.tsx` (1183 lines, down from 2170) | Editor chrome composition root: context wiring (`useTracks`, `usePlayback`, `useLoopRegionContext`, `useContextMenus`, `useMuseHub`, etc.) + layout scaffolding (effects panel / track control side panel / timeline ruler row / canvas + rulers row / bottom drawer / menus-modals) + `Canvas`/`TrackControlPanel`/`VerticalRulerPanel` prop assembly. Everything with independently-testable logic is extracted: presentational dedup → `components/editor/` (`LoopRegionStalks`, `PunchPointIndicator`, `EditorBottomDrawer`, `TrackEffectsPanel`), interaction bundles → hooks (`useMeasuredWidth`, `useRulerFlyout`, `useTimelineRulerInteractions`, `useTrackPanelHandlers`, plus the effect hooks above), pure logic → `utils/focusRouting.ts` + `utils/trackManagement.ts`. Remaining bulk is JSX layout structure and per-track-panel prop wiring inside the `state.tracks.map(...)` loop — further reduction needs a selection/focus context (separate project), same as before |
| `apps/sandbox/src/components/Canvas.tsx` (771 lines) | Track/clip/label interaction dispatcher (renders no `<canvas>`). Grid → `GridOverlay`, split tool → `useSplitTool`, geometry → `utils/canvasGeometry`, pointer handlers → `useCanvasPointerHandlers`, track-nav keyboard → `useTrackKeyboardHandlers`, and the per-track render loop → `components/canvas/CanvasTrackList.tsx` are now extracted. Remaining bulk is state wiring across those pieces |
| `apps/sandbox/src/components/canvas/CanvasTrackList.tsx` (774 lines) | The per-track render loop extracted from Canvas.tsx — still coupled to ~10 tracks-reducer dispatch types directly (clip move/trim/stretch, label update, envelope points, etc.) rather than going through a narrower prop interface. This is a deliberate verbatim relocation, not new debt: reducing it needs the same Context-slicing change Canvas.tsx would have needed |

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
