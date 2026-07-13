# Backlog — known follow-ups

Self-contained work items discovered during the agent-readiness campaigns (2026-07). Each is scoped so an agent can pick it up with no other context. None are blockers; the baseline is fully green with these in place. Delete entries when done.

## Bugs (confirmed, preserved-not-fixed during refactors)

### Cursor-time readout wrong at non-default zoom
`apps/sandbox/src/components/EditorLayout.tsx` — the canvas scroll-container's `onMouseMove` (locate by the `/100` divisor, near `setMouseCursorPosition`) computes mouse cursor time with a hard-coded 100 px/s divisor; every other site uses the live `pixelsPerSecond`. The status-bar cursor time is wrong at any other zoom. Verify by zooming and comparing the readout against the ruler; fix to use `pixelsPerSecond`; add a covering assertion via the integration harness (`apps/sandbox/src/__tests__/`).

### Async race in createNewProject
`createNewProject` (follow from App.tsx's new-project boot path) performs an async IndexedDB write + `RESET_STATE` dispatch that can land AFTER subsequent dispatches, clobbering them. Observed while writing `EditorLayout.integration.test.tsx`, which carries bounded retry/settle helpers as a test-side workaround. Fix the ordering in product code, then remove the test workaround to prove it.

### Broken default accessibility profile id
`packages/components/src/contexts/AccessibilityProfileContext.tsx` defaults `initialProfileId = 'au4'` — no such profile exists (real ids: `'au4-tab-groups'`, `'wcag-flat'` in `packages/core/src/accessibility/profiles.ts`), so bare providers silently fall back to flat navigation. This exact footgun broke the TrackNew tests for months. Decide the true default (likely `'au4-tab-groups'`), change it, consider a console.warn on unknown-id fallback, and check `apps/docs/.storybook/preview.tsx` + other bare provider usages for behavior changes.

### Invalid controlPointStyle default in Canvas
`apps/sandbox/src/components/Canvas.tsx` — the `controlPointStyle` default value is not a valid `ENVELOPE_POINT_STYLES` key (discovered building the integration harness, which works around it). Fix the default to a real key; check what envelope point rendering silently does with the invalid value today.

## Decisions needed (product/architecture)

### Unify the two missing-plugins scans?
The watcher effect uses `apps/sandbox/src/utils/findMissingEffects.ts` (id-based, includes masterEffects, installed-aware, sorted). The project-open path in `apps/sandbox/src/hooks/useProjectLifecycle.ts` carries an inline scan with DIFFERENT semantics (lowercased-name matching, no installed check, skips masterEffects, signed-out-gated, unsorted). Deliberately not unified during refactoring (behavior-preserving). Decide which semantics the open path should have, implement, and add a covering test.

### React 18/19 split
`apps/sandbox` ships react ^18.3.1 while `packages/components` dev-deps react ^19 and docs say "React 19" repo-wide. Two physical React copies are held together by a `resolve.alias` in `apps/sandbox/vitest.config.ts` (see its comment). Pick one version (19 likely intended), align deps + docs, and remove or keep the alias accordingly. Full suite + manual smoke after.

### Dead label-keyboard code
`apps/sandbox/src/` — `useLabelKeyboardHandling.ts` and `LabelMarker.tsx` (Cmd+Arrow label move, Shift+Arrow label trim) are never imported; the active path is `LabelRenderer.tsx`. Check git history for intent, then either wire them in or delete. Related dead code: an unused local duplicate `AudioPlaybackManager` class + `getAudioPlaybackManager()` in `apps/sandbox/src/utils/audioPlayback.ts` (~line 400, never imported).

## Refactor tail

### Extract EditorLayout's remaining handler clusters
Final review of the EditorLayout decomposition (spec: `docs/superpowers/specs/2026-07-11-editor-layout-decomposition-design.md`) adjudicated the remaining 1178 lines as ~80% composition-root glue plus three extractable clusters no task scoped: (1) Canvas focus-routing callbacks (`onContainerEnter`/`onShiftTabFromTrack`/`onTabFromLastClip`) → `useCanvasFocusRouting`; (2) VerticalRulerPanel callbacks incl. two scroll-sync math blocks → `useVerticalRulerPanelHandlers`; (3) MarketplaceModal/EffectPicker handler block → container component. Same discipline: verbatim moves under the existing characterization net (the 5 focus-routing integration tests must stay green). Cheap riders: rewrite the stale exploratory comment in `components/editor/EditorBottomDrawer.tsx` (~84–92) to describe the actual `close-mixer-panel` CustomEvent contract; have `hooks/handlers/trackCreationHandlers.ts` (Cmd+T) adopt `utils/trackManagement.ts` to kill its near-duplicate id/name allocation.

## Minor (batch into related work, don't do standalone)

- `stretchFactor` onto the sandbox `Clip` type — would remove 2 justified `as any` casts in `utils/clipKeyboardEdit.ts` (plain `as Clip` does NOT typecheck today).
- Relocate `CanvasProps` out of Canvas.tsx (type-only import cycle with `useCanvasPointerHandlers`).
- `components/editor/LoopRegionStalks.tsx` — inactive-color ternary branch is unreachable (both call sites gate on enabled).
- `components/editor/PunchPointIndicator.tsx` — hard-coded `#FF2672`; fold into any design-token sweep.
- GitHub workflows pin `node-version: '20'` (deprecated on runners, forced to 24) — bump repo-wide (test/deploy/release) in one pass.
- `resetPreferences` + full-blob `usePreferences` context value are recreated per render (pre-existing; matters only if modal re-renders ever get audited).
