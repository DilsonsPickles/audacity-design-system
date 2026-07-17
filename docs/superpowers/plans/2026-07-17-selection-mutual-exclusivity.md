# Track-Selection / Time-Selection Mutual Exclusivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce that track selection and time selection are mutually exclusive — a non-null time selection always clears `selectedTrackIndices`, and Cmd+click on a track header while a time selection is active extends the time selection scope (not the track selection).

**Architecture:** Two targeted changes: (1) add an invariant guard in `tracksReducer` so `SET_TIME_SELECTION` with a non-null payload atomically clears `selectedTrackIndices` at the state boundary — covers all callers automatically; (2) fix `toggleScopeOrTrackSelection` in `useTrackPanelHandlers` to branch cleanly on whether a time selection exists, removing the current "always-toggle-track-selection then maybe-also-update-scope" logic.

**Tech Stack:** TypeScript, React 19, Vitest 4, `@testing-library/react 16`, pnpm monorepo.

## Global Constraints

- All gates must remain green: `pnpm --filter @audacity-ui/sandbox test`, `pnpm --filter @dilsonspickles/components test`, `npx tsc --noEmit`, `node scripts/check-any.mjs`
- No `any` — every use requires a `// justified:` comment or the guard fails
- Behavior-preserving outside the stated scope — do not touch other selection behaviors (Shift+click range, clip selection, label selection, keyboard selection)
- Commit messages should be concise

---

## File Map

| File | Change |
|------|--------|
| `apps/sandbox/src/contexts/TracksContext.tsx` | Add invariant guard in `tracksReducer` |
| `apps/sandbox/src/hooks/useTrackPanelHandlers.ts` | Clean up `toggleScopeOrTrackSelection` branching |
| `apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts` | Add invariant tests |

---

## Task 1: Reducer invariant — `SET_TIME_SELECTION` clears track selection

**Files:**
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (around line 473, just before `const before = state.tracks`)
- Test: `apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts`

**Interfaces:**
- Produces: `tracksReducer` guarantees `selectedTrackIndices === []` after any `SET_TIME_SELECTION` with non-null payload

### Why this is the right place

`tracksReducer` already has two early-returns at the top for `UNDO`/`REDO`. A third early-return for `SET_TIME_SELECTION` enforces the invariant at the state boundary — all callers (canvas drag, keyboard, `toggleScopeOrTrackSelection`) get it for free without needing to remember to dispatch a separate clear action.

`SET_TIME_SELECTION` is not in `UNDOABLE_ACTIONS`, so the early-return skips the undo-snapshot logic cleanly (same as the UNDO/REDO cases above it).

- [ ] **Step 1: Write the failing tests**

Open `apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts` and append a new describe block **after** the existing `scope integrity under track delete/move` block:

```typescript
describe('track-selection / time-selection mutual exclusivity', () => {
  it('SET_TIME_SELECTION with non-null payload clears selectedTrackIndices', () => {
    const state = stateWith({
      selectedTrackIndices: [0, 1],
    });
    const next = tracksReducer(state, {
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 1 },
    });
    expect(next.selectedTrackIndices).toEqual([]);
    expect(next.timeSelection).toEqual({ startTime: 0, endTime: 1 });
  });

  it('SET_TIME_SELECTION with null payload leaves selectedTrackIndices untouched', () => {
    const state = stateWith({
      selectedTrackIndices: [0, 1],
      timeSelection: { startTime: 0, endTime: 1 },
    });
    const next = tracksReducer(state, { type: 'SET_TIME_SELECTION', payload: null });
    expect(next.selectedTrackIndices).toEqual([0, 1]);
    expect(next.timeSelection).toBeNull();
  });

  it('SET_TIME_SELECTION is a no-op on selectedTrackIndices when it is already empty', () => {
    const state = stateWith({ selectedTrackIndices: [] });
    const next = tracksReducer(state, {
      type: 'SET_TIME_SELECTION',
      payload: { startTime: 0, endTime: 2 },
    });
    expect(next.selectedTrackIndices).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/sandbox && npx vitest run timeSelectionScope.reducer
```

Expected: the first two tests fail (the third may pass already if `initialState.selectedTrackIndices` is `[]`).

- [ ] **Step 3: Add the invariant guard to `tracksReducer`**

In `apps/sandbox/src/contexts/TracksContext.tsx`, locate the `tracksReducer` function. After the two `UNDO`/`REDO` `if` blocks (around line 473, just before `const before = state.tracks`), insert:

```typescript
  // Invariant: a non-null time selection cannot coexist with track selection.
  if (action.type === 'SET_TIME_SELECTION' && action.payload !== null) {
    return { ...innerReducer(state, action), selectedTrackIndices: [] };
  }
```

The surrounding context for placement (existing lines shown for reference):

