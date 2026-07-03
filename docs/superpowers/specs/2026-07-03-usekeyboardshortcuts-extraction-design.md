# Design: useKeyboardShortcuts Conservative Handler Extraction

**Date:** 2026-07-03
**Base branch:** `master`
**Status:** Approved for planning

## Goal

Lift the four safe-tier inline keyboard handlers out of the ~1,279-line `useKeyboardShortcuts` hook into new `hooks/handlers/` modules (matching the five that already exist), with targeted characterization tests for each, and remove a dead options parameter. **Zero behavior change.**

## Motivation

`apps/sandbox/src/hooks/useKeyboardShortcuts.ts` is already ~78% decomposed: ~995 of its lines live in five `handlers/` modules (`clipboardHandlers`, `deleteHandlers`, `navigationHandlers`, `playheadSelectionHandlers`, `transportHandlers`). What remains is one large `keydown` `useEffect` (lines ~93–1278) whose dispatch logic is an **ordered early-return guard chain**. The heaviest still-inline blocks are split (Cmd+I, ~137 lines), duplicate (Ctrl+D, ~117 lines), new-track creation (~50 lines), and the E-key effects toggle (~50 lines). Finishing the extraction shrinks the hook to its dispatch skeleton plus the genuinely-fragile handlers, and — because no keyboard-behavior test exists today — the new tests raise the safety floor.

## Constraints

- **Preserve the guard-chain order.** The dispatch order in the hook is behaviorally load-bearing (Cmd+Arrow must be checked before playhead nudge; Escape's 4-level cascade; Delete's priority cascade). Only handler *bodies* move out; the guard condition, `preventDefault`, and call ordering stay in the hook.
- **No behavior change.** Extracted bodies move verbatim; the hook calls them in the same place with the same guards.
- **Follow the existing pattern.** New handlers mirror the signature style of the five current `handlers/` modules (an options/args object carrying `state`, `dispatch`, the event, and any refs the body needs).
- **Work on a feature branch** off `master` (not on `master`).
- No other refactoring; the other monolith files are out of scope.

## Scope — what moves

Four new modules under `apps/sandbox/src/hooks/handlers/`:

| Module | Bindings handled | Threads |
|---|---|---|
| `trackCreationHandlers.ts` | Cmd/Ctrl+T (mono), Cmd/Ctrl+Shift+T (stereo), Cmd/Ctrl+Shift+L (label) | `state`, `dispatch` |
| `splitHandlers.ts` | Cmd/Ctrl+I (split at playhead), Cmd/Ctrl+Shift+I (split all tracks) | `state`, `dispatch`; reads `document.activeElement` |
| `duplicateHandlers.ts` | Cmd/Ctrl+D (duplicate focused clip(s)/track(s)) | `state`, `dispatch`; reads `document.activeElement` |
| `effectsPanelHandlers.ts` | E (toggle effects panel with focus capture/restore) | `effectsPanelFocusOriginRef`, `setEffectsPanel`/effects state, `dispatch` |

One shared helper:

- `handlers/selectionTarget.ts` — extract the "Model-3" focus-vs-selection resolution currently **duplicated inline** in both split and duplicate (the `focused-in-selection → act on selection; focused-only → act on focused; else selection` cascade). Both new handlers consume it. This is a DRY improvement that directly serves the extraction, not unrelated cleanup.

## Scope — the dead-parameter cleanup

`controlPanelHasFocus` is passed into the hook but never read in the handler body (it appears only in the options interface, the destructure, and the effect dependency array). Remove it **only** from the hook's surface:
- `UseKeyboardShortcutsOptions` interface (`useKeyboardShortcuts.ts:35`)
- the destructure (`:63`)
- the effect dependency array (`:1272`)
- the argument passed at the call site (`App.tsx:~640`)

**Do NOT remove** the `controlPanelHasFocus` React state in `App.tsx:523` or its use by `EditorLayout` (`EditorLayout.tsx:65,153`, `App.tsx:1793`) — that state is genuinely consumed elsewhere. Only the hook wiring is dead.

## Testing — hybrid, targeted

There is currently **no** test covering `useKeyboardShortcuts`, so these characterization tests both protect the extraction and establish a baseline.

- For each extracted handler, a test calls the handler function **directly** with a spy `dispatch`, a constructed `TracksState` (reuse the `initialState`-spread pattern from the reducer tests), and a synthetic event object, then asserts the dispatched action(s) — the `type` and the key payload fields.
- For split and duplicate, which read `document.activeElement`: the test stages a minimal jsdom element carrying the relevant `data-clip-id` / `data-track-index`, appends it, and focuses it before invoking the handler; assert the focus-resolved target is acted upon.
- Tests live in `apps/sandbox/src/hooks/handlers/__tests__/`.
- The pre-existing five handlers are **not** required to gain tests in this pass (out of scope), though the new `selectionTarget` helper gets a direct unit test since two handlers depend on it.

## Verification

- New handler tests pass (green from the start — characterization).
- Full sandbox suite stays green: `pnpm --filter @audacity-ui/sandbox test`.
- Typecheck + production build succeed: `pnpm --filter @audacity-ui/sandbox build` (proves the hook's consumers and the removed param wire up cleanly).
- Manual smoke of the four behaviors in the running app: create mono/stereo/label track, split at playhead (with a clip focused and with a selection), duplicate, toggle effects panel with E (and confirm focus returns on close).

## Explicitly out of scope

- **Escape**, **Cmd+Arrow clip-move**, and **ArrowUp/Down** — order-coupled, focus-heavy, highest regression risk. Left inline; noted for a possible future pass.
- The other five already-extracted handlers.
- Other monolith files (`Canvas.tsx`, `EditorLayout.tsx`, `App.tsx`, `PreferencesModal.tsx`).

## Success criteria

- The four concerns live in dedicated `handlers/` modules; the hook calls them in the same guarded positions, in the same order.
- The shared selection-target helper is extracted and consumed by both split and duplicate (no remaining duplicate copy).
- `controlPanelHasFocus` is gone from the hook's options and call site; the App/EditorLayout state is untouched.
- Targeted characterization tests cover each extracted handler and the shared helper; full suite + build green; no observable behavior change.
