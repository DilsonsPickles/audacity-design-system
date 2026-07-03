# useKeyboardShortcuts Conservative Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move four safe-tier inline keyboard handlers out of the ~1,279-line `useKeyboardShortcuts` hook into new `hooks/handlers/` modules with targeted characterization tests, extract one shared selection-target helper, and remove a dead options parameter — with zero behavior change.

**Architecture:** The hook keeps its single `keydown` `useEffect` and its **ordered early-return guard chain**. For each concern, the inline body moves verbatim into a `handle*(e, deps)` function in `hooks/handlers/` (matching the five existing handler modules); the hook keeps the guard condition, `preventDefault`, and call ordering, replacing only the body with a call. The shared "focus-vs-selection" resolver is deduplicated out of split and duplicate after both are extracted.

**Tech Stack:** React 19, TypeScript 5, Vitest 4 + jsdom.

## Global Constraints

- Work on branch `refactor/keyboard-shortcuts-extraction` (already created).
- ZERO behavior change: bodies move verbatim; the hook's guard-chain order is untouched.
- Follow the existing handler convention: a module exports an `XHandlerDeps` interface and `handle*(e: KeyboardEvent, deps: XHandlerDeps): void` functions (some omit `e`). See `apps/sandbox/src/hooks/handlers/transportHandlers.ts` and `navigationHandlers.ts` for the exact shape.
- Do NOT touch the three fragile inline handlers: Escape, Cmd+Arrow clip-move, ArrowUp/Down.
- Tests: `pnpm --filter @audacity-ui/sandbox test`. Typecheck/build: `pnpm --filter @audacity-ui/sandbox build`.
- Reuse the `initialState`-spread state factory from `apps/sandbox/src/contexts/__tests__/tracksReducer.characterization.test.ts` for building `TracksState` in tests: `const makeState = (o = {}) => ({ ...initialState, ...o })`.

---

## Task 0: Baseline

**Files:** none (verification only).

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `refactor/keyboard-shortcuts-extraction`

- [ ] **Step 2: Full suite green**

Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: all pass (~130 tests). If red, STOP and report.

- [ ] **Step 3: Confirm no existing keyboard test**

Run: `ls apps/sandbox/src/hooks/handlers/__tests__/ 2>/dev/null || echo "no handlers tests dir yet"`
Expected: directory absent or without a keyboard-handler test — this pass creates the first. Note the result.

---

## Task 1: Extract `trackCreationHandlers`

**Files:**
- Create: `apps/sandbox/src/hooks/handlers/trackCreationHandlers.ts`
- Create: `apps/sandbox/src/hooks/handlers/__tests__/trackCreationHandlers.test.ts`
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (the Cmd+T / Shift+T / Shift+L blocks, ~lines 1041–1089)

**Interfaces:**
- Produces: `interface TrackCreationHandlerDeps { state: TracksState; dispatch: React.Dispatch<TracksAction>; }` and `handleTrackCreation(e: KeyboardEvent, deps: TrackCreationHandlerDeps): void`.

- [ ] **Step 1: Write the failing tests**

Create `trackCreationHandlers.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { handleTrackCreation } from '../trackCreationHandlers';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const keyEvent = (over: Partial<KeyboardEvent>) =>
  ({ metaKey: false, ctrlKey: false, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

describe('handleTrackCreation', () => {
  it('Cmd+T adds a mono audio track', () => {
    const dispatch = vi.fn();
    handleTrackCreation(keyEvent({ key: 't', metaKey: true }), { state: makeState(), dispatch });
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_TRACK');
    expect(action.payload.type).toBe('audio');
    expect(action.payload.channelSplitRatio).toBeUndefined();
  });

  it('Cmd+Shift+T adds a stereo audio track (channelSplitRatio 0.5)', () => {
    const dispatch = vi.fn();
    handleTrackCreation(keyEvent({ key: 't', metaKey: true, shiftKey: true }), { state: makeState(), dispatch });
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_TRACK');
    expect(action.payload.type).toBe('audio');
    expect(action.payload.channelSplitRatio).toBe(0.5);
  });

  it('Cmd+Shift+L adds a label track', () => {
    const dispatch = vi.fn();
    handleTrackCreation(keyEvent({ key: 'l', metaKey: true, shiftKey: true }), { state: makeState(), dispatch });
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_TRACK');
    expect(action.payload.type).toBe('label');
  });
});
```

