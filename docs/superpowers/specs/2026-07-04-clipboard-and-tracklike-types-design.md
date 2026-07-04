# Design: Clipboard Typing + `TrackLike` Selection-Hook Unification

**Date:** 2026-07-04
**Base branch:** `master`
**Status:** Approved for planning

## Goal

Eliminate the last documented `any` boundaries left by the interaction-cluster slice, in two independent parts:
- **Part A:** type `ClipboardState.clips` precisely (sandbox-only).
- **Part B:** give the components-package selection hooks a minimal structural `TrackLike`/`ClipLike` config type so the `as any` casts vanish from both `Canvas.tsx` and the library — with no runtime behavior change.

Slice 2 of the whole-app `any`-elimination campaign (`memory/project-prototyping-machine-mission.md`).

## Motivation

Two residual `any` boundaries survived slice 1 as documented casts:
1. `ClipboardState.clips: any[]` (in `useKeyboardShortcuts.ts`) — deferred because typing it cascades to a few consumers.
2. `tracks as any` at `Canvas.tsx:533`, passing sandbox tracks into `useAudioSelection`.

Investigation of #2's root cause found the type is **lying**: the selection hooks (`useTimeSelection`, `useSpectralSelection`, `useAudioSelection`) read `clip.start`, `clip.duration`, `clip.id`, `track.clips`, `track.height`, `track.viewMode`, and (for stereo) `clip.waveformLeft`/`waveformRight` — i.e. the **sandbox** clip shape (`.start`) — but the config is typed as core `Track[]` (which uses `.startTime`). To paper over the contradiction the library uses internal `as any` casts and the app adds the `tracks as any`. Verified facts:
- The hooks never read `clip.startTime` — only `clip.start`. (Confirmed by grep.)
- `useAudioSelection` has exactly **one** caller: `apps/sandbox/src/components/Canvas.tsx`.
Therefore making the config type honest (a minimal structural shape using `.start`) removes casts in both places with **zero runtime change** — the code already reads `.start` and the sandbox already provides it.

## Constraints

- **Behavior-preserving.** No runtime/logic change. Part A is type-only; Part B makes a lying type honest (the code already reads the fields the new type declares). Tests + tsc + build gate everything.
- **Do NOT change** the sandbox `Track`/`Clip` (`TracksContext`) or core's `Track`/`Clip` (`@audacity-ui/core`) — introduce a NEW minimal structural type instead; leave the existing definitions untouched.
- **No new `any`.**
- Work on a feature branch off `master`. Part A and Part B are **separate commits** (A first: sandbox-only, low-risk; B: cross-package). Part B requires rebuilding `packages/components`.

## Part A — type `ClipboardState.clips`

- `ClipboardState.clips` is written by `clipboardHandlers` copy/cut as `selectedClips`, whose real element type is `Clip & { trackIndex: number }`. Type the field precisely:
  ```ts
  clips: (Clip & { trackIndex: number })[];
  ```
  Import `Clip` from `../contexts/TracksContext` in `useKeyboardShortcuts.ts`.
- Follow the `tsc` cascade: `clipboardHandlers.ts` (drop the `clip: any` type-predicate justification cast now that the element type is known), plus any consumer that reads `clipboard.clips` (App's `useState<ClipboardState | null>`, paste in `clipboardHandlers`). Fix each access to the now-typed shape; never re-add `any`. If a genuine gap remains, keep ONE documented cast and note it.
- **Verify:** `tsc` clean, full suite green, build green. Commit Part A alone.

## Part B — `TrackLike`/`ClipLike` structural config type

1. **Define the minimal structural types.** Add to `packages/core/src/types/index.ts` (the shared types home) — reflecting EXACTLY what the selection hooks read:
   ```ts
   export interface ClipLike {
     id: number;
     start: number;
     duration: number;
     waveformLeft?: number[];
     waveformRight?: number[];
   }
   export interface TrackLike {
     clips: ClipLike[];
     height?: number;
     viewMode?: 'waveform' | 'spectrogram' | 'split';
   }
   ```
2. **Retype the hooks' config.** In `packages/components/src/hooks/` change the `tracks` field the selection config carries (in `TimeSelectionConfig` / the spectral config / `UseAudioSelectionConfig` — wherever `tracks: Track[]` is declared for these hooks) to `tracks: TrackLike[]`. Then **remove the internal `as any` casts** that only existed because the type was wrong: the `track as any` for `.viewMode`/`.height` reads (`useTimeSelection` ~136/286/447, `useAudioSelection` ~225/287) and the `(clip as any).waveformLeft/waveformRight` stereo casts (now declared optional on `ClipLike`). Keep a cast ONLY if a hook reads a field genuinely absent from `TrackLike`/`ClipLike` — and if so, add that field to the structural type instead (that's the whole point).
   - If `TimeSelectionConfig.tracks` is shared with OTHER hooks/consumers that pass a different shape, scope the change to the config(s) `useAudioSelection` actually uses; do not break an unrelated consumer. (Investigation: `useAudioSelection` is the only caller of concern; confirm during implementation before widening.)
3. **Remove the app-side cast.** In `Canvas.tsx:533`, drop `tracks as any` → `tracks` (sandbox `Track[]` structurally satisfies `TrackLike[]`).
4. **Rebuild the package** so the sandbox picks up the new types: `pnpm --filter @dilsonspickles/components build` (or the repo's package build), then typecheck the sandbox.

## Testing

- `tsc` clean is the primary gate for both parts (typing changes; the type system is the test).
- Full sandbox suite green (behavior backstop): `pnpm --filter @audacity-ui/sandbox test`.
- The components package's own tests (if any) green after its rebuild: `pnpm --filter @dilsonspickles/components test` (run if the package has a test script).
- Production build green: `pnpm --filter @audacity-ui/sandbox build`.
- No new unit tests required — this is type-model work; a behavior change would be a bug, not a feature.

## Verification

- Part A: `ClipboardState.clips` typed; its consumers typed; tsc clean; suite + build green; commit.
- Part B: `TrackLike`/`ClipLike` added to core; selection-hook config retyped; internal library `as any` casts on tracks/clips removed; `Canvas.tsx:533` cast removed; package rebuilt; sandbox tsc clean; suite + build green; commit.
- Report the net cast/`any` removals across `Canvas.tsx`, `useKeyboardShortcuts.ts`, `clipboardHandlers.ts`, and the three selection-hook files.
- Manual smoke: copy/cut/paste clips still work (Part A); time selection + spectral selection drag still work (Part B — the hooks whose config changed).

## Explicitly out of scope

- Changing the sandbox `Track`/`Clip` or core `Track`/`Clip` real definitions (we add a new structural type instead).
- The broader "adopt core types across the app" migration (the `// TODO` — a separate large project).
- Other `any` clusters (`AppDialogs`, `AppContextMenus`, `AudioEngineContext`/Tone.js) — later slices.

## Success criteria

- `ClipboardState.clips` is precisely typed; no `any` remains in the clipboard path.
- The selection hooks' config uses `TrackLike[]`; the `as any` casts on tracks/clips are gone from `Canvas.tsx` AND the library hooks; `packages/components` rebuilt.
- The sandbox `Track`/`Clip` and core `Track`/`Clip` real types are untouched.
- tsc clean, full suite green, build green, manual smoke clean — zero behavior change.
