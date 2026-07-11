# Integration Test Net + Test CI — Design

**Date:** 2026-07-11
**Status:** Approved (user, 2026-07-11)
**Motivation:** All coverage added by the fable5-finalize refactor is unit-level. Nothing renders App or Canvas end-to-end, so cross-seam regressions (hook ordering, provider nesting, context wiring, handler-bundle composition) are caught only by manual verification. Additionally, no CI workflow runs tests at all — `.github/workflows/` contains deploy/release only.

**Sequencing:** This net ships first. EditorLayout decomposition (2170 lines, never examined) is a SEPARATE follow-up spec, executed under this net.

## Goals

1. jsdom integration tests that render the real component tree — full provider stack down — and assert cross-seam behavior against the real reducer and real DOM.
2. A GitHub Actions test workflow enforcing the same gates CLAUDE.md prescribes for agents.

## Non-Goals

- Canvas pixel output verification (jsdom cannot paint; stays visual/manual).
- Real audio playback verification (human ear-check; the audio boundary is mocked).
- Real-browser E2E (Playwright) — considered and deferred.
- Any product-code change. The app must not know it is being tested.
- EditorLayout/App/CanvasTrackList decomposition (next spec).

## Architecture

### 1. Integration harness — `apps/sandbox/src/__tests__/integrationHarness.tsx`

The single place fakes live:

- **Audio boundary:** `vi.mock('@audacity-ui/audio')` replacing `AudioPlaybackManager` and `RecordingManager` with spy-method stubs (class instances whose methods are `vi.fn()`; no Tone.js import, no getUserMedia). The stub surface is derived from what the sandbox actually calls (setLoopEnabled, setLoopRegion, setMasterVolume, play/stop/loadClips, etc. — enumerate from usage at implementation time).
- **IndexedDB:** `fake-indexeddb` (new devDependency, apps/sandbox only) registered in setup so Dexie/`projectDatabase.ts` runs its REAL code against an in-memory store. The DB layer is deliberately not mocked.
- **jsdom gaps:** stubs for `ResizeObserver`, `matchMedia`, `Element.prototype.scrollTo`/`scrollIntoView` as needed (added incrementally when a render demands them; canvas 2D context is already stubbed by the existing setup pattern).
- **Exports:**
  - `renderApp()` — renders the full `ThemedApp` tree (PreferencesProvider → ThemeProvider → … → CanvasDemoContent) and returns testing-library handles plus the audio-stub spies.
  - `renderCanvas(tracks: Track[])` — renders `Canvas` inside a real `TracksProvider` (seeded via initial state or dispatch) + SpectralSelection/Accessibility/Theme providers, with minimal required props. Returns handles + `getState`-style access via DOM assertions (state is asserted through rendered DOM, not by reaching into the store).

Test-file conventions follow CLAUDE.md: `afterEach(cleanup)`, container-scoped queries, `fireEvent`, `act()` for focus, real profile id `'au4-tab-groups'`.

### 2. App seam suite — `apps/sandbox/src/__tests__/App.integration.test.tsx`

Renders via `renderApp()`. Asserts (each maps to a refactor seam):

| Test | Seam covered |
|---|---|
| App mounts and renders chrome (toolbar, timeline, track panel) without crashing | Whole hook-order chain (recordingManagerRef → usePlaybackControls → useRecording → useLoopRegion → useKeyboardShortcuts; useCanvasScrollSync after useZoomControls) + provider nesting |
| Cmd+, opens the preferences modal; all nav pages render | Modal page split (Phase 4) |
| Switching theme to dark re-themes the tree (assert a themed element's class/style changes) and persists to localStorage | Appearance slice + ThemedApp gate + persistence blob |
| Loop toggle creates the default region (assert timeline loop band / audio stub `setLoopRegion` called with 0..8s) | LoopRegionContext value-provider + consumers |
| Transport toolbar renders docked-top, docked-bottom, and floating (drive `toolbarPosition` via gripper interaction or exposed control) | TransportToolbarContainer 3-slot seam + useDraggableToolbar |

Failure-mode fallback (explicit): if full-App render proves unstable in jsdom despite the harness, the suite renders from `CanvasDemoContent` down with a stubbed `PlaybackProvider value` — losing only the top-of-tree seam. The implementation plan must record which mode shipped.

### 3. Canvas seam suite — `apps/sandbox/src/__tests__/Canvas.integration.test.tsx`

Renders via `renderCanvas(seededTracks)` with 2–3 tracks / 3–4 clips. Asserts real reducer + DOM outcomes:

| Test | Seam covered |
|---|---|
| Click a clip → clip shows selected state in DOM; body click → deselects | useCanvasPointerHandlers onClick + useClipMouseDown + reducer |
| Shift+Click after a selection → time-selection extends, scoped to the gesture's rows | Shift+Click-on-click ordering hazard + timeSelection scope stamping |
| ArrowDown on focused track → focus moves to next track | useTrackKeyboardHandlers navigate |
| Cmd+ArrowDown → track order changes; releasing Meta dispatches overlap resolution (assert via resulting clip attributes) | useTrackKeyboardHandlers reorder + useCmdArrowMove keyup seam + pendingClipMoveResolution singleton |
| Keyboard trim (per current keybinding) → clip duration attribute shrinks by the step | clipKeyboardEdit utils wired through CanvasTrackList |
| Tab on a clip → focus moves to next clip (roving) | TrackNew Tab-stepping + container tab group under 'au4-tab-groups' |

Assertions are on rendered DOM (`data-*` attributes, styles, focus) — never `expect(mockFn).toHaveBeenCalled()` as the primary assertion (audio-stub spies are allowed as SECONDARY evidence, e.g. setLoopRegion args).

### 4. Test CI — `.github/workflows/test.yml`

On `push` (master) and `pull_request`:
1. checkout, pnpm setup (version pinned to match `packageManager`/lockfile-less install: `pnpm install --no-frozen-lockfile` since pnpm-lock.yaml is gitignored), Node LTS
2. `pnpm build` (all packages)
3. `npx tsc --noEmit` in `packages/components` and `apps/sandbox`
4. `pnpm --filter @dilsonspickles/components test` and `pnpm --filter @audacity-ui/sandbox test`
5. `node scripts/check-any.mjs`

Single job, ~2–4 min. No coverage-thresholds or matrix builds (YAGNI).

## Error handling / flakiness policy

- No arbitrary timeouts: async assertions use testing-library `findBy*`/`waitFor` on conditions.
- Tests must pass in isolation and with the full suite (React 19 + jsdom cleanup caveats per CLAUDE.md).
- If a seam test cannot be made deterministic in jsdom, it is dropped with a comment naming the manual check that replaces it — a flaky net is worse than a smaller net.

## Testing the tests

Each suite lands with a deliberate sabotage check during development (e.g. temporarily reorder an App hook, or break the provider nesting) to prove the net actually catches the class of regression it claims to — evidence recorded in the implementation report, sabotage reverted before commit.

## Dependencies

- `fake-indexeddb` (devDependency, apps/sandbox).
- No other new dependencies.

## Acceptance

- Both suites green locally and in CI; existing 290+75 tests unaffected.
- CI workflow red on a deliberately broken PR (verified once via the sabotage check locally).
- CLAUDE.md gates section gains the CI note; codebase-map gains the harness/suites entries.