- [ ] **Step 2: Run — verify it fails (module missing)**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/__tests__/trackCreationHandlers.test.ts`
Expected: FAIL — cannot resolve `../trackCreationHandlers`.

- [ ] **Step 3: Create the handler by moving the inline body verbatim**

Create `trackCreationHandlers.ts`. Move the two inline blocks (the `(metaKey||ctrlKey) && key t/T` block and the `(metaKey||ctrlKey) && shiftKey && key l/L` block, ~lines 1041–1089 of `useKeyboardShortcuts.ts`) into ONE function, VERBATIM except: reference `deps.state` / `deps.dispatch` instead of the closed-over `state` / `dispatch`, and keep the same `e.preventDefault()` and early `return`s. Skeleton:

```ts
import type { TracksState, TracksAction } from '../../contexts/TracksContext';

export interface TrackCreationHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

/** Cmd/Ctrl+T (mono), Cmd/Ctrl+Shift+T (stereo), Cmd/Ctrl+Shift+L (label). */
export function handleTrackCreation(e: KeyboardEvent, deps: TrackCreationHandlerDeps): void {
  const { state, dispatch } = deps;
  // ← paste the two inline track-creation blocks here, verbatim,
  //   using `state`/`dispatch` from deps. Preserve preventDefault + returns.
}
```

- [ ] **Step 4: Replace the inline blocks in the hook with a delegating call**

In `useKeyboardShortcuts.ts`, replace the two moved blocks with, in the SAME position in the guard chain:

```ts
if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T' || e.key === 'l' || e.key === 'L')) {
  handleTrackCreation(e, { state, dispatch });
  return;
}
```

Adapt the guard so it matches exactly the keys the two original blocks matched (Cmd+T, Cmd+Shift+T, Cmd+Shift+L) and nothing more — if the label branch required `shiftKey`, the handler's internal logic already enforces it, but the outer guard must not swallow a Cmd+L that the original let fall through. Verify against the original: the original had two separate `if` guards; if a plain Cmd+L (no shift) was NOT handled before, ensure it still falls through. Add the import at the top of the hook.

- [ ] **Step 5: Run tests + full contexts/handlers suites**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/ src/contexts/`
Expected: new tests PASS; nothing else broke.

- [ ] **Step 6: Typecheck**

Run: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "trackCreation|useKeyboardShortcuts" || echo "clean"`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/trackCreationHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/trackCreationHandlers.test.ts apps/sandbox/src/hooks/useKeyboardShortcuts.ts
git commit -m "refactor(keyboard): extract track-creation handler (no behavior change)"
```

---

## Task 2: Extract `effectsPanelHandlers` (E-key)

**Files:**
- Create: `apps/sandbox/src/hooks/handlers/effectsPanelHandlers.ts`
- Create: `apps/sandbox/src/hooks/handlers/__tests__/effectsPanelHandlers.test.ts`
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (E-key block, ~lines 249–297)

**Interfaces:**
- Consumes: `handleEffectsToggle` + `TransportHandlerDeps` from `./transportHandlers` (the E-key body calls `handleEffectsToggle(transportDeps)`).
- Produces: `interface EffectsPanelHandlerDeps { effectsPanel: EffectsPanelState | null; setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>; effectsPanelFocusOriginRef: React.MutableRefObject<HTMLElement | null>; transportDeps: TransportHandlerDeps; }` and `handleEffectsKey(e: KeyboardEvent, deps: EffectsPanelHandlerDeps): void`.

- [ ] **Step 1: Write the failing tests**

Create `effectsPanelHandlers.test.ts`. The E-key does not dispatch a `TracksAction`; it drives `setEffectsPanel` and the focus-origin ref. Assert those:

