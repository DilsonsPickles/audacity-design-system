# Overlapping Clips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement clip-on-clip overlap behavior where the moving clip wins, non-destructively trimming, splitting, or deleting underlying clips on release.

**Architecture:** A pure `resolveOverlap` function turns a "proposed final positions" intent into a single atomic state diff. Drag and trim hooks call it on mouseup and dispatch one new `APPLY_CLIP_PLACEMENT` action. Snap to flush with another small pure helper applied during drag.

**Tech Stack:** TypeScript, React, Vitest 4, @testing-library/react, jsdom. Sandbox app at `apps/sandbox/` (Vite). Pure functions in `apps/sandbox/src/utils/`. Reducer in `apps/sandbox/src/contexts/TracksContext.tsx`.

**Spec:** `docs/superpowers/specs/2026-05-07-overlapping-clips-design.md`

**Important codebase notes:**
- The sandbox `Clip` type is defined locally in `apps/sandbox/src/contexts/TracksContext.tsx` (lines 21–38). It uses `start: number` (not `startTime`), `duration: number`, and optional `trimStart: number`, `fullDuration: number`. The plan uses `clip.start` consistently to match.
- Existing `MOVE_CLIP` action fires on every `mousemove`. We keep that behavior. The new `APPLY_CLIP_PLACEMENT` action runs once on `mouseup` to apply the resolved diff.
- Existing `snapToGrid` utility (`apps/sandbox/src/utils/snapToGrid.ts`) handles grid/time-based snap. The new clip-edge snap composes with it.

---

## File Plan

### New files

- `apps/sandbox/src/utils/resolveOverlap.ts` — pure resolver, ~150 lines.
- `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts` — unit tests.
- `apps/sandbox/src/utils/snapToClipEdges.ts` — pure snap helper, ~60 lines.
- `apps/sandbox/src/utils/__tests__/snapToClipEdges.test.ts` — unit tests.

### Modified files

- `apps/sandbox/src/contexts/TracksContext.tsx` — add `APPLY_CLIP_PLACEMENT` action type and reducer case (~80 line addition).
- `apps/sandbox/src/hooks/useClipDragging.ts` — apply clip-edge snap during `mousemove`; call resolver on `mouseup`.
- `apps/sandbox/src/hooks/useClipTrimming.ts` — same pattern for edge trim.
- `packages/components/src/Track/TrackNew.tsx` — add `isDraggingClipId` prop and apply `opacity: 0.7` on the clip(s) being dragged.

---

## Task 1: Create resolver module skeleton with type definitions

**Files:**
- Create: `apps/sandbox/src/utils/resolveOverlap.ts`

- [ ] **Step 1: Create the module with types and a stub function**

```ts
// apps/sandbox/src/utils/resolveOverlap.ts

export interface ResolverClip {
  id: number;
  start: number;
  duration: number;
  trimStart?: number;
  fullDuration?: number;
}

export interface ResolverTrack {
  clips: ResolverClip[];
}

export interface ClipPlacement {
  clipId: number;
  trackIndex: number;
  start: number;
  duration: number;
}

export type ClipMutation =
  | {
      type: 'trim';
      clipId: number;
      trackIndex: number;
      newStart: number;
      newDuration: number;
      newTrimStart: number;
    }
  | {
      type: 'split';
      clipId: number;
      trackIndex: number;
      // Left segment runs original.start → leftEnd (duration = leftEnd - original.start).
      // Right segment runs rightStart → original.start + original.duration.
      leftEnd: number;
      rightStart: number;
    }
  | {
      type: 'delete';
      clipId: number;
      trackIndex: number;
    };

export interface OverlapResolution {
  placements: ClipPlacement[];
  mutations: ClipMutation[];
}

/**
 * Pure resolver: given current tracks and the proposed final positions of moving clips,
 * compute the diff (placements + mutations) needed to apply the spec's overlap rule.
 * The moving clip(s) always win; underlying clips on the destination tracks are
 * non-destructively trimmed, split, or deleted depending on geometry.
 */
export function resolveOverlap(
  _tracks: ResolverTrack[],
  _intent: ClipPlacement[],
  _movingClipIds: ReadonlySet<number>,
): OverlapResolution {
  return { placements: [], mutations: [] };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd apps/sandbox && pnpm tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/utils/resolveOverlap.ts
git commit -m "Add resolveOverlap module skeleton with types"
```

---

## Task 2: Resolver — no-overlap case (TDD)

**Files:**
- Create: `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`
- Modify: `apps/sandbox/src/utils/resolveOverlap.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts
import { describe, it, expect } from 'vitest';
import { resolveOverlap, ResolverTrack, ClipPlacement } from '../resolveOverlap';

const track = (clips: Array<{ id: number; start: number; duration: number; trimStart?: number }>): ResolverTrack => ({
  clips: clips.map(c => ({ trimStart: 0, ...c })),
});

describe('resolveOverlap', () => {
  it('returns no mutations when intent does not overlap any clip', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 10, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
    expect(result.placements).toEqual(intent);
  });

  it('returns no mutations when intent is exactly adjacent (touching but not overlapping)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 5, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
  });

  it('does not produce a mutation against a clip in movingClipIds (selected clips do not eat each other)', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 5 },
        { id: 2, start: 3, duration: 4 },
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 1, trackIndex: 0, start: 0, duration: 5 },
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([1, 2]));
    expect(result.mutations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: tests run; the placements assertion fails (the stub returns `placements: []` instead of `intent`).

- [ ] **Step 3: Implement minimal resolver to pass**

Replace the stub body:

```ts
export function resolveOverlap(
  tracks: ResolverTrack[],
  intent: ClipPlacement[],
  movingClipIds: ReadonlySet<number>,
): OverlapResolution {
  const mutations: ClipMutation[] = [];

  for (const placement of intent) {
    const destTrack = tracks[placement.trackIndex];
    if (!destTrack) continue;

    const mStart = placement.start;
    const mEnd = placement.start + placement.duration;

    for (const underlying of destTrack.clips) {
      if (movingClipIds.has(underlying.id)) continue;

      const uStart = underlying.start;
      const uEnd = underlying.start + underlying.duration;

      // No overlap (strict): mEnd <= uStart or mStart >= uEnd
      if (mEnd <= uStart || mStart >= uEnd) continue;

      // Geometry classification will go here in later tasks.
    }
  }

  return { placements: intent, mutations };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: PASS — all three "no-overlap" tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts apps/sandbox/src/utils/resolveOverlap.ts
git commit -m "Resolver: handle no-overlap and adjacent cases"
```

---

## Task 3: Resolver — partial right-side overlap (TDD)

Geometry: moving clip overlaps the **right portion** of the underlying clip (`mStart > uStart && mEnd >= uEnd`). Underlying clip's right edge trims back to `mStart`. `start` and `trimStart` unchanged; `duration` reduced.

**Files:**
- Modify: `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`
- Modify: `apps/sandbox/src/utils/resolveOverlap.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('resolveOverlap', ...)`:

```ts
  it('trims the underlying clip when moving clip overlaps its right portion', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 }, // moving clip 3..7, underlying 0..5
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 0,
        newDuration: 3,
        newTrimStart: 0,
      },
    ]);
  });

  it('right-side trim: mEnd exactly equals uEnd is still right-side trim (single trim)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 2, duration: 3 }, // moving 2..5, underlying 0..5
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    // mStart > uStart and mEnd >= uEnd → right-side trim
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 0,
        newDuration: 2,
        newTrimStart: 0,
      },
    ]);
  });

  it('right-side trim preserves trimStart of the underlying clip', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5, trimStart: 1.5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 4, duration: 3 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 0,
        newDuration: 4,
        newTrimStart: 1.5,
      },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: FAIL — `mutations` is empty `[]`, expected the trim entry.

