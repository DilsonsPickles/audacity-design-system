# Codebase Navigation Refresh + TracksContext Reducer Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repo legible to context-free agents (accurate CLAUDE.md + a codebase map, dead code removed) and decompose the `TracksContext` domain switch into per-domain sub-reducers, tests-first, with zero behavior change.

**Architecture:** `tracksReducer` (`apps/sandbox/src/contexts/TracksContext.tsx:445`) is already two layers — an outer wrapper that owns UNDO/REDO and undo-history coalescing, and an inner 75-case `switch` (`innerReducer`, line 521) of pure domain logic. We split **only** `innerReducer` into domain sub-reducers routed by an action-type→domain table; the undo wrapper is untouched. A routing-exhaustiveness test guarantees every action is handled by exactly one domain.

**Tech Stack:** React 19, TypeScript 5, Vitest 4, pnpm workspaces.

## Global Constraints

- All work on branch `refactor/docs-and-trackscontext` (already created and checked out).
- No behavior change in Part B: the public exports of `TracksContext.tsx` (`tracksReducer`, `TracksProvider`, `useTracks`, `useTracksState`, `useTracksDispatch`, `TracksState`, `TracksAction`, `Track`, `Clip`, `expandSelectionToGroups`) keep identical signatures. No consumer files change.
- Keep `packages/components` (published `@audacity-ui/components`) untouched.
- Tests run from repo root with `pnpm --filter @audacity/sandbox test` (or `cd apps/sandbox && pnpm test`). Verify the exact script name in `apps/sandbox/package.json` Step 0.
- Frequent commits — one per task minimum.

---

## Task 0: Baseline — confirm the tree and test command are green

**Files:**
- Read: `apps/sandbox/package.json`

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `refactor/docs-and-trackscontext`

- [ ] **Step 2: Find the sandbox test script**

Run: `grep -A12 '"scripts"' apps/sandbox/package.json`
Expected: note the exact `test` script and package `name` field. Use that invocation everywhere below (referred to as `<sandbox-test>`).

- [ ] **Step 3: Run the existing sandbox suite green**

Run: `<sandbox-test> run`
Expected: existing tests PASS (10 sandbox test files). If any already fail on a clean checkout, STOP and report — do not build on a red baseline.

---

## Task 1: Remove `apps/astro-website` and clean dead workspace globs

**Files:**
- Delete: `apps/astro-website/` (entire directory)
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: nothing.
- Produces: a 4-app monorepo (`sandbox`, `desktop`, `docs`, `static-smoke`).

- [ ] **Step 1: Re-confirm nothing imports it**

Run: `grep -rln "astro-website" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.js" --include="*.cjs" apps packages | grep -v node_modules | grep -v "apps/astro-website"`
Expected: no output. If anything prints, STOP and report.

- [ ] **Step 2: Remove the directory**

Run: `git rm -r apps/astro-website`
Expected: files staged for deletion.

- [ ] **Step 3: Clean the workspace globs**

Edit `pnpm-workspace.yaml` — remove the `- 'apps/demo/*'` line (phantom submodule that no longer exists). Final file:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

- [ ] **Step 4: Verify the workspace still resolves**

