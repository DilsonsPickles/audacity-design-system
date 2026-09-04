# Integration Test Net + Test CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** jsdom integration suites that render the real App and Canvas trees and assert cross-seam behavior, plus a GitHub Actions workflow enforcing the repo gates.

**Architecture:** One harness module owns all fakes (audio boundary mocked, IndexedDB faked with real Dexie code running, jsdom gaps stubbed); two test suites assert seams against the real reducer and real DOM; one CI workflow runs the CLAUDE.md gates. Zero product-code changes.

**Tech Stack:** Vitest 4 + jsdom + @testing-library/react 16, fake-indexeddb, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-11-integration-net-design.md` — its seam tables, flakiness policy, and sabotage requirement bind every task.

## Global Constraints

- **Zero product-code changes.** If a test cannot pass without touching `src` outside `__tests__`, STOP and report — that is a finding, not a fix.
- **CLAUDE.md test rules bind:** `afterEach(cleanup)`; container-scoped queries; `fireEvent` (not userEvent); `act()` for focus; profile id `'au4-tab-groups'`; tests independent.
- **Assertions target rendered DOM / real reducer outcomes.** Audio-stub spies are secondary evidence only (e.g. `setLoopRegion(0, 8)` args).
- **No arbitrary timeouts** — `findBy*`/`waitFor` on conditions. A seam test that cannot be made deterministic is dropped with a comment naming the replacement manual check.
- **Sabotage evidence required** per suite (break the seam, watch the test fail, revert) — recorded in the task report, never committed.
- **Gates after every task:** `pnpm --filter @audacity-ui/sandbox test` (all green, no skips — 290 baseline plus this plan's new tests), `pnpm --filter @audacity-ui/components test` (75), `npx tsc --noEmit` clean in apps/sandbox, `node scripts/check-any.mjs` 0.
- Line numbers are hints; locate by identifier.

---

### Task 1: Integration harness + boot test

**Files:**
- Modify: `apps/sandbox/package.json` (add `fake-indexeddb` devDependency; run `pnpm install`)
- Create: `apps/sandbox/src/__tests__/integrationHarness.tsx`
- Create: `apps/sandbox/src/__tests__/App.integration.test.tsx` (boot test only in this task)

**Interfaces (Produces — Tasks 2–3 consume):**
```ts
export function audioMockFactory(): Record<string, unknown>; // for vi.mock('@audacity-ui/audio', audioMockFactory) in each test file
export function installJsdomStubs(): void;                   // ResizeObserver, matchMedia, scrollTo/scrollIntoView, etc.
export function renderApp(): RenderResult & { audioSpies: AudioSpies };
export function renderCanvas(tracks: Track[]): RenderResult;
```

- [ ] **Step 1: Add fake-indexeddb.** `pnpm --filter @audacity-ui/sandbox add -D fake-indexeddb`; harness imports `'fake-indexeddb/auto'` (harness-only — do not add to the global setup file, unit tests must be unaffected).
- [ ] **Step 2: Build the audio mock.** `vi.mock('@audacity-ui/audio')` cannot live inside the harness (vitest hoists per test file) — export a factory from the harness and have each integration test file call `vi.mock('@audacity-ui/audio', () => audioMockFactory())` at top. Stub classes: use a self-populating spy object so the surface can't drift: methods appear as `vi.fn()` on first access (`get: (t, p) => (t[p] ??= vi.fn())` Proxy or equivalent), with any REQUIRED return values (grep `audioManagerRef.current.` and `recordingManagerRef.current.` across apps/sandbox/src to find calls whose return values are consumed — e.g. anything used in arithmetic or conditionals must return a sane primitive, not a vi.fn()). Enumerate those in a plain object over the Proxy base.
- [ ] **Step 3: jsdom stubs.** Add `installJsdomStubs()` covering ResizeObserver + matchMedia minimally; extend ONLY when a render error demands it (record each addition + the error that forced it in the report).
- [ ] **Step 4: renderApp().** Import the default export of `apps/sandbox/src/App.tsx` and render it (default URL path → PreferencesProvider → ThemedApp). Clear localStorage in the harness per-test (preferences blob bleeds otherwise). Return testing-library handles + the audio spies.
- [ ] **Step 5: Boot test (the risky step — do it before writing more).**
```tsx
it('boots: renders project chrome without crashing', async () => {
  const { container, findByLabelText } = renderApp();
  await findByLabelText('Play');            // transport toolbar mounted
  expect(container.querySelector('.timeline-ruler, [class*="timeline"]')).toBeTruthy();
});
```
Adjust selectors to reality (aria-labels confirmed to exist: "Play", "Stop", "Track menu"). Navigating Home→Project may be required first (the app boots on Home) — drive it via the real "Project" button click, `fireEvent`.
- [ ] **Step 6: FALLBACK DECISION POINT.** If full-App render cannot boot cleanly after reasonable stub additions, switch to the spec's sanctioned fallback: render from `CanvasDemoContent` down with a stubbed `PlaybackProvider value` — and say so in the report (the plan's remaining tasks adapt). Do not burn more than ~5 stub-iterations before deciding.
- [ ] **Step 7: renderCanvas(tracks).** Render `Canvas` inside real `TracksProvider` + `SpectralSelectionProvider` + `AccessibilityProfileProvider initialProfileId="au4-tab-groups"` + `ThemeProvider` + `PreferencesProvider`, minimal required props (read `CanvasProps` — most have defaults; pass `pixelsPerSecond`, `onTimeSelectionMenuClick` no-ops etc. as needed). Seeding: check whether `TracksProvider` accepts initial state; if not, a `SeedTracks` child component dispatching `SET_TRACKS` in a `useEffect` once, then rendering children. Include a smoke assertion (clips appear as `[data-clip-id]`).
- [ ] **Step 8: Gates + commit** — `test(sandbox): integration harness + app boot test`.

### Task 2: App seam suite

**Files:**
- Modify: `apps/sandbox/src/__tests__/App.integration.test.tsx`

**Consumes:** `renderApp()`, audio spies.

- [ ] **Step 1: Implement the spec's App seam table** (5 tests; boot test from Task 1 counts as #1):
  - Preferences: `fireEvent.keyDown(document, { key: ',', metaKey: true })` → modal appears; click through nav tabs; each real page renders (assert one control per page; Music/Advanced render empty — assert the DOCUMENTED quirk, don't fight it).
  - Theme: switch to Dark via the Appearance page radio → assert a themed element's computed style/class changes AND `JSON.parse(localStorage.getItem('audacity-preferences')).theme === 'dark'`.
  - Loop: toggle Loop (aria-label "Loop") → `audioSpies` saw `setLoopEnabled(true)` and `setLoopRegion(0, 8)` (secondary), and the timeline shows the loop band (primary — locate its DOM signature).
  - Toolbar positions: drive `handleToolbarGripperMouseDown` via mousedown on the gripper + document mousemove/mouseup to each zone (top/bottom/floating) → assert the toolbar container's position style/class per zone. If the gripper drag proves jsdom-hostile (getBoundingClientRect zeros), drop to the spec's flakiness policy: name the manual check in a comment and cover only the default slot.
- [ ] **Step 2: Sabotage check (report-only):** temporarily swap two hooks in the App.tsx chain (e.g. move `useLoopRegion` above `usePlaybackControls`) → boot test must fail; revert. Record the failure output in the report.
- [ ] **Step 3: Gates + commit** — `test(sandbox): App integration seam suite`.

### Task 3: Canvas seam suite

**Files:**
- Create: `apps/sandbox/src/__tests__/Canvas.integration.test.tsx`

**Consumes:** `renderCanvas(tracks)`.

- [ ] **Step 1: Implement the spec's Canvas seam table** (6 tests). Seeds: 3 tracks, clips with known ids/times. Key mechanics:
  - Selection: `fireEvent.click` on `[data-clip-id="1"]` → selected state in DOM (find the attribute/class TrackNew renders for selection — read the source first); body click deselects.
  - Shift+Click: establish a selection (keyboard or click), then `fireEvent.click(target, { shiftKey: true })` on the container at a computed coordinate — jsdom has no layout, so coordinates come from the handler's own math: pass `clientX/clientY` consistent with `pixelsPerSecond` and the mocked `getBoundingClientRect` (stub `getBoundingClientRect` on the container to a fixed rect in the harness). Assert time-selection state via its DOM signature (overlay/selected band or the data the reducer renders).
  - Keyboard nav/reorder: focus track element (`act(() => el.focus())`), `fireEvent.keyDown(el, { key: 'ArrowDown' })` → focus moved; `{ key: 'ArrowDown', metaKey: true }` → track order changed in DOM; `fireEvent.keyUp(document, { key: 'Meta' })` → overlap-resolution dispatch observable (seed overlapping clips so resolution visibly trims one — assert the trimmed duration attribute).
  - Keyboard trim: read the current keybinding from TrackNew/CanvasTrackList source; fire it on a focused clip; assert the clip's width/duration DOM change.
  - Tab roving: from clip 1, `fireEvent.keyDown(clip, { key: 'Tab' })` → `document.activeElement` is clip 2 (mirrors the pattern in TrackNew.test.tsx).
- [ ] **Step 2: Sabotage check (report-only):** temporarily break `pendingClipMoveResolution` sharing (point `useCmdArrowMove` at a fresh local ref) → the Cmd+Arrow test must fail; revert. Record output.
- [ ] **Step 3: Gates + commit** — `test(sandbox): Canvas integration seam suite`.

### Task 4: Test CI + docs

**Files:**
- Create: `.github/workflows/test.yml`
- Modify: `CLAUDE.md` (gates section: note CI enforces them)
- Modify: `docs/codebase-map.md` (harness + suites entries)

- [ ] **Step 1: Workflow** — single job on push to master + pull_request: actions/checkout; pnpm/action-setup (read pnpm version from existing workflows in `.github/workflows/` to stay consistent — copy their setup steps); node LTS; `pnpm install --no-frozen-lockfile` (lockfile is gitignored — mirror whatever the existing deploy workflow does); `pnpm build`; `npx tsc --noEmit` in `packages/components` and `apps/sandbox`; both package test suites; `node scripts/check-any.mjs`.
- [ ] **Step 2: Docs** — CLAUDE.md gates subsection gains one line ("CI runs these same gates on every push/PR — `.github/workflows/test.yml`"); codebase-map gains the harness + integration suites under testing.
- [ ] **Step 3: Gates + commit** — `ci: test workflow running repo gates on push/PR` (+ docs in same or separate commit).
- [ ] **Step 4: CI proof.** After merge/push the controller verifies the workflow actually runs green on GitHub (implementer can only lint the YAML locally — note this handoff in the report).

---

## Final verification

- [ ] Full local gates; new suite counts reported (expect ~300+ sandbox)
- [ ] Both sabotage evidences present in reports
- [ ] Whole-branch review (fable), then finishing-a-development-branch