- [ ] **Step 3: Implement the right-side classification branch**

Inside the inner loop in `resolveOverlap.ts`, replace the `// Geometry classification will go here` comment with:

```ts
      const fullyObscured = mStart <= uStart && mEnd >= uEnd;
      const fullyInside = mStart > uStart && mEnd < uEnd;
      const overlapsRight = mStart > uStart && mEnd >= uEnd; // moving covers underlying's right portion
      const overlapsLeft = mStart <= uStart && mEnd < uEnd && mEnd > uStart; // moving covers underlying's left portion

      if (fullyObscured) {
        // delete — implemented in a later task
      } else if (fullyInside) {
        // split — implemented in a later task
      } else if (overlapsRight) {
        mutations.push({
          type: 'trim',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
          newStart: underlying.start,
          newDuration: mStart - underlying.start,
          newTrimStart: underlying.trimStart ?? 0,
        });
      } else if (overlapsLeft) {
        // left-trim — implemented in a later task
      }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: PASS — all five tests so far pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts apps/sandbox/src/utils/resolveOverlap.ts
git commit -m "Resolver: handle right-side partial overlap (trim)"
```

---

## Task 4: Resolver — partial left-side overlap (TDD)

Geometry: moving clip overlaps the **left portion** of underlying (`mStart <= uStart && mEnd < uEnd && mEnd > uStart`). Underlying's left edge trims forward: `newStart = mEnd`, `newTrimStart = trimStart + (mEnd − uStart)`, `newDuration = uEnd − mEnd`.

**Files:**
- Modify: `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`
- Modify: `apps/sandbox/src/utils/resolveOverlap.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe('resolveOverlap', ...)`:

```ts
  it('trims the underlying clip when moving clip overlaps its left portion', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 5, duration: 5, trimStart: 0 }]), // underlying 5..10
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 }, // moving 3..7
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 7,        // mEnd
        newDuration: 3,     // uEnd - mEnd = 10 - 7
        newTrimStart: 2,    // 0 + (mEnd - uStart) = 0 + (7 - 5)
      },
    ]);
  });

  it('left-side trim adjusts trimStart by overlap amount when underlying already had trimStart', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 5, duration: 5, trimStart: 1 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 4, duration: 3 }, // moving 4..7, underlying 5..10
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 7,
        newDuration: 3,
        newTrimStart: 3,    // 1 + (7 - 5)
      },
    ]);
  });

  it('left-side trim: mStart exactly equals uStart still treated as left-side', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 5, duration: 5, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 5, duration: 3 }, // moving 5..8, underlying 5..10
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'trim',
        clipId: 1,
        trackIndex: 0,
        newStart: 8,
        newDuration: 2,
        newTrimStart: 3,
      },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: FAIL — left-side cases produce empty mutations.

- [ ] **Step 3: Implement the left-side branch**

Replace the `// left-trim — implemented in a later task` comment with:

```ts
        const overlapAmount = mEnd - uStart;
        mutations.push({
          type: 'trim',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
          newStart: mEnd,
          newDuration: uEnd - mEnd,
          newTrimStart: (underlying.trimStart ?? 0) + overlapAmount,
        });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: PASS — all left-side cases pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts apps/sandbox/src/utils/resolveOverlap.ts
git commit -m "Resolver: handle left-side partial overlap (trim with trimStart adjust)"
```

---

## Task 5: Resolver — fully inside / split (TDD)

Geometry: moving clip is fully inside underlying (`mStart > uStart && mEnd < uEnd`). Emit a `split` mutation. The reducer (Task 8) will materialize this into two clip records.

**Files:**
- Modify: `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`
- Modify: `apps/sandbox/src/utils/resolveOverlap.ts`

- [ ] **Step 1: Write the failing test**

```ts
  it('splits the underlying clip when moving clip is fully inside it', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 10, trimStart: 0 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 3, duration: 4 }, // moving 3..7, underlying 0..10
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      {
        type: 'split',
        clipId: 1,
        trackIndex: 0,
        leftEnd: 3,
        rightStart: 7,
      },
    ]);
  });

  it('split is emitted as a single mutation regardless of the underlying clip duration', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 2, duration: 20, trimStart: 0.5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 99, trackIndex: 0, start: 10, duration: 2 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([99]));
    expect(result.mutations).toEqual([
      {
        type: 'split',
        clipId: 1,
        trackIndex: 0,
        leftEnd: 10,
        rightStart: 12,
      },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: FAIL — split cases return empty mutations.

- [ ] **Step 3: Implement the split branch**

Replace the `// split — implemented in a later task` comment with:

```ts
        mutations.push({
          type: 'split',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
          leftEnd: mStart,
          rightStart: mEnd,
        });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts apps/sandbox/src/utils/resolveOverlap.ts
git commit -m "Resolver: split underlying clip when moving clip is fully inside"
```

---

## Task 6: Resolver — fully obscured / delete (TDD)

Geometry: moving clip fully covers underlying (`mStart <= uStart && mEnd >= uEnd`). Emit `delete`.

**Files:**
- Modify: `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`
- Modify: `apps/sandbox/src/utils/resolveOverlap.ts`

- [ ] **Step 1: Write the failing test**

```ts
  it('deletes the underlying clip when moving clip fully obscures it', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 2, duration: 3 }]), // underlying 2..5
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 1, duration: 6 }, // moving 1..7
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      { type: 'delete', clipId: 1, trackIndex: 0 },
    ]);
  });

  it('deletes when boundaries match exactly (mStart=uStart and mEnd=uEnd)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 0, start: 0, duration: 5 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([
      { type: 'delete', clipId: 1, trackIndex: 0 },
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: FAIL — delete cases return no mutations.

- [ ] **Step 3: Implement the delete branch**

Replace the `// delete — implemented in a later task` comment with:

