# EditorLayout Elegance Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `EditorLayout.tsx` consume the typed `TracksContext` directly (killing the `any`-typed `state`/`dispatch` God-prop), restore real types, then lift its five self-contained effects into named, tested hooks — all behavior-preserving.

**Architecture:** App already reads `{state, dispatch}` from `useTracks()` (typed) and drills them into EditorLayout as `any`. EditorLayout will call `useTracks()` itself (it renders inside `TracksProvider`), the two props leave its interface + App's call site, real `TracksState`/`TracksAction` types flow, and redundant inline `any` annotations are removed. Then the five effects move verbatim into hooks. Children keep receiving props (out of scope this pass).

**Tech Stack:** React 19, TypeScript 5, Vitest 4 + jsdom, @testing-library/react (`renderHook`).

## Global Constraints

- Work on branch `refactor/editorlayout-hooks` (already created).
- ZERO behavior change. Adopting the context is a **source flip** — `useTracks()` returns the same value App passed (App got it from the same `useTracks()`), so identity + values are unchanged. Hook extraction is verbatim.
- Bounded to EditorLayout + its App call site (+ a small typed widening in TracksContext for the scale fix). Do NOT convert EditorLayout's children to context.
- Do NOT touch the landmines: loop-region overlay sync, selection/focus routing, scroll sync, layout JSX.
- Tests: `pnpm --filter @audacity-ui/sandbox test`. Build (tsc+vite): `pnpm --filter @audacity-ui/sandbox build`. Typecheck: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json`.
- `renderHook` from `@testing-library/react` works in this env; full component `render()` does NOT (react-dom@18 / react@19 mismatch) — do not attempt to render EditorLayout.

---

## Task 0: Baseline

- [ ] **Step 1: Confirm branch** — Run `git branch --show-current` → `refactor/editorlayout-hooks`.
- [ ] **Step 2: Full suite green** — Run `pnpm --filter @audacity-ui/sandbox test`. Expected: all pass (~149). If red, STOP.
- [ ] **Step 3: Build green** — Run `pnpm --filter @audacity-ui/sandbox build`. Expected: succeeds. Record the `EditorLayout.tsx` line count (`wc -l apps/sandbox/src/components/EditorLayout.tsx`) for later comparison.

---

## Task 1: Adopt `useTracks()` + drop `state`/`dispatch` props + fix the scale type

**Files:**
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (props interface ~21–22; add `useTracks()` call; import)
- Modify: `apps/sandbox/src/App.tsx` (`<EditorLayout>` call ~1763–1764)
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (the `UPDATE_TRACK_SPECTROGRAM_SCALE` action scale type + the `Track.spectrogramScale` field type)

**Interfaces:**
- Produces: `EditorLayoutProps` no longer has `state`/`dispatch`; inside EditorLayout `state: TracksState`, `dispatch: React.Dispatch<TracksAction>` (from `useTracks()`).

- [ ] **Step 1: Widen the scale type to the canonical `SpectrogramScale` (single source of truth)**

In `apps/sandbox/src/contexts/TracksContext.tsx`:
- Add a type-only import: `import type { SpectrogramScale } from '@dilsonspickles/components';` (near the other type imports).
- Change the action payload from the 4-member union to the canonical type:
  ```ts
  | { type: 'UPDATE_TRACK_SPECTROGRAM_SCALE'; payload: { index: number; scale: SpectrogramScale } }
  ```
- Find the `Track` interface's `spectrogramScale` field (`grep -n "spectrogramScale" apps/sandbox/src/contexts/TracksContext.tsx`); if it is typed as the same 4-member union, change it to `SpectrogramScale?` too. The reducer's handler for this action just stores the value (`grep` the `case 'UPDATE_TRACK_SPECTROGRAM_SCALE'` body to confirm it assigns `scale` without validating the member set) — so widening is behavior-safe. Note in your report what the handler does.

- [ ] **Step 2: EditorLayout consumes the context**

In `EditorLayout.tsx`:
- Add import: `import { useTracks } from '../contexts/TracksContext';` and ensure `import type { TracksState, TracksAction } from '../contexts/TracksContext';` (used implicitly via `useTracks()` return, but keep the type import if referenced).
- Remove `state: any;` and `dispatch: React.Dispatch<any>;` from `EditorLayoutProps` (lines ~21–22).
- At the top of the component body, add `const { state, dispatch } = useTracks();` (place it above the first use of `state`/`dispatch`, before other hooks that read them). Remove `state`/`dispatch` from the props destructure if they were destructured there.

- [ ] **Step 3: Stop drilling from App**

In `App.tsx`, remove the `state={state}` and `dispatch={dispatch}` lines from the `<EditorLayout .../>` call (~1763–1764). Leave App's own `const { state, dispatch } = useTracks()` (line ~115) and all other consumers untouched.

- [ ] **Step 4: Typecheck — expect ONLY the known scale error to have been resolved, no new errors**

Run: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "EditorLayout.tsx|App.tsx|TracksContext.tsx"`
Expected: NO errors. (Recon confirmed typing `state`/`dispatch` surfaces exactly the one scale error, which Step 1 fixes by widening.) If a NEW error appears, it's a real type mismatch the `any` was hiding — investigate and fix it correctly (or report if it reveals a genuine gap); do not re-introduce `any`.

