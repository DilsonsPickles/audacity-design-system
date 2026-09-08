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

### Dark mode unfinished for dialog/marketplace surfaces (hardcoded light backgrounds)
Several components render light backgrounds in dark mode because they hardcode `#ffffff`/`white` in CSS with no theme wiring at all (this app themes by injecting CSS-variable values from `useTheme()`; a literal is a theming gap). Found by scanning the live dark-mode DOM for opaque-white backgrounds. Confirmed white-in-dark-mode:
- **PreferencesModal** — the whole modal body renders light (`.preferences-modal__body` bg ≈ `#EBEDF0`); `PreferencesModal.css:268` (`.shortcuts-table__body`) is `#ffffff`.
- **Shortcuts table** — `ShortcutTableRow.css:5` (`.shortcut-table-row`) `#ffffff` rows.
- **Plugins marketplace** — `PluginCard.css:7` `#ffffff` cards (Home Plugins page + Get-effects modal); `PluginBrowserDialog.css:33` `#ffffff` sidebar; the surrounding page content area is also un-themed light-grey, not just the pure-white cards.
- **NumberStepper** — `NumberStepper.css:4` `background-color: white`. Deliberately NOT fixed standalone: it lives almost entirely inside the above still-light dialogs, so theming it alone (dark control on a light modal) clashes. Fix it AS PART OF theming those dialogs so the whole surface flips together. The one-line fix is `--number-stepper-bg: theme.background.control.input.idle` injected in `NumberStepper.tsx` + `background-color: var(--number-stepper-bg, white)` in the CSS (light value is `#FFFFFF`, so light/website is unchanged) — apply it when the dialogs are themed.

Pattern to reuse (already applied to Button/Dropdown/SearchField): source backgrounds from `theme.background.control.input.idle` (or an appropriate `surface` token), whose light value stays `#FFFFFF` so light mode / the website is unchanged. NOT bugs — leave alone: white 1px indicator lines (`PlayheadCursor.css`, `VerticalRulerPanel.css:158`, `PianoRollPanel.tsx:318`), which are white in both themes by design. Design-check (low priority): label `:hover` states hardcode `background: white` (`PointLabel`/`RegionLabel`/`LabelMarker`) though their base is themed. `TabList.css:8` is white but the component has no app importers (dead/demo).

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

### Deprecate the combined MacroManager modal
The sandbox now uses the dockable `MacrosPanel` + floating `MacroEditorDialog` (2026-09-07);
`MacroManager` stays exported from `@audacity-ui/components` only for package consumers.
Decide whether to mark it deprecated / remove it in the next breaking release.
Related nits while it lives: its "run on files" affordance reuses the `save` icon — the
design wants a folder glyph, which means adding a `folder` codepoint to `Icon`'s `ICON_MAP`.

### Spectral view of long imported/recorded clips is decimated data (2026-09-08)
Import and recording-complete now store decimated peak/RMS display arrays
(`apps/sandbox/src/utils/clipWaveforms.ts`, capped at 65,536 values/channel)
instead of full-rate samples — this is what fixed the large-import freeze and
the ~424 MB state payload. Consequence: the spectrogram/split view FFTs those
arrays, so for clips longer than ~1.5 s (where decimation kicks in) it renders
from decimated data — increasingly wrong as clips get longer. The decoded
AudioBuffer is still retained by AudioPlaybackManager; the proper fix is to
render spectrograms from it on demand. Short clips and the demo content are
unaffected (full rate below the cap).

### Debounce loadClips on rapid tracks changes (2026-09-08)
usePlaybackControls reloads all Tone players on every tracks change while
stopped. Envelope drags (EnvelopeInteractionLayer) and clip drags dispatch
per mousemove, so a drag re-copies every clip buffer per event — and with
envelope baking (packages/audio/src/envelopeGain.ts) enveloped clips now
also re-bake per event. Pre-existing cost, roughly doubled for enveloped
clips. Fix: debounce the reload effect (~150 ms), being careful that
handlePlay no longer reloads on play — a pending debounce must flush
before play() so fresh edits are audible.

## Minor (batch into related work, don't do standalone)

- `stretchFactor` onto the sandbox `Clip` type — would remove 2 justified `as any` casts in `utils/clipKeyboardEdit.ts` (plain `as Clip` does NOT typecheck today).
- Relocate `CanvasProps` out of Canvas.tsx (type-only import cycle with `useCanvasPointerHandlers`).
- `components/editor/LoopRegionStalks.tsx` — inactive-color ternary branch is unreachable (both call sites gate on enabled).
- `components/editor/PunchPointIndicator.tsx` — hard-coded `#FF2672`; fold into any design-token sweep.
- GitHub workflows pin `node-version: '20'` (deprecated on runners, forced to 24) — bump repo-wide (test/deploy/release) in one pass.
- `resetPreferences` + full-blob `usePreferences` context value are recreated per render (pre-existing; matters only if modal re-renders ever get audited).
