# Canvas.tsx Conservative Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract three cohesive pieces out of `apps/sandbox/src/components/Canvas.tsx` — a `GridOverlay` component, pure geometry helpers, and a `useSplitTool` hook — behavior-preserving, with targeted tests.

**Architecture:** Canvas is a DOM interaction dispatcher (renders no `<canvas>`), already delegating gestures to 8 hooks. We lift out (1) the pure grid calc + SVG into a component, (2) two pure geometry helpers into a utils module, (3) the split tool's state/effects/handlers into a hook whose returned handlers Canvas wires back into the mouse-dispatch chain **in the same order**. The bulk (935-line track loop) is intentionally left alone.

**Tech Stack:** React 19, TypeScript 5, Vitest 4 + jsdom, @testing-library/react.

## Global Constraints

- Work on branch `refactor/canvas-extraction` (already created).
- ZERO behavior change. The mouse-dispatch guard chain (capture→bubble: right-click marquee → split-mode → shift-guard → clip mousedown → container click) keeps its exact order; split-tool handlers relocate bodies only, wired in the same positions with the same `preventDefault`/`stopPropagation`.
- Do NOT touch the race-prone refs: `didDragRef`, `justSelectedOnMouseDownRef`, `clipTrimStateRef`, `clipStretchStateRef`, module-scoped `pendingClipMoveResolution`.
- Layout constants live in `apps/sandbox/src/constants/canvas.ts`: `TOP_GAP=2`, `TRACK_GAP=2`, `DEFAULT_TRACK_HEIGHT=114`, `CLIP_HEADER_HEIGHT=20`. `CLIP_CONTENT_OFFSET` is imported from `@audacity-ui/components`. `calculateTrackYOffset` from `../utils/trackLayout`.
- Tests: `pnpm --filter @audacity-ui/sandbox test`. Build: `pnpm --filter @audacity-ui/sandbox build`. Typecheck: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json`.
- Test provider pattern: components using `useTheme` need `ThemeProvider` + `AccessibilityProfileProvider` wrappers (see `packages/components` test docs / existing component tests). Query from the `container` returned by `render()`, add `afterEach(cleanup)`.

---

## Task 0: Baseline

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `refactor/canvas-extraction`

- [ ] **Step 2: Full suite green**

Run: `pnpm --filter @audacity-ui/sandbox test`
Expected: all pass (~139 tests). If red, STOP and report.

- [ ] **Step 3: Confirm no existing Canvas test**

Run: `ls apps/sandbox/src/components/__tests__/ 2>/dev/null || echo "no components __tests__ dir yet"`
Note the result — this pass creates the first Canvas-area tests.

---

## Task 1: Extract `GridOverlay` component

**Files:**
- Create: `apps/sandbox/src/components/GridOverlay.tsx`
- Create: `apps/sandbox/src/components/__tests__/GridOverlay.test.tsx`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (grid `useMemo` ~738–814; SVG render ~871–897)

**Interfaces:**
- Produces: pure `computeGrid(args: { bpm: number; beatsPerMeasure: number; timeFormat: 'beats-measures' | 'minutes-seconds'; pixelsPerSecond: number; width: number; clipContentOffset: number }): { gridLines: Array<{ x: number; tier: 'measure' | 'beat' | 'subdivision' }>; measureBands: Array<{ x: number; w: number }> }` and a `GridOverlay` React component consuming the same fields as props (+ `containerHeight`, `viewportHeight`).

- [ ] **Step 1: Write the failing pure-function test**

Create `GridOverlay.test.tsx` (start with the pure calc — deterministic, no DOM):

```tsx
import { describe, it, expect } from 'vitest';
import { computeGrid } from '../GridOverlay';

const CLIP_CONTENT_OFFSET = 8; // any positive offset; assertions are relative to it