Run: `pnpm install --lockfile-only`
Expected: completes without error; no reference to `astro-website` or `apps/demo` in output.

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore: remove unused astro-website app and dead workspace glob"
```

---

## Task 2: Verify-then-prune stale root TODO/migration docs

**Files:**
- Investigate then Delete (only if confirmed done): `THEME_MIGRATION_TODO.md`, `REMAINING_THEME_MIGRATIONS.md`, `CHANNEL_MAPPING_IMPLEMENTATION.md`, `EAR_SVGS.md`
- Keep: `KEYBOARD_SHORTCUTS.md` unless it duplicates `docs/keyboard-handlers-map.md`

**Interfaces:**
- Consumes: nothing.
- Produces: an uncluttered repo root.

- [ ] **Step 1: Check each doc for live references**

For each file, run (example for theme migration):
`grep -rin "TODO\|not yet\|remaining\|pending" THEME_MIGRATION_TODO.md REMAINING_THEME_MIGRATIONS.md CHANNEL_MAPPING_IMPLEMENTATION.md`
And spot-check whether the work landed: e.g. `grep -rln "channelMapping\|ChannelMapping" packages apps | grep -v node_modules | head`.
Expected: build a per-file verdict — **done** (work exists in code, doc is a historical TODO) / **live** (open items remain) / **uncertain**.

- [ ] **Step 2: Delete only the confirmed-done docs**

Run `git rm <file>` for each doc judged **done**. Leave **live** and **uncertain** docs in place.

- [ ] **Step 3: Record the verdicts**

Note in the commit body which docs were removed and which were kept and why. Any **uncertain** doc is left for the user to rule on (mention it in the task handoff).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: prune completed migration TODO docs from repo root

Removed: <list>. Kept: <list> (reason)."
```

---

## Task 3: Rewrite CLAUDE.md to match the current tree

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the accurate app/package list from Tasks 1–2.
- Produces: a CLAUDE.md a context-free agent can trust; links to `docs/codebase-map.md` (created in Task 4).

- [ ] **Step 1: Fix the factual errors**

Edit `CLAUDE.md` to correct, at minimum:
- Apps list → `sandbox` (Vite dev app + full UI), `desktop` (Electron wrapper of sandbox), `docs` (Storybook), `static-smoke` (regression page). Remove all `apps/demo/clip-envelope` submodule references.
- Packages list → 4 packages: `@audacity-ui/core`, `@audacity-ui/tokens`, `@audacity-ui/components`, and add `@audacity-ui/audio` (`packages/audio`, Tone.js playback).
- Remove the false "Canvas.tsx refactored to 788 lines" claim and every other **exact line-count citation**. Replace "N-line file" phrasing with role descriptions; where a file is large enough to warrant care, write "large — see `docs/codebase-map.md`".

- [ ] **Step 2: Verify retained sections against code**

For each still-present technical section (testing conventions, provider tree, envelope interaction constants), confirm the referenced symbol/file still exists before keeping it. Delete or correct any that no longer match. Example: `grep -rn "CLICK_THRESHOLD\|ENVELOPE_LINE_FAR_THRESHOLD" packages/components/src | head`.

- [ ] **Step 3: Add a pointer to the codebase map**

Add near the top of CLAUDE.md:
```markdown
## Navigation
Start with **`docs/codebase-map.md`** — the canonical "where does X live" index for this monorepo. Prefer it over hunting through directories.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md to match current tree; drop rot-prone line counts"
```

---

## Task 4: Add `docs/codebase-map.md`

**Files:**
- Create: `docs/codebase-map.md`

**Interfaces:**
- Consumes: structural facts below.
- Produces: the agent "start here" index CLAUDE.md links to. Updated again in Task 12 with the new reducer layout.

- [ ] **Step 1: Write the map**

Create `docs/codebase-map.md` with these sections (fill from the current tree, no line counts):
- **Packages** — core / tokens / components / audio, one line each + published name.
- **Apps** — sandbox / desktop / docs / static-smoke, one line each.
- **Where state lives** — `apps/sandbox/src/contexts/` (TracksContext is the hub; others per project memory). After Task 11, note the `contexts/reducers/` domain split.
- **Where interactions live** — `apps/sandbox/src/hooks/` (drag/trim/stretch/marquee/zoom/pan) and `apps/sandbox/src/hooks/handlers/` (keyboard by domain: clipboard, delete, navigation, playhead-selection, transport).
- **Where rendering happens** — `packages/components/src/Track/TrackNew.tsx`, `ClipBody/ClipBody.tsx`, `apps/sandbox/src/components/Canvas.tsx`.
- **Big-and-scary files (known debt)** — `EditorLayout.tsx`, `App.tsx`, `Canvas.tsx`, `PreferencesModal.tsx` — one line each on what they own and that they are not yet decomposed.
- **Existing deep-dive docs** — point to the relevant files already in `docs/` (accessibility-architecture, keyboard-handlers-map, automation-overlay-states, etc.).