- [ ] **Step 5: Full suite + build**

Run: `pnpm --filter @audacity-ui/sandbox test` then `pnpm --filter @audacity-ui/sandbox build`
Expected: all green; build succeeds (proves the source flip is behavior-identical and the whole app still typechecks).

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/components/EditorLayout.tsx apps/sandbox/src/App.tsx apps/sandbox/src/contexts/TracksContext.tsx
git commit -m "refactor(editor): EditorLayout consumes typed TracksContext; drop state/dispatch any-props"
```

---

## Task 2: Remove redundant inline `any` annotations in EditorLayout

Now that `state` is `TracksState`, the inline `(t: any)`, `(c: any)`, `(l: any)` annotations are redundant — inference supplies `Track`/`Clip`/`Label`. Removing them is the visible "it's typed now" win.

**Files:**
- Modify: `apps/sandbox/src/components/EditorLayout.tsx`

- [ ] **Step 1: Inventory the inline annotations**

Run: `grep -nE "\((\w+): any\)|<any>|: any\b" apps/sandbox/src/components/EditorLayout.tsx`
List every inline `: any` (map/filter/sort/forEach callbacks, local casts). These are the removal targets. (The `spectralSelection: any` and `theme: any` PROPS are separate — see Step 3.)

- [ ] **Step 2: Remove annotations in small batches, typechecking after each**

For each batch of callback annotations (e.g. all `state.tracks.map((t: any) => ...)` → `state.tracks.map((t) => ...)`), remove the `: any` and run:
`cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep EditorLayout.tsx`
Expected: clean after each batch. If removing an annotation surfaces an error, that annotation was masking a real access — fix the access (the property genuinely exists on the typed shape, or the code had a latent bug). Do NOT re-add `any` to silence it; if it reveals a genuine type gap you cannot resolve cleanly, leave that one annotation and note it in your report.

- [ ] **Step 3: Opportunistically type the `theme` / `spectralSelection` props IF clean**

Try typing `theme: any` → the tokens `Theme` type (check the import: `grep -rn "export.*type Theme\|export interface Theme" packages/tokens/src @audacity-ui` and how Canvas types its `theme` prop) and `spectralSelection: any` → its real type. Run tsc. If either resolves with no cascade of errors, keep it. If it cascades, revert that one and note it as a follow-up (do NOT chase a rabbit hole — this is a bonus, not the task's core).

- [ ] **Step 4: Full suite + build**

Run: `pnpm --filter @audacity-ui/sandbox test` then `pnpm --filter @audacity-ui/sandbox build`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/components/EditorLayout.tsx
git commit -m "refactor(editor): drop redundant inline any annotations now that state is typed"
```

