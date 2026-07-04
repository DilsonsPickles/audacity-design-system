# Clipboard Typing + TrackLike Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type `ClipboardState.clips` precisely (Part A) and give the components-package selection hooks a shared minimal `TrackLike`/`ClipLike` config type so every `as any` cast on tracks/clips drops from both the app and the library (Part B) — zero behavior change.

**Architecture:** Part A is sandbox-only type tightening. Part B replaces a *lying* type: the selection hooks read `clip.start`/`.duration`/`.id`, `track.clips`/`.height`/`.viewMode`, and (stereo) `clip.waveformLeft`/`waveformRight` — but were typed against core `Track[]` (which uses `.startTime`), forcing `as any` casts. A local `SpectralTrack`/`SpectralClip` already models the correct `.start`-based shape; we promote that to shared `TrackLike`/`ClipLike` in core, point both configs at it, and remove the casts.

**Tech Stack:** TypeScript 5 (tsc is the primary gate), Vitest (behavior backstop), tsup (package build).

## Global Constraints

- Work on branch `refactor/clipboard-and-tracklike-types` (already created).
- **Behavior-preserving.** Type-only; the code already reads the fields the new types declare. Any runtime/logic change = a bug, not this task.
- Do NOT change the sandbox `Track`/`Clip` (`TracksContext`) or core's real `Track`/`Clip` (`@audacity-ui/core`). Add NEW structural types instead.
- **No new `any`.** A surfaced `tsc` error = a real mismatch to fix at the access; never silence with `any`.
- Part A and Part B are **separate commits**. Part B requires rebuilding `packages/components`.
- Verify commands: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` ; `pnpm --filter @audacity-ui/sandbox test` ; `pnpm --filter @audacity-ui/sandbox build` ; package build `pnpm --filter @dilsonspickles/components build`.

---

## Task 0: Baseline

- [ ] **Step 1:** `git branch --show-current` → `refactor/clipboard-and-tracklike-types`.
- [ ] **Step 2:** `pnpm --filter @audacity-ui/sandbox test` → all pass (~168). If red, STOP.
- [ ] **Step 3:** `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` → 0 errors. If not, STOP.
- [ ] **Step 4:** Record baseline cast counts: `grep -c "as any" apps/sandbox/src/components/Canvas.tsx` (expect 7); `grep -rc "as any" packages/components/src/hooks/useTimeSelection.ts packages/components/src/hooks/useSpectralSelection.ts packages/components/src/hooks/useAudioSelection.ts`.

---

## Task 1 (Part A): Type `ClipboardState.clips`

**Files:**
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (`ClipboardState` ~line 18)
- Modify: `apps/sandbox/src/hooks/handlers/clipboardHandlers.ts` (the kept `clip: any` predicate ~line 206; paste reads)
- Modify: `apps/sandbox/src/App.tsx` (inline clipboard `useState` ~line 573)

**Interfaces:**
- Produces: `ClipboardState.clips: (Clip & { trackIndex: number })[]`.

- [ ] **Step 1: Type the field**

In `useKeyboardShortcuts.ts`, import `Clip` and change the field:
```ts
import type { Clip } from '../contexts/TracksContext'; // add to existing type imports
// ...
export interface ClipboardState {
  clips: (Clip & { trackIndex: number })[];
  operation: 'copy' | 'cut';
  timeSelection?: { startTime: number; endTime: number };
}
```

- [ ] **Step 2: Make App use the shared type (single source of truth)**

In `App.tsx` (~573), replace the inline object type with the imported `ClipboardState`:
```ts
import type { ClipboardState } from './hooks/useKeyboardShortcuts'; // add
// ...
const [clipboard, setClipboard] = React.useState<ClipboardState | null>(null);
```
Delete the inline `{ clips: any[]; operation; timeSelection? }` shape.

- [ ] **Step 3: Follow the tsc cascade**

Run `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json`. Fix every surfaced error at the access (the elements are now `Clip & { trackIndex: number }` — all fields real): in `clipboardHandlers.ts` paste logic, `clip.trackIndex`/`clip.start`/`clip.id`/etc. are now typed. Remove the kept `clip: any` type-predicate cast (~line 206) and its `// justified:` comment — it's no longer needed. If a genuine gap remains, keep ONE documented cast and note it; never re-add `any`.

- [ ] **Step 4: Verify**

`cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` clean; `pnpm --filter @audacity-ui/sandbox test` (168 pass); `pnpm --filter @audacity-ui/sandbox build` green.

- [ ] **Step 5: Commit**

```bash
git commit -am "refactor(types): type ClipboardState.clips precisely (drop any[])"
```

---

## Task 2 (Part B): Shared `TrackLike`/`ClipLike`; remove selection-hook casts

**Files:**
- Modify: `packages/core/src/types/index.ts` (add `ClipLike`/`TrackLike`; `TimeSelectionConfig.tracks` ~line 99)
- Modify: `packages/components/src/hooks/useSpectralSelection.ts` (retire local `SpectralTrack`/`SpectralClip` ~lines 19–30; config `tracks` field; stereo casts 421/621/701/862)
- Modify: `packages/components/src/hooks/useTimeSelection.ts` (casts 136/286/447)
- Modify: `packages/components/src/hooks/useAudioSelection.ts` (casts 225/287)
- Modify: `apps/sandbox/src/components/Canvas.tsx` (cast ~line 533)

