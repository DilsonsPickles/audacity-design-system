# Fable-5 Finalize — Agent-Readiness Refactor Tail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the agent-readiness refactor: dedupe ClipBody waveform setup, extract LoopRegionContext, split PreferencesContext into domain contexts, decompose PreferencesModal into per-page files, and decompose Canvas.tsx and App.tsx into hooks/components — all behavior-preserving.

**Architecture:** Six sequential phases, each independently mergeable. Every extraction follows the repo's established conventions: hooks take a single `options`/`deps` object typed by an exported `UseXOptions` interface and return `void` or a `UseXReturn` object; imperative handlers are plain functions taking `{ state, dispatch, audioManagerRef, ... }`; contexts follow the `PlaybackContext` value-provider pattern. Pure logic gets extracted to unit-tested utils FIRST, then glue moves.

**Tech Stack:** React 19, TypeScript, Vitest 4 + jsdom + @testing-library/react 16, pnpm monorepo.

## Global Constraints

- **Behavior-preserving.** No user-visible change. Preserve known quirks verbatim: PreferencesModal footer Reset button is a no-op stub; several EditingPage/AudioSettingsPage/SpectralDisplayPage controls are deliberately NOT wired to persistence — do not "fix" them.
- **Verbatim-move discipline.** When moving code, copy it exactly; any deliberate change is disclosed in the commit message.
- **Ref-mirror pattern is load-bearing.** Any extracted hook that binds document-level `mousemove`/`mouseup`/`keyup` listeners MUST mirror frequently-changing props into refs (`useEffect(() => { ref.current = val }, [val])`) so the listener effect binds once. See `apps/sandbox/src/hooks/useClipTrimming.ts` (comment at lines 85–96 documents the lost-mouseup bug).
- **Hook call order in App.tsx is a dependency chain:** `recordingManagerRef` → `usePlaybackControls` (produces `audioManagerRef`) → `useRecording` → `useLoopRegion` → `useKeyboardShortcuts`. Never reorder these.
- **No new unjustified `any`.** `node scripts/check-any.mjs` (from repo root) must pass after every task.
- **`PreferencesProvider` stays ABOVE `ThemeProvider`** in the tree (App.tsx:1858–1863); `preferences.theme` gates `ThemedApp`.
- **One localStorage key `'audacity-preferences'`**, whole-blob JSON, merge-on-load (`{ ...defaultPreferences, ...JSON.parse(stored) }`). The split must not change the storage format.
- **ClipBody perf pattern:** pixel redraw is keyed on `useDeferredValue(height)` (`drawHeight`, ClipBody.tsx:195); CSS sizing uses live `height`. Do not swap these. No allocations inside per-pixel loops.
- **Gates after EVERY task:** `pnpm --filter @audacity-ui/sandbox test` (232+ passing, no skips), `node scripts/check-any.mjs`, and `npx tsc --noEmit` in the touched package. Commit per task with the repo's `refactor(scope):` / `test(scope):` message style (concise — user preference).
- **Line numbers in this plan are from branch `refactor/fable5-finalize` @ 011cb74.** They will drift as tasks land — always locate code by the quoted identifier, using the line number only as a starting hint.

---

## Phase 0 — Housekeeping

### Task 0.1: Delete stale App.tsx.bak

**Files:**
- Delete: `apps/sandbox/src/App.tsx.bak`

- [ ] **Step 1: Verify it is unreferenced**

Run: `grep -rn "App.tsx.bak" apps/ packages/ --include='*.*' | grep -v node_modules`
Expected: no output.

- [ ] **Step 2: Delete and commit**

```bash
git rm apps/sandbox/src/App.tsx.bak
git commit -m "chore(sandbox): remove stale App.tsx.bak"
```

---

## Phase 1 — ClipBody waveform setup dedup

The per-pixel loop is ALREADY unified in `drawChannel` (`packages/components/src/ClipBody/ClipBody.tsx:19–59`). What remains duplicated is the per-branch setup across four draw branches: split-stereo (326–374), split-mono (375–400), pure stereo (449–517), pure mono (518–565).

### Task 1.1: `computeWaveformGeometry` util + tests

**Files:**
- Create: `packages/components/src/ClipBody/waveformGeometry.ts`
- Test: `packages/components/src/ClipBody/__tests__/waveformGeometry.test.ts`

**Interfaces:**
- Produces: `computeWaveformGeometry(args: WaveformGeometryArgs): WaveformGeometry` — consumed by Task 1.3.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeWaveformGeometry } from '../waveformGeometry';