- [ ] **Step 2: Commit**

```bash
git add docs/codebase-map.md
git commit -m "docs: add codebase-map.md navigation index for agents"
```

---

## Task 5: Characterization test harness + baseline domain tests

These tests capture **current** reducer behavior and must stay green through the entire split. They test through the public `tracksReducer` (not internals), so the outer undo wrapper is exercised too.

**Files:**
- Create: `apps/sandbox/src/contexts/__tests__/tracksReducer.characterization.test.ts`

**Interfaces:**
- Consumes: `tracksReducer`, `TracksState`, `Track`, `Clip`, `TracksAction` from `../TracksContext`.
- Produces: a `makeState(overrides?)` helper and a `makeTrack`/`makeClip` factory reused by later tasks; a green baseline suite.

- [ ] **Step 1: Write the harness + one test per domain (all should PASS against current code)**

Model the factories on the existing `clipGrouping.test.ts` pattern. Cover at least one representative action from each domain group so the split can't silently break a domain:

```ts
import { describe, it, expect } from 'vitest';
import { tracksReducer, type Track, type Clip, type TracksState, type TracksAction } from '../TracksContext';

const makeClip = (o: Partial<Clip> = {}): Clip => ({
  id: 1, name: 'c', start: 0, duration: 1, envelopePoints: [], ...o,
} as Clip);

const makeTrack = (o: Partial<Track> = {}): Track => ({
  id: 1, name: 't', clips: [makeClip()], ...o,
} as Track);

// Minimal valid state: spread a real reducer RESET to get every field, then override.
const base = tracksReducer(undefined as unknown as TracksState, { type: 'RESET_STATE' } as TracksAction);
const makeState = (o: Partial<TracksState> = {}): TracksState => ({ ...base, ...o });

describe('tracksReducer characterization (behavior lock for domain split)', () => {
  it('tracks: ADD_TRACK appends a track', () => {
    const s = makeState({ tracks: [] });
    const next = tracksReducer(s, { type: 'ADD_TRACK', payload: makeTrack({ id: 9 }) });
    expect(next.tracks.map(t => t.id)).toEqual([9]);
  });

  it('selection: SELECT_CLIP marks exactly that clip selected', () => {
    const s = makeState({ tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 }), makeClip({ id: 2 })] })] });
    const next = tracksReducer(s, { type: 'SELECT_CLIP', payload: { trackIndex: 0, clipId: 2 } });
    expect(next.tracks[0].clips.find(c => c.id === 2)?.selected).toBe(true);
    expect(next.tracks[0].clips.find(c => c.id === 1)?.selected).toBeFalsy();
  });

  it('clips: UPDATE_CLIP applies a partial update', () => {
    const s = makeState({ tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1, name: 'old' })] })] });
    const next = tracksReducer(s, { type: 'UPDATE_CLIP', payload: { trackIndex: 0, clipId: 1, updates: { name: 'new' } } });
    expect(next.tracks[0].clips[0].name).toBe('new');
  });

  it('envelope: SET_ENVELOPE_MODE toggles the flag', () => {
    const next = tracksReducer(makeState({ envelopeMode: false }), { type: 'SET_ENVELOPE_MODE', payload: true });
    expect(next.envelopeMode).toBe(true);
  });

  it('view: SET_PLAYHEAD_POSITION sets the playhead', () => {
    const next = tracksReducer(makeState(), { type: 'SET_PLAYHEAD_POSITION', payload: 3.5 });
    expect(next.playheadPosition).toBe(3.5);
  });

  it('effects: ADD_MASTER_EFFECT appends to masterEffects', () => {
    const s = makeState({ masterEffects: [] });
    const fx = { id: 'e1' } as unknown as TracksState['masterEffects'][number];
    const next = tracksReducer(s, { type: 'ADD_MASTER_EFFECT', payload: fx });
    expect(next.masterEffects.length).toBe(1);
  });

  it('undo wrapper: a destructive edit then UNDO restores prior tracks', () => {
    const s = makeState({ tracks: [makeTrack({ id: 1, clips: [makeClip({ id: 1 })] })] });
    const added = tracksReducer(s, { type: 'ADD_CLIP', payload: { trackIndex: 0, clip: makeClip({ id: 2 }) } });
    expect(added.tracks[0].clips.map(c => c.id)).toEqual([1, 2]);
    const undone = tracksReducer(added, { type: 'UNDO' });
    expect(undone.tracks[0].clips.map(c => c.id)).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run — expect PASS (characterization locks current behavior)**

Run: `<sandbox-test> run src/contexts/__tests__/tracksReducer.characterization.test.ts`
Expected: all PASS. If `RESET_STATE`-from-undefined throws, replace the `base` construction with a hand-built full `TracksState` literal (copy every field from `initialState` in `TracksContext.tsx:307`) and note it.

- [ ] **Step 3: Commit**

```bash
git add apps/sandbox/src/contexts/__tests__/tracksReducer.characterization.test.ts
git commit -m "test: characterization suite locking tracksReducer domain behavior"
```

---

## Task 6: Add the action→domain routing table + exhaustiveness test

This defines the split's contract before any code moves: every action type maps to exactly one domain.

**Files:**
- Create: `apps/sandbox/src/contexts/reducers/domains.ts`
- Create: `apps/sandbox/src/contexts/__tests__/reducerRouting.test.ts`

**Interfaces:**
- Consumes: `TracksAction` from `../TracksContext`.
- Produces: `type Domain`, `ACTION_DOMAIN: Record<TracksAction['type'], Domain>`, and `DOMAINS: Domain[]`. Later tasks import `ACTION_DOMAIN` to route.

- [ ] **Step 1: Write the routing table**

Create `apps/sandbox/src/contexts/reducers/domains.ts`. Assign **every** action type from the `TracksAction` union (`TracksContext.tsx:214-304`) to one domain. `UNDO`/`REDO`/`RESET_STATE` belong to `history` (handled by the outer wrapper / initial-state reset, not a domain sub-reducer, but still listed for exhaustiveness):

```ts
import type { TracksAction } from '../TracksContext';

