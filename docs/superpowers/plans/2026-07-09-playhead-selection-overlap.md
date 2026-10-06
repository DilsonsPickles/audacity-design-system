> **Superseded 2026-10-07:** the exception described here was removed — finalizing a selection always moves the playhead to the selection's start (user decision: "remove exception logic whereby it doesn't move if it's included in selection"). Kept for the record.

# Playhead Selection-Overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. (This rider was approved for INLINE execution in-session.)

**Goal:** Finalizing a selection drag leaves the playhead alone when it sits inside the drawn range; otherwise it jumps to selection start as today.

**Spec:** `docs/superpowers/specs/2026-07-09-playhead-selection-overlap-design.md`.

**Architecture:** One pure helper (`playheadAfterSelectionFinalize`) with unit tests; two one-line guards at Canvas's time and spectral finalize callbacks.

**Tech Stack:** TypeScript, Vitest 4.

## Global Constraints

- Branch: `feat/time-selection-scope` (rider on the in-review feature). No `any` types. Commit only named files.
- Rule verbatim: inclusive edges — `startTime <= playheadPosition <= endTime` → don't move; else move to `sel.startTime`. Both finalize paths. Clicks (`useContainerClick`) and keyboard gestures untouched.

---

### Task 1: Helper + guards + docs

**Files:**
- Create: `apps/sandbox/src/utils/playheadAfterFinalize.ts`
- Test: `apps/sandbox/src/utils/__tests__/playheadAfterFinalize.test.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (both finalize callbacks, ~lines 542-546 and ~600-604)
- Modify: `docs/clip-interactions.md` (one sentence in the "Time-selection scope" section)

**Interfaces:**
- Produces: `playheadAfterSelectionFinalize(playheadPosition: number, sel: { startTime: number; endTime: number }): number | null` — `null` = don't move.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { playheadAfterSelectionFinalize } from '../playheadAfterFinalize';

describe('playheadAfterSelectionFinalize', () => {
  const sel = { startTime: 2, endTime: 5 };
  it('playhead inside the range → null (do not move)', () => {
    expect(playheadAfterSelectionFinalize(3, sel)).toBeNull();
  });
  it('playhead exactly at the start edge → null', () => {
    expect(playheadAfterSelectionFinalize(2, sel)).toBeNull();
  });
  it('playhead exactly at the end edge → null', () => {
    expect(playheadAfterSelectionFinalize(5, sel)).toBeNull();
  });
  it('playhead before the range → selection start', () => {
    expect(playheadAfterSelectionFinalize(1, sel)).toBe(2);
  });
  it('playhead after the range → selection start', () => {
    expect(playheadAfterSelectionFinalize(7, sel)).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

`pnpm --filter @audacity-ui/sandbox test -- playheadAfterFinalize` → FAIL (module not found).

- [ ] **Step 3: Implement helper**

```ts
// Spec: docs/superpowers/specs/2026-07-09-playhead-selection-overlap-design.md
// Finalizing a selection drag must not move a playhead the user parked
// inside the drawn range. Returns the new playhead position, or null
// when the playhead should stay where it is.
export function playheadAfterSelectionFinalize(
  playheadPosition: number,
  sel: { startTime: number; endTime: number },
): number | null {
  if (playheadPosition >= sel.startTime && playheadPosition <= sel.endTime) {
    return null;
  }
  return sel.startTime;
}
```

- [ ] **Step 4: Run to verify pass** — same command, 5/5 green.

- [ ] **Step 5: Guard both Canvas callbacks**

Add import `import { playheadAfterSelectionFinalize } from '../utils/playheadAfterFinalize';`. At BOTH sites replace:

```ts
        if (sel) {
          dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: sel.startTime });
```

with:

```ts
        if (sel) {
          // Don't yank a playhead the user parked inside the range.
          const nextPlayhead = playheadAfterSelectionFinalize(playheadPosition, sel);
          if (nextPlayhead !== null) {
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: nextPlayhead });
          }
```

(`playheadPosition` is already in scope in Canvas — the Shift+Click range site reads it.)

- [ ] **Step 6: Docs sentence** — append to the "Time-selection scope" section of `docs/clip-interactions.md`:

```markdown
Finalizing a selection drag moves the playhead to the selection start —
unless the playhead already lies inside the drawn range (edges inclusive),
in which case it stays put. Applies to spectral selections too.
```

- [ ] **Step 7: Gates** — `cd apps/sandbox && npx tsc --noEmit` clean; `pnpm --filter @audacity-ui/sandbox test` all green (expect 232).

- [ ] **Step 8: Commit**

```bash
git add apps/sandbox/src/utils/playheadAfterFinalize.ts apps/sandbox/src/utils/__tests__/playheadAfterFinalize.test.ts apps/sandbox/src/components/Canvas.tsx docs/clip-interactions.md
git commit -m "feat(selection): finalize keeps an overlapped playhead in place"
```