```ts
        mutations.push({
          type: 'delete',
          clipId: underlying.id,
          trackIndex: placement.trackIndex,
        });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: PASS — all six geometry cases now pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts apps/sandbox/src/utils/resolveOverlap.ts
git commit -m "Resolver: delete underlying clip when fully obscured"
```

---

## Task 7: Resolver — multi-clip and cross-track tests

Pure tests verifying the resolver handles multi-clip intent and cross-track placement. No new implementation expected — this exercises edge cases of the existing logic.

**Files:**
- Modify: `apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts`

- [ ] **Step 1: Add multi-clip and cross-track tests**

```ts
  it('handles multi-clip intent: each moving clip eats independently against non-moving clips', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 4 },   // underlying A
        { id: 2, start: 6, duration: 4 },   // underlying B
        { id: 10, start: 0, duration: 4 },  // moving X (initially at 0..4, will move)
        { id: 11, start: 6, duration: 4 },  // moving Y (initially at 6..10, will move)
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 10, trackIndex: 0, start: 2, duration: 4 }, // X lands on right of A
      { clipId: 11, trackIndex: 0, start: 8, duration: 4 }, // Y lands on right of B
    ];
    const result = resolveOverlap(tracks, intent, new Set([10, 11]));
    expect(result.mutations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'trim', clipId: 1, newDuration: 2 }),
      expect.objectContaining({ type: 'trim', clipId: 2, newDuration: 2 }),
    ]));
    expect(result.mutations).toHaveLength(2);
  });

  it('cross-track: mutations only target the destination track', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),  // track 0
      track([{ id: 2, start: 0, duration: 5 }]),  // track 1
    ];
    const intent: ClipPlacement[] = [
      { clipId: 99, trackIndex: 1, start: 2, duration: 4 }, // moving lands on track 1 only
    ];
    const result = resolveOverlap(tracks, intent, new Set([99]));
    expect(result.mutations).toEqual([
      expect.objectContaining({ type: 'trim', clipId: 2, trackIndex: 1, newDuration: 2 }),
    ]);
  });

  it('handles multiple underlying clips overlapping a single placement', () => {
    const tracks: ResolverTrack[] = [
      track([
        { id: 1, start: 0, duration: 3 },  // underlying A: 0..3
        { id: 2, start: 4, duration: 3 },  // underlying B: 4..7
        { id: 3, start: 8, duration: 3 },  // underlying C: 8..11
      ]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 99, trackIndex: 0, start: 2, duration: 7 }, // moving 2..9 — eats A's right, all of B, C's left
    ];
    const result = resolveOverlap(tracks, intent, new Set([99]));
    expect(result.mutations).toHaveLength(3);
    expect(result.mutations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'trim', clipId: 1, newDuration: 2 }),
      expect.objectContaining({ type: 'delete', clipId: 2 }),
      expect.objectContaining({ type: 'trim', clipId: 3, newStart: 9, newDuration: 2 }),
    ]));
  });

  it('ignores tracks that do not exist (out-of-bounds trackIndex)', () => {
    const tracks: ResolverTrack[] = [
      track([{ id: 1, start: 0, duration: 5 }]),
    ];
    const intent: ClipPlacement[] = [
      { clipId: 2, trackIndex: 99, start: 0, duration: 5 },
    ];
    const result = resolveOverlap(tracks, intent, new Set([2]));
    expect(result.mutations).toEqual([]);
  });
```

- [ ] **Step 2: Run the tests**

Run: `cd apps/sandbox && pnpm test resolveOverlap`
Expected: PASS — all new tests pass without code changes (covered by existing branches).

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/utils/__tests__/resolveOverlap.test.ts
git commit -m "Resolver: add multi-clip and cross-track edge case tests"
```

---

## Task 8: TracksContext — add APPLY_CLIP_PLACEMENT action and reducer case

The reducer applies all mutations and placements atomically so undo restores the entire diff in one step.

**Files:**
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx`

- [ ] **Step 1: Add the action type to the `TracksAction` union**

Find the action union near line 200–215 in `TracksContext.tsx` (look for the line `| { type: 'MOVE_CLIP'; payload: ...}`). Add a new variant directly below `MOVE_CLIP`:

```ts
  | {
      type: 'APPLY_CLIP_PLACEMENT';
      payload: {
        placements: Array<{ clipId: number; trackIndex: number; start: number; duration: number }>;
        mutations: Array<
          | { type: 'trim'; clipId: number; trackIndex: number; newStart: number; newDuration: number; newTrimStart: number }
          | { type: 'split'; clipId: number; trackIndex: number; leftEnd: number; rightStart: number }
          | { type: 'delete'; clipId: number; trackIndex: number }
        >;
      };
    }
```

- [ ] **Step 2: Add the reducer case**

Find `case 'TRIM_CLIP': {` (around line 1030). Add the new case directly after the closing `}` of `TRIM_CLIP`'s block (before `case 'ADD_LABEL': {`):

```ts
    case 'APPLY_CLIP_PLACEMENT': {
      const { placements, mutations } = action.payload;

      // Generate a fresh id for split right-segments. Use a single counter
      // anchored to current max id so all splits in this dispatch get unique ids.
      let nextId = 1;
      for (const t of state.tracks) {
        for (const c of t.clips) if (c.id >= nextId) nextId = c.id + 1;
      }

      // Group mutations by track for efficient application.
      const newTracks = state.tracks.map((track, trackIndex) => {
        const trackMutations = mutations.filter(m => m.trackIndex === trackIndex);
        const trackPlacements = placements.filter(p => p.trackIndex === trackIndex);

        if (trackMutations.length === 0 && trackPlacements.length === 0) return track;

        // Apply mutations to existing clips, producing a list of new clips.
        let newClips: Clip[] = [];
        for (const clip of track.clips) {
          const mutation = trackMutations.find(m => m.clipId === clip.id);

          if (!mutation) {
            newClips.push(clip);
            continue;
          }

          if (mutation.type === 'delete') {
            // omit
            continue;
          }

          if (mutation.type === 'trim') {
            newClips.push({
              ...clip,
              start: mutation.newStart,
              duration: mutation.newDuration,
              trimStart: mutation.newTrimStart,
              fullDuration: clip.fullDuration ?? ((clip.trimStart ?? 0) + clip.duration),
            });
            continue;
          }

          // mutation.type === 'split'
          const originalTrimStart = clip.trimStart ?? 0;
          const originalEnd = clip.start + clip.duration;
          const fullDuration = clip.fullDuration ?? (originalTrimStart + clip.duration);

          // Left segment keeps the original id and waveform reference.
          const leftSegment: Clip = {
            ...clip,
            duration: mutation.leftEnd - clip.start,
            fullDuration,
          };

          // Right segment gets a fresh id; trimStart advances by skipped audio length.
          const rightSegment: Clip = {
            ...clip,
            id: nextId++,
            start: mutation.rightStart,
            duration: originalEnd - mutation.rightStart,
            trimStart: originalTrimStart + (mutation.rightStart - clip.start),
            fullDuration,
          };

          newClips.push(leftSegment, rightSegment);
        }

        // Apply placements: update start/duration on moving clips already in the track.
        // (MOVE_CLIP during drag has typically already placed them; this is a no-op
        // unless the resolver/snap adjusted the final position.)
        if (trackPlacements.length > 0) {
          newClips = newClips.map(clip => {
            const placement = trackPlacements.find(p => p.clipId === clip.id);
            if (!placement) return clip;
            return { ...clip, start: placement.start, duration: placement.duration };
          });
        }

        return { ...track, clips: newClips };
      });

      return { ...state, tracks: newTracks };
    }
```