```ts
import { describe, it, expect, vi } from 'vitest';
import { handleEffectsKey } from '../effectsPanelHandlers';
import { initialState } from '../../../contexts/TracksContext';

const keyEvent = (over = {}) =>
  ({ key: 'e', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

const transportDeps = (setEffectsPanel: any) => ({
  state: initialState,
  handlePlay: () => {}, handleRecord: () => {}, handleStopRecording: () => {},
  setEffectsPanel, toggleLoopRegion: () => {},
});

describe('handleEffectsKey', () => {
  it('opening: captures focus origin and calls setEffectsPanel to open', () => {
    const setEffectsPanel = vi.fn();
    const ref = { current: null as HTMLElement | null };
    handleEffectsKey(keyEvent(), {
      effectsPanel: null, setEffectsPanel, effectsPanelFocusOriginRef: ref,
      transportDeps: transportDeps(setEffectsPanel),
    });
    // handleEffectsToggle(prev=null) opens the panel via the functional updater
    expect(setEffectsPanel).toHaveBeenCalled();
    const updater = setEffectsPanel.mock.calls.at(-1)![0];
    expect(updater(null)).toMatchObject({ isOpen: true });
  });

  it('does nothing in a text input', () => {
    const setEffectsPanel = vi.fn();
    const ref = { current: null as HTMLElement | null };
    handleEffectsKey(keyEvent({ target: { tagName: 'INPUT', getAttribute: () => null } }), {
      effectsPanel: null, setEffectsPanel, effectsPanelFocusOriginRef: ref,
      transportDeps: transportDeps(setEffectsPanel),
    });
    expect(setEffectsPanel).not.toHaveBeenCalled();
  });

  it('closing: calls setEffectsPanel(null)', () => {
    const setEffectsPanel = vi.fn();
    const ref = { current: null as HTMLElement | null };
    handleEffectsKey(keyEvent(), {
      effectsPanel: { isOpen: true, trackIndex: 0, left: 0, top: 0, height: 600, width: 240 } as any,
      setEffectsPanel, effectsPanelFocusOriginRef: ref,
      transportDeps: transportDeps(setEffectsPanel),
    });
    expect(setEffectsPanel).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/__tests__/effectsPanelHandlers.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Create the handler by moving the E-key body verbatim**

Move the E-key block (~lines 249–297) verbatim into `handleEffectsKey`, referencing `deps.effectsPanel`, `deps.setEffectsPanel`, `deps.effectsPanelFocusOriginRef`, and calling `handleEffectsToggle(deps.transportDeps)`. Keep the text-input guard, the modifier guard, `preventDefault`, the `setTimeout` focus-restore, and both `return`s exactly as-is.

```ts
import type { EffectsPanelState } from '../useContextMenuState';
import { handleEffectsToggle, type TransportHandlerDeps } from './transportHandlers';

export interface EffectsPanelHandlerDeps {
  effectsPanel: EffectsPanelState | null;
  setEffectsPanel: React.Dispatch<React.SetStateAction<EffectsPanelState | null>>;
  effectsPanelFocusOriginRef: React.MutableRefObject<HTMLElement | null>;
  transportDeps: TransportHandlerDeps;
}

export function handleEffectsKey(e: KeyboardEvent, deps: EffectsPanelHandlerDeps): void {
  // ← paste the E-key body (lines ~256–296) verbatim, using deps.*
}
```

(Confirm the exact `EffectsPanelState` import path by checking how `useKeyboardShortcuts.ts` imports it.)

- [ ] **Step 4: Replace the inline E-key block with a call**

In the hook, in the same guard-chain position:

```ts
if (e.key === 'e' || e.key === 'E') {
  handleEffectsKey(e, { effectsPanel, setEffectsPanel, effectsPanelFocusOriginRef, transportDeps });
  return;
}
```

(`transportDeps` already exists in the hook — it's passed to the transport handlers. Reuse it.)

- [ ] **Step 5: Run tests + suites**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/ src/contexts/`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "effectsPanel|useKeyboardShortcuts" || echo "clean"`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/effectsPanelHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/effectsPanelHandlers.test.ts apps/sandbox/src/hooks/useKeyboardShortcuts.ts
git commit -m "refactor(keyboard): extract E-key effects-panel handler (no behavior change)"
```