describe('computeGrid', () => {
  it('beats-measures: emits lines classified by tier, first line on the measure boundary', () => {
    const { gridLines, measureBands } = computeGrid({
      bpm: 120, beatsPerMeasure: 4, timeFormat: 'beats-measures',
      pixelsPerSecond: 100, width: 2000, clipContentOffset: CLIP_CONTENT_OFFSET,
    });
    expect(gridLines.length).toBeGreaterThan(0);
    expect(gridLines[0]).toEqual({ x: CLIP_CONTENT_OFFSET, tier: 'measure' });
    for (const l of gridLines) {
      expect(['measure', 'beat', 'subdivision']).toContain(l.tier);
      expect(l.x).toBeLessThanOrEqual(2000);
    }
    // alternating bands exist and start at the content offset
    expect(measureBands.length).toBeGreaterThan(0);
    expect(measureBands[0].x).toBe(CLIP_CONTENT_OFFSET);
    expect(measureBands[0].w).toBeGreaterThan(0);
  });

  it('minutes-seconds: emits major/beat lines only (no bands)', () => {
    const { gridLines, measureBands } = computeGrid({
      bpm: 120, beatsPerMeasure: 4, timeFormat: 'minutes-seconds',
      pixelsPerSecond: 100, width: 1000, clipContentOffset: CLIP_CONTENT_OFFSET,
    });
    expect(gridLines.length).toBeGreaterThan(0);
    for (const l of gridLines) expect(['measure', 'beat']).toContain(l.tier);
    expect(measureBands).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/components/__tests__/GridOverlay.test.tsx`
Expected: FAIL — cannot resolve `../GridOverlay`.

- [ ] **Step 3: Create `GridOverlay.tsx` — move the calc verbatim into `computeGrid`**

Create the file. Move the body of the grid `useMemo` (Canvas.tsx ~738–813) VERBATIM into an exported pure `computeGrid`, substituting the closure vars for the args and using `args.clipContentOffset` where the original used the imported `CLIP_CONTENT_OFFSET`. Then a `GridOverlay` component that calls it in a `useMemo` and renders the SVG (moved verbatim from Canvas ~871–897):

```tsx
import React from 'react';
import { CLIP_CONTENT_OFFSET, useTheme } from '@audacity-ui/components';

export interface GridArgs {
  bpm: number;
  beatsPerMeasure: number;
  timeFormat: 'beats-measures' | 'minutes-seconds';
  pixelsPerSecond: number;
  width: number;
  clipContentOffset: number;
}

export function computeGrid(args: GridArgs): {
  gridLines: Array<{ x: number; tier: 'measure' | 'beat' | 'subdivision' }>;
  measureBands: Array<{ x: number; w: number }>;
} {
  const { bpm, beatsPerMeasure, timeFormat, pixelsPerSecond, width, clipContentOffset } = args;
  // ← paste the useMemo body (lines ~739–813) verbatim, replacing CLIP_CONTENT_OFFSET with clipContentOffset
}

export interface GridOverlayProps {
  bpm: number;
  beatsPerMeasure: number;
  timeFormat: 'beats-measures' | 'minutes-seconds';
  pixelsPerSecond: number;
  width: number;
  containerHeight: number;
  viewportHeight: number;
}

export function GridOverlay(props: GridOverlayProps) {
  const { theme } = useTheme();
  const { gridLines, measureBands } = React.useMemo(
    () => computeGrid({ ...props, clipContentOffset: CLIP_CONTENT_OFFSET }),
    [props.bpm, props.beatsPerMeasure, props.timeFormat, props.pixelsPerSecond, props.width],
  );
  // ← paste the SVG render (Canvas lines ~871–897) verbatim, using gridLines/measureBands/theme
  //   and Math.max(props.containerHeight, props.viewportHeight) for the height as the original did.
}
```

- [ ] **Step 4: Run pure test — verify PASS**

Run: `pnpm --filter @audacity-ui/sandbox test run src/components/__tests__/GridOverlay.test.tsx`
Expected: PASS. If the first line isn't at `clipContentOffset` with tier `measure`, you altered the calc — re-check the verbatim move.

- [ ] **Step 5: Replace the inline grid in Canvas with `<GridOverlay />`**

In `Canvas.tsx`: delete the grid `useMemo` (738–814) and the inline SVG (871–897); import `GridOverlay`; render `<GridOverlay bpm={bpm} beatsPerMeasure={beatsPerMeasure} timeFormat={timeFormat} pixelsPerSecond={pixelsPerSecond} width={width} containerHeight={containerHeight} viewportHeight={viewportHeight} />` at the same JSX position the SVG occupied. Confirm the exact prop names by checking how `bpm`/`beatsPerMeasure`/`timeFormat`/`width`/`containerHeight`/`viewportHeight` are named in Canvas's scope; if a name differs, pass the actual variable.

- [ ] **Step 6: Full suite + typecheck**

Run: `pnpm --filter @audacity-ui/sandbox test run src/components/ src/contexts/` then `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "GridOverlay|Canvas" || echo clean`
Expected: green + clean.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/components/GridOverlay.tsx apps/sandbox/src/components/__tests__/GridOverlay.test.tsx apps/sandbox/src/components/Canvas.tsx
git commit -m "refactor(canvas): extract GridOverlay component (no behavior change)"
```

---

## Task 2: Extract pure geometry helpers

**Files:**
- Create: `apps/sandbox/src/utils/canvasGeometry.ts`
- Create: `apps/sandbox/src/utils/__tests__/canvasGeometry.test.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (helpers ~495–518; call sites)

**Interfaces:**
- Produces:
  - `resolveTrackIndexFromY(y: number, tracks: Track[]): number | null`
  - `buildSplitForTrack(trackIndex: number, time: number, tracks: Track[]): { type: 'split'; clipId: number; trackIndex: number; leftEnd: number; rightStart: number } | null`
  - (import `Track` type from `../contexts/TracksContext`.)

- [ ] **Step 1: Write the failing tests**

Create `canvasGeometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTrackIndexFromY, buildSplitForTrack } from '../canvasGeometry';
import type { Track } from '../../contexts/TracksContext';

// TOP_GAP=2, TRACK_GAP=2, DEFAULT_TRACK_HEIGHT=114
const twoTracks = [
  { id: 1, name: 'a', clips: [{ id: 10, name: 'c', start: 0, duration: 5, envelopePoints: [] }] },
  { id: 2, name: 'b', clips: [] },
] as unknown as Track[];

describe('resolveTrackIndexFromY', () => {
  it('returns track 0 for a Y inside the first row', () => {
    expect(resolveTrackIndexFromY(2, twoTracks)).toBe(0);      // at TOP_GAP
    expect(resolveTrackIndexFromY(100, twoTracks)).toBe(0);    // inside row 0 (2..116)
  });
  it('returns track 1 for a Y inside the second row', () => {
    expect(resolveTrackIndexFromY(200, twoTracks)).toBe(1);    // row1 starts 2+114+2=118
  });
  it('returns null past the last row', () => {
    expect(resolveTrackIndexFromY(100000, twoTracks)).toBeNull();
  });
});

describe('buildSplitForTrack', () => {
  it('returns a split mutation for a time strictly inside a clip', () => {
    expect(buildSplitForTrack(0, 2.5, twoTracks)).toEqual({
      type: 'split', clipId: 10, trackIndex: 0, leftEnd: 2.5, rightStart: 2.5,
    });
  });
  it('returns null at a clip edge (no zero-width split)', () => {
    expect(buildSplitForTrack(0, 0, twoTracks)).toBeNull();
    expect(buildSplitForTrack(0, 5, twoTracks)).toBeNull();
  });
  it('returns null on an empty track and an out-of-range index', () => {
    expect(buildSplitForTrack(1, 1, twoTracks)).toBeNull();
    expect(buildSplitForTrack(99, 1, twoTracks)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/utils/__tests__/canvasGeometry.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `canvasGeometry.ts` (pure move)**

```ts
import type { Track } from '../contexts/TracksContext';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT } from '../constants/canvas';

/** Resolve which track index a Y pixel falls in; null when outside any row. */
export function resolveTrackIndexFromY(y: number, tracks: Track[]): number | null {
  let cursor = TOP_GAP;
  for (let i = 0; i < tracks.length; i++) {
    const h = tracks[i].height || DEFAULT_TRACK_HEIGHT;
    if (y >= cursor && y < cursor + h) return i;
    cursor += h + TRACK_GAP;
  }
  return null;
}

/** Build a split mutation for a clip on `trackIndex` strictly containing `time`. */
export function buildSplitForTrack(trackIndex: number, time: number, tracks: Track[]) {
  const track = tracks[trackIndex];
  if (!track) return null;
  const hit = track.clips.find((c) => {
    const start = c.start;
    const end = c.start + c.duration;
    return time > start + 0.0001 && time < end - 0.0001;
  });
  if (!hit) return null;
  return { type: 'split' as const, clipId: hit.id, trackIndex, leftEnd: time, rightStart: time };
}
```

- [ ] **Step 4: Run tests — verify PASS**

Run: `pnpm --filter @audacity-ui/sandbox test run src/utils/__tests__/canvasGeometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace the inline helpers in Canvas with imports**

In `Canvas.tsx`: delete the `resolveTrackIndexFromY` `useCallback` (495–503) and the `buildSplitForTrack` `useCallback` (508–518). Import the pure versions from `../utils/canvasGeometry`. Update every call site to pass `tracks`:
- `resolveTrackIndexFromY(y)` → `resolveTrackIndexFromY(y, tracks)`
- `buildSplitForTrack(ti, time)` → `buildSplitForTrack(ti, time, tracks)`

Search all usages: `grep -n "resolveTrackIndexFromY\|buildSplitForTrack" apps/sandbox/src/components/Canvas.tsx` and update each. If any usage sat inside a `useMemo`/`useCallback`/`useEffect` dependency array as `resolveTrackIndexFromY`/`buildSplitForTrack`, remove it from the deps (they're now module-level stable functions) and add `tracks` if not already present.

- [ ] **Step 6: Full suite + typecheck**

Run: `pnpm --filter @audacity-ui/sandbox test run src/utils/ src/components/ src/contexts/` then `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "canvasGeometry|Canvas.tsx" || echo clean`
Expected: green + clean.

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/utils/canvasGeometry.ts apps/sandbox/src/utils/__tests__/canvasGeometry.test.ts apps/sandbox/src/components/Canvas.tsx
git commit -m "refactor(canvas): extract pure resolveTrackIndexFromY / buildSplitForTrack helpers"
```

---

## Task 3: Extract `useSplitTool` hook

**Files:**
- Create: `apps/sandbox/src/hooks/useSplitTool.ts`
- Create: `apps/sandbox/src/hooks/__tests__/useSplitTool.test.ts`
- Modify: `apps/sandbox/src/components/Canvas.tsx` (split state ~469–474; effects ~480–538; handlers ~916–1051)

**Interfaces:**
- Consumes: `resolveTrackIndexFromY`, `buildSplitForTrack` from `../utils/canvasGeometry`.
- Produces: `useSplitTool(deps: { containerRef: React.RefObject<HTMLDivElement>; tracks: Track[]; pixelsPerSecond: number; leftPadding: number; splitMode: boolean; dispatch: React.Dispatch<TracksAction> }): { splitHover: { x: number; trackIndex: number; shiftKey: boolean } | null; handlers: { onMouseDownCapture(e): void; onMouseDown(e): void; onMouseMove(e): void; onMouseLeave(e): void; onClickCapture(e): void } }`. (Finalize the exact deps/handler set by reading what the split branches actually use.)

- [ ] **Step 1: Read the split pieces and list every ref/state/handler branch**

Read Canvas.tsx and enumerate: the split state (`splitHover` ~469, `lastMouseRef` ~474), the two effects (Shift keydown/keyup sync ~480–492, on-enable hover-compute ~523–538), and every split-specific branch inside `onMouseDownCapture` (~916–947), `onMouseDown` (~949–1023, the split fallback only), `onMouseMove` (~1024–1051, the hover-compute part), `onMouseLeave` (~1054–1061, split clear), `onClickCapture` (~1062–1071). Write them to the report. `lastMouseRef` is ALSO read by `onMouseMove` for non-split purposes — if so, keep the `lastMouseRef.current = ...` write in Canvas's `onMouseMove` and have the hook read the ref via deps, OR move `lastMouseRef` into the hook and expose an `onMouseMove` that Canvas calls first; pick whichever keeps behavior identical and document the choice.

- [ ] **Step 2: Write the failing characterization test**

Create `useSplitTool.test.ts`. Test the dispatch-observable behavior: a split-mode mousedown over a clip dispatches a split. Since the split dispatch path ultimately uses `buildSplitForTrack` + `dispatch`, the most robust characterization is to test the hook's `handlers.onMouseDownCapture` with a synthetic event + a spy dispatch, staging `containerRef` geometry. If wiring a full `renderHook` with DOM geometry proves brittle, instead assert the split action shape via the underlying path directly and note it. Target assertion: an `APPLY_CLIP_PLACEMENT` action whose `payload.mutations` contains a `split` for the hit clip is dispatched.

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSplitTool } from '../useSplitTool';
import { initialState, type Track } from '../../contexts/TracksContext';

const tracks = [
  { id: 1, name: 'a', height: 114, clips: [{ id: 10, name: 'c', start: 0, duration: 5, envelopePoints: [] }] },
] as unknown as Track[];

function makeContainer() {
  const el = document.createElement('div');
  // getBoundingClientRect drives client→canvas coord conversion; stub a known rect.
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500, x: 0, y: 0, toJSON: () => {} });
  document.body.appendChild(el);
  return el;
}

describe('useSplitTool', () => {
  it('split-mode mousedown over a clip dispatches a split placement', () => {
    const dispatch = vi.fn();
    const el = makeContainer();
    const containerRef = { current: el } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() =>
      useSplitTool({ containerRef, tracks, pixelsPerSecond: 100, leftPadding: 0, splitMode: true, dispatch }));

    // clientX=250 → time 2.5s at 100px/s; clientY inside track-0 body (past CLIP_HEADER_HEIGHT=20).
    const e = { button: 0, clientX: 250, clientY: 60, shiftKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn(), target: el } as unknown as React.MouseEvent;
    result.current.handlers.onMouseDownCapture(e);

    const types = dispatch.mock.calls.map(c => c[0].type);
    expect(types).toContain('APPLY_CLIP_PLACEMENT');
    const placement = dispatch.mock.calls.find(c => c[0].type === 'APPLY_CLIP_PLACEMENT')![0];
    expect(placement.payload.mutations.some((m: any) => m.type === 'split' && m.clipId === 10)).toBe(true);
  });
});
```

Adapt the coord math (`leftPadding`, the y offset for CLIP_HEADER_HEIGHT) to what the moved code actually computes — read the split-down branch and mirror its client→canvas conversion exactly. If the branch reads `e.target.closest(...)` or container offsets differently, stage that. Do NOT change the handler to fit the test.

- [ ] **Step 3: Run — verify it fails**

Run: `pnpm --filter @audacity-ui/sandbox test run src/hooks/__tests__/useSplitTool.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4: Create `useSplitTool.ts` — move the split pieces verbatim**

Move `splitHover` state, `lastMouseRef` (or the split-owned part), the two `useEffect`s, and the split handler branch bodies into the hook, VERBATIM except referencing `deps.*` and importing the geometry helpers. Return `{ splitHover, handlers }`. The handlers must call `preventDefault`/`stopPropagation` exactly where the originals did.

- [ ] **Step 5: Wire the hook into Canvas — PRESERVE GUARD-CHAIN ORDER**

In `Canvas.tsx`: remove the moved state/effects/handler branches. Call `const splitTool = useSplitTool({ containerRef, tracks, pixelsPerSecond, leftPadding, splitMode, dispatch });`. In each container event handler, invoke `splitTool.handlers.<event>(e)` **at the exact point the inline split branch used to run** — i.e. split-capture still executes before the clip/marquee logic that followed it, and if the original split branch `return`ed early after dispatching, replicate that (have the hook handler signal whether it consumed the event, e.g. return a boolean, and Canvas `return`s on true). The split-preview `div` (~840–867) stays in Canvas JSX, now reading `splitTool.splitHover`. Confirm no other still-inline branch changed relative order.

- [ ] **Step 6: Full suite + typecheck + build**

Run: `pnpm --filter @audacity-ui/sandbox test` then `pnpm --filter @audacity-ui/sandbox build`
Expected: all green; build succeeds. If the split test fails, fix the move (never the test).

- [ ] **Step 7: Commit**

```bash
git add apps/sandbox/src/hooks/useSplitTool.ts apps/sandbox/src/hooks/__tests__/useSplitTool.test.ts apps/sandbox/src/components/Canvas.tsx
git commit -m "refactor(canvas): extract useSplitTool hook (no behavior change)"
```

---

## Task 4: Final verification + docs

**Files:**
- Modify: `docs/codebase-map.md`

- [ ] **Step 1: Full suite + build**

Run: `pnpm --filter @audacity-ui/sandbox test` then `pnpm --filter @audacity-ui/sandbox build`
Expected: all pass; build succeeds.

- [ ] **Step 2: Manual smoke**

Run the app (`cd apps/sandbox && pnpm dev`). Verify no regression: the beat/measure grid renders at two zoom levels; enabling split mode shows the preview line following the cursor; Shift extends the preview across all tracks; clicking splits the clip at the cursor; and split still intercepts before a clip drag begins. Note any anomaly.

- [ ] **Step 3: Update the codebase map**

In `docs/codebase-map.md`: under "Where rendering happens" add `GridOverlay.tsx`; under "Where interactions live" note `hooks/useSplitTool.ts` and `utils/canvasGeometry.ts`; in the big-files entry for `Canvas.tsx`, note the split tool, grid, and geometry helpers are now extracted.

- [ ] **Step 4: Commit**

```bash
git add docs/codebase-map.md
git commit -m "docs: note GridOverlay / useSplitTool / canvasGeometry extractions"
```

---

## Self-Review notes (author)

- **Spec coverage:** GridOverlay→T1, geometry helpers→T2, useSplitTool→T3 (order preserved, refs untouched per Steps 1/5), verification+docs→T4. All spec items mapped.
- **Ordering:** GridOverlay first (independent, safest confidence-builder); geometry helpers (T2) before useSplitTool (T3) which consumes them.
- **Behavior lock:** T1/T2 move pure code verbatim with concrete unit tests; T3 moves handler bodies verbatim and explicitly preserves guard-chain order + early-return semantics, gated by a dispatch characterization test + full build.
- **Test honesty:** pure calc/geometry tested on invariants (not brittle exact counts); split tested on the dispatched `APPLY_CLIP_PLACEMENT` split mutation, staging the real container geometry the code reads.
- **Open item for executor:** T3 Step 1 — if `lastMouseRef` is shared between split and non-split `onMouseMove` logic, choose the ref-ownership split that preserves behavior and document it; if the split-down coord conversion differs from the test's assumption, mirror the code in the test, never the reverse.