---

## Task 3: Extract `usePianoRollSmoothScroll`

**Files:**
- Create: `apps/sandbox/src/hooks/usePianoRollSmoothScroll.ts`
- Create: `apps/sandbox/src/hooks/__tests__/usePianoRollSmoothScroll.test.ts`
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (effect ~479–521; refs ~469, ~472)

**Interfaces:**
- Produces: `usePianoRollSmoothScroll(deps): { skipPianoRollScrollRef: React.MutableRefObject<boolean> }`. The hook owns `pianoRollScrollAnimRef` + `skipPianoRollScrollRef` and returns the skip ref so the piano-roll render can set it during clip creation.

- [ ] **Step 1: Read the effect + refs; list every closure var it reads**

Read EditorLayout ~469–521. Record: the two refs (`pianoRollScrollAnimRef` ~469, `skipPianoRollScrollRef` ~472), the RAF animate loop, the trigger deps, the `state.*` reads (`pianoRollOpen`, `pianoRollTrackIndex`, `tracks`, `pianoRollScrollX`), and the `dispatch(SET_PIANO_ROLL_SCROLL_X)` call. Write the `deps` shape to your report.

- [ ] **Step 2: Write the failing test**

Create `usePianoRollSmoothScroll.test.ts`. Drive the RAF loop and assert the dispatch. Use a spy `dispatch` and fake timers / rAF:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePianoRollSmoothScroll } from '../usePianoRollSmoothScroll';
import { initialState, type TracksState } from '../../contexts/TracksContext';