---

## Task 3: Extract `splitHandlers` (Cmd+I / Cmd+Shift+I)

**Files:**
- Create: `apps/sandbox/src/hooks/handlers/splitHandlers.ts`
- Create: `apps/sandbox/src/hooks/handlers/__tests__/splitHandlers.test.ts`
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (~lines 819–1006)

**Interfaces:**
- Produces: `interface SplitHandlerDeps { state: TracksState; dispatch: React.Dispatch<TracksAction>; }`; `handleSplitAtPlayhead(e: KeyboardEvent, deps: SplitHandlerDeps): void` and `handleSplitAllTracks(e: KeyboardEvent, deps: SplitHandlerDeps): void`. Keep the inline focus-vs-selection resolution inside these for now (Task 5 deduplicates it).

- [ ] **Step 1: Write the failing test**

The split blocks read `document.activeElement` to find the focused clip, then dispatch `APPLY_CLIP_PLACEMENT` (with a `split` mutation) and `SELECT_CLIPS`. Stage a focused clip element and assert the dispatch:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleSplitAtPlayhead } from '../splitHandlers';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const keyEvent = (over = {}) =>
  ({ key: 'i', metaKey: true, ctrlKey: false, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

afterEach(() => { document.body.innerHTML = ''; });

describe('handleSplitAtPlayhead', () => {
  it('splits the focused clip at the playhead (dispatches APPLY_CLIP_PLACEMENT)', () => {
    // A track with one clip spanning the playhead.
    const state = makeState({
      playheadPosition: 2,
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'c', start: 0, duration: 5, envelopePoints: [] },
      ] }],
    });
    // Stage the focused clip element the handler reads via document.activeElement.
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('tabindex', '-1');
    const trackEl = document.createElement('div');
    trackEl.setAttribute('data-track-index', '0');
    trackEl.appendChild(el);
    document.body.appendChild(trackEl);
    el.focus();

    const dispatch = vi.fn();
    handleSplitAtPlayhead(keyEvent(), { state, dispatch });

    const types = dispatch.mock.calls.map(c => c[0].type);
    expect(types).toContain('APPLY_CLIP_PLACEMENT');
  });
});
```

If, after moving the code, the exact focus-resolution needs a different attribute (e.g. the clip element also needs `data-track-index` on an ancestor), adjust the staged DOM to match what the moved code actually queries — read the moved body and mirror its selectors. Do NOT change the handler to fit the test.

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/__tests__/splitHandlers.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Move the two split blocks verbatim**

Create `splitHandlers.ts`. Move the Cmd+I block (~819–956) into `handleSplitAtPlayhead` and the Cmd+Shift+I block (~958–1006) into `handleSplitAllTracks`, VERBATIM except referencing `deps.state`/`deps.dispatch`. Keep the `document.activeElement` reads, the focus-vs-selection cascade, `preventDefault`, and returns exactly as-is.

```ts
import type { TracksState, TracksAction } from '../../contexts/TracksContext';

export interface SplitHandlerDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
}

export function handleSplitAtPlayhead(e: KeyboardEvent, deps: SplitHandlerDeps): void { /* verbatim Cmd+I body */ }
export function handleSplitAllTracks(e: KeyboardEvent, deps: SplitHandlerDeps): void { /* verbatim Cmd+Shift+I body */ }
```

- [ ] **Step 4: Replace the inline blocks with calls (preserve order + guards)**

The original checks Cmd+Shift+I BEFORE Cmd+I (the more specific guard first). Preserve that order:

```ts
if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
  handleSplitAllTracks(e, { state, dispatch });
  return;
}
if ((e.metaKey || e.ctrlKey) && (e.key === 'i' || e.key === 'I')) {
  handleSplitAtPlayhead(e, { state, dispatch });
  return;
}
```

Match the original guards exactly (check the source for whether `!e.shiftKey` was explicit on the Cmd+I guard).

- [ ] **Step 5: Run tests + suites**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/ src/contexts/`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "splitHandlers|useKeyboardShortcuts" || echo "clean"`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/splitHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/splitHandlers.test.ts apps/sandbox/src/hooks/useKeyboardShortcuts.ts
git commit -m "refactor(keyboard): extract split-at-playhead handlers (no behavior change)"
```