export type Domain =
  | 'history' | 'tracks' | 'clips' | 'selection'
  | 'envelope' | 'effects' | 'view' | 'recording' | 'midi';

export const DOMAINS: Domain[] = [
  'history', 'tracks', 'clips', 'selection',
  'envelope', 'effects', 'view', 'recording', 'midi',
];

export const ACTION_DOMAIN: Record<TracksAction['type'], Domain> = {
  RESET_STATE: 'history', UNDO: 'history', REDO: 'history',

  SET_TRACKS: 'tracks', REPLACE_TRACKS_EDIT: 'tracks', ADD_TRACK: 'tracks',
  UPDATE_TRACK: 'tracks', DELETE_TRACK: 'tracks', DELETE_TRACKS: 'tracks',
  MOVE_TRACK: 'tracks', UPDATE_TRACK_HEIGHT: 'tracks', UPDATE_CHANNEL_SPLIT_RATIO: 'tracks',
  UPDATE_TRACK_VIEW: 'tracks', UPDATE_TRACK_RULER_FORMAT: 'tracks',
  UPDATE_TRACK_SPECTROGRAM_SCALE: 'tracks', UPDATE_TRACK_SPECTROGRAM_FREQ: 'tracks',

  ADD_CLIP: 'clips', UPDATE_CLIP: 'clips', DELETE_CLIP: 'clips', MOVE_CLIP: 'clips',
  APPLY_CLIP_PLACEMENT: 'clips', TRIM_CLIP: 'clips', STRETCH_CLIP: 'clips',
  MOVE_SELECTED_CLIPS: 'clips', MOVE_SELECTED_CLIPS_TO_TRACK: 'clips',
  DELETE_TIME_RANGE: 'clips', GROUP_SELECTED_CLIPS: 'clips', UNGROUP_CLIPS: 'clips',
  ADD_LABEL: 'clips', UPDATE_LABEL: 'clips',

  SET_SELECTED_TRACKS: 'selection', SET_FOCUSED_TRACK: 'selection', SELECT_TRACK: 'selection',
  SELECT_CLIP: 'selection', SELECT_CLIPS: 'selection', SELECT_CLIP_RANGE: 'selection',
  TOGGLE_CLIP_SELECTION: 'selection', DESELECT_ALL_CLIPS: 'selection',
  SET_SELECTED_LABELS: 'selection', TOGGLE_LABEL_SELECTION: 'selection',
  SET_HOVERED_POINT: 'selection',

  UPDATE_CLIP_ENVELOPE_POINTS: 'envelope', SET_ENVELOPE_MODE: 'envelope', SET_ENVELOPE_ALT_MODE: 'envelope',

  ADD_TRACK_EFFECT: 'effects', UPDATE_TRACK_EFFECT: 'effects', REMOVE_TRACK_EFFECT: 'effects',
  REORDER_TRACK_EFFECTS: 'effects', TOGGLE_ALL_TRACK_EFFECTS: 'effects',
  SET_MASTER_EFFECTS: 'effects', ADD_MASTER_EFFECT: 'effects', UPDATE_MASTER_EFFECT: 'effects',
  REMOVE_MASTER_EFFECT: 'effects', REORDER_MASTER_EFFECTS: 'effects', TOGGLE_ALL_MASTER_EFFECTS: 'effects',

  SET_SPECTROGRAM_MODE: 'view', SET_SPLIT_MODE: 'view', SET_TIME_SELECTION: 'view',
  SET_PLAYHEAD_POSITION: 'view', SET_CUT_MODE: 'view', SET_CANVAS_SNAP: 'view',

  START_RECORDING: 'recording', STOP_RECORDING: 'recording', UPDATE_RECORDING_METERS: 'recording',

  SET_PIANO_ROLL_OPEN: 'midi', SET_PIANO_ROLL_SNAP: 'midi', SET_PIANO_ROLL_TIME_BASIS: 'midi',
  SET_PIANO_ROLL_PIXELS_PER_SECOND: 'midi', SET_PIANO_ROLL_SCROLL_X: 'midi',
  ADD_MIDI_NOTE: 'midi', DELETE_MIDI_NOTES: 'midi', UPDATE_MIDI_NOTE: 'midi',
  SELECT_MIDI_NOTE: 'midi', SELECT_MIDI_NOTES: 'midi', DESELECT_ALL_MIDI_NOTES: 'midi',
  RESIZE_MIDI_NOTE: 'midi', ADD_MIDI_CLIP: 'midi',
};
```

> Note: the `Record<TracksAction['type'], Domain>` type makes TypeScript fail the build if any action type is missing or misspelled — this is the primary exhaustiveness guard. The test below is the runtime backstop.

- [ ] **Step 2: Write the exhaustiveness test**

Create `apps/sandbox/src/contexts/__tests__/reducerRouting.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ACTION_DOMAIN, DOMAINS } from '../reducers/domains';