- [ ] **Step 3: Verify it type-checks**

Run: `cd apps/sandbox && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Add a reducer-level integration test**

Create `apps/sandbox/src/contexts/__tests__/applyClipPlacement.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// Import the reducer. Currently TracksContext.tsx does not export it directly.
// If not exported, exporting `tracksReducer` from TracksContext.tsx is required first
// (add `export` to its declaration).
import { tracksReducer, type TracksState, type Clip } from '../TracksContext';

const baseState = (clips: Partial<Clip>[]): TracksState => ({
  // Minimal viable state — only `tracks` is consumed by APPLY_CLIP_PLACEMENT.
  // Use a cast to TracksState so we don't have to enumerate every other field.
  tracks: [{
    id: 1,
    name: 't',
    clips: clips.map((c, i) => ({
      id: i + 1,
      name: '',
      start: 0,
      duration: 1,
      envelopePoints: [],
      ...c,
    } as Clip)),
  }],
} as unknown as TracksState);

describe('APPLY_CLIP_PLACEMENT', () => {
  it('applies a trim mutation by updating start, duration, trimStart', () => {
    const state = baseState([{ id: 1, start: 0, duration: 5, trimStart: 0 }]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [
          { type: 'trim', clipId: 1, trackIndex: 0, newStart: 0, newDuration: 3, newTrimStart: 0 },
        ],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(1);
    expect(next.tracks[0].clips[0]).toMatchObject({ id: 1, start: 0, duration: 3, trimStart: 0 });
  });

  it('applies a split mutation by producing two clips that share metadata', () => {
    const state = baseState([{ id: 1, start: 0, duration: 10, trimStart: 0, name: 'src' }]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [
          { type: 'split', clipId: 1, trackIndex: 0, leftEnd: 3, rightStart: 7 },
        ],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(2);
    expect(next.tracks[0].clips[0]).toMatchObject({ id: 1, start: 0, duration: 3, trimStart: 0, name: 'src' });
    expect(next.tracks[0].clips[1]).toMatchObject({ start: 7, duration: 3, trimStart: 7, name: 'src' });
    expect(next.tracks[0].clips[1].id).not.toBe(1);
  });

  it('applies a delete mutation by removing the clip', () => {
    const state = baseState([
      { id: 1, start: 0, duration: 5 },
      { id: 2, start: 10, duration: 5 },
    ]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [{ type: 'delete', clipId: 1, trackIndex: 0 }],
      },
    });
    expect(next.tracks[0].clips).toHaveLength(1);
    expect(next.tracks[0].clips[0].id).toBe(2);
  });

  it('applies a placement by updating the moving clip start/duration', () => {
    const state = baseState([{ id: 1, start: 0, duration: 5 }]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [{ clipId: 1, trackIndex: 0, start: 7, duration: 5 }],
        mutations: [],
      },
    });
    expect(next.tracks[0].clips[0]).toMatchObject({ start: 7, duration: 5 });
  });

  it('applies trim + split + delete in one dispatch atomically', () => {
    const state = baseState([
      { id: 1, start: 0, duration: 5, trimStart: 0 },
      { id: 2, start: 6, duration: 10, trimStart: 0 },
      { id: 3, start: 18, duration: 4 },
    ]);
    const next = tracksReducer(state, {
      type: 'APPLY_CLIP_PLACEMENT',
      payload: {
        placements: [],
        mutations: [
          { type: 'trim', clipId: 1, trackIndex: 0, newStart: 0, newDuration: 3, newTrimStart: 0 },
          { type: 'split', clipId: 2, trackIndex: 0, leftEnd: 8, rightStart: 12 },
          { type: 'delete', clipId: 3, trackIndex: 0 },
        ],
      },
    });
    // 1 trimmed clip + 2 split-result clips = 3 clips total
    expect(next.tracks[0].clips).toHaveLength(3);
    expect(next.tracks[0].clips.find(c => c.id === 3)).toBeUndefined();
  });
});
```

If `tracksReducer` and `TracksState` are not currently exported from `TracksContext.tsx`, prepend `export` to their declarations:

```ts
// In TracksContext.tsx — change:
function tracksReducer(state: TracksState, action: TracksAction): TracksState {
// To:
export function tracksReducer(state: TracksState, action: TracksAction): TracksState {
```

```ts
// And:
interface TracksState { ... }
// To:
export interface TracksState { ... }
```

(`Clip` is already exported indirectly; if not, add `export` to its declaration too.)

- [ ] **Step 5: Run the tests**

Run: `cd apps/sandbox && pnpm test applyClipPlacement`
Expected: PASS — all five reducer tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx apps/sandbox/src/contexts/__tests__/applyClipPlacement.test.ts
git commit -m "Add APPLY_CLIP_PLACEMENT action and reducer with atomic trim/split/delete"
```

---

## Task 9: Snap helper — clip-edge magnetic snap (TDD)

Pure helper that takes the proposed `start` of a moving clip + its boundaries and returns a snapped `start` if any boundary is within the threshold of an edge on the destination track. Continued past-the-snap movement is handled by the *caller* (the hook tracks cumulative cursor delta and chooses whether to call this helper or skip it). The helper itself is a stateless `(intent, edges, threshold) → snapped` function.

**Files:**
- Create: `apps/sandbox/src/utils/snapToClipEdges.ts`
- Create: `apps/sandbox/src/utils/__tests__/snapToClipEdges.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/sandbox/src/utils/__tests__/snapToClipEdges.test.ts
import { describe, it, expect } from 'vitest';
import { snapToClipEdges } from '../snapToClipEdges';

describe('snapToClipEdges', () => {
  it('snaps the moving clip\'s left edge to a target edge within threshold', () => {
    // Moving clip: start=0.04, duration=2 → edges [0.04, 2.04]
    // Targets: [0, 5] (clip ending at 5 has edges 0 and 5)
    // Threshold: 6px / pps; pixelsPerSecond=100 → threshold = 0.06s
    const result = snapToClipEdges({
      proposedStart: 0.04,
      duration: 2,
      targetEdges: [0, 5],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    // Left edge 0.04 within 0.06s of 0 → snap left to 0 → start = 0
    expect(result.snappedStart).toBe(0);
    expect(result.snappedEdge).toBe('left-to-0');
  });

  it('snaps the moving clip\'s right edge to a target edge within threshold', () => {
    // Moving clip start=2.97, duration=2 → right edge=4.97. Target edge at 5.
    // Distance: 0.03 < 0.06 → snap right to 5 → start = 3
    const result = snapToClipEdges({
      proposedStart: 2.97,
      duration: 2,
      targetEdges: [5],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBe(3);
    expect(result.snappedEdge).toBe('right-to-5');
  });

  it('returns proposed start unchanged when no target edge is within threshold', () => {
    const result = snapToClipEdges({
      proposedStart: 1.5,
      duration: 2,
      targetEdges: [10, 20],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBe(1.5);
    expect(result.snappedEdge).toBeNull();
  });

  it('prefers the closest edge when multiple are within threshold', () => {
    // proposedStart=0.05, duration=4.92 → edges [0.05, 4.97]
    // Targets [0, 5]: left distance to 0 = 0.05; right distance to 5 = 0.03
    // Right is closer → snap right.
    const result = snapToClipEdges({
      proposedStart: 0.05,
      duration: 4.92,
      targetEdges: [0, 5],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBeCloseTo(0.08, 5); // start = 5 - 4.92 = 0.08
    expect(result.snappedEdge).toBe('right-to-5');
  });

  it('does not snap below 0 (negative starts are clamped by the caller, but helper still returns a valid value)', () => {
    const result = snapToClipEdges({
      proposedStart: 0,
      duration: 2,
      targetEdges: [],
      pixelsPerSecond: 100,
      thresholdPx: 6,
    });
    expect(result.snappedStart).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/sandbox && pnpm test snapToClipEdges`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the snap helper**

```ts
// apps/sandbox/src/utils/snapToClipEdges.ts

export interface SnapInput {
  proposedStart: number;
  duration: number;
  targetEdges: number[];   // time positions of edges of non-selected clips on the destination track
  pixelsPerSecond: number;
  thresholdPx: number;     // typically 6
}

export interface SnapResult {
  snappedStart: number;
  snappedEdge: string | null; // 'left-to-X' or 'right-to-X' for debug; null if no snap
}

/**
 * Pure helper: if the moving clip's left or right edge is within `thresholdPx`
 * of any target edge on the destination track, snap the moving clip so that
 * edge meets the target exactly. If multiple edges are in range, the closest wins.
 */
export function snapToClipEdges(input: SnapInput): SnapResult {
  const { proposedStart, duration, targetEdges, pixelsPerSecond, thresholdPx } = input;
  const thresholdTime = thresholdPx / pixelsPerSecond;

  const leftEdge = proposedStart;
  const rightEdge = proposedStart + duration;

  let bestSnap: { newStart: number; edgeLabel: string; distance: number } | null = null;

  for (const target of targetEdges) {
    const leftDistance = Math.abs(leftEdge - target);
    if (leftDistance <= thresholdTime && (bestSnap === null || leftDistance < bestSnap.distance)) {
      bestSnap = { newStart: target, edgeLabel: `left-to-${target}`, distance: leftDistance };
    }

    const rightDistance = Math.abs(rightEdge - target);
    if (rightDistance <= thresholdTime && (bestSnap === null || rightDistance < bestSnap.distance)) {
      bestSnap = { newStart: target - duration, edgeLabel: `right-to-${target}`, distance: rightDistance };
    }
  }

  if (bestSnap === null) {
    return { snappedStart: proposedStart, snappedEdge: null };
  }
  return { snappedStart: bestSnap.newStart, snappedEdge: bestSnap.edgeLabel };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/sandbox && pnpm test snapToClipEdges`
Expected: PASS — all five tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/utils/snapToClipEdges.ts apps/sandbox/src/utils/__tests__/snapToClipEdges.test.ts
git commit -m "Add snapToClipEdges helper with closest-edge magnetic snap"
```

---

## Task 10: Wire useClipDragging — apply snap on mousemove, resolver on mouseup

Existing hook fires `MOVE_CLIP` on every `mousemove`. We layer in:
- Clip-edge snap before computing the dispatched `newStartTime`.
- A "snap-engaged" hysteresis tracker so the user can deliberately push past a snap.
- An `APPLY_CLIP_PLACEMENT` dispatch on `mouseup` driven by the resolver.

**Files:**
- Modify: `apps/sandbox/src/hooks/useClipDragging.ts`

- [ ] **Step 1: Add imports and a hysteresis ref**

At the top of the file, add to the existing imports:

```ts
import { snapToClipEdges } from '../utils/snapToClipEdges';
import { resolveOverlap, ClipPlacement } from '../utils/resolveOverlap';
```

Below the existing `clipDragStateRef` and `didDragRef` declarations, add:

```ts
  // Tracks cumulative cursor x movement while a snap is engaged, for hysteresis.
  // When this exceeds `SNAP_RELEASE_PX`, the snap releases and free positioning resumes.
  const snapHysteresisRef = useRef<{ engagedAtTimePos: number; cursorXAtEngage: number } | null>(null);
```

Define constants near the top of the function body (after `const dispatch = useTracksDispatch()`):

```ts
  const SNAP_THRESHOLD_PX = 6;
  const SNAP_RELEASE_PX = 10; // additional px the cursor must move past the snap point to release
```

- [ ] **Step 2: In `handleMouseMove`, apply clip-edge snap to `newStartTime` before MOVE_CLIP dispatches**

Find the section starting at `let newStartTime = Math.max(0, ...);` (around line 75). Replace the block from that line through the existing grid-snap `if (snapEnabled && snapOptions) {...}` so it reads:

```ts
      // Calculate raw new start time
      let newStartTime = Math.max(0, (x - dragState.offsetX - clipContentOffset) / pixelsPerSecond);
      if (snapEnabled && snapOptions) {
        newStartTime = Math.max(0, snapToGrid(newStartTime, snapOptions));
      }

      // Determine destination track first (the existing code does this below; pull it up).
      let currentY = topGap;
      let newTrackIndex = dragState.trackIndex;
      for (let i = 0; i < tracks.length; i++) {
        const trackHeight = tracks[i].height || defaultTrackHeight;
        if (y >= currentY && y < currentY + trackHeight) {
          newTrackIndex = i;
          break;
        }
        currentY += trackHeight + trackGap;
      }

      // Build moving-clip-id set for snap (don't snap to ourselves).
      const movingIds = new Set<number>(
        dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1
          ? dragState.selectedClipsInitialPositions.map(p => p.clipId)
          : [dragState.clip.id]
      );

      // Compute target edges on destination track (non-moving clips only).
      const destClips = tracks[newTrackIndex]?.clips ?? [];
      const targetEdges: number[] = [];
      for (const c of destClips) {
        if (movingIds.has(c.id)) continue;
        targetEdges.push(c.start);
        targetEdges.push(c.start + c.duration);
      }

      // Apply clip-edge snap unless the user has pushed past hysteresis.
      const hysteresis = snapHysteresisRef.current;
      const cursorX = e.clientX;
      let snappedStart = newStartTime;

      if (hysteresis && Math.abs(cursorX - hysteresis.cursorXAtEngage) > SNAP_RELEASE_PX) {
        // User pushed past the snap; release.
        snapHysteresisRef.current = null;
      }

      if (snapHysteresisRef.current === null) {
        const snapResult = snapToClipEdges({
          proposedStart: newStartTime,
          duration: dragState.clip.duration,
          targetEdges,
          pixelsPerSecond,
          thresholdPx: SNAP_THRESHOLD_PX,
        });
        if (snapResult.snappedEdge !== null) {
          snappedStart = snapResult.snappedStart;
          snapHysteresisRef.current = {
            engagedAtTimePos: snappedStart,
            cursorXAtEngage: cursorX,
          };
        }
      } else {
        // Snap is engaged but not yet released — keep the snapped position.
        snappedStart = hysteresis.engagedAtTimePos;
      }

      newStartTime = Math.max(0, snappedStart);
```

Then **delete** the duplicate "Find which track the cursor is over" block that follows (around lines 80–90 of the original) since it's now at the top of the move handler.

- [ ] **Step 3: In `handleMouseUp`, build intent + call resolver + dispatch**

Replace the existing `handleMouseUp` (around line 164):

```ts
    const handleMouseUp = () => {
      const dragState = clipDragStateRef.current;
      if (!dragState) return;

      const wasDragging = didDragRef.current;

      if (wasDragging) {
        // Build intent from current positions of moving clips.
        const movingIds = new Set<number>(
          dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1
            ? dragState.selectedClipsInitialPositions.map(p => p.clipId)
            : [dragState.clip.id]
        );

        const intent: ClipPlacement[] = [];
        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
          for (const clip of tracks[trackIndex].clips) {
            if (movingIds.has(clip.id)) {
              intent.push({
                clipId: clip.id,
                trackIndex,
                start: clip.start,
                duration: clip.duration,
              });
            }
          }
        }

        const resolution = resolveOverlap(tracks, intent, movingIds);
        if (resolution.mutations.length > 0) {
          dispatch({ type: 'APPLY_CLIP_PLACEMENT', payload: resolution });
        }
      }

      cancelDrag();
      didDragRef.current = wasDragging;
      snapHysteresisRef.current = null;
    };
```

- [ ] **Step 4: Verify it type-checks**

Run: `cd apps/sandbox && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Run all tests**

Run: `cd apps/sandbox && pnpm test`
Expected: PASS — existing tests still pass; new resolver and snap tests still pass.

- [ ] **Step 6: Manually verify in the sandbox**

Run: `cd apps/sandbox && pnpm dev`

Open `http://localhost:3000`. Drag a clip onto another clip's right side and release. The underlying clip should trim back at the boundary. Drag a small clip into the middle of a big clip; on release, the big clip should split into two segments. Drag near another clip's edge; you should feel a soft snap to flush before having to push past.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/useClipDragging.ts
git commit -m "Wire useClipDragging to snap and resolveOverlap on release"
```

---

## Task 11: Wire useClipTrimming — same pattern for edge trim

Reference: `apps/sandbox/src/hooks/useClipTrimming.ts` already supports multi-clip trim. Both edges share the pattern:

- **Left-edge trim** computes `trimDelta` (then `clampedTrimDelta`), and applies it to all selected clips: `newTrimStart = initialState.trimStart + clampedTrimDelta`, `newDuration = rightEdge − newTrimStart`, `newStart = initialState.start + clampedTrimDelta`.
- **Right-edge trim** computes `durationDelta` (then `clampedDurationDelta`), and applies it: `newDuration = initialState.duration + clampedDurationDelta`.

We layer in a clip-edge snap that adjusts `clampedTrimDelta` / `clampedDurationDelta` (so all selected clips snap together by the same amount). On mouseup, run the resolver against all selected (trimmed) clips and dispatch `APPLY_CLIP_PLACEMENT`.

**Files:**
- Modify: `apps/sandbox/src/hooks/useClipTrimming.ts`

- [ ] **Step 1: Add imports and snap state**

At the top of the file:

```ts
import { resolveOverlap, ClipPlacement } from '../utils/resolveOverlap';
```

Below `clipTrimStateRef`:

```ts
  const snapHysteresisRef = useRef<{ cursorXAtEngage: number } | null>(null);
  const SNAP_THRESHOLD_PX = 6;
  const SNAP_RELEASE_PX = 10;
```

- [ ] **Step 2: Add a snap helper in the mousemove for the LEFT edge case**

Locate `if (trimState.edge === 'left') { ... }` (line 101 in the current file). After `clampedTrimDelta` is computed (around line 123) but before the `selectedClips.forEach(...)` that dispatches, insert this snap-adjustment block:

```ts
        // Snap-to-flush: adjust clampedTrimDelta so the dragged clip's left edge
        // (newStart) meets a non-selected clip's edge on the same track within threshold.
        {
          const draggedInitial = trimState.allClipsInitialState.get(`${trimState.trackIndex}-${trimState.clipId}`);
          if (draggedInitial) {
            const projectedLeftEdge = draggedInitial.start + clampedTrimDelta;
            const trackClips = tracks[trimState.trackIndex]?.clips ?? [];
            const targetEdges: number[] = [];
            for (const c of trackClips) {
              if (c.selected) continue;
              targetEdges.push(c.start);
              targetEdges.push(c.start + c.duration);
            }

            const cursorX = e.clientX;
            const hysteresis = snapHysteresisRef.current;
            if (hysteresis && Math.abs(cursorX - hysteresis.cursorXAtEngage) > SNAP_RELEASE_PX) {
              snapHysteresisRef.current = null;
            }

            if (snapHysteresisRef.current === null) {
              const thresholdTime = SNAP_THRESHOLD_PX / pixelsPerSecond;
              let bestTarget: number | null = null;
              let bestDistance = Infinity;
              for (const target of targetEdges) {
                const d = Math.abs(projectedLeftEdge - target);
                if (d <= thresholdTime && d < bestDistance) {
                  bestTarget = target;
                  bestDistance = d;
                }
              }
              if (bestTarget !== null) {
                const snapDelta = bestTarget - draggedInitial.start;
                clampedTrimDelta = snapDelta;
                snapHysteresisRef.current = { cursorXAtEngage: cursorX };
              }
            }
          }
        }
```

- [ ] **Step 3: Add the same snap helper in the mousemove for the RIGHT edge case**

Locate the `else { ... }` branch for right-edge trim (line 159). After `clampedDurationDelta` is computed (around line 178) but before the `selectedClips.forEach(...)` that dispatches, insert:

```ts
        // Snap-to-flush: adjust clampedDurationDelta so the dragged clip's right edge
        // meets a non-selected clip's edge on the same track within threshold.
        {
          const draggedInitial = trimState.allClipsInitialState.get(`${trimState.trackIndex}-${trimState.clipId}`);
          if (draggedInitial) {
            const projectedRightEdge = draggedInitial.start + draggedInitial.duration + clampedDurationDelta;
            const trackClips = tracks[trimState.trackIndex]?.clips ?? [];
            const targetEdges: number[] = [];
            for (const c of trackClips) {
              if (c.selected) continue;
              targetEdges.push(c.start);
              targetEdges.push(c.start + c.duration);
            }

            const cursorX = e.clientX;
            const hysteresis = snapHysteresisRef.current;
            if (hysteresis && Math.abs(cursorX - hysteresis.cursorXAtEngage) > SNAP_RELEASE_PX) {
              snapHysteresisRef.current = null;
            }

            if (snapHysteresisRef.current === null) {
              const thresholdTime = SNAP_THRESHOLD_PX / pixelsPerSecond;
              let bestTarget: number | null = null;
              let bestDistance = Infinity;
              for (const target of targetEdges) {
                const d = Math.abs(projectedRightEdge - target);
                if (d <= thresholdTime && d < bestDistance) {
                  bestTarget = target;
                  bestDistance = d;
                }
              }
              if (bestTarget !== null) {
                const originalRight = draggedInitial.start + draggedInitial.duration;
                clampedDurationDelta = bestTarget - originalRight;
                snapHysteresisRef.current = { cursorXAtEngage: cursorX };
              }
            }
          }
        }
```

- [ ] **Step 4: Replace `handleMouseUp` to run the resolver against all trimmed clips**

```ts
    const handleMouseUp = () => {
      const trimState = clipTrimStateRef.current;
      if (!trimState) return;

      // Build intent from final positions of all clips that were being trimmed
      // (every selected clip on every track).
      const intent: ClipPlacement[] = [];
      const movingIds = new Set<number>();
      tracks.forEach((track: any, trackIndex: number) => {
        track.clips.forEach((clip: any) => {
          if (clip.selected) {
            intent.push({
              clipId: clip.id,
              trackIndex,
              start: clip.start,
              duration: clip.duration,
            });
            movingIds.add(clip.id);
          }
        });
      });

      if (intent.length > 0) {
        const resolution = resolveOverlap(tracks, intent, movingIds);
        if (resolution.mutations.length > 0) {
          dispatch({ type: 'APPLY_CLIP_PLACEMENT', payload: resolution });
        }
      }

      snapHysteresisRef.current = null;
      cancelTrim();
    };
```

- [ ] **Step 5: Verify type-check and tests**

Run: `cd apps/sandbox && pnpm tsc --noEmit && pnpm test`
Expected: PASS.

- [ ] **Step 6: Manually verify trim eating**

Run: `cd apps/sandbox && pnpm dev`. Drag the right edge of clip A into clip B. On release, B's left edge should trim forward. Reverse: drag B's left edge into A; A's right should trim back.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/useClipTrimming.ts
git commit -m "Wire useClipTrimming to snap and resolveOverlap on release"
```

---

## Task 12: Add visual ghost styling for moving clips

Apply `opacity: 0.7` and elevated z-index to clips currently being dragged.

**Files:**
- Modify: `packages/components/src/Track/TrackNew.tsx`
- Modify (caller): `apps/sandbox/src/components/Canvas.tsx` (or wherever `TrackNew` is rendered)

- [ ] **Step 1: Add `draggingClipIds` prop to `TrackNew`**

Locate the `TrackNew` component's props interface in `packages/components/src/Track/TrackNew.tsx`. Add:

```ts
  /**
   * Set of clip ids currently being dragged. Drawn at reduced opacity and elevated z-index.
   */
  draggingClipIds?: ReadonlySet<number>;
```

In the clip render loop, when rendering each clip, apply the visual treatment:

```tsx
const isDragging = draggingClipIds?.has(clip.id) ?? false;
// ...wherever the clip's outer wrapper style is applied:
style={{
  ...existingStyles,
  opacity: isDragging ? 0.7 : 1,
  zIndex: isDragging ? 10 : undefined,
}}
```

- [ ] **Step 2: Pass `draggingClipIds` from the caller**

In the file that renders `TrackNew` and owns the `useClipDragging` hook (likely `apps/sandbox/src/components/Canvas.tsx`), derive the dragging set from `clipDragStateRef.current` on each render:

```tsx
const draggingClipIds = React.useMemo(() => {
  const dragState = clipDragStateRef.current;
  if (!dragState || !didDragRef.current) return new Set<number>();
  if (dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1) {
    return new Set(dragState.selectedClipsInitialPositions.map(p => p.clipId));
  }
  return new Set([dragState.clip.id]);
}, [/* re-evaluate on render via state-based proxy */]);
```

Because `clipDragStateRef` is a ref, the `useMemo` won't re-run when it changes. Use the existing `onDragStatusChange` callback to track an `isDragging` boolean in component state, and recompute `draggingClipIds` whenever that state flips:

```tsx
const [isDraggingClips, setIsDraggingClips] = useState(false);

// pass to useClipDragging:
useClipDragging({
  // ...existing props
  onDragStatusChange: setIsDraggingClips,
});

const draggingClipIds = React.useMemo(() => {
  if (!isDraggingClips) return new Set<number>();
  const dragState = clipDragStateRef.current;
  if (!dragState) return new Set<number>();
  if (dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1) {
    return new Set(dragState.selectedClipsInitialPositions.map(p => p.clipId));
  }
  return new Set([dragState.clip.id]);
}, [isDraggingClips]);
```

Pass `draggingClipIds` to each `<TrackNew />` instance.

- [ ] **Step 3: Verify it type-checks and builds**

Run: `cd apps/sandbox && pnpm tsc --noEmit && cd ../../packages/components && pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manually verify**

Run sandbox; drag a clip and confirm it renders ghosted (opacity ~0.7) above other clips.

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/Track/TrackNew.tsx apps/sandbox/src/components/Canvas.tsx
git commit -m "Render dragged clips ghosted (opacity 0.7) with elevated z-index"
```

---

## Task 13: Hook integration test for drag + drop overlap

Verify drag → drop produces the expected resolver-driven mutation against the reducer.

**Files:**
- Create: `apps/sandbox/src/hooks/__tests__/useClipDragging.overlap.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// apps/sandbox/src/hooks/__tests__/useClipDragging.overlap.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import React, { useRef } from 'react';
import { TracksProvider, useTracksState } from '../../contexts/TracksContext';
import { useClipDragging } from '../useClipDragging';

afterEach(cleanup);

// Minimal harness: a div with a known boundingRect, two clips on track 0.
function Harness({ onState }: { onState: (s: any) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksState = useTracksState();
  const { clipDragStateRef, startClipDrag } = useClipDragging({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    tracks: tracksState.tracks,
    pixelsPerSecond: 100,
    clipContentOffset: 0,
    topGap: 0,
    trackGap: 0,
    defaultTrackHeight: 100,
  });

  React.useEffect(() => onState(tracksState), [tracksState, onState]);

  return (
    <div
      ref={containerRef}
      style={{ width: 1000, height: 200 }}
      data-testid="container"
      onMouseDown={(e) => {
        // Simulate the canvas starting a drag of clip id=2 at offsetX=0.
        const clip = tracksState.tracks[0].clips.find((c: any) => c.id === 2);
        if (!clip) return;
        startClipDrag({
          clip,
          trackIndex: 0,
          offsetX: 0,
          initialX: e.clientX,
          initialStartTime: clip.start,
          initialTrackIndex: 0,
        });
      }}
    />
  );
}

describe('useClipDragging — overlap resolution', () => {
  it('drag clip 2 onto right side of clip 1, release → clip 1 is trimmed', async () => {
    let lastState: any;
    const initialClips = [
      { id: 1, name: '', start: 0, duration: 5, trimStart: 0, envelopePoints: [] },
      { id: 2, name: '', start: 8, duration: 4, trimStart: 0, envelopePoints: [] },
    ];

    const { container } = render(
      <TracksProvider initialTracks={[{ id: 1, name: 't', clips: initialClips }]}>
        <Harness onState={(s) => { lastState = s; }} />
      </TracksProvider>
    );

    // Mock getBoundingClientRect for the container.
    const c = container.querySelector('[data-testid="container"]') as HTMLElement;
    Object.defineProperty(c, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 1000, height: 200, right: 1000, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
    });

    // Start drag at the position corresponding to clip 2 (start=8s → x=800).
    fireEvent.mouseDown(c, { clientX: 800, clientY: 50 });

    // Move so that clip 2's start lands at 3s → x=300.
    act(() => {
      fireEvent.mouseMove(document, { clientX: 300, clientY: 50 });
    });

    // Release.
    act(() => {
      fireEvent.mouseUp(document);
    });

    const track = lastState.tracks[0];
    const clip1 = track.clips.find((c: any) => c.id === 1);
    expect(clip1.duration).toBe(3);  // trimmed from 5 → 3 because clip 2 lands at start=3
  });
});
```

> **Note:** `TracksProvider` may not currently accept an `initialTracks` prop. If it does not, add one that hydrates the reducer's initial state. If that's invasive, instead populate state via dispatching `LOAD_TRACKS` (or whatever the existing seeding action is) before running the drag.

- [ ] **Step 2: Run the test**

Run: `cd apps/sandbox && pnpm test useClipDragging.overlap`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/hooks/__tests__/useClipDragging.overlap.test.tsx
git commit -m "Integration test: drag-drop overlap trims underlying clip"
```

---

## Task 14: Manual verification matrix and snap tuning

Run through every behavior the spec defines. Adjust the snap threshold (`SNAP_THRESHOLD_PX = 6`) if it feels too sticky or not sticky enough during real use.

- [ ] **Step 1: Run the sandbox**

Run: `cd apps/sandbox && pnpm dev`

Open `http://localhost:3000`.

- [ ] **Step 2: Verify the geometry matrix**

For each case, set up the configuration, drop, and verify the result:

- **Right-side overlap** — drag clip B from empty space onto the right portion of clip A. ✅ Clip A's right edge trims back to clip B's start.
- **Left-side overlap** — drag clip B onto the left portion of clip A. ✅ Clip A's left edge trims forward; `start` shifts; previously-hidden audio at A's start is now invisible (audio still in source).
- **Fully inside** — drag a small clip B into the middle of a large clip A. ✅ Clip A splits into a left segment and a right segment.
- **Fully obscured** — drag a wide clip B over a small clip A. ✅ Clip A is deleted.
- **Adjacent (no overlap)** — drag clip B so it lands flush with clip A's right edge. ✅ No mutation; both clips intact.

- [ ] **Step 3: Verify multi-clip drag**

Select two clips with shift-click. Drag both onto a track containing three other clips. ✅ Each dropped clip eats independently; selected clips don't eat each other.

- [ ] **Step 4: Verify cross-track drop**

Drag a clip from track 0 to track 1, landing on top of an existing clip in track 1. ✅ Eating applies on track 1.

- [ ] **Step 5: Verify trim eating**

Drag the right edge of clip A into clip B (extending A). ✅ Clip B's left edge trims forward.

Drag the left edge of clip B leftward into clip A. ✅ Clip A's right edge trims back.

Drag a clip's edge so it spans across another clip entirely. ✅ Spanned clip is deleted.

- [ ] **Step 6: Verify undo**

After each operation, press cmd+Z. ✅ One undo step restores the prior state (all mutations reversed at once).

- [ ] **Step 7: Verify snap feel**

Drag a clip toward another clip's edge slowly. ✅ At ~6px from the edge, the dragged clip snaps to flush. Continued cursor movement past ~10px releases the snap and allows free positioning past the edge (overlap).

- [ ] **Step 8: Tune `SNAP_THRESHOLD_PX` / `SNAP_RELEASE_PX` if needed**

If snap feels too sticky: lower `SNAP_THRESHOLD_PX` (e.g., to 4) or raise `SNAP_RELEASE_PX` (e.g., to 14).
If snap feels not sticky enough: raise `SNAP_THRESHOLD_PX` (e.g., to 8).

Adjust in both `useClipDragging.ts` and `useClipTrimming.ts`. Commit any tuning change with a message like "Tune snap threshold based on manual testing."

- [ ] **Step 9: Final commit**

If no tuning was needed:

```bash
git commit --allow-empty -m "Manual verification of overlapping clips passed"
```

---

## Done

All spec requirements covered:

- ✅ Right-side / left-side / fully-inside / fully-obscured geometry (Tasks 3–6)
- ✅ Non-destructive trim using `trimStart` (Task 8 reducer)
- ✅ Multi-clip independent eating (Task 7)
- ✅ Cross-track eating (Task 7 + manual Task 14)
- ✅ Trim-into-overlap uses same rule (Task 11)
- ✅ Snap to flush with hysteresis (Tasks 9–11)
- ✅ Drop-only commit, no live carve (Tasks 10–11; resolver only fires on mouseup)
- ✅ Single-step undo via atomic `APPLY_CLIP_PLACEMENT` (Task 8)
- ✅ Ghost rendering during drag (Task 12)