---

## Task 4: Extract `duplicateHandlers` (Ctrl+D)

**Files:**
- Create: `apps/sandbox/src/hooks/handlers/duplicateHandlers.ts`
- Create: `apps/sandbox/src/hooks/handlers/__tests__/duplicateHandlers.test.ts`
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (~lines 1091–1208)

**Interfaces:**
- Produces: `interface DuplicateHandlerDeps { state: TracksState; dispatch: React.Dispatch<TracksAction>; }`; `handleDuplicate(e: KeyboardEvent, deps: DuplicateHandlerDeps): void`. Keep the inline focus-vs-selection resolution for now (Task 5 deduplicates it).

- [ ] **Step 1: Write the failing test**

Duplicate dispatches `ADD_CLIP` (duplicating a focused clip) or `ADD_TRACK` (duplicating a track), plus `SELECT_CLIPS`. Test the clip path, staging a focused clip:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleDuplicate } from '../duplicateHandlers';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const keyEvent = (over = {}) =>
  ({ key: 'd', metaKey: false, ctrlKey: true, shiftKey: false, preventDefault: () => {}, target: document.body, ...over } as unknown as KeyboardEvent);

afterEach(() => { document.body.innerHTML = ''; });

describe('handleDuplicate', () => {
  it('duplicates the focused clip (dispatches ADD_CLIP)', () => {
    const state = makeState({
      focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', clips: [
        { id: 10, name: 'c', start: 0, duration: 3, envelopePoints: [] },
      ] }],
    });
    const el = document.createElement('div');
    el.setAttribute('data-clip-id', '10');
    el.setAttribute('tabindex', '-1');
    const trackEl = document.createElement('div');
    trackEl.setAttribute('data-track-index', '0');
    trackEl.appendChild(el);
    document.body.appendChild(trackEl);
    el.focus();

    const dispatch = vi.fn();
    handleDuplicate(keyEvent(), { state, dispatch });

    const types = dispatch.mock.calls.map(c => c[0].type);
    expect(types).toContain('ADD_CLIP');
  });
});
```

Adjust the staged DOM to mirror the selectors the moved code actually queries (read the moved body). Do NOT alter the handler to fit the test.

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/__tests__/duplicateHandlers.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Move the Ctrl+D block verbatim**

Create `duplicateHandlers.ts`; move the Ctrl+D block (~1091–1208) into `handleDuplicate`, verbatim, referencing `deps.state`/`deps.dispatch`. Keep the `document.activeElement` reads, the focus-vs-selection cascade, `preventDefault`, returns.

- [ ] **Step 4: Replace the inline block with a call**

Same guard-chain position:
```ts
if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
  handleDuplicate(e, { state, dispatch });
  return;
}
```
Match the original guard exactly.

- [ ] **Step 5: Run tests + suites**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/ src/contexts/`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "duplicateHandlers|useKeyboardShortcuts" || echo "clean"`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/handlers/duplicateHandlers.ts apps/sandbox/src/hooks/handlers/__tests__/duplicateHandlers.test.ts apps/sandbox/src/hooks/useKeyboardShortcuts.ts
git commit -m "refactor(keyboard): extract duplicate handler (no behavior change)"
```

---

## Task 5: Deduplicate the focus-vs-selection resolver into `selectionTarget`

Now that split and duplicate both exist with their own copy of the "Model-3" resolution cascade (focused-in-selection → act on selection; focused-only → act on focused; else selection), extract the common logic into one helper both consume.