const makeState = (o: Partial<TracksState> = {}): TracksState => ({ ...initialState, ...o });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('usePianoRollSmoothScroll', () => {
  it('animates scroll toward the target, dispatching SET_PIANO_ROLL_SCROLL_X', () => {
    const dispatch = vi.fn();
    // a state where the piano roll is open on a track and the target scroll differs from current
    const state = makeState({
      pianoRollOpen: true, pianoRollTrackIndex: 0, pianoRollScrollX: 0,
      tracks: [{ id: 1, name: 't', clips: [{ id: 9, name: 'm', start: 4, duration: 1, envelopePoints: [] }] }] as any,
    });
    const { result } = renderHook(() => usePianoRollSmoothScroll({ state, dispatch /* + any other deps read */ } as any));
    // advance rAF/timers to run the ease-out loop
    vi.advanceTimersByTime(320);
    expect(dispatch.mock.calls.some(c => c[0].type === 'SET_PIANO_ROLL_SCROLL_X')).toBe(true);
    expect(result.current.skipPianoRollScrollRef.current).toBe(false);
  });

  it('does nothing when skipPianoRollScrollRef is set', () => {
    const dispatch = vi.fn();
    const state = makeState({ pianoRollOpen: true, pianoRollTrackIndex: 0 });
    const { result, rerender } = renderHook(({ s }) => usePianoRollSmoothScroll({ state: s, dispatch } as any), { initialProps: { s: state } });
    result.current.skipPianoRollScrollRef.current = true;
    rerender({ s: makeState({ pianoRollOpen: true, pianoRollTrackIndex: 0, pianoRollScrollX: 5 }) });
    vi.advanceTimersByTime(320);
    expect(dispatch.mock.calls.some(c => c[0].type === 'SET_PIANO_ROLL_SCROLL_X')).toBe(false);
  });
});
```

Adapt the exact `deps` fields and the trigger that starts the animation to what the moved code actually reads — read the effect and mirror it. If the ease-out target math needs a specific selected-clip signal, stage it. If driving rAF via fake timers proves unreliable, stub `requestAnimationFrame` to run its callback synchronously a few times and assert the dispatch; note the approach.

- [ ] **Step 3: Run — verify it fails** — `pnpm --filter @audacity-ui/sandbox test run src/hooks/__tests__/usePianoRollSmoothScroll.test.ts` → FAIL (module missing).

- [ ] **Step 4: Create the hook (verbatim move)**

Move the effect + the two refs into `usePianoRollSmoothScroll.ts`, referencing `deps.*`, returning `{ skipPianoRollScrollRef }`. Keep the RAF cancel/cleanup exactly.

- [ ] **Step 5: Wire into EditorLayout**

Remove the inline effect + the two ref declarations; call `const { skipPianoRollScrollRef } = usePianoRollSmoothScroll({ ... });` in the same spot (declaration order preserved). Update the piano-roll render site that sets `skipPianoRollScrollRef.current` to use the returned ref.

- [ ] **Step 6: Suite + build** — `pnpm --filter @audacity-ui/sandbox test` then `... build`. Green.

- [ ] **Step 7: Commit** — `git commit -m "refactor(editor): extract usePianoRollSmoothScroll hook (no behavior change)"`

---

## Task 4: Extract `useAutoOpenPianoRoll` + `useDrawerTabAutoSwitch`

**Files:**
- Create: `apps/sandbox/src/hooks/useAutoOpenPianoRoll.ts` + test
- Create: `apps/sandbox/src/hooks/useDrawerTabAutoSwitch.ts` + test
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (effects ~439–453, ~456–466; refs ~437–438)

**Interfaces:**
- Produces: `useAutoOpenPianoRoll(deps): void` and `useDrawerTabAutoSwitch(deps): void`. The latter owns `prevMixerRef`/`prevPianoRollRef` and takes `setDrawerActiveTab`.

- [ ] **Step 1: Write the failing tests**

`useAutoOpenPianoRoll.test.ts` — asserts `SET_PIANO_ROLL_OPEN` dispatch when a MIDI track gains focus:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoOpenPianoRoll } from '../useAutoOpenPianoRoll';
import { initialState } from '../../contexts/TracksContext';

describe('useAutoOpenPianoRoll', () => {
  it('dispatches SET_PIANO_ROLL_OPEN when a MIDI track becomes focused', () => {
    const dispatch = vi.fn();
    const midiState = { ...initialState, focusedTrackIndex: 0,
      tracks: [{ id: 1, name: 't', trackType: 'midi', clips: [{ id: 9, name: 'm', start: 0, duration: 1, envelopePoints: [] }] }] as any };
    renderHook(() => useAutoOpenPianoRoll({ state: midiState, dispatch } as any));
    expect(dispatch.mock.calls.some(c => c[0].type === 'SET_PIANO_ROLL_OPEN')).toBe(true);
  });
});
```

`useDrawerTabAutoSwitch.test.ts` — asserts the setter is called when the mixer opens:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDrawerTabAutoSwitch } from '../useDrawerTabAutoSwitch';