**Interfaces:**
- Produces (in `@audacity-ui/core`):
  ```ts
  export interface ClipLike { id: number; start: number; duration: number; waveformLeft?: number[]; waveformRight?: number[]; }
  export interface TrackLike { clips: ClipLike[]; height?: number; viewMode?: 'waveform' | 'spectrogram' | 'split'; }
  ```

- [ ] **Step 1: Add the shared structural types to core**

In `packages/core/src/types/index.ts`, add (near the selection config types):
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
Change `TimeSelectionConfig.tracks` (~line 99) from `tracks: Track[];` to `tracks: TrackLike[];`.

- [ ] **Step 2: Point the spectral config at the shared type; retire the local duplicate**

In `useSpectralSelection.ts`, delete the local `interface SpectralTrack {…}` / `interface SpectralClip {…}` (~19–30) and import `TrackLike`/`ClipLike` from `@audacity-ui/core`. Change `UseSpectralSelectionConfig.tracks` from `SpectralTrack[]` to `TrackLike[]`. Replace any other `SpectralTrack`/`SpectralClip` references with `TrackLike`/`ClipLike`.

- [ ] **Step 3: Remove the now-redundant internal casts**

- `useTimeSelection.ts` lines 136, 286, 447: `const track = tracks[trackIndex] as any;` → `const track = tracks[trackIndex];` (`.viewMode`/`.height` are on `TrackLike`).
- `useAudioSelection.ts` line 225: `tracks[trackIndex] as any` → drop the cast. Line 287: `tracks: timeSelectionConfig.tracks as any` → `tracks: timeSelectionConfig.tracks` (both configs are `TrackLike[]` now). Remove the `// Track types are compatible at runtime` comment.
- `useSpectralSelection.ts` lines 421, 621, 701, 862: `(clip as any).waveformLeft && (clip as any).waveformRight` → `clip.waveformLeft && clip.waveformRight` (optional on `ClipLike`).

- [ ] **Step 4: Remove the app-side cast**

`Canvas.tsx` ~line 533: `tracks: tracks as any,` → `tracks: tracks,` (drop the `// justified:` comment). The sandbox `Track[]` structurally satisfies `TrackLike[]`.

- [ ] **Step 5: Rebuild the package, then typecheck the app**

```bash
pnpm --filter @dilsonspickles/components build
cd apps/sandbox && npx tsc --noEmit -p tsconfig.json
```
Expected: package builds; sandbox tsc clean. If sandbox tsc errors on the `tracks` prop, the sandbox `Track`/`Clip` is missing a field `TrackLike` requires — DO NOT widen `TrackLike` beyond what the hooks read; instead confirm the field (`start`/`duration`/`id`/`clips`/`height`/`viewMode`) genuinely exists on the sandbox types (it does) and fix the real mismatch. If some other consumer of `TimeSelectionConfig`/`useTimeSelection` breaks (passes a non-`TrackLike` shape), report it — do not broaden scope silently.

- [ ] **Step 6: Verify**

`pnpm --filter @audacity-ui/sandbox test` (168 pass); `pnpm --filter @audacity-ui/sandbox build` green; if the components package has a test script, `pnpm --filter @dilsonspickles/components test`.

- [ ] **Step 7: Commit**

```bash
git commit -am "refactor(types): shared TrackLike/ClipLike for selection hooks; remove tracks as-any casts"
```

---

## Task 3: Final verification + report

- [ ] **Step 1:** `pnpm --filter @audacity-ui/sandbox test` (green) + `pnpm --filter @audacity-ui/sandbox build` (green) + `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` (0 errors).
- [ ] **Step 2:** Recount casts: `grep -c "as any" apps/sandbox/src/components/Canvas.tsx` (was 7 → expect 6, the `tracks` one gone); `grep -rc "as any" packages/components/src/hooks/useTimeSelection.ts packages/components/src/hooks/useSpectralSelection.ts packages/components/src/hooks/useAudioSelection.ts` (the tracks/clip casts gone). Report before→after and confirm `ClipboardState.clips` no longer `any[]`.
- [ ] **Step 3: Manual smoke** — `cd apps/sandbox && pnpm dev`: copy/cut/paste a clip (Part A) and drag a time selection + a spectral selection over stereo and mono tracks (Part B — the hooks whose config changed). Confirm no regression.
- [ ] **Step 4:** Nothing to commit if clean; note completion.

---

## Self-Review notes (author)

- **Spec coverage:** Part A (ClipboardState.clips) → Task 1; Part B (TrackLike/ClipLike + cast removal + package rebuild) → Task 2; verification/report/smoke → Task 3. All spec items mapped.
- **Behavior-preserving:** every change is type-only; the hooks already read `.start`/`.viewMode`/`.height`/`.waveformLeft` (verified — the local `SpectralTrack`/`SpectralClip` already used `.start`), so `TrackLike` matches reality. tsc + full suite + build gate each part.
- **No placeholders:** exact types, exact cast line numbers, exact config declarations.
- **Type consistency:** `TrackLike`/`ClipLike` field set is identical in Task 2 Step 1 (definition) and referenced consistently in Steps 2–4.
- **Open items for executor:** (a) Task 1 — App's inline clipboard type may need `ClipboardState` import; (b) Task 2 Step 5 — if a non-Canvas consumer of `TimeSelectionConfig`/`useTimeSelection` breaks, report rather than broaden scope; (c) the `SpectralClip`→`ClipLike` promotion adds optional `waveformLeft/Right` — confirm no spectral code path now mis-handles their presence (it only reads them for a boolean stereo check, so optional is safe).
