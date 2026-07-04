# Design: EditorLayout Elegance Pass — Adopt Typed Context, Kill the `any`-Drill, Extract Effect Hooks

**Date:** 2026-07-04
**Base branch:** `master`
**Status:** Approved for planning

## Goal

Make `apps/sandbox/src/components/EditorLayout.tsx` (~2,389 lines) genuinely elegant by removing the biggest source of incidental complexity — the `any`-typed `state`/`dispatch` God-prop — and then lifting its self-contained effects into named, tested hooks. Behavior-preserving throughout.

## Motivation

The macro architecture is sound (clean packages, a typed reducer split into domain sub-reducers, gesture logic in focused hooks, strategic contexts). The thing keeping EditorLayout from elegant is concrete and almost self-parodying:

```
App.tsx:115     const { state, dispatch } = useTracks();          // pulls from a FULLY TYPED context
App.tsx:1763    <EditorLayout state={state} dispatch={dispatch}/> // re-drills it down
EditorLayout:21   state: any;  dispatch: React.Dispatch<any>;     // discards the types
```

The state already lives in a fully-typed React context (`useTracks()` → `TracksState`). App reads it from context, then hand-drills it into EditorLayout as `any`-typed props, which then does `state.tracks.map((t: any) => …)` **132 times**, all blind. This God-prop is a big reason EditorLayout carries **69 props** and a chunk of why **28 files** use `: any`.

**Reconnaissance (done):** temporarily typing `state: TracksState` + `dispatch: Dispatch<TracksAction>` in EditorLayout produces exactly **one** `tsc` error — a real `SpectrogramScale` vs `'mel'|'linear'|'period'|'erb'` mismatch at ~line 1911 that the `any` was masking. The code already respects its types; restoring them is nearly free.

## Constraints

- **Behavior-preserving.** `useTracks()` inside EditorLayout returns the *same* context value App passed as props (App got it from the same `useTracks()`), so identity and values are unchanged — this is a source flip, not a data change. Hook extraction is verbatim.
- **Do not touch the landmines.** Loop-region overlay sync (ruler + canvas trees), selection/focus routing across regions, scroll sync, and layout JSX are left as-is.
- **Bounded to EditorLayout + its App call site.** EditorLayout keeps passing `state`/`dispatch` (or slices) down to its *children* (Canvas, panels) exactly as today — this pass does NOT convert the children to context (that's the separate whole-app campaign). Only EditorLayout's own *source* of state flips from prop to context.
- Work on a feature branch off `master`.

## Scope

### Part A — Adopt the typed context + restore types

1. **Consume `useTracks()` in EditorLayout.** Add `const { state, dispatch } = useTracks();` (import from `../contexts/TracksContext`). Remove `state` and `dispatch` from `EditorLayoutProps`. This is safe because App already renders `<EditorLayout>` inside `TracksProvider` (App itself calls `useTracks()` at line 115).
2. **Stop drilling from App.** Remove `state={state}` and `dispatch={dispatch}` from the `<EditorLayout .../>` call in `App.tsx` (~1763–1764). Leave App's own `useTracks()` and its other consumers untouched.
3. **Fix the one surfaced type error** (~EditorLayout line 1911): the `SpectrogramScale` → track-scale union mismatch. Investigate whether the value is genuinely one of `'mel'|'linear'|'period'|'erb'` (narrow/guard it) or whether the track-scale type should widen; fix correctly and note which.
4. **Remove the redundant inline `any` annotations** that the restored types make unnecessary — `(t: any)`, `(c: any)`, `(l: any)`, etc. in EditorLayout — letting inference supply `Track`/`Clip`/`Label`. Do this in small batches, running `tsc` after each; if removing an annotation surfaces a new error, that annotation was hiding a real access — fix the access (or flag if it reveals a genuine type gap). Also opportunistically type `theme: any` (use the tokens `Theme` type) and `spectralSelection: any` **only if** they resolve cleanly without a cascade; otherwise leave them and note as follow-up.

### Part B — Extract the self-contained effect hooks

With `state`/`dispatch` now properly typed, lift these `useEffect` blocks into named hooks under `apps/sandbox/src/hooks/` (verbatim move, closure vars threaded as a typed `deps` object; EditorLayout calls the hook in place, preserving declaration order):

| Hook | From (approx) | Owns / notes |
|---|---|---|
| `usePianoRollSmoothScroll` | 479–521 | RAF ease-out scroll to selected MIDI clip; owns `pianoRollScrollAnimRef` + `skipPianoRollScrollRef`; **returns `skipPianoRollScrollRef`** so the piano-roll render still sets it |
| `useAutoOpenPianoRoll` | 456–466 | Dispatch `SET_PIANO_ROLL_OPEN` when a MIDI track gains focus |
| `useDrawerTabAutoSwitch` | 439–453 | Switch drawer tab when mixer/piano-roll open/close; owns `prevMixerRef`/`prevPianoRollRef` |
| `useTimeSelectionTabHandler` | 243–335 | Global keydown: Tab behavior during a time selection |
| `useFlatNavTabRouter` | 343–434 | Global keydown: flat-nav Tab interception + DOM-ordered focus routing |

The two Tab handlers stay as two separate hooks (two distinct effects), not merged.

## Testing — hybrid, targeted

`renderHook` from `@testing-library/react` works despite the sandbox's react-dom/react `render()` mismatch (hooks don't hit the broken DOM-render path); full component render of EditorLayout is not attempted.