describe('useDrawerTabAutoSwitch', () => {
  it('switches to the mixer tab when showMixer flips true', () => {
    const setDrawerActiveTab = vi.fn();
    const { rerender } = renderHook(
      ({ showMixer }) => useDrawerTabAutoSwitch({ showMixer, pianoRollOpen: false, setDrawerActiveTab } as any),
      { initialProps: { showMixer: false } },
    );
    rerender({ showMixer: true });
    expect(setDrawerActiveTab).toHaveBeenCalled();
  });
});
```

Adapt the exact trigger condition + the MIDI-track discriminator (`trackType`/`type` — read the actual effect to see how it detects a MIDI track) and the deps to what the moved code reads. Mirror the code; don't reshape it.

- [ ] **Step 2: Run — verify both fail** — module-missing failures.

- [ ] **Step 3: Create both hooks (verbatim moves)** — move each effect (and `prevMixerRef`/`prevPianoRollRef` into `useDrawerTabAutoSwitch`) into its file, referencing `deps.*`.

- [ ] **Step 4: Wire into EditorLayout** — replace the two inline effects (and the two moved refs) with the two hook calls, declaration order preserved.

- [ ] **Step 5: Run the two tests + suite + build** — green.

- [ ] **Step 6: Commit** — `git commit -m "refactor(editor): extract useAutoOpenPianoRoll + useDrawerTabAutoSwitch hooks"`

---

## Task 5: Extract `useTimeSelectionTabHandler`

**Files:**
- Create: `apps/sandbox/src/hooks/useTimeSelectionTabHandler.ts` + test
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (effect ~243–341)

**Interfaces:**
- Produces: `useTimeSelectionTabHandler(deps): void` — installs/cleans the global `keydown` listener (`handleSelectionTab`) governing Tab during a time selection.

- [ ] **Step 1: Read the effect; list closure vars + the exact behavior**

Read ~243–341. Record what it reads (selection/track state), what the `keydown` handler does on Tab (focus target / `preventDefault` / dispatch), and the `addEventListener('keydown', handleSelectionTab, true)` + cleanup. Note the deps array contents.

- [ ] **Step 2: Write the failing characterization test**

Stage the DOM the handler queries, mount the hook, fire Tab, assert the observable outcome:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useTimeSelectionTabHandler } from '../useTimeSelectionTabHandler';
import { initialState } from '../../contexts/TracksContext';

afterEach(() => { document.body.innerHTML = ''; });

describe('useTimeSelectionTabHandler', () => {
  it('intercepts Tab while a time selection is active (preventDefault / routes focus)', () => {
    // stage whatever focusable elements the handler queries (mirror the code's selectors)
    const el = document.createElement('button');
    el.setAttribute('data-...', '...'); // ← attribute(s) the handler looks for
    document.body.appendChild(el);

    const state = { ...initialState, timeSelection: { startTime: 0, endTime: 2 } };
    renderHook(() => useTimeSelectionTabHandler({ state, /* + deps */ } as any));

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    const prevented = !document.dispatchEvent(ev); // dispatchEvent returns false if preventDefault called
    expect(prevented).toBe(true); // or assert focus moved to the expected element
  });
});
```

Read the handler and set the assertion to its ACTUAL observable effect (preventDefault, or `document.activeElement` moved to a specific staged element). Stage exactly the elements/attributes it queries. Adapt to the code; if you cannot reproduce the focus outcome after faithful staging, assert the `preventDefault` it performs and note it. Do NOT weaken to a no-op assertion.

- [ ] **Step 3: Run — verify it fails** — module missing.

- [ ] **Step 4: Create the hook (verbatim move)** — move the effect (listener + cleanup) into the file, referencing `deps.*`.

- [ ] **Step 5: Wire into EditorLayout** — replace the inline effect with the hook call, same position.

- [ ] **Step 6: Suite + build** — green.

- [ ] **Step 7: Commit** — `git commit -m "refactor(editor): extract useTimeSelectionTabHandler hook (no behavior change)"`

---

## Task 6: Extract `useFlatNavTabRouter`

**Files:**
- Create: `apps/sandbox/src/hooks/useFlatNavTabRouter.ts` + test
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (effect ~343–434)

**Interfaces:**
- Produces: `useFlatNavTabRouter(deps: { isFlatNavigation: boolean; /* + reads */ }): void` — the global `keydown` `handleTab` that intercepts Tab in flat-nav mode and routes focus through the DOM-ordered list. Guarded by `if (!isFlatNavigation) return;` inside the effect; dep array `[isFlatNavigation]`.

- [ ] **Step 1: Read the effect; list closure vars + build the DOM-order picture**

Read ~343–434. Record how it builds the ordered element list (which `querySelectorAll` selectors across headers/clips/rulers), how Tab/Shift+Tab pick the next/prev element, the `preventDefault`, and the deps. Note that it early-returns unless `isFlatNavigation`.

- [ ] **Step 2: Write the failing characterization test**

Stage a small ordered set of the focusable elements it queries, enable flat-nav, fire Tab, assert focus advances to the next element in the custom order:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlatNavTabRouter } from '../useFlatNavTabRouter';

afterEach(() => { document.body.innerHTML = ''; });