describe('reducer routing table', () => {
  it('maps every action to a known domain', () => {
    for (const [type, domain] of Object.entries(ACTION_DOMAIN)) {
      expect(DOMAINS, `action ${type} routed to unknown domain ${domain}`).toContain(domain);
    }
  });
  it('has no duplicate/blank entries', () => {
    for (const [type, domain] of Object.entries(ACTION_DOMAIN)) {
      expect(domain, `action ${type} has empty domain`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 3: Run — expect PASS and a clean typecheck**

Run: `<sandbox-test> run src/contexts/__tests__/reducerRouting.test.ts`
Then: `cd apps/sandbox && npx tsc --noEmit` (or the project's typecheck script) — expect no missing-key errors on `ACTION_DOMAIN`.
Expected: both green. A TS error here means an action type is unassigned — assign it.

- [ ] **Step 4: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/domains.ts apps/sandbox/src/contexts/__tests__/reducerRouting.test.ts
git commit -m "feat: action->domain routing table for reducer split (exhaustive)"
```

---

## Tasks 7–10: Extract each domain sub-reducer (repeat per domain)

Extract domains in this order, one task each, tests green after every task:
**7 = selection, 8 = view + recording, 9 = effects + midi, 10 = tracks + clips + envelope.**
(Order runs low-coupling → high-coupling; clips is last because `APPLY_CLIP_PLACEMENT`/`MOVE_SELECTED_CLIPS` touch the most state.)

Each task follows the **identical mechanical procedure** below. Because case bodies are moved **verbatim**, behavior is preserved; the tests from Tasks 5–6 are the proof.

**Files (per task):**
- Create: `apps/sandbox/src/contexts/reducers/<domain>Reducer.ts`
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx` (`innerReducer` switch only)

**Interfaces:**
- Consumes: `TracksState`, `TracksAction`, and any helpers a moved case uses (e.g. `expandSelectionToGroups`, `MAX_UNDO_HISTORY`, `TRACK_COLOR_PALETTE`). Export helpers from `TracksContext.tsx` as needed rather than duplicating them.
- Produces: `export function <domain>Reducer(state: TracksState, action: TracksAction): TracksState` — a switch over exactly that domain's action types with `default: return state`.

- [ ] **Step 1: Create the domain reducer file**

Move the `case '...':` blocks for this domain (per `ACTION_DOMAIN`) **verbatim** out of `innerReducer` into a new switch. Template (selection shown):

```ts
import type { TracksState, TracksAction } from '../TracksContext';
import { expandSelectionToGroups } from '../TracksContext'; // only what the moved cases use

export function selectionReducer(state: TracksState, action: TracksAction): TracksState {
  switch (action.type) {
    // <-- paste the SELECT_CLIP / SELECT_CLIPS / TOGGLE_CLIP_SELECTION / ... case bodies here, unchanged
    default:
      return state;
  }
}
```

If a moved case references a module-private constant or helper in `TracksContext.tsx` (e.g. `MAX_UNDO_HISTORY`, `TRACK_COLOR_PALETTE`, `clampTrackHeight`), add `export` to that symbol at its definition and import it here. Do not copy-paste the helper body.

- [ ] **Step 2: Delegate from `innerReducer`**

In `TracksContext.tsx`, replace the removed cases with a single delegation guarded by the routing table. Add once near the top of `innerReducer`:

```ts
import { ACTION_DOMAIN } from './reducers/domains';
import { selectionReducer } from './reducers/selectionReducer';
// ...other domain imports as they are created

// inside innerReducer, before the switch:
switch (ACTION_DOMAIN[action.type]) {
  case 'selection': return selectionReducer(state, action);
  // add cases as domains are extracted; un-extracted domains fall through
  // to the existing switch below.
}
```

Keep the original `switch (action.type)` below for not-yet-extracted domains. As each domain task lands, its cases leave the big switch and a `case '<domain>': return <domain>Reducer(...)` is added above. After the final domain task, the original big switch is empty except `history`/`default` and is removed (Task 11).

- [ ] **Step 3: Run the full reducer suite — expect PASS**

Run: `<sandbox-test> run src/contexts/__tests__/`
Expected: `tracksReducer.characterization`, `reducerRouting`, `clipGrouping`, `applyClipPlacement` all PASS. Any red = the move altered behavior; diff the moved case against the original and fix.

- [ ] **Step 4: Typecheck**

Run: `cd apps/sandbox && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/sandbox/src/contexts/reducers/<domain>Reducer.ts apps/sandbox/src/contexts/TracksContext.tsx
git commit -m "refactor(tracks): extract <domain> sub-reducer (no behavior change)"
```

---

## Task 11: Collapse `innerReducer` to pure routing

**Files:**
- Modify: `apps/sandbox/src/contexts/TracksContext.tsx`

**Interfaces:**
- Consumes: all domain reducers + `ACTION_DOMAIN`.
- Produces: an `innerReducer` that is only a routing switch; the outer `tracksReducer` (undo wrapper) is unchanged.

- [ ] **Step 1: Replace the body of `innerReducer` with full routing**

```ts
function innerReducer(state: TracksState, action: TracksAction): TracksState {
  switch (ACTION_DOMAIN[action.type]) {
    case 'tracks':    return tracksDomainReducer(state, action);
    case 'clips':     return clipsReducer(state, action);
    case 'selection': return selectionReducer(state, action);
    case 'envelope':  return envelopeReducer(state, action);
    case 'effects':   return effectsReducer(state, action);
    case 'view':      return viewReducer(state, action);
    case 'recording': return recordingReducer(state, action);
    case 'midi':      return midiReducer(state, action);
    case 'history':   return action.type === 'RESET_STATE' ? initialState : state;
    default:          return state;
  }
}
```

(Confirm the exact exported names match Tasks 7–10. Note `UNDO`/`REDO` never reach here — the outer `tracksReducer` handles them first.)

- [ ] **Step 2: Full sandbox suite + typecheck**

Run: `<sandbox-test> run` then `cd apps/sandbox && npx tsc --noEmit`
Expected: all PASS, clean typecheck.

- [ ] **Step 3: Manual smoke in the running app**

Run the app (`cd apps/sandbox && pnpm dev`) and manually exercise, confirming no regression: add/delete track, drag a clip, trim, stretch, group/ungroup, select clips, toggle envelope mode, undo/redo a drag (verify a single drag = one undo entry — the coalescing path). Note any anomaly before proceeding.

- [ ] **Step 4: Commit**

```bash
git add apps/sandbox/src/contexts/TracksContext.tsx
git commit -m "refactor(tracks): innerReducer is now pure domain routing"
```

---

## Task 12: Document the new reducer structure

**Files:**
- Modify: `docs/codebase-map.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: the final `contexts/reducers/` layout.
- Produces: docs that describe the improved structure (closing the "both together" loop).

- [ ] **Step 1: Update the map**

In `docs/codebase-map.md` "Where state lives", document: `TracksContext.tsx` holds the outer undo/redo wrapper + `TracksProvider`; domain logic lives in `contexts/reducers/<domain>Reducer.ts`; routing is `contexts/reducers/domains.ts`. List the domains.

- [ ] **Step 2: Cross-check CLAUDE.md**

Ensure CLAUDE.md's state-management mention points to the map and to `contexts/reducers/`. No line counts.

- [ ] **Step 3: Commit**

```bash
git add docs/codebase-map.md CLAUDE.md
git commit -m "docs: document contexts/reducers domain split"
```

---

## Self-Review notes (author)

- **Spec coverage:** A1(CLAUDE)→T3, A2(map)→T4/T12, A3(astro+workspace)→T1, A4(prune docs)→T2, B1(tests-first)→T5, B2(sub-reducers)→T6–T11, B3(green+smoke)→T11, B4(document)→T12. All spec items mapped.
- **Behavior lock:** verbatim case moves + Task 5/6 suites green after every extraction; undo wrapper never touched.
- **Type guard:** `Record<TracksAction['type'], Domain>` fails the build on any unassigned action — exhaustiveness enforced by the compiler, not just the test.
- **Open item for executor:** Task 2 may surface an **uncertain** doc; leave it and flag to the user rather than deleting.