**Files:**
- Create: `apps/sandbox/src/hooks/handlers/selectionTarget.ts`
- Create: `apps/sandbox/src/hooks/handlers/__tests__/selectionTarget.test.ts`
- Modify: `splitHandlers.ts`, `duplicateHandlers.ts`

**Interfaces:**
- Produces: a pure resolver. Signature to be finalized from the two copies, but shape:
  `resolveSelectionTarget(state: TracksState, focused: { trackIndex: number; clipId: number } | null): { trackIndex: number; clipId: number }[]` — returns the clips the action should apply to, per the cascade.

- [ ] **Step 1: Compare the two inline copies**

Read the focus-vs-selection cascade in both `splitHandlers.ts` and `duplicateHandlers.ts`. Confirm they implement the same cascade (they may differ only in what they do with the resolved target, not in how they resolve it). Identify the exact common resolution to lift. If they differ materially, STOP and report — a shared helper is only correct if the resolution is genuinely identical.

- [ ] **Step 2: Write the failing unit test**

Create `selectionTarget.test.ts` asserting the cascade:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSelectionTarget } from '../selectionTarget';
import { initialState } from '../../../contexts/TracksContext';

const makeState = (o = {}) => ({ ...initialState, ...o });
const clip = (id: number, selected = false) => ({ id, name: '', start: 0, duration: 1, envelopePoints: [], selected });

describe('resolveSelectionTarget', () => {
  it('focused clip that IS in the selection → acts on the whole selection', () => {
    const state = makeState({ tracks: [{ id: 1, name: 't', clips: [clip(1, true), clip(2, true)] }] });
    const result = resolveSelectionTarget(state, { trackIndex: 0, clipId: 1 });
    expect(result.map(r => r.clipId).sort()).toEqual([1, 2]);
  });

  it('focused clip NOT in the selection → acts on the focused clip only', () => {
    const state = makeState({ tracks: [{ id: 1, name: 't', clips: [clip(1, false), clip(2, true)] }] });
    const result = resolveSelectionTarget(state, { trackIndex: 0, clipId: 1 });
    expect(result.map(r => r.clipId)).toEqual([1]);
  });

  it('no focus but a selection exists → acts on the selection', () => {
    const state = makeState({ tracks: [{ id: 1, name: 't', clips: [clip(1, true)] }] });
    const result = resolveSelectionTarget(state, null);
    expect(result.map(r => r.clipId)).toEqual([1]);
  });
});
```

Adjust the expected shape to match the resolution you found in Step 1 (e.g. if it returns `{trackIndex, clipId}` objects vs clip ids). The three cascade branches are the invariant to assert.

- [ ] **Step 3: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/handlers/__tests__/selectionTarget.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4: Create the helper from the shared cascade**

Create `selectionTarget.ts` with `resolveSelectionTarget`, lifting the common cascade verbatim in logic.

- [ ] **Step 5: Update split and duplicate to call it**

Replace the inline cascade in `handleSplitAtPlayhead`, `handleSplitAllTracks` (if applicable), and `handleDuplicate` with a call to `resolveSelectionTarget`. This is the ONLY non-verbatim change to those handlers — keep everything downstream of the resolved target identical.

- [ ] **Step 6: Run tests + full suite**

Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: ALL pass — the split and duplicate characterization tests from Tasks 3–4 must still pass, proving the dedup didn't change behavior.

- [ ] **Step 7: Typecheck + commit**

Run: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "selectionTarget|splitHandlers|duplicateHandlers" || echo "clean"`
```bash
git add apps/sandbox/src/hooks/handlers/selectionTarget.ts apps/sandbox/src/hooks/handlers/__tests__/selectionTarget.test.ts apps/sandbox/src/hooks/handlers/splitHandlers.ts apps/sandbox/src/hooks/handlers/duplicateHandlers.ts
git commit -m "refactor(keyboard): dedupe focus-vs-selection resolver into selectionTarget"
```

---

## Task 6: Remove the dead `controlPanelHasFocus` hook param