function stageFocusable(attrs: Record<string,string>) {
  const el = document.createElement('div');
  el.tabIndex = 0;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe('useFlatNavTabRouter', () => {
  it('is inert when flat navigation is off', () => {
    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: false } as any));
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(document.dispatchEvent(ev)).toBe(true); // not prevented
  });

  it('routes Tab to the next element in the custom order when flat-nav is on', () => {
    const a = stageFocusable({ /* selectors the router queries for element #1 */ });
    const b = stageFocusable({ /* selectors for element #2 */ });
    a.focus();
    renderHook(() => useFlatNavTabRouter({ isFlatNavigation: true, /* + deps */ } as any));
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(document.activeElement).toBe(b);
  });
});
```

Read the router's selectors and stage elements that match them in order; set the assertion to its real behavior (focus moved / preventDefault). Mirror the code. If focus-movement can't be reproduced after faithful staging, assert `preventDefault` and note it — never a no-op.

- [ ] **Step 3: Run — verify it fails** — module missing.

- [ ] **Step 4: Create the hook (verbatim move)** — move the effect (incl. the `if (!isFlatNavigation) return;` guard and cleanup) into the file, referencing `deps.*`, dep array `[isFlatNavigation]` (plus any other reads it closes over).

- [ ] **Step 5: Wire into EditorLayout** — replace the inline effect with the hook call, same position.

- [ ] **Step 6: Suite + build** — green.

- [ ] **Step 7: Commit** — `git commit -m "refactor(editor): extract useFlatNavTabRouter hook (no behavior change)"`

---

## Task 7: Final verification + docs

**Files:**
- Modify: `docs/codebase-map.md`

- [ ] **Step 1: Full suite + build + typecheck** — `pnpm --filter @audacity-ui/sandbox test`, `... build`, `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json`. All green/clean. Record the new `EditorLayout.tsx` line count (compare to Task 0).

- [ ] **Step 2: Manual smoke** — Run `cd apps/sandbox && pnpm dev`. Verify no regression: app opens, tracks/clips render; flat-nav Tab cycles tracks in the documented order; Tab during an active time selection behaves as before; selecting a MIDI clip smooth-scrolls the piano roll and creating a clip does NOT jump-scroll; opening the mixer / piano roll auto-switches the drawer tab; spectrogram scale selection still works on a track. Note any anomaly.

- [ ] **Step 3: Update the codebase map** — In `docs/codebase-map.md`: under the drag/gesture hooks table add the five new hooks (usePianoRollSmoothScroll, useAutoOpenPianoRoll, useDrawerTabAutoSwitch, useTimeSelectionTabHandler, useFlatNavTabRouter); in the big-files entry for EditorLayout note it now consumes TracksContext directly (no state/dispatch prop-drill) and that its self-contained effects are extracted to hooks.

- [ ] **Step 4: Commit** — `git commit -m "docs: note EditorLayout context adoption + extracted effect hooks"`

---

## Self-Review notes (author)

- **Spec coverage:** context adoption + drop props → T1; scale type fix → T1 (Step 1); inline `any` removal + opportunistic prop typing → T2; the five hooks → T3–T6 (piano-roll scroll owns/returns skip ref per spec); verification + docs → T7. All spec items mapped.
- **Ordering:** Part A (T1–T2) before Part B (T3–T6) so the hooks extract with real types; safest→least within each part.
- **Behavior lock:** T1 is a source flip (identity preserved) gated by tsc + suite + build; T2 is type-only gated by tsc; T3–T6 are verbatim effect moves gated by `renderHook` characterization tests + suite + build.
- **Test honesty:** hooks tested via `renderHook` (render() is blocked by the env mismatch — called out); tab routers assert real focus/preventDefault with a documented fallback to the observable dispatch, never a no-op.
- **Open items for executor:** (a) T1 — confirm the reducer handler merely stores `scale` before widening the type; if a NEW tsc error appears beyond the known one, fix it correctly, never re-`any`. (b) T3/T5/T6 — mirror the code's exact DOM selectors / rAF mechanism in the tests; adapt test to code, never the reverse.