- **Part A** is gated by the compiler + suite: `tsc` clean (the whole point is types now line up), full sandbox suite green, production build green, and manual smoke (EditorLayout still renders and behaves identically). There is no per-line unit test for "removed an `any`" — the type system is the test.
- **Part B hooks:** each gets a `renderHook` characterization test. The tab routers stage focusable DOM elements with the queried attributes, fire `Tab`/`Shift+Tab` keydown, and assert focus moved / `preventDefault` fired (locking accessibility). `usePianoRollSmoothScroll` drives the RAF loop and asserts `dispatch(SET_PIANO_ROLL_SCROLL_X)` fires and the returned skip-ref suppresses it. `useAutoOpenPianoRoll`/`useDrawerTabAutoSwitch` assert the dispatch/setter on their trigger. If focus-movement staging proves too brittle, assert the observable dispatch/preventDefault instead of nothing, and note it.

## Verification

- `tsc` clean (no `any`-hidden errors remain in EditorLayout's state/dispatch surface).
- Full sandbox suite green; production build green.
- New hook tests green.
- Manual smoke: app opens; tracks/clips render; flat-nav Tab cycles tracks in order; Tab during a time selection behaves as before; selecting a MIDI clip smooth-scrolls the piano roll (clip creation doesn't jump); opening the mixer/piano-roll auto-switches the drawer tab; nothing visually regressed.

## Explicitly out of scope

- Converting EditorLayout's **children** (Canvas, panels) to consume the context — that is the separate whole-app `any`-elimination campaign.
- The landmine shared state (loop-region overlay sync, selection/focus routing, scroll sync) and all layout JSX.
- A `BottomDrawer`/region component extraction; the ruler-viewport `ResizeObserver` effect (stays inline).
- Other monoliths (`App.tsx`, `PreferencesModal.tsx`).

## Success criteria

- EditorLayout sources `state`/`dispatch` from `useTracks()`; those two props are gone from `EditorLayoutProps` and the App call site; `state` is `TracksState`, `dispatch` is `Dispatch<TracksAction>`.
- The one masked type error is fixed; the redundant inline `any` annotations in EditorLayout are removed with `tsc` clean.
- The five effects live in named, typed hooks with characterization tests; full suite + build green; manual smoke clean.
- EditorLayout's prop count drops and its `state.*` accesses are type-checked — the "holy shit, it's typed now" difference.
