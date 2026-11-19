# Selection readout in the ruler, and Set selection… — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the time selection's numbers as a label in the timeline ruler, take the status bar's selection timecodes out of the default layout, add an Edit › Set selection… dialog, then add a "Stroked islands" toolbar style to Debug.

**Architecture:** Two pure helpers in components (`utils/selectionReadout.ts`: the label's text and its placement) feed a small `SelectionReadout` overlay rendered beside `TimelineRuler` inside EditorLayout's ruler container (the ruler itself is a bare canvas). Set selection… is a sandbox dialog modelled on `GoToDialog`, opened through `useDialogState` and the in-app Edit menu. The stroked style is one more `groupStyle` value, CSS only.

**Tech Stack:** React 19, TypeScript, Vitest + jsdom + Testing Library, tsup (components), Vite (sandbox).

**Spec:** `docs/superpowers/specs/2026-11-19-selection-readout-design.md`

## Global Constraints

- After editing `packages/components`, run `pnpm build` in it — the sandbox imports its `dist`.
- Every `any` needs `// justified:`; `node scripts/check-any.mjs` stays at 0.
- Query test DOM from the render's `container` (menus portal to `document`); `afterEach(cleanup)`.
- Copy: sentence case; the menu item reads "Set selection..." (three dots, as "Go to..." does in `menuDefinitions.ts`).
- A time selection is NOT on the undo chain: applying Set selection… is not an undo step.
- The Debug option label: "Stroked islands (stroke in both themes)".

## Review Focus

- A selection that runs off the left or right edge of the view — the label stays inside the ruler, over the visible part.
- A selection wholly off screen — no label.
- A zero-length or reversed selection (end before start) — read as start ≤ end; a zero length shows no label.
- Beats-and-bars ruler mode — the label in bars and beats, not seconds.
- Set selection… with End typed before Start — refused (Set dimmed), never a negative range.

---

### Task 1: The readout's text and placement (pure helpers)

**Files:**
- Create: `packages/components/src/utils/selectionReadout.ts`
- Modify: `packages/components/src/index.ts` (export both helpers and their types)
- Test: `packages/components/src/utils/__tests__/selectionReadout.test.ts`

**Interfaces:**
- Produces:
  - `formatSelectionReadout(start: number, end: number, opts: { format: 'minutes-seconds' | 'beats-measures'; bpm?: number; beatsPerMeasure?: number; noteValue?: number }): { full: string; short: string }`
  - `placeSelectionReadout(args: { startX: number; endX: number; labelWidth: number; viewportWidth: number; fullWidth: number }): { left: number; full: boolean } | null`

- [ ] **Step 1: Write the failing tests**

```ts
describe('formatSelectionReadout', () => {
  it('seconds: the length then the range', () => {
    expect(formatSelectionReadout(1.3, 2.55, { format: 'minutes-seconds' })).toEqual({ full: '1.250 s · 0:01.300 – 0:02.550', short: '1.250 s' });
  });
  it('a range past an hour carries hours', () => {
    expect(formatSelectionReadout(3600, 3725.4, { format: 'minutes-seconds' }).full).toBe('2:05.400 · 1:00:00.000 – 1:02:05.400');
  });
  it('lengths of a minute or more read m:ss.mmm', () => {
    expect(formatSelectionReadout(0, 65, { format: 'minutes-seconds' }).short).toBe('1:05.000');
  });
  it('reversed input reads start-first', () => {
    expect(formatSelectionReadout(2.55, 1.3, { format: 'minutes-seconds' }).full).toBe('1.250 s · 0:01.300 – 0:02.550');
  });
  it('beats and bars: bar.beat positions, the length in beats (120 bpm, 4/4: a beat is 0.5 s)', () => {
    expect(formatSelectionReadout(0.5, 4, { format: 'beats-measures', bpm: 120, beatsPerMeasure: 4, noteValue: 4 })).toEqual({ full: '7 beats · 1.2 – 3.1', short: '7 beats' });
  });
});

describe('placeSelectionReadout', () => {
  it('centred over the selection when the full label fits', () => {
    expect(placeSelectionReadout({ startX: 100, endX: 400, labelWidth: 200, viewportWidth: 1000, fullWidth: 200 })).toEqual({ left: 150, full: true });
  });
  it('a selection narrower than the full label shows the short one', () => {
    expect(placeSelectionReadout({ startX: 100, endX: 160, labelWidth: 60, viewportWidth: 1000, fullWidth: 200 })?.full).toBe(false);
  });
  it('kept inside the ruler when the selection runs off an edge', () => {
    expect(placeSelectionReadout({ startX: -300, endX: 120, labelWidth: 200, viewportWidth: 1000, fullWidth: 200 })?.left).toBe(4);
    expect(placeSelectionReadout({ startX: 900, endX: 1400, labelWidth: 200, viewportWidth: 1000, fullWidth: 200 })?.left).toBe(796);
  });
  it('nothing when the selection is wholly off screen or has no length', () => {
    expect(placeSelectionReadout({ startX: -500, endX: -10, labelWidth: 60, viewportWidth: 1000, fullWidth: 200 })).toBeNull();
    expect(placeSelectionReadout({ startX: 200, endX: 200, labelWidth: 60, viewportWidth: 1000, fullWidth: 200 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd packages/components && npx vitest run src/utils/__tests__/selectionReadout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement both in `utils/selectionReadout.ts`**

Positions: `m:ss.mmm`, with `h:mm:ss.mmm` from an hour; lengths under a minute `S.mmm s`, else the position form. Beats: a beat = `beatSeconds(bpm, noteValue)` from `utils/musicalTime.ts`; position = `bar.beat`, 1-based (`floor(t / beat)` beats, then `floor(n / beatsPerMeasure) + 1` and `n % beatsPerMeasure + 1`); length = rounded beats, "beat"/"beats". Placement: clamp the visible span to `[0, viewportWidth]`; `null` if it has no width; `full` when the visible span ≥ `fullWidth`; `left` = centred over the visible span, then clamped to `[4, viewportWidth − labelWidth − 4]`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/utils/selectionReadout.ts packages/components/src/utils/__tests__/selectionReadout.test.ts packages/components/src/index.ts
git commit -m "feat(ruler): selection readout text and placement helpers"
```

### Task 2: The readout over the ruler

**Files:**
- Create: `packages/components/src/SelectionReadout/SelectionReadout.tsx`, `SelectionReadout.css`, `index.ts`
- Modify: `packages/components/src/index.ts` (export `SelectionReadout`)
- Modify: `apps/sandbox/src/components/EditorLayout.tsx` (render it inside the ruler's relative container, after `<TimelineRuler …/>`, ~line 1298)
- Test: `packages/components/src/SelectionReadout/__tests__/SelectionReadout.test.tsx`

**Interfaces:**
- Consumes: Task 1's helpers.
- Produces: `SelectionReadout(props: { startTime: number; endTime: number; pixelsPerSecond: number; scrollX: number; viewportWidth: number; height: number; timeFormat?: 'minutes-seconds' | 'beats-measures'; bpm?: number; beatsPerMeasure?: number; noteValue?: number })` — renders `null` or a `[data-selection-readout]` pill.

- [ ] **Step 1: Write the failing tests**

```tsx
it('shows the full label for a selection, with the data attribute', () => {
  const { container } = render(<ThemeProvider><SelectionReadout startTime={1.3} endTime={2.55} pixelsPerSecond={200} scrollX={0} viewportWidth={1000} height={40} /></ThemeProvider>);
  expect(container.querySelector('[data-selection-readout]')?.textContent).toBe('1.250 s · 0:01.300 – 0:02.550');
});
it('renders nothing for a zero-length selection', () => {
  const { container } = render(<ThemeProvider><SelectionReadout startTime={2} endTime={2} pixelsPerSecond={200} scrollX={0} viewportWidth={1000} height={40} /></ThemeProvider>);
  expect(container.querySelector('[data-selection-readout]')).toBeNull();
});
it('takes no pointer events', () => {
  const { container } = render(<ThemeProvider><SelectionReadout startTime={1} endTime={3} pixelsPerSecond={200} scrollX={0} viewportWidth={1000} height={40} /></ThemeProvider>);
  expect(getComputedStyle(container.querySelector('[data-selection-readout]')!).pointerEvents).toBe('none');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/SelectionReadout` — FAIL, module not found.

- [ ] **Step 3: Implement**

x = `CLIP_CONTENT_OFFSET + t * pixelsPerSecond − scrollX` (the ruler's own formula, `constants.ts`). Measure the pill's full and short widths in a layout effect (a hidden measuring span for the full text); in jsdom widths are 0, so treat a 0 measure as "fits" and show `full`. Position: absolute, `left` from the helper, vertically in the ruler's BOTTOM half (where the selection is drawn), `pointer-events: none`, `z-index` above the canvas. Look: 11px semibold, the theme's primary text on `background.surface.elevated`, 1px `border.default`, radius 3, 1px 6px padding, `white-space: nowrap`, tabular figures.

- [ ] **Step 4: Render it in EditorLayout** when `rulerTimeSelection` (or, with none, `spectralSelection`) has a length, passing `rulerViewportWidth || timelineWidth`, `timelineFormat`, `bpm`, `beatsPerMeasure`, `noteValue`.

- [ ] **Step 5: Run tests, `pnpm build`, `npx tsc --noEmit` in both packages** — PASS / 0 errors.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/SelectionReadout packages/components/src/index.ts apps/sandbox/src/components/EditorLayout.tsx
git commit -m "feat(ruler): the time selection's length and range over the ruler"
```

### Task 3: Selection timecodes off by default

**Files:**
- Modify: `packages/components/src/utils/toolbarLayout.ts:240` (`statusBars` returns only `{ id: 'status', tools: ['status-cue', 'status-info'] }`; its comment)
- Modify: `apps/sandbox/src/__tests__/App.integration.test.tsx:311,340`
- Test: `packages/components/src/utils/__tests__/toolbarLayout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('no seed puts the selection timecodes on a toolbar (2026-11-19)', () => {
  for (const ws of ['classic', 'modern', 'music', 'spectral-editing'] as const) {
    const json = JSON.stringify(defaultToolbarLayout(ws));
    expect(json).not.toContain('selection-timecodes');
    expect(json).not.toContain('selection-duration');
  }
});
```

- [ ] **Step 2: Run to verify it fails**, then **Step 3: change `statusBars`**, then **Step 4: run to verify it passes.**

- [ ] **Step 5: Update the integration test** — line 311 asserts `[aria-label="Selection start"]` is `null` in the bottom dock; line 340 waits for the status bar's `.selection-toolbar__status-text` in the top dock instead.

- [ ] **Step 6: `pnpm build` (components), run `pnpm --filter @audacity-ui/sandbox test` — all pass.** (F6 already skips a missing stop: `F6_SECTIONS` queries return null.)

- [ ] **Step 7: Commit** — `feat(toolbars): selection timecodes off the default status bar`

### Task 4: Edit › Set selection…

**Files:**
- Create: `apps/sandbox/src/components/SetSelectionDialog.tsx`
- Modify: `apps/sandbox/src/hooks/useDialogState.ts` (a `'setSelection'` dialog: `isSetSelectionOpen` / `setIsSetSelectionOpen`, as `'goTo'`)
- Modify: `apps/sandbox/src/data/menuDefinitions.ts` (Edit: `{ label: 'Set selection...', onClick: deps.onOpenSetSelection }` directly after "Go to..."; dep `onOpenSetSelection: () => void`)
- Modify: `apps/sandbox/src/hooks/useMenuDefinitions.ts` (thread it), `apps/sandbox/src/App.tsx` (render the dialog by `GoToDialog`'s)
- Test: `apps/sandbox/src/components/__tests__/SetSelectionDialog.test.tsx`

**Interfaces:**
- Produces: `SetSelectionDialog(props: { isOpen: boolean; initialStart: number; initialEnd: number; format: TimeCodeFormat; onFormatChange: (f: TimeCodeFormat) => void; onSet: (start: number, end: number) => void; onClose: () => void; os?: 'macos' | 'windows' })`

- [ ] **Step 1: Write the failing tests** — driving the three TimeCodes' `onChange` through their typed entry is heavy in jsdom, so export the field rule as a pure function from the dialog file and test it, plus the open/Set/Escape wiring:

```ts
it('editing Start or Length moves End; editing End changes Length', () => {
  expect(applySelectionField({ start: 1, end: 3 }, 'start', 2)).toEqual({ start: 2, end: 4 });
  expect(applySelectionField({ start: 1, end: 3 }, 'length', 5)).toEqual({ start: 1, end: 6 });
  expect(applySelectionField({ start: 1, end: 3 }, 'end', 2.5)).toEqual({ start: 1, end: 2.5 });
});
it('Set is dimmed while End is before Start', () => { /* render with initialStart 3, initialEnd 1: the Set button is disabled */ });
it('Set applies the range and closes; Escape closes without applying', () => { /* render, click Set → onSet(1, 3) and onClose; render again, Escape → onClose only */ });
```

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: Implement** `applySelectionField(range: { start: number; end: number }, field: 'start' | 'end' | 'length', value: number): { start: number; end: number }` (values clamped at 0) and the dialog: Go to…'s pattern — `Dialog` + three labelled `TimeCode variant="alt"` (Start, End, Length; aria-labels "Selection start" / "Selection end" / "Selection length" are taken by the status bar tools, so use "Set start", "Set end", "Set length"), Start auto-editing at open (`autoEdit`), Enter applies, Escape cancels, footer Cancel / Set.

- [ ] **Step 4: Wire it in App:** open from the menu; initial range = `state.timeSelection` (start ≤ end), else the playhead with zero length; `onSet` dispatches `SET_TIME_SELECTION` `{ startTime, endTime, tracks: rangeScopeFor(state, trackImOnOf(...)) }` (from `hooks/handlers/playheadSelectionHandlers.ts`; with no track scope, every non-folder track) and `SET_PLAYHEAD_POSITION` to `startTime`; focus returns to the opener.

- [ ] **Step 5: Run the dialog test and the sandbox suite; `npx tsc --noEmit`.** The palette lists it with no extra work (it reads the menus) — add one assertion to the existing palette/menu test that `Set selection...` exists in Edit, after "Go to...".

- [ ] **Step 6: Commit** — `feat(edit): Set selection… — start, end and length by keyboard`

### Task 5: Stroked islands in Debug

**Files:**
- Modify: `packages/components/src/ToolbarDock/ToolbarDock.tsx` (`groupStyle` gains `'stroked'`; it adds `toolbar-dock--islands` and `toolbar-dock--stroked`)
- Modify: `packages/components/src/ToolbarDock/ToolbarDock.css` (`.toolbar-dock--stroked .toolbar-dock__bar { background-color: var(--toolbar-bg); border-color: var(--toolbar-island-border); }`)
- Modify: the `'lines' | 'islands' | 'filled' | 'open'` union in `apps/sandbox/src/{App.tsx,components/AppDialogs.tsx,components/DebugPanel.tsx,components/AppToolbarDock.tsx}`; DebugPanel's radio list gains `['stroked', 'Stroked islands (stroke in both themes)']` after Filled.
- Test: `packages/components/src/ToolbarDock/__tests__/ToolbarDock.test.tsx`

- [ ] **Step 1: Failing test** — `renderDock({ groupStyle: 'stroked' })` → the root has `toolbar-dock--islands` and `toolbar-dock--stroked`.
- [ ] **Step 2: Run (fails) → implement → run (passes); `pnpm build`; both `tsc`.**
- [ ] **Step 3: Commit** — `feat(toolbars): stroked islands to compare in Debug`

### Finally

- [ ] Update CLAUDE.md (the ruler readout; the status bar seed; Set selection…; the five Debug styles) and run all four gates.
- [ ] Remove the two timecode tools from the six workspaces made in this session (Studio, Podcasting, Music production, Analysis, Modern minimal, Classic (Audacity 3)) in the running app's preferences, layout and saved `start` alike; leave Alex.
