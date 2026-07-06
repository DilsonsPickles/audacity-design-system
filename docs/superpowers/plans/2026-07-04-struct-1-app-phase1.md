# struct-1 — App.tsx Phase 1 + PlaybackProvider unlock (spec + plan)

> First slice of the structural program (recon: App.tsx map, 2026-07-04). Subagent per task, per-task review, fable final review.

**Goal:** extract App.tsx's safe self-contained state/effects into hooks, its three big pure handlers into utils, its two medium persistence effects into hooks, and introduce `PlaybackContext` (value-provider form) so `audioManagerRef` stops being drilled — unblocking LoopRegionContext (struct-2). Behavior-preserving except items explicitly disclosed.

**Verified design fact:** `usePlaybackControls` takes App-local deps (`state, dispatch, recordingManagerRef, scrollContainerRef, pixelsPerSecond, updateDisplayWhilePlaying, pinnedPlayHead, isProgrammaticScrollRef`) — so PlaybackContext is a **value-provider**: `CanvasDemoContent` keeps calling the hook and wraps its JSX in `<PlaybackProvider value={playback}>`; consumers read via `usePlayback()`. No hook restructuring, no provider-tree change.

## Global rules
- Verbatim moves; hooks take typed `deps` objects (established convention, see `useAutoOpenPianoRoll`). No new `any` (guard enforces). Runtime changes only where disclosed. Gates every task: `pnpm guard:any` 0 violations; sandbox tsc 0; core tsc 0; 168 tests; build. Commit per task.

## Task 1 — Safe hooks batch (~120 lines out)
New files under `apps/sandbox/src/hooks/`:
- `useFocusDebugger.ts` (App ~753–795 + state `focusedElement`; takes `showFocusDebug`, returns `focusedElement`)
- `useMixerPanelListener.ts` (~389–393 + `mixerPanelOpen` state; returns state+setter)
- `useTimeCodeFormats.ts` (~144–146; returns the 3 formats + setters)
- `useLocalStorageBackedState.ts` — ONE generic hook covering both `dontShowSaveModalAgain` (~207–219) and `cloudAudioFiles` (~198–224) persistence patterns (typed generic; replaces the two state+effect pairs)
- CONSOLIDATION (disclose): App has DUPLICATE auto-select-track-0 mount effects (~227–232 and ~745–750). Extract ONE `useInitialTrackSelection.ts` and delete both. Behavior-identical (second effect was redundant); disclose in report.
Each: verbatim move → App calls the hook in the same declaration position. Commit: `refactor(app): extract safe self-contained hooks from App.tsx`.

## Task 2 — Handler utils (~220 lines out)
New files under `apps/sandbox/src/utils/`:
- `generateTone.ts` (App ~1065–1109), `importAudio.ts` (~1112–1202), `saveCloudProject.ts` (~1209–1292).
Pattern: export a plain function taking an explicit typed deps object (`{ state, dispatch, audioManagerRef, toast, ... }` — read each block's actual closures). App's JSX call sites call the util with the deps. Verbatim bodies. Commit: `refactor(app): extract generateTone/importAudio/saveCloudProject handler utils`.

## Task 3 — Medium persistence hooks (~60 lines out)
- `useProjectAutoSave.ts` (App ~688–709; deps `{ currentProjectId, tracks, masterEffects, playheadPosition }`; keep the debounce timing identical)
- `useCloudProjectCleanup.ts` (~292–326, BOTH effects — orphan-prune + sign-out wipe; deps from adieu context values + `indexedDBProjects` + `dispatch`)
Verbatim; same declaration order. Commit: `refactor(app): extract project auto-save + cloud cleanup hooks`.

## Task 4 — PlaybackContext (the unlock)
- New `apps/sandbox/src/contexts/PlaybackContext.tsx`: `PlaybackContextValue = UsePlaybackControlsReturn` (import the type); `PlaybackProvider({ value, children })` + `usePlayback()` (throws outside provider — mirror TracksContext's pattern).
- In App: wrap `CanvasDemoContent`'s returned JSX in `<PlaybackProvider value={playbackControls}>` where `playbackControls` is the FULL return object of the existing `usePlaybackControls(...)` call (keep the existing destructure too, or destructure from the object — smallest diff wins).
- Consumers: `EditorLayout` + `AppDialogs` currently receive `audioManagerRef` (and EditorLayout `isPlaying`, `trackMeterLevels`?) as props — migrate ONLY `audioManagerRef` this task (read via `usePlayback()`; drop the prop from both interfaces + App call sites). Other playback props stay for struct-2 (keep slice bounded).
- The `// justified: AudioPlaybackManager cluster deferred (PlaybackContext blocker)` comments on the old `RefObject<any>` props: DELETE the props entirely; where `audioManagerRef` is now consumed via context, type it properly from `UsePlaybackControlsReturn` (if the return type has it as `RefObject<AudioPlaybackManager>`, great; if it's `any`-ish in the hook's own types, type THE HOOK's return properly — `import type { AudioPlaybackManager } from '@audacity-ui/audio'` — this task removes the blocker excuse).
Commit: `feat(context): PlaybackContext value-provider; audioManagerRef no longer drilled`.

## Task 5 — Controller: final verify + docs
Gates; App.tsx line count before/after (baseline ~2,185); codebase-map updates (new hooks table rows, PlaybackContext in "Where State Lives", App.tsx known-debt entry updated); ledger; fable whole-branch review; merge menu.

**Out of scope:** LoopRegionContext + remaining playback props (struct-2); cloud-load orchestration (deferred); menu-definitions/wheel-zoom/view-options (struct-1b).