describe('computeWaveformGeometry', () => {
  it('derives sample rate from full duration and computes samples per pixel', () => {
    // 50_000 samples/sec over 2s = 100_000 samples; 100 px/s, no stretch
    const g = computeWaveformGeometry({
      dataLength: 100_000,
      clipFullDuration: 2,
      clipTrimStart: 0,
      clipDuration: 2,
      pixelsPerSecond: 100,
      clipStretchFactor: 1,
    });
    expect(g.samplesPerPixel).toBeCloseTo(500); // 50_000 / 100
    expect(g.trimStartSample).toBe(0);
  });

  it('falls back to trimStart + duration when clipFullDuration is undefined', () => {
    const g = computeWaveformGeometry({
      dataLength: 150_000,
      clipFullDuration: undefined,
      clipTrimStart: 1,
      clipDuration: 2, // fullDuration = 3 → rate 50_000
      pixelsPerSecond: 100,
      clipStretchFactor: 1,
    });
    expect(g.samplesPerPixel).toBeCloseTo(500);
    expect(g.trimStartSample).toBe(50_000); // floor(1 * 50_000)
  });

  it('divides samples per pixel by the stretch factor', () => {
    const g = computeWaveformGeometry({
      dataLength: 100_000,
      clipFullDuration: 2,
      clipTrimStart: 0.5,
      clipDuration: 1.5,
      pixelsPerSecond: 100,
      clipStretchFactor: 2,
    });
    expect(g.samplesPerPixel).toBeCloseTo(250);
    expect(g.trimStartSample).toBe(25_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/components && pnpm test -- waveformGeometry`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

This is the exact math currently duplicated at ClipBody.tsx:336–337/342–344 (and 382–383/387–389, 460–461/465–467, 525–526/530–532):

```ts
export interface WaveformGeometryArgs {
  dataLength: number;
  clipFullDuration: number | undefined;
  clipTrimStart: number;
  clipDuration: number;
  pixelsPerSecond: number;
  clipStretchFactor: number;
}

export interface WaveformGeometry {
  samplesPerPixel: number;
  trimStartSample: number;
}

export function computeWaveformGeometry(args: WaveformGeometryArgs): WaveformGeometry {
  const fullDuration = args.clipFullDuration || (args.clipTrimStart + args.clipDuration);
  const detectedSampleRate = args.dataLength / fullDuration;
  const secondsPerPixel = 1 / args.pixelsPerSecond;
  const samplesPerPixel = (secondsPerPixel * detectedSampleRate) / args.clipStretchFactor;
  const trimStartSample = Math.floor(args.clipTrimStart * detectedSampleRate);
  return { samplesPerPixel, trimStartSample };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/components && pnpm test -- waveformGeometry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/ClipBody/waveformGeometry.ts packages/components/src/ClipBody/__tests__/waveformGeometry.test.ts
git commit -m "refactor(components): extract computeWaveformGeometry util with tests"
```

### Task 1.2: `makeSelectionColorFns` util + tests

**Files:**
- Modify: `packages/components/src/ClipBody/waveformGeometry.ts` (append)
- Test: `packages/components/src/ClipBody/__tests__/waveformGeometry.test.ts` (append)

**Interfaces:**
- Produces: `makeSelectionColorFns(args: SelectionColorArgs): { getWaveColor: (px: number) => string; getRmsColor: (px: number) => string }` — consumed by Task 1.3.

- [ ] **Step 1: Read the source block**

Read ClipBody.tsx:470–492 (stereo branch) and 534–557 (mono branch) — they are identical. The block computes `selStartPx`/`selEndPx` from `timeSelectionRange` relative to the clip, and returns per-pixel color pickers that switch between normal and time-selection colors. Note lines 484, 487, 549, 552 read `selectedWaveformColor`/`selectedRmsColor` from computed style but never use them — these are dead reads; DROP them in the extracted helper and note it in the commit message.

- [ ] **Step 2: Write the failing test**

Use a fake style object — the helper must take `getPropertyValue` through a minimal interface so it's testable without a real `CSSStyleDeclaration`:

```ts
import { makeSelectionColorFns } from '../waveformGeometry';

describe('makeSelectionColorFns', () => {
  const style = {
    getPropertyValue: (name: string) => `var(${name})`,
  };
  const base = {
    computedStyle: style,
    colorPrefix: 'blue',
    clipStartTime: 10,
    clipDuration: 4,
    pixelsPerSecond: 100,
  };

  it('returns selection colors inside the selection pixel range and normal outside', () => {
    // selection 11s–12s over a clip starting at 10s → px 100..200
    const fns = makeSelectionColorFns({
      ...base,
      inTimeSelection: true,
      timeSelectionRange: { startTime: 11, endTime: 12 },
    });
    expect(fns.getWaveColor(150)).not.toBe(fns.getWaveColor(50));
    expect(fns.getWaveColor(50)).toBe(fns.getWaveColor(250));
  });

  it('returns constant colors when there is no time selection', () => {
    const fns = makeSelectionColorFns({
      ...base,
      inTimeSelection: false,
      timeSelectionRange: null,
    });
    expect(fns.getWaveColor(0)).toBe(fns.getWaveColor(999));
  });
});
```

Adjust the two assertions' exact expected strings to match the CSS custom-property names used in the verbatim block once read (the block reads properties like `--clip-waveform-<color>` / time-selection variants via `getPropertyValue`) — assert on the actual returned strings, keeping the shape above (inside ≠ outside; no-selection is constant).

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/components && pnpm test -- waveformGeometry`
Expected: FAIL — `makeSelectionColorFns` not exported.

- [ ] **Step 4: Implement by verbatim move**

Move the block from ClipBody.tsx:534–557 into the helper. Parameter interface (derive exact fields from what the block actually touches):

```ts
export interface SelectionColorArgs {
  computedStyle: Pick<CSSStyleDeclaration, 'getPropertyValue'>;
  colorPrefix: string; // the clip color key used in the CSS var names
  inTimeSelection: boolean;
  timeSelectionRange: { startTime: number; endTime: number } | null;
  clipStartTime: number;
  clipDuration: number;
  pixelsPerSecond: number;
}
```

Keep the pixel-bounds math and the branch conditions character-for-character; only the dead `selectedWaveformColor`/`selectedRmsColor` reads are dropped.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/components && pnpm test -- waveformGeometry`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/ClipBody/
git commit -m "refactor(components): extract makeSelectionColorFns; drop dead selected-color reads"
```

### Task 1.3: Replace the four ClipBody branch setups with the helpers

**Files:**
- Modify: `packages/components/src/ClipBody/ClipBody.tsx` (branches at 326–374, 375–400, 449–517, 518–565)

**Interfaces:**
- Consumes: `computeWaveformGeometry`, `makeSelectionColorFns` from Task 1.1/1.2.

- [ ] **Step 1: Replace setup blocks branch by branch**

In each of the four branches, replace the inline sample-rate/samples-per-pixel/trim block with one `computeWaveformGeometry` call, and (mono + stereo branches only) the color-fn block with one `makeSelectionColorFns` call. `centerY`/`maxAmplitude` stay branch-specific. The `drawChannel` calls themselves DO NOT change. Split-view branches (326–400) have no color fns — don't add them.

- [ ] **Step 2: Gates**

Run: `cd packages/components && pnpm test && npx tsc --noEmit` then `pnpm --filter @audacity-ui/sandbox test` and `node scripts/check-any.mjs` from root.
Expected: all pass.

- [ ] **Step 3: Visual verification (no unit coverage exists for canvas output)**

Run the sandbox (`pnpm --filter @audacity-ui/sandbox dev`, port 5173) and verify: mono waveform, stereo waveform, split view, and a time selection over a clip all render as before (waveform colors change inside the selection band). State what was checked in the commit body.

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/ClipBody/ClipBody.tsx
git commit -m "refactor(components): ClipBody draw branches use shared geometry/color helpers"
```

---

## Phase 2 — LoopRegionContext

`useLoopRegion` (`apps/sandbox/src/hooks/useLoopRegion.ts`) already owns all loop state. The blocker (audioManagerRef drilling) is gone: `usePlayback()` exposes `audioManagerRef` (PlaybackContext.tsx:5, value shape `UsePlaybackControlsReturn`). This phase follows the PlaybackContext **value-provider** pattern: App keeps calling `useLoopRegion` (its options need App-local `timeSelection`/`bpm`/`beatsPerMeasure`), and provides the returned object via context — eliminating the drilled props in EditorLayout, AppContextMenus, and AppDialogs.

### Task 2.1: Characterization test for useLoopRegion

**Files:**
- Test: `apps/sandbox/src/hooks/__tests__/useLoopRegion.test.ts`

- [ ] **Step 1: Write the test (this should PASS immediately — it locks in current behavior)**

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLoopRegion } from '../useLoopRegion';

function makeAudioManagerRef() {
  return {
    current: {
      setLoopEnabled: vi.fn(),
      setLoopRegion: vi.fn(),
    },
  } as never; // shape-only stub; cast via never to satisfy AudioPlaybackManager — justify if guard flags it
}

describe('useLoopRegion', () => {
  it('toggleLoopRegion defaults to a 4-measure region from bpm when no time selection', () => {
    const audioManagerRef = makeAudioManagerRef();
    const { result } = renderHook(() =>
      useLoopRegion({ audioManagerRef, timeSelection: null, bpm: 120, beatsPerMeasure: 4 })
    );
    act(() => { result.current.toggleLoopRegion(); });
    expect(result.current.loopRegionEnabled).toBe(true);
    expect(result.current.loopRegionStart).toBe(0);
    // 4 measures * 4 beats at 120bpm = 16 beats * 0.5s = 8s
    expect(result.current.loopRegionEnd).toBeCloseTo(8);
  });

  it('toggleLoopRegion adopts the active time selection', () => {
    const audioManagerRef = makeAudioManagerRef();
    const { result } = renderHook(() =>
      useLoopRegion({
        audioManagerRef,
        timeSelection: { startTime: 2, endTime: 5 } as never,
        bpm: 120,
        beatsPerMeasure: 4,
      })
    );
    act(() => { result.current.toggleLoopRegion(); });
    expect(result.current.loopRegionStart).toBe(2);
    expect(result.current.loopRegionEnd).toBe(5);
  });

  it('syncs enabled state and region to the audio manager', () => {
    const audioManagerRef = makeAudioManagerRef();
    const { result } = renderHook(() =>
      useLoopRegion({ audioManagerRef, timeSelection: null, bpm: 120, beatsPerMeasure: 4 })
    );
    act(() => { result.current.setLoopRegionEnabled(true); });
    expect((audioManagerRef as { current: { setLoopEnabled: ReturnType<typeof vi.fn> } }).current.setLoopEnabled).toHaveBeenCalledWith(true);
  });
});
```

Before finalizing, read `useLoopRegion.ts:53–75` and correct the expected default-region numbers to the actual formula. If `timeSelection`'s type disallows `null`, match the real option type. Replace `as never` casts with the minimal real types if cheap; otherwise add `// justified: shape-only test stub`.

- [ ] **Step 2: Run and confirm PASS**

Run: `pnpm --filter @audacity-ui/sandbox test -- useLoopRegion`
Expected: PASS. If a expectation fails, fix the EXPECTATION to match observed behavior (this is characterization, not a bugfix).

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/hooks/__tests__/useLoopRegion.test.ts
git commit -m "test(sandbox): characterization tests for useLoopRegion"
```

### Task 2.2: Create LoopRegionContext (value-provider)

**Files:**
- Create: `apps/sandbox/src/contexts/LoopRegionContext.tsx`
- Modify: `apps/sandbox/src/App.tsx` (wrap tree inside `<PlaybackProvider>` at line 1167)

**Interfaces:**
- Produces: `LoopRegionProvider({ value, children })`, `useLoopRegionContext(): UseLoopRegionReturn` — consumed by Tasks 2.3–2.5.

- [ ] **Step 1: Write the context, mirroring PlaybackContext.tsx exactly**

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { UseLoopRegionReturn } from '../hooks/useLoopRegion';

export type LoopRegionContextValue = UseLoopRegionReturn;

const LoopRegionContext = createContext<LoopRegionContextValue | undefined>(undefined);

/**
 * Value-provider: CanvasDemoContent calls useLoopRegion (its options need
 * App-local timeSelection/bpm/beatsPerMeasure) and passes the result here.
 */
export function LoopRegionProvider({ value, children }: { value: LoopRegionContextValue; children: ReactNode }) {
  return <LoopRegionContext.Provider value={value}>{children}</LoopRegionContext.Provider>;
}

export function useLoopRegionContext(): LoopRegionContextValue {
  const ctx = useContext(LoopRegionContext);
  if (!ctx) throw new Error('useLoopRegionContext must be used within LoopRegionProvider');
  return ctx;
}
```

Check `useLoopRegion.ts:11–23`: if `UseLoopRegionReturn` is not exported, export it.

- [ ] **Step 2: Mount it in App.tsx**

At App.tsx:577–589 the hook result is destructured. Keep the destructure (App still uses several fields itself, e.g. export path at 1153–1160) but also capture the whole object: `const loopRegion = useLoopRegion({...})` then destructure from `loopRegion`. Wrap the JSX immediately inside `<PlaybackProvider value={playback}>` (line 1167) with `<LoopRegionProvider value={loopRegion}>` (closing before `</PlaybackProvider>` at 1788).

- [ ] **Step 3: Gates + commit**

Run: `cd apps/sandbox && npx tsc --noEmit && pnpm test` and `node scripts/check-any.mjs`.

```bash
git add apps/sandbox/src/contexts/LoopRegionContext.tsx apps/sandbox/src/App.tsx apps/sandbox/src/hooks/useLoopRegion.ts
git commit -m "feat(sandbox): LoopRegionContext value-provider"
```

### Task 2.3: EditorLayout consumes LoopRegionContext

**Files:**
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (prop types 86–95, destructure 159–160, usages 1105–1145, 1461–1489)
- Modify: `apps/sandbox/src/App.tsx` (drop loop props at 1109–1114 and 1487–1496)

- [ ] **Step 1: Swap props for context**

In EditorLayout: delete the loop-region prop declarations and destructures; add `const { loopRegionEnabled, loopRegionStart, loopRegionEnd, loopRegionInteracting, loopRegionHovering, setLoopRegionEnabled, setLoopRegionStart, setLoopRegionEnd, setLoopRegionInteracting, setLoopRegionHovering, toggleLoopRegion } = useLoopRegionContext();` (only the members it actually uses — check each usage site). In App.tsx remove the now-unpassed props.

- [ ] **Step 2: Gates + commit**

Run: `cd apps/sandbox && npx tsc --noEmit && pnpm test` — tsc will catch any missed prop.
Manual check: toggle the loop region from the timeline; drag its handles.

```bash
git add apps/sandbox/src/components/EditorLayout.tsx apps/sandbox/src/App.tsx
git commit -m "refactor(sandbox): EditorLayout reads loop region from context"
```

### Task 2.4: AppContextMenus consumes LoopRegionContext

**Files:**
- Modify: `apps/sandbox/src/components/AppContextMenus.tsx` (prop types 31–36, destructure 59–61, logic 378–417)
- Modify: `apps/sandbox/src/App.tsx` (drop the corresponding props)

- [ ] **Step 1: Swap props for context** — same mechanics as Task 2.3. The `onToggleLoopRegion`/`onClearLoopRegion`/`onSetLoopRegionToSelection` logic at 378–417 stays verbatim, sourcing setters from the context.

- [ ] **Step 2: Gates + commit** (same commands)

```bash
git commit -am "refactor(sandbox): AppContextMenus reads loop region from context"
```

### Task 2.5: AppDialogs consumes LoopRegionContext

**Files:**
- Modify: `apps/sandbox/src/components/AppDialogs.tsx` (prop types 85–87, destructure 164, usage 842)
- Modify: `apps/sandbox/src/App.tsx` (drop props at 1652–1654, 1696–1701)

- [ ] **Step 1: Swap props for context** — `hasLoopRegion` derivation at AppDialogs.tsx:842 stays verbatim.
- [ ] **Step 2: Gates + commit**

```bash
git commit -am "refactor(sandbox): AppDialogs reads loop region from context"
```

---

## Phase 3 — PreferencesContext domain split

Source: `packages/components/src/contexts/PreferencesContext.tsx` (210 lines). Strategy: ONE state blob + ONE storage key stay; the provider additionally exposes three memoized domain slices via nested contexts. External consumers migrate to slices; the modal keeps full `usePreferences`. Domains by actual consumer data:
- **General** (`operatingSystem`, `showWelcomeDialog`, `checkForUpdates`) — App, InstallerWizardDialog, EffectDialog, WelcomeDialog.
- **Appearance** (`theme`, `clipStyle`) — ThemedApp, Canvas.
- **EditingBehavior** (`trackSelectionMode`) — Canvas, EditorLayout, useKeyboardShortcuts, App. Hottest field.

### Task 3.1: Characterization tests for PreferencesContext persistence

**Files:**
- Test: `packages/components/src/contexts/__tests__/PreferencesContext.test.tsx`

- [ ] **Step 1: Write the test (expected to pass as-is)**

```tsx
import { render, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PreferencesProvider, usePreferences } from '../PreferencesContext';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

function Probe({ onValue }: { onValue: (v: ReturnType<typeof usePreferences>) => void }) {
  onValue(usePreferences());
  return null;
}

describe('PreferencesContext persistence', () => {
  it('merges stored values over defaults on load', () => {
    localStorage.setItem('audacity-preferences', JSON.stringify({ theme: 'dark' }));
    let value!: ReturnType<typeof usePreferences>;
    render(<PreferencesProvider><Probe onValue={(v) => (value = v)} /></PreferencesProvider>);
    expect(value.preferences.theme).toBe('dark');
    expect(value.preferences.clipStyle).toBe('colourful'); // default survives partial blob
  });

  it('updatePreference persists the whole blob', () => {
    let value!: ReturnType<typeof usePreferences>;
    render(<PreferencesProvider><Probe onValue={(v) => (value = v)} /></PreferencesProvider>);
    act(() => value.updatePreference('theme', 'dark'));
    const stored = JSON.parse(localStorage.getItem('audacity-preferences')!);
    expect(stored.theme).toBe('dark');
    expect(stored).toHaveProperty('trackSelectionMode'); // full blob, not a diff
  });

  it('resetPreferences restores defaults', () => {
    let value!: ReturnType<typeof usePreferences>;
    render(<PreferencesProvider><Probe onValue={(v) => (value = v)} /></PreferencesProvider>);
    act(() => value.updatePreference('theme', 'dark'));
    act(() => value.resetPreferences());
    expect(value.preferences.theme).toBe('light');
  });
});
```

Verify the two default values (`clipStyle`, `theme`) against `defaultPreferences` (PreferencesContext.tsx:74–132) and fix expectations to match reality.

- [ ] **Step 2: Run, confirm PASS, commit**

Run: `cd packages/components && pnpm test -- PreferencesContext`

```bash
git add packages/components/src/contexts/__tests__/PreferencesContext.test.tsx
git commit -m "test(components): characterization tests for PreferencesContext persistence"
```

### Task 3.2: Add domain slice contexts inside PreferencesProvider

**Files:**
- Modify: `packages/components/src/contexts/PreferencesContext.tsx`

**Interfaces (Produces — consumed by Tasks 3.3–3.4):**

```ts
export interface GeneralPrefsValue {
  operatingSystem: PreferencesState['operatingSystem'];
  showWelcomeDialog: boolean;
  checkForUpdates: boolean;
  updatePreference: PreferencesContextValue['updatePreference'];
}
export function useGeneralPrefs(): GeneralPrefsValue;

export interface AppearancePrefsValue {
  theme: PreferencesState['theme'];
  clipStyle: PreferencesState['clipStyle'];
  updatePreference: PreferencesContextValue['updatePreference'];
}
export function useAppearancePrefs(): AppearancePrefsValue;

export interface EditingBehaviorPrefsValue {
  trackSelectionMode: PreferencesState['trackSelectionMode'];
  updatePreference: PreferencesContextValue['updatePreference'];
}
export function useEditingBehaviorPrefs(): EditingBehaviorPrefsValue;
```

- [ ] **Step 1: Write a failing re-render-isolation test** (append to the Task 3.1 file)

```tsx
import { useEditingBehaviorPrefs } from '../PreferencesContext';

it('editing-behavior consumers do not re-render on appearance changes', () => {
  let editingRenders = 0;
  let value!: ReturnType<typeof usePreferences>;
  function EditingProbe() {
    useEditingBehaviorPrefs();
    editingRenders++;
    return null;
  }
  const Memoized = React.memo(EditingProbe);
  render(
    <PreferencesProvider>
      <Probe onValue={(v) => (value = v)} />
      <Memoized />
    </PreferencesProvider>
  );
  const before = editingRenders;
  act(() => value.updatePreference('theme', 'dark'));
  expect(editingRenders).toBe(before); // context value memoized on trackSelectionMode only
});
```

- [ ] **Step 2: Run to verify it fails** (`useEditingBehaviorPrefs` doesn't exist).

- [ ] **Step 3: Implement**

Inside `PreferencesProvider`, after the existing state/`updatePreference`, add three `useMemo` slice values keyed only on their fields + `updatePreference` (which must already be a stable `useCallback` — make it one if it isn't, disclosing in the commit), and nest the providers:

```tsx
const generalValue = useMemo(
  () => ({
    operatingSystem: preferences.operatingSystem,
    showWelcomeDialog: preferences.showWelcomeDialog,
    checkForUpdates: preferences.checkForUpdates,
    updatePreference,
  }),
  [preferences.operatingSystem, preferences.showWelcomeDialog, preferences.checkForUpdates, updatePreference]
);
// appearanceValue, editingBehaviorValue analogous

return (
  <PreferencesContext.Provider value={value}>
    <GeneralPrefsContext.Provider value={generalValue}>
      <AppearancePrefsContext.Provider value={appearanceValue}>
        <EditingBehaviorPrefsContext.Provider value={editingBehaviorValue}>
          {children}
        </EditingBehaviorPrefsContext.Provider>
      </AppearancePrefsContext.Provider>
    </GeneralPrefsContext.Provider>
  </PreferencesContext.Provider>
);
```

Each `useXPrefs` hook throws outside its provider, same message pattern as `usePreferences` (line 201–209).

- [ ] **Step 4: Run all context tests, gates, commit**

Run: `cd packages/components && pnpm test -- PreferencesContext && npx tsc --noEmit`; root gates.

```bash
git commit -am "feat(components): domain slice contexts inside PreferencesProvider"
```

### Task 3.3: Migrate package-internal consumers to slices

**Files:**
- Modify: `packages/components/src/EffectDialog/EffectDialog.tsx:95,147` (`operatingSystem` → `useGeneralPrefs`)
- Modify: `packages/components/src/WelcomeDialog/WelcomeDialog.tsx:83,105,129–130,185,190` (`operatingSystem`, `showWelcomeDialog` read+write → `useGeneralPrefs`)

- [ ] **Step 1: Swap `usePreferences()` for `useGeneralPrefs()`** at each site; writes go through the slice's `updatePreference`.
- [ ] **Step 2: Gates + commit**

Run: `cd packages/components && pnpm test && npx tsc --noEmit` then `pnpm --filter @audacity-ui/sandbox test`.

```bash
git commit -am "refactor(components): EffectDialog/WelcomeDialog use general prefs slice"
```

### Task 3.4: Migrate sandbox consumers to slices

**Files:**
- Modify: `apps/sandbox/src/App.tsx` — ThemedApp:1794–1795 (`theme` → `useAppearancePrefs`); CanvasDemoContent keeps full `usePreferences` (it reads across domains: `operatingSystem`, `trackSelectionMode`, `rollInTime`).
- Modify: `apps/sandbox/src/components/Canvas.tsx:205,1121,1323` (`trackSelectionMode` → `useEditingBehaviorPrefs`; `clipStyle` → `useAppearancePrefs`)
- Modify: `apps/sandbox/src/components/EditorLayout.tsx:168,936,1414,1551` (`trackSelectionMode` → `useEditingBehaviorPrefs`)
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:59,106,425,481,931` (`trackSelectionMode` → `useEditingBehaviorPrefs`)
- Modify: `apps/sandbox/src/components/InstallerWizardDialog.tsx:34–35` (`operatingSystem` → `useGeneralPrefs`)

- [ ] **Step 1: Swap hook calls file by file**, keeping each read site verbatim.
- [ ] **Step 2: Gates + commit**

Run: `cd apps/sandbox && npx tsc --noEmit && pnpm test`; root `node scripts/check-any.mjs`.
Manual check: switch theme in preferences (whole app re-themes); toggle track-selection mode and verify keyboard track selection behavior changes accordingly.

```bash
git commit -am "refactor(sandbox): hot preference consumers use domain slices"
```

---

## Phase 4 — PreferencesModal per-page split

Source: `packages/components/src/PreferencesModal/PreferencesModal.tsx` (1979 lines). All 10 page components are already self-contained top-level functions — extraction is verbatim moves. Target layout:

```
PreferencesModal/
  PreferencesModal.tsx      # scaffold: Dialog, side nav, page switch, footer (~440 lines)
  types.ts                  # PreferencesPage union, PreferencesModalProps
  menuItems.ts              # menuItems array
  TabGroupField.tsx         # shared field wrapper (lines 110–249)
  pages/
    GeneralPage.tsx … CloudPage.tsx, PlaceholderPage.tsx
```

**Watch-out:** `TabGroupField` does runtime `child.type.name`/displayName string checks (lines 214–240) on LabeledInput/Checkbox/Radio/NumberStepper/Button. Moving PAGES does not move those field components, so the checks are unaffected — but do not rename anything they match.

### Task 4.1: Extract shared scaffolding modules

**Files:**
- Create: `packages/components/src/PreferencesModal/types.ts` (move `PreferencesPage` 22–34, `PreferencesModalProps` 36–93)
- Create: `packages/components/src/PreferencesModal/menuItems.ts` (move `menuItems` 95–108)
- Create: `packages/components/src/PreferencesModal/TabGroupField.tsx` (move `TabGroupFieldProps` + `TabGroupField` 110–249)
- Modify: `packages/components/src/PreferencesModal/PreferencesModal.tsx` (import from the new modules; re-export `type PreferencesPage`, `type PreferencesModalProps` so `index.ts:77` `export *` keeps the public API)

- [ ] **Step 1: Move verbatim, fix imports, re-export types from PreferencesModal.tsx.**
- [ ] **Step 2: Gates + commit**

Run: `cd packages/components && pnpm test && npx tsc --noEmit`; `pnpm --filter @audacity-ui/sandbox test` (sandbox imports the modal).

```bash
git commit -am "refactor(components): PreferencesModal scaffolding into shared modules"
```

### Task 4.2: Extract the zero-coupling pages (EditingPage, ShortcutsPage, PlaceholderPage)

**Files:**
- Create: `packages/components/src/PreferencesModal/pages/EditingPage.tsx` (move lines 1325–1681: `EditingPageProps` + `EditingPage`; its 9 useState hooks are component-local by design — move as-is, do NOT wire to preferences)
- Create: `packages/components/src/PreferencesModal/pages/ShortcutsPage.tsx` (move 1682–1819)
- Create: `packages/components/src/PreferencesModal/pages/PlaceholderPage.tsx` (move 1970–1978)
- Test: `packages/components/src/PreferencesModal/__tests__/pages.test.tsx`

- [ ] **Step 1: Write page smoke tests FIRST (against the not-yet-moved exports — they fail on import)**

```tsx
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';
import { PreferencesProvider } from '../../contexts/PreferencesContext';
import { EditingPage } from '../pages/EditingPage';
import { ShortcutsPage } from '../pages/ShortcutsPage';

afterEach(cleanup);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ThemeProvider>
        <AccessibilityProfileProvider>{children}</AccessibilityProfileProvider>
      </ThemeProvider>
    </PreferencesProvider>
  );
}

describe('preferences pages render', () => {
  it('EditingPage renders', () => {
    const { container } = render(<Providers><EditingPage /></Providers>);
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });
  it('ShortcutsPage renders', () => {
    const { container } = render(<Providers><ShortcutsPage /></Providers>);
    expect(container.querySelector('.preferences-page')).toBeTruthy();
  });
});
```

Adjust the asserted selector to whatever root class the pages actually render (check the moved JSX; `.preferences-page` per the accounts wrapper at 366–368).

- [ ] **Step 2: Run to verify import failure.** `cd packages/components && pnpm test -- pages`
- [ ] **Step 3: Move the pages verbatim, export named; import them in PreferencesModal.tsx.**
- [ ] **Step 4: Run to verify PASS; full gates.**
- [ ] **Step 5: Commit**

```bash
git commit -am "refactor(components): extract EditingPage/ShortcutsPage/PlaceholderPage"
```

### Task 4.3: Extract the context-coupled small pages (GeneralPage, AppearancePage, PluginsPage, CloudPage)

**Files:**
- Create: `pages/GeneralPage.tsx` (440–541, prop `{ onResetWarnings?: () => void }`), `pages/AppearancePage.tsx` (542–594), `pages/PluginsPage.tsx` (1820–1871, prop `{ onOpenPluginManager?: () => void }`), `pages/CloudPage.tsx` (1872–1969)
- Test: append render smoke tests to `__tests__/pages.test.tsx` (same pattern as Task 4.2 — these pages need `PreferencesProvider`, already in `Providers`)

- [ ] **Step 1: Append failing smoke tests; Step 2: verify fail; Step 3: move verbatim + wire imports/props at the switch site (365–383); Step 4: gates; Step 5: commit**

```bash
git commit -am "refactor(components): extract General/Appearance/Plugins/Cloud pages"
```

### Task 4.4: Extract the large pages (AudioSettingsPage, PlaybackRecordingPage, SpectralDisplayPage)

**Files:**
- Create: `pages/AudioSettingsPage.tsx` (595–827), `pages/PlaybackRecordingPage.tsx` (828–1082), `pages/SpectralDisplayPage.tsx` (1083–1324)
- Test: append smoke tests as above

Same 5-step cycle. Preserve the partial wiring exactly (AudioSettings persists only `audioHost`/`recordingDevice`/`playbackDevice`; SpectralDisplay persists only `spectralGain`/`spectralScheme`).

```bash
git commit -am "refactor(components): extract AudioSettings/PlaybackRecording/SpectralDisplay pages"
```

- [ ] **Final phase check:** `wc -l packages/components/src/PreferencesModal/PreferencesModal.tsx` — expect ~450 lines (scaffold only). Verify in Storybook or sandbox: open Preferences, click through all 12 nav items, confirm every page renders and F6 region cycling still works.

---

## Phase 5 — Canvas.tsx decomposition

Source: `apps/sandbox/src/components/Canvas.tsx` (1959 lines). Order: pure math with tests → self-contained hooks → glue-heavy handler bundles. Follow the `useClipTrimming` interface convention (exported `UseXxxOptions`/`UseXxxReturn`, hook pulls `useTracksDispatch()` itself, ref-mirror for document listeners).

### Task 5.1: Pure layout/guideline utils + tests

**Files:**
- Create: `apps/sandbox/src/utils/canvasLayout.ts`
- Create: `apps/sandbox/src/utils/snapGuideline.ts`
- Test: `apps/sandbox/src/utils/__tests__/canvasLayout.test.ts`, `apps/sandbox/src/utils/__tests__/snapGuideline.test.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (blocks at 456–462 and 395–402)

**Interfaces:**

```ts
// canvasLayout.ts — verbatim math from Canvas.tsx:456–462
export interface CanvasHeights { tracksHeight: number; totalHeight: number; containerHeight: number }
export function computeCanvasHeights(
  tracks: ReadonlyArray<{ height?: number }>,
  opts: { topGap: number; trackGap: number; defaultTrackHeight: number; bottomBuffer: number }
): CanvasHeights;

// snapGuideline.ts — verbatim coalescing from Canvas.tsx:395–402
export type SnapKind = 'grid' | 'alignment' | null;
export interface SnapGuidelineInput { time: number | null; kind: SnapKind }
export function resolveSnapGuideline(
  drag: SnapGuidelineInput, trim: SnapGuidelineInput, stretch: SnapGuidelineInput
): { time: number | null; kind: SnapKind };
```

- [ ] **Step 1: Write failing tests** — for `computeCanvasHeights`: two tracks with explicit heights, one defaulting, assert the three sums match the current formula (read 456–462 first and encode it). For `resolveSnapGuideline`: drag wins over trim wins over stretch (encode the actual precedence found at 395–402); all-null returns nulls.
- [ ] **Step 2: Verify fail → implement by verbatim move → verify pass.**
- [ ] **Step 3: Replace the inline blocks in Canvas.tsx with calls; keep the derived `snapGuidelineColor`/`snapGuidelineShadow` mapping inline if it reads `theme`.**
- [ ] **Step 4: Gates + commit**

```bash
git commit -am "refactor(sandbox): extract canvas height + snap-guideline utils with tests"
```

### Task 5.2: `useCmdArrowMove` hook

**Files:**
- Create: `apps/sandbox/src/hooks/useCmdArrowMove.ts`
- Test: `apps/sandbox/src/hooks/__tests__/useCmdArrowMove.test.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (keyup effect 478–512, `isCmdArrowMoving` state 260, and the `pendingClipMoveResolution` writes inside `onClipMove` 1336–1364 / `onClipMoveToTrack` 1365–1403 / `onTrackReorder` 1144–1319)

**Interfaces:**

```ts
export interface UseCmdArrowMoveOptions { tracks: Track[] } // dispatch pulled internally via useTracksDispatch
export interface UseCmdArrowMoveReturn {
  isCmdArrowMoving: boolean;
  /** Record a pending keyboard clip-move; overlap resolution fires on Cmd/Ctrl release. */
  beginCmdMove: () => void;
}
export function useCmdArrowMove(options: UseCmdArrowMoveOptions): UseCmdArrowMoveReturn;
```

- [ ] **Step 1: Write the failing test** — renderHook with a `TracksProvider`-style dispatch mock (follow `useClipDragging.overlap.test.tsx` for the provider harness); call `beginCmdMove()` after seeding `pendingClipMoveResolution.current`, fire `keyup` with `key: 'Meta'` on `document`, assert `isCmdArrowMoving` flips false and dispatch received `APPLY_CLIP_PLACEMENT`.
- [ ] **Step 2: Implement** — move the effect verbatim; mirror `tracks` into a ref (ref-mirror constraint) so the keyup listener binds once. `beginCmdMove` = `setIsCmdArrowMoving(true)` (the pending-state write stays at the call sites, which own the placement details).
- [ ] **Step 3: Wire Canvas to the hook; delete local state + effect.**
- [ ] **Step 4: Gates + commit**

```bash
git commit -am "refactor(sandbox): useCmdArrowMove hook owns keyup overlap resolution"
```

### Task 5.3: Keyboard trim/stretch math → tested utils

**Files:**
- Create: `apps/sandbox/src/utils/clipKeyboardEdit.ts`
- Test: `apps/sandbox/src/utils/__tests__/clipKeyboardEdit.test.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (`onClipTrim` 1442–1605, `onClipStretch` 1606–1668)

**Interfaces:**

```ts
export interface KeyboardTrimArgs {
  clip: Clip; trackIndex: number; edge: 'left' | 'right'; direction: -1 | 1;
  stepSeconds: number; tracks: Track[];
}
export interface KeyboardTrimResult {
  updatedClip: Clip; announcement: string;
  placements: ClipPlacement[] | null; // overlap-resolved placements, null if no overlap
}
export function computeKeyboardTrim(args: KeyboardTrimArgs): KeyboardTrimResult | null; // null = no-op (limit reached)

export interface KeyboardStretchArgs { clip: Clip; direction: -1 | 1; stepSeconds: number }
export function computeKeyboardStretch(args: KeyboardStretchArgs): { updatedClip: Clip; announcement: string } | null;
```

**Note to implementer:** read the two inline handlers FIRST and let their actual inputs/outputs drive the final signatures — the shapes above are the target altitude (pure state in → intent out, dispatch/`announce` stay in Canvas), not gospel. `resolveOverlap` is already unit-tested; reuse it inside `computeKeyboardTrim`.

- [ ] **Step 1: Write failing tests** — trim right edge shrinks duration by step and announces; trim past minimum returns null; stretch changes stretchFactor and duration proportionally (encode observed formula); AUDIO clips only (stretch on a MidiClip is not a case — do not add one; product rule: stretchFactor never applies to MidiClip).
- [ ] **Step 2: Extract the math verbatim into the utils; thin the Canvas handlers to: call util → dispatch → announce.**
- [ ] **Step 3: Gates + commit**

```bash
git commit -am "refactor(sandbox): keyboard trim/stretch math extracted to tested utils"
```

### Task 5.4: Small pure derivations (`envelopePointSizes`, drag-highlight ids)

**Files:**
- Create: `apps/sandbox/src/utils/envelopePointSizes.ts` (move memo body 219–240 → `deriveEnvelopePointSizes(styleKey)`)
- Create: `apps/sandbox/src/hooks/useDragHighlightIds.ts` (memos 334–342 `draggingClipIds` + 348–360 `raisedClipIds`; options `{ isDraggingClips, clipDragStateRef, isCmdArrowMoving, tracks }`)
- Test: `apps/sandbox/src/utils/__tests__/envelopePointSizes.test.ts` (table-driven over `ENVELOPE_POINT_STYLES` keys)
- Modify: `apps/sandbox/src/components/Canvas.tsx`

- [ ] **Step 1–4: test → move → wire → gates + commit**

```bash
git commit -am "refactor(sandbox): extract envelope point sizes + drag-highlight id derivations"
```

### Task 5.5: Overlay presentational components

**Files:**
- Create: `apps/sandbox/src/components/canvas/SnapGuideline.tsx` (div at 687–701), `apps/sandbox/src/components/canvas/SplitPreviewLine.tsx` (IIFE 705–732), `apps/sandbox/src/components/canvas/MarqueeRect.tsx` (1925–1940)
- Modify: `apps/sandbox/src/components/Canvas.tsx`

Props = exactly the values each block reads today (e.g. `SplitPreviewLine`: `{ splitHover, tracks, focusColor }`). Pure JSX moves, no state.

- [ ] **Step 1: Move verbatim; Step 2: gates; Step 3: manual check** (drag a clip near another → guideline appears; split tool hover → preview line; right-drag → marquee)**; Step 4: commit**

```bash
git commit -am "refactor(sandbox): canvas overlays as presentational components"
```

### Task 5.6: `useCanvasPointerHandlers` — container mouse-handler bundle

**Files:**
- Create: `apps/sandbox/src/hooks/useCanvasPointerHandlers.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (handlers at 745–972)

**Interfaces:**

```ts
export interface UseCanvasPointerHandlersOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  lastMouseButtonRef: React.MutableRefObject<number>;
  splitTool: ReturnType<typeof useSplitTool>;
  marquee: ReturnType<typeof useMarqueeSelection>;
  containerProps: /* useAudioSelection's containerProps type */;
  handleClipMouseDown: (e: React.MouseEvent) => void;
  handleContainerClick: (e: React.MouseEvent) => void;
  onTimeSelectionMenuClick: CanvasProps['onTimeSelectionMenuClick'];
  onMidiClipDoubleClick: CanvasProps['onMidiClipDoubleClick'];
  // + the state read by the click logic: timeSelection, focusedTrackIndex,
  //   playheadPosition, selectedTrackIndices, tracks, pixelsPerSecond, clipContentOffset
}
export interface UseCanvasPointerHandlersReturn {
  onMouseDownCapture: React.MouseEventHandler; onMouseDown: React.MouseEventHandler;
  onMouseMove: React.MouseEventHandler; onMouseLeave: React.MouseEventHandler;
  onClickCapture: React.MouseEventHandler; onClick: React.MouseEventHandler;
  onContextMenu: React.MouseEventHandler; onDoubleClick: React.MouseEventHandler;
  onDragStart: React.DragEventHandler;
}
```

**Hazards (all documented in the source — preserve):**
- The Shift+Click time-range logic MUST stay on `click` (fires after `useAudioSelection`'s mouseup), not `mousedown` — the source comment says so.
- `onMouseLeave`/`onMouseMove` must keep chaining `containerProps.onMouseLeave`/`onMouseMove`, else the `ew-resize` hover cursor strands.
- `onContextMenu` reads `marquee.wasMarqueeing()` and `lastMouseButtonRef` written in `onMouseDown` — the whole bundle moves together.

- [ ] **Step 1: Move all nine handlers verbatim into the hook; Canvas spreads the returned object onto the container div.**
- [ ] **Step 2: Gates.** No new unit test (this is glue over already-tested parts); rely on tsc + suite.
- [ ] **Step 3: Manual check:** Shift+Click range selection; Cmd+click scope toggle on canvas; right-click time-selection menu; double-click MIDI clip opens piano roll; split tool click.
- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(sandbox): useCanvasPointerHandlers bundles container mouse events"
```

### Task 5.7: `useTrackKeyboardHandlers` (navigate/reorder)

**Files:**
- Create: `apps/sandbox/src/hooks/useTrackKeyboardHandlers.ts` (move `onTrackNavigateVertical` 1097–1143 and `onTrackReorder` 1144–1319 bodies)
- Modify: `apps/sandbox/src/components/Canvas.tsx`

Options carry what the two callbacks close over: `{ tracks, selectedTrackIndices, focusedTrackIndex, timeSelection, isFlatNavigation, beginCmdMove }` (dispatch pulled internally). `onTrackReorder` uses `resolveTimeSelectionScope` (already tested in `timeSelectionScope.test.ts`) and `beginCmdMove` from Task 5.2. Return `{ onTrackNavigateVertical, onTrackReorder }` with the exact signatures TrackNew expects (read them from `CanvasProps`/TrackNew props before moving).

- [ ] **Step 1: Move verbatim → wire → gates.**
- [ ] **Step 2: Manual check:** ArrowUp/Down focus tracks; Cmd+Arrow reorders; a scoped time selection promotes to clip move per the scope rules.
- [ ] **Step 3: Commit**

```bash
git commit -am "refactor(sandbox): track keyboard navigation/reorder extracted to hook"
```

### Task 5.8: `CanvasTrackList` component

**Files:**
- Create: `apps/sandbox/src/components/canvas/CanvasTrackList.tsx` (the `tracks.map` render at 983–1883, receiving the handler bundles from Tasks 5.2/5.3/5.6/5.7 plus the remaining inline clip callbacks as props)
- Modify: `apps/sandbox/src/components/Canvas.tsx`

Do this LAST in the phase — by now the inline handlers have shrunk to thin dispatch wrappers. Group the remaining TrackNew callbacks into one `clipHandlers` object prop rather than ~30 loose props. Preserve the cross-hook ref contracts verbatim: `onClipClick` mutates `didDragRef`/`justSelectedOnMouseDownRef`; `onClipTrimEdge` writes `clipTrimStateRef.current`; `onClipStretchEdge` calls `startClipStretch`.

- [ ] **Step 1: Move → wire → gates.**
- [ ] **Step 2: Manual sweep:** click/drag/trim/stretch clips by mouse and keyboard; envelope editing; label interactions; empty-background Shift+Click.
- [ ] **Step 3: Commit; then check** `wc -l apps/sandbox/src/components/Canvas.tsx` — target under ~700 lines.

```bash
git commit -am "refactor(sandbox): CanvasTrackList renders the per-track tree"
```

---

## Phase 6 — App.tsx decomposition

Source: `apps/sandbox/src/App.tsx` (1864 lines, `CanvasDemoContent` = 134–1790). Keep blocks A (context header), B (nav/routing state), and the JSX assembly as the shell. Never reorder the hook chain (Global Constraints).

### Task 6.1: Module helpers + `CloudAudioFile` type → utils

**Files:**
- Create: `apps/sandbox/src/utils/cloudProjects.ts` (move `loadCloudProjectAsStored` 74–118, `cloudSummaryToStored` 120–130, and the `CloudAudioFile` interface 22–31)
- Modify: `apps/sandbox/src/App.tsx` (import them; delete originals)
- Modify: `apps/sandbox/src/components/AppDialogs.tsx` (change `import type { CloudAudioFile } from '../App'` → `from '../utils/cloudProjects'`)

- [ ] **Step 1: Move verbatim; fix the AppDialogs import; grep for other `from '../App'` / `from './App'` type imports** (`grep -rn "from '.*App'" apps/sandbox/src --include='*.ts*'`) and update any found.
- [ ] **Step 2: Gates + commit**

```bash
git commit -am "refactor(sandbox): cloud project mappers + CloudAudioFile type to utils"
```

### Task 6.2: `useDraggableToolbar` + `useMasterMeter` + `useAudioDeviceMenu`

**Files:**
- Create: `apps/sandbox/src/hooks/useDraggableToolbar.ts` (move `ToolbarPosition` type 371–374, `toolbarPosition` state, `dragStateRef`, `handleToolbarGripperMouseDown` 388–423; return `{ toolbarPosition, setToolbarPosition, handleToolbarGripperMouseDown }`; document-listener → ref-mirror pattern if it reads changing state)
- Create: `apps/sandbox/src/hooks/useMasterMeter.ts` (move 557–574; options `{ masterMeterLevel, audioManagerRef }`; return `{ masterVolume, handleMasterVolumeChange, masterLevelLeft, masterLevelRight }`)
- Create: `apps/sandbox/src/hooks/useAudioDeviceMenu.ts` (move state 353–357 + effect 661–680)
- Test: `apps/sandbox/src/hooks/__tests__/useMasterMeter.test.ts` — renderHook: `handleMasterVolumeChange(0.5)` calls `audioManagerRef.current.setMasterVolume(0.5)` and updates `masterVolume`; dB memos derive from `masterMeterLevel` (encode the observed formula from 567–574).
- Modify: `apps/sandbox/src/App.tsx`

- [ ] **Step 1: useMasterMeter test-first (fail → move → pass); other two are verbatim moves.**
- [ ] **Step 2: Wire, gates, manual check** (drag toolbar gripper to top/bottom/floating; master volume slider moves meter).
- [ ] **Step 3: Commit**

```bash
git commit -am "refactor(sandbox): extract toolbar-drag, master-meter, audio-device-menu hooks"
```

### Task 6.3: `usePlugins` — unify the duplicated missing-plugins scan

**Files:**
- Create: `apps/sandbox/src/utils/findMissingEffects.ts` — pure scanner extracted from the effect at App.tsx:301–324: `findMissingEffects(args: { tracks: Track[]; masterEffects: Effect[]; installedIds: Set<string> }): string[]` (let the real shapes at the two call sites drive the exact types).
- Create: `apps/sandbox/src/hooks/usePlugins.ts` (move `plugins` state 232, `allPlugins` memo 238–252, disabled-sync effect 291–293, missing-plugins watcher 301–324 now calling `findMissingEffects`, `setPluginsWithSync` 328–337; options `{ state, showMissingPlugins, syncDisabledFromList, installedEffects }`)
- Test: `apps/sandbox/src/utils/__tests__/findMissingEffects.test.ts` — tracks referencing an uninstalled effect id → reported once; installed → empty; masterEffects included.
- Modify: `apps/sandbox/src/App.tsx` — ALSO replace the duplicated inline scan in the project-open handler (1362–1380) with `findMissingEffects`. This unification is the one deliberate dedup in this phase — disclose it in the commit message.

- [ ] **Step 1: findMissingEffects test-first; Step 2: build usePlugins by verbatim move; Step 3: replace both call sites; Step 4: gates + commit**

```bash
git commit -am "refactor(sandbox): usePlugins hook; unify duplicated missing-effects scan"
```

### Task 6.4: `useProjectLifecycle` — HomeTab open/new/delete handlers

**Files:**
- Create: `apps/sandbox/src/hooks/useProjectLifecycle.ts`
- Modify: `apps/sandbox/src/App.tsx` (inline handlers in HomeTab JSX: `onNewProject` 1303–1323, `onOpenProject` 1324–1423, `onDeleteProject` 1425–1440)

**Interfaces:**

```ts
export interface UseProjectLifecycleOptions {
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  museHubSignedIn: boolean;
  showMissingPlugins: (ids: string[]) => void;
  cloudProjectIds: Set<string>;
  cloudLoadCancelledRef: React.MutableRefObject<boolean>;
  setCloudLoadProgress: React.Dispatch<React.SetStateAction<CloudLoadProgress /* actual local type */>>;
  setCurrentProjectId: (id: string | null) => void;
  setIsCloudProject: (v: boolean) => void;
  setActiveMenuItem: (v: 'home' | 'project' | 'export' | 'debug') => void;
  setIndexedDBProjects: React.Dispatch<React.SetStateAction<StoredProject[]>>;
  adieu: ReturnType<typeof useAdieu>; // or the narrower members actually used
}
export interface UseProjectLifecycleReturn {
  handleNewProject: () => void;
  handleOpenProject: (id: string) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
}
```

(dispatch pulled internally via `useTracksDispatch`; state via `useTracksState` where the handlers read it. Read the three handlers first and let their real closures finalize the option list — anything from blocks A/B they close over must arrive as an option.)

- [ ] **Step 1: Move the three handlers verbatim; HomeTab JSX gets `onOpenProject={handleOpenProject}` etc.**
- [ ] **Step 2: Gates + manual check:** create new project; open a local project; open a cloud project (progress dialog + cancel); delete a project.
- [ ] **Step 3: Commit**

```bash
git commit -am "refactor(sandbox): useProjectLifecycle owns HomeTab project handlers"
```

### Task 6.5: `useMenuDefinitions` + `useElectronMenuBridge`

**Files:**
- Create: `apps/sandbox/src/hooks/useMenuDefinitions.ts` — first hoist the two big inline callbacks into named handlers inside the hook (`handleTogglePianoRoll` from 1004–1038, `handleToggleEffectsPanel` from 984–1000), then move the `createMenuDefinitions({...})` assembly (971–1044). Options = the ~15 states/setters the assembly closes over (enumerate them by reading the object literal; pass verbatim).
- Create: `apps/sandbox/src/hooks/useElectronMenuBridge.ts` (move `menuByLabel` memo 1050–1058, `electronCommandsRef` 1060–1074, `onCommand` effect 1076–1084; options `{ menuDefinitions }`)
- Modify: `apps/sandbox/src/App.tsx`

- [ ] **Step 1: Move → wire → gates.**
- [ ] **Step 2: Manual check:** menu bar renders; View → toggle piano roll auto-creates a MIDI track; effects panel toggle works. (Electron bridge is exercised only in the desktop app — tsc is the gate.)
- [ ] **Step 3: Commit**

```bash
git commit -am "refactor(sandbox): menu definitions + electron bridge hooks"
```

### Task 6.6: `TransportToolbarContainer` + `ProjectToolbarContainer` components

**Files:**
- Create: `apps/sandbox/src/components/TransportToolbarContainer.tsx` (move the `transportToolbarElement` JSX 1086–1164; group its ~40 closed-over values into a few cohesive object props: `transport`, `snap`, `timecode`, `masterMeter`, `gripper` — shapes produced by the hooks from Tasks 6.2/earlier)
- Create: `apps/sandbox/src/components/ProjectToolbarContainer.tsx` (move the ProjectToolbar wiring 1175–1240: `onMenuItemClick` nav logic, `centerActions`, `workspaceSelector`, `historyActions`)
- Modify: `apps/sandbox/src/App.tsx`

- [ ] **Step 1: Move → wire (the element is rendered at three slots: 1241, 1565, 1567–1581 — render `<TransportToolbarContainer …/>` at each) → gates.**
- [ ] **Step 2: Manual check:** transport toolbar renders in docked and floating positions; undo/redo buttons; workspace selector switches workspaces.
- [ ] **Step 3: Commit**

```bash
git commit -am "refactor(sandbox): transport + project toolbar container components"
```

### Task 6.7: `useCanvasScrollSync` — scroll-sync + wheel-zoom (hardest, last)

**Files:**
- Create: `apps/sandbox/src/hooks/useCanvasScrollSync.ts` (move refs 683–690, wheel effects 692–760 + 767–789, `handleScroll` 791–828, `handleTrackHeaderScroll` 830–843)
- Modify: `apps/sandbox/src/App.tsx`

**Interfaces:**

```ts
export interface UseCanvasScrollSyncOptions {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  trackHeaderScrollRef: React.RefObject<HTMLDivElement>;
  lastWrittenScrollTopRef: React.MutableRefObject<number>;
  pixelsPerSecond: number;
  maxPixelsPerSecond: number;
  setPixelsPerSecond: (v: number) => void; // the _setPixelsPerSecond from useZoomControls
  activeMenuItem: string;
  setScrollX: (v: number) => void;
  setScrollY: (v: number) => void;
}
export interface UseCanvasScrollSyncReturn {
  handleScroll: React.UIEventHandler<HTMLDivElement>;
  handleTrackHeaderScroll: React.UIEventHandler<HTMLDivElement>;
}
```

**Hazards:** the hook must be called AFTER `useZoomControls` (it consumes its outputs); the internal `ppsRef`/`maxPpsRef`/`setPixelsPerSecondRef`/`isZoomingRef` mirroring moves with it (this IS the ref-mirror pattern already done right — keep it verbatim); `scrollRafRef`/`pendingScrollRef` (142–145) move too if only scroll code touches them (verify by grep before moving).

- [ ] **Step 1: Move verbatim → wire → gates.**
- [ ] **Step 2: Manual check:** wheel-zoom under cursor (Cmd/pinch), horizontal pan, track-header vertical scroll mirrors canvas and back without echo loops (scroll both panes).
- [ ] **Step 3: Commit; then check** `wc -l apps/sandbox/src/App.tsx` — target under ~900 lines.

```bash
git commit -am "refactor(sandbox): useCanvasScrollSync owns wheel-zoom and two-pane scroll sync"
```

---

## Final verification (whole branch)

- [ ] `pnpm build` (root — all packages compile)
- [ ] `pnpm --filter @audacity-ui/sandbox test` and `pnpm --filter @audacity-ui/components test` — all green, count strictly greater than the 232 baseline (new tests added in Phases 1–3, 5, 6)
- [ ] `node scripts/check-any.mjs` — 0 violations
- [ ] Manual smoke sweep in the sandbox: playback, record, loop region, clip drag/trim/stretch (mouse + keyboard), time selection with scope, envelope edit, preferences modal all pages, theme switch, project open/save/new (local + cloud), undo/redo
- [ ] Line-count report in the final summary: App.tsx, Canvas.tsx, PreferencesModal.tsx before/after
- [ ] Use superpowers:requesting-code-review, then superpowers:finishing-a-development-branch