```typescript
  // [existing REDO block ends here]
  }

  // Invariant: a non-null time selection cannot coexist with track selection.
  if (action.type === 'SET_TIME_SELECTION' && action.payload !== null) {
    return { ...innerReducer(state, action), selectedTrackIndices: [] };
  }

  // Snapshot the current tracks before running the reducer if this is an
  const before = state.tracks;
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
cd apps/sandbox && npx vitest run timeSelectionScope.reducer
```

Expected: all 3 new tests pass, all pre-existing tests in the file still pass.

- [ ] **Step 5: Run full gates**

```bash
pnpm --filter @audacity-ui/sandbox test
npx tsc --noEmit  # from apps/sandbox/
node scripts/check-any.mjs  # from repo root
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx \
        apps/sandbox/src/contexts/__tests__/timeSelectionScope.reducer.test.ts
git commit -m "feat: SET_TIME_SELECTION clears selectedTrackIndices (mutual exclusivity invariant)"
```

---

## Task 2: Fix `toggleScopeOrTrackSelection` branching

**Files:**
- Modify: `apps/sandbox/src/hooks/useTrackPanelHandlers.ts` (lines 93–110)

**Interfaces:**
- Consumes: `timeSelection` from hook options (already available), `selectedTrackIndices` from hook options (already available), `toggleTrackSelection` from `../utils/trackSelection`
- Produces: clean two-branch logic where the presence of a time selection determines which operation runs

### Current behavior (broken)

The function unconditionally calls `toggleTrackSelection` (adds/removes the track from `selectedTrackIndices`), then additionally updates the time selection scope if one exists. This means Cmd+clicking while a time selection is active simultaneously mutates both track selection and time selection scope — violating mutual exclusivity.

### New behavior

If a time selection is active: **only** update `timeSelection.tracks` (the scope), leave `selectedTrackIndices` untouched (the reducer invariant from Task 1 will keep it clear regardless).

If no time selection is active: **only** toggle the track in/out of `selectedTrackIndices`.

- [ ] **Step 1: Replace `toggleScopeOrTrackSelection` (lines 93–110)**

Replace the entire function with:

```typescript
  const toggleScopeOrTrackSelection = (index: number) => {
    const ts = timeSelection;
    if (ts) {
      // Time-selection mode: extend or contract the row scope only.
      // selectedTrackIndices stays empty (invariant: track selection and
      // time selection cannot coexist).
      const currentScope = ts.tracks ?? selectedTrackIndices;
      const newScope = currentScope.includes(index)
        ? currentScope.filter((i) => i !== index)
        : [...currentScope, index].sort((a, b) => a - b);
      dispatch({
        type: 'SET_TIME_SELECTION',
        payload: newScope.length > 0 ? { ...ts, tracks: newScope } : null,
      });
    } else {
      // Track-selection mode: toggle the clicked track in/out of the selection set.
      toggleTrackSelection(index, selectedTrackIndices, dispatch);
    }
    setSelectionAnchor(index);
  };
```

- [ ] **Step 2: Run full gates**

```bash
pnpm --filter @audacity-ui/sandbox test
npx tsc --noEmit  # from apps/sandbox/
```

Expected: all green — no behavioral tests cover this function today, so the gate is the type-checker and the existing suite not regressing.

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/hooks/useTrackPanelHandlers.ts
git commit -m "fix: toggleScopeOrTrackSelection branches on time-vs-track mode, never mixes both"
```

---

## Verification checklist (manual smoke-test)

After both tasks are committed, open the sandbox (`pnpm sandbox`) and verify:

- [ ] Drag a time selection across tracks 0 and 1. Confirm track selection highlight disappears from all track headers.
- [ ] With a time selection active, Cmd+click a third track header. Confirm the time selection extends to that track (waveform region highlighted) but no track header shows the "selected" ring.
- [ ] Cmd+click that same track header again. Confirm the track is removed from the time selection scope.
- [ ] Plain-click a track header while a time selection exists. Confirm the time selection is destroyed and only that track header shows the selected ring.
- [ ] With no time selection, Cmd+click two track headers. Confirm both show the selected ring and no time selection appears.
- [ ] Cmd+click one of those headers again. Confirm it deselects (ring gone) while the other remains selected.

---

## Out of scope (possible follow-ups)

- **Shift+click on a track header while a time selection exists** — not addressed; current behavior (extends track selection range) may also need to become "extend time selection scope" or "destroy time selection, range-select tracks" depending on product decision.
- **Keyboard Enter / Shift+Enter on track headers** — handled by `selectTrackExclusive` / `onRangeSelection` which already dispatch `SET_TIME_SELECTION: null` on plain Enter; Shift+Enter dispatches `SET_SELECTED_TRACKS` (no time selection created) so no conflict. Leave untouched.