**Files:**
- Modify: `apps/sandbox/src/hooks/useKeyboardShortcuts.ts` (interface line ~35, destructure ~63, effect dep array ~1272)
- Modify: `apps/sandbox/src/App.tsx` (the `useKeyboardShortcuts({ ... })` call, ~line 640)

**Interfaces:** removes `controlPanelHasFocus` from `UseKeyboardShortcutsOptions`.

- [ ] **Step 1: Confirm it is unread in the hook body**

Run: `grep -n "controlPanelHasFocus" apps/sandbox/src/hooks/useKeyboardShortcuts.ts`
Expected: exactly three hits — the interface field, the destructure, and the effect dependency array. NO use inside `handleKeyDown`. If there is any real read, STOP — it is not dead.

- [ ] **Step 2: Remove from the hook**

Delete the `controlPanelHasFocus: number | null;` line from `UseKeyboardShortcutsOptions`, remove `controlPanelHasFocus,` from the destructure, and remove `controlPanelHasFocus,` from the `useEffect` dependency array.

- [ ] **Step 3: Remove from the call site**

In `App.tsx`, remove `controlPanelHasFocus,` from the object passed to `useKeyboardShortcuts({ ... })` (~line 640). Do NOT touch the `controlPanelHasFocus` React state declaration (`App.tsx:523`) or the prop passed to `EditorLayout` (`App.tsx:~1793`) — those are used elsewhere.

- [ ] **Step 4: Verify nothing else broke**

Run: `pnpm --filter @audacity-ui/sandbox build`
Expected: typecheck + build succeed (proves the removed field isn't referenced anywhere unexpected).

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/hooks/useKeyboardShortcuts.ts apps/sandbox/src/App.tsx
git commit -m "refactor(keyboard): drop unused controlPanelHasFocus hook param"
```

---

## Task 7: Final verification + docs

**Files:**
- Modify: `docs/codebase-map.md` (the "Where interactions live" handlers listing)

- [ ] **Step 1: Full suite**

Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: all pass, including the 4 new handler test files + the selectionTarget test.

- [ ] **Step 2: Production build**

Run: `pnpm --filter @audacity-ui/sandbox build`
Expected: succeeds.

- [ ] **Step 3: Manual smoke in the running app**

Run the app (`cd apps/sandbox && pnpm dev`) and verify no regression: create a mono track (Cmd+T), stereo (Cmd+Shift+T), label (Cmd+Shift+L); split a focused clip at the playhead (Cmd+I) and split-all (Cmd+Shift+I); duplicate (Ctrl+D); toggle the effects panel with E and confirm focus returns to the prior element when it closes. Note any anomaly before finishing.

- [ ] **Step 4: Update the codebase map**

In `docs/codebase-map.md`, under "Where interactions live", add the new handler modules (trackCreation, split, duplicate, effectsPanel, selectionTarget) to the `hooks/handlers/` list so the index stays accurate.

- [ ] **Step 5: Commit**

```bash
git add docs/codebase-map.md
git commit -m "docs: list new keyboard handler modules in codebase-map"
```

---

## Self-Review notes (author)

- **Spec coverage:** trackCreation→T1, effectsPanel/E-key→T2, split→T3, duplicate→T4, shared selectionTarget→T5 (dedup-after-both-exist, per the reducer-review lesson), dead-param removal→T6, verification+docs→T7. All spec items mapped.
- **Guard-chain order preserved:** each task replaces a body in-place and explicitly instructs matching the original guard/order (Cmd+Shift+I before Cmd+I; track-creation guard must not swallow a previously-falling-through key).
- **Behavior lock:** every extraction is verbatim; the new per-handler tests + full suite + build gate each task. The only non-verbatim change (T5 dedup) is guarded by the T3/T4 tests staying green.
- **Test honesty:** tests assert real dispatched action types / setter calls; split & duplicate stage the exact DOM their code queries (implementer mirrors the selectors from the moved body rather than inventing them).
- **Open item for executor:** if T5 Step 1 finds the two resolution copies are NOT identical, do not force a shared helper — report back.
