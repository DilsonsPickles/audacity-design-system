# struct-1 Task 1 Report — Extract Safe Self-Contained Hooks from App.tsx

**Date:** 2026-07-06
**Branch:** refactor/struct-1-app-phase1

## Summary

Extracted five state/effect clusters from `apps/sandbox/src/App.tsx` into dedicated hooks under `apps/sandbox/src/hooks/`. App.tsx went from 2185 → 2119 lines (−66 lines net; the hooks themselves are ~130 lines of new code across 5 files).

---

## Hooks Extracted

### 1. `useFocusDebugger.ts`

**Lines moved from App.tsx:** state at ~378 (`focusedElement`), full effect at ~752–795 (showFocusDebug guard, focusin listener, description builder).

**Signature:** `useFocusDebugger({ showFocusDebug: boolean }): string`

`showFocusDebug` state itself stays in App.tsx (it's driven by UI toggle passed to `AppDialogs`). The hook owns the `focusedElement` state and the document `focusin` listener. Returns `focusedElement` string directly.

**App.tsx replacement:** `const focusedElement = useFocusDebugger({ showFocusDebug });`

---

### 2. `useMixerPanelListener.ts`

**Lines moved from App.tsx:** state at ~386 (`mixerPanelOpen`), effect at ~388–393 (window `close-mixer-panel` listener).

**Signature:** `useMixerPanelListener(): { mixerPanelOpen: boolean; setMixerPanelOpen: Dispatch<SetStateAction<boolean>> }`

Returns both state and setter; `setMixerPanelOpen` is still needed at call sites that open the mixer panel.

**App.tsx replacement:** `const { mixerPanelOpen, setMixerPanelOpen } = useMixerPanelListener();`

---

### 3. `useTimeCodeFormats.ts`

**Lines moved from App.tsx:** three `useState` calls at ~144–146.

**Signature:** `useTimeCodeFormats(): UseTimeCodeFormatsReturn` (6 values: the three format states + their setters).

`TimeCodeFormat` type import removed from App.tsx's `@dilsonspickles/components` import (now lives only in the hook file).

**App.tsx replacement:** destructuring call at same declaration position.

---

### 4. `useLocalStorageBackedState.ts`

**Lines moved from App.tsx:** two `useState` with localStorage initializers (~198–210) and two `useEffect` persist pairs (~216–224).

**Generic signature:** `useLocalStorageBackedState<T>(key, initial, serialize, deserialize): [T, Dispatch<SetStateAction<T>>]`

**Exact localStorage semantics preserved:**

| State | Key | Initial read | Serialize | Deserialize |
|-------|-----|-------------|-----------|-------------|
| `cloudAudioFiles` | `'cloudAudioFiles'` | `JSON.parse` with try/catch (returns `[]` on error or missing) | `JSON.stringify` | `JSON.parse` with try/catch |
| `dontShowSaveModalAgain` | `'dontShowSaveModalAgain'` | `=== 'true'` check (returns `false` if missing) | `String` | `raw === 'true'` |

Both had their lazy initializer read localStorage synchronously on first render — the generic hook preserves this via the `useState(() => {...})` lazy initializer pattern. Both had a `useEffect` that wrote on every value change — the generic hook preserves this with `useEffect(() => localStorage.setItem(key, serialize(value)), [key, value, serialize])`.

**App.tsx call sites:**
```ts
const [cloudAudioFiles, setCloudAudioFiles] = useLocalStorageBackedState<CloudAudioFile[]>(
  'cloudAudioFiles', [], JSON.stringify,
  (raw) => { try { return JSON.parse(raw) as CloudAudioFile[]; } catch { return []; } },
);
const [dontShowSaveModalAgain, setDontShowSaveModalAgain] = useLocalStorageBackedState<boolean>(
  'dontShowSaveModalAgain', false, String, (raw) => raw === 'true',
);
```

---

### 5. `useInitialTrackSelection.ts` — CONSOLIDATION DISCLOSED

**Lines removed from App.tsx:**
- Effect 1 (~227–232): `selectedTrackIndices.length === 0` guard → dispatched `SET_SELECTED_TRACKS [0]`, `SET_FOCUSED_TRACK 0`
- Effect 2 (~745–750): `focusedTrackIndex === null` guard → dispatched `SET_FOCUSED_TRACK 0`, `SET_SELECTED_TRACKS [0]`

**Evidence of redundancy:** Both effects had `[]` deps (mount-only). `initialState` in `TracksContext.tsx` has `selectedTrackIndices: []` and `focusedTrackIndex: null`, so at mount both conditions are always true simultaneously. The second effect was added as a belt-and-suspenders guard but was functionally unreachable if effect 1 already ran (both in the same React commit on mount). The two effects dispatched the same two actions in opposite order, but with the same end state.

**Merged guard:** `state.tracks.length > 0 && state.selectedTrackIndices.length === 0 && state.focusedTrackIndex === null` — covers both original conditions, equivalent at mount time.

**Dispatch order preserved from effect 1** (which ran first by declaration order): `SET_SELECTED_TRACKS [0]` then `SET_FOCUSED_TRACK 0`.

**App.tsx replacement:** `useInitialTrackSelection({ state, dispatch });` at the position of the first (earlier) effect.

---

## Gate Results

| Gate | Result |
|------|--------|
| `pnpm guard:any` | 0 violations (435 files scanned) |
| `cd apps/sandbox && npx tsc --noEmit` | 0 errors |
| `cd packages/core && npx tsc --noEmit` | 0 errors |
| `pnpm --filter @audacity-ui/sandbox test` | 168/168 pass, 24 test files |
| `pnpm --filter @audacity-ui/sandbox build` | Success (✓ built in 3.00s) |

## App.tsx Line Count

- **Before:** 2185
- **After:** 2119
- **Net change:** −66 lines (hook implementations live in 5 new files totalling ~130 lines)

## New Files

- `apps/sandbox/src/hooks/useFocusDebugger.ts`
- `apps/sandbox/src/hooks/useMixerPanelListener.ts`
- `apps/sandbox/src/hooks/useTimeCodeFormats.ts`
- `apps/sandbox/src/hooks/useLocalStorageBackedState.ts`
- `apps/sandbox/src/hooks/useInitialTrackSelection.ts`
