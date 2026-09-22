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

### Retire the legacy macro surfaces (MacroManager AND MacroEditorDialog)
The sandbox now uses the dockable `MacrosPanel` + `MacroBuilderDialog` (the Figma-spec
Edit-macro window, 2026-09-16). TWO generations are now dead code paths kept only as
exports: `MacroManager` (the combined modal, superseded 2026-09-07) and
`MacroEditorDialog` (the card-list editor, superseded by the builder). Once the builder
is considered final: remove both, and MOVE `EditStepDialog` out of
`MacroEditorDialog.tsx` first — the builder imports it as its schema-less parameters
fallback. `SelectCommandDialog` also loses its last sandbox consumer with
MacroEditorDialog (the builder's search is inline).

### Macro builder — parked design decisions (2026-09-16)
Loose threads from the builder iteration, each awaiting a product call:
- **Drag-to-insert between steps** — drag a command from the list directly into a
  position in the step table (gaps/connectors as drop targets, Shortcuts-style).
  Today every add appends. The one interaction idea deliberately shelved.
- **No confirmation on destructive actions** — "Remove all steps" and "Delete macro"
  act immediately (consistent with each other). Decide whether both should confirm.
- **Splitter width isn't persisted** — resets to the spec's 322px whenever the
  builder opens.
- **Step table keyboard nav** — command list has full ↑/↓/Enter flow; step rows only
  Tab + Enter-to-edit. Add arrow walking for symmetry if desired.
- **Figma drift to reconcile in the file** — code decisions the spec doesn't show:
  fixed-width category dropdown (124px vs hug-content — width jumping was rejected),
  accent selection tint `rgba(103,124,228,0.25)` (vs the file's grey ghost-hover
  pill), gutter-only-when-scrollable, and the steps well `#f4f4f6` (eyeballed from a
  mockup, not a token — pin it once the file names one).

### Labels — strap colours pending (labels-rewrite)
The dev-handoff spec for the lighter strap is `blendColors(white_color, clipColor, 0.5)`
(sandbox: `color-mix(in srgb, clipColor 50%, white)`) with hover 0.7 / selected 0.3.
Alexander intends to supply updated strap colours; when they arrive they slot into
`labelPalette()` in `apps/sandbox/src/components/labels/LabelItem.tsx` as new mix
percentages (or explicit hexes) against `BUILD_LABEL_COLORS`.

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

### Panel windowing — polish tail (2026-09-17)
The panel system (docked left/right/bottom vs frameless OS popout, drag-to-dock with
zone highlights, tab tear-off straight into the popout) landed on `labels-rewrite`.
Remaining polish, none blocking:
- **Bottom-drawer Macros tab tear-off** — the drawer's PanelHeader doesn't wire
  `onTabTearOff` yet; docks do.
- **Popout position/size persistence** — a reopened popout gets the default
  placement; stash its last screen bounds and feed them back as window.open
  left/top/width/height.
- **Popout chrome theming** — PopoutPanel's header/shell hard-codes light-theme
  hexes; switch to theme tokens when dark mode reaches the popouts.
- **Dialogs from popout content open in the MAIN window** (effect dialogs, context
  menus are portaled to the main document) — known cross-document portal
  limitation; revisit if it grates in practice.

### Clip crossfades v1 — parked follow-ups (2026-09-21)
Overlap-based crossfades landed (edge fades only; containment = z-order occlusion,
hard cuts). Deliberately deferred, waiting on live feel / product calls:
- **Overlap legibility** — the top clip fully covers the bottom one outside the X
  veil; candidate treatments: ghost the buried waveform, translucent top clip in
  the shared region, header stacking polish.
- **Curve options** — equal-power only, no UI. A per-overlap curve choice (linear/
  S) would be the feature's first stored state; deferred on purpose.
- **Plain fade-in/out handles** on a lone clip's corners — same primitive, no
  neighbour; gesture surface not designed yet.
- **Send to back / bring to front** context-menu mirror for z-order (today only
  moving a clip raises it).
- **Snap-target policy under overlap** — every clip edge is still a snap target,
  including buried interior edges; may want topmost-visible-only.
- **Tie-breaks** in "next clip" logic (post-delete focus, vertical navigation)
  when clips share a start time — arbitrary today, harmless.
- **MIDI clips** — overlap rules apply to audio clips only; midiClips were left
  alone (positional pianoRollClipIndex).
- **stretchFactor** — fade bake maps source time without stretch compensation,
  same as the envelope bake (parity kept deliberately).

### Track folders v1 — deferred tail (2026-09-21)
Organisational folders landed (flat array, `type: 'folder'` + `folderId`,
collapse = derived zero height, mute/solo cascade, family drag, delete =
ungroup). Deliberately deferred:
- **Marquee selection** (`useMarqueeSelection`) still uses raw heights —
  band-select across a collapsed folder may pick hidden tracks' clips.
- **Fit/expand/collapse-all track heights** (`trackManagement.computeFitTrackHeight`,
  EditorLayout 401-416) divide by ALL tracks — should use visible non-folder rows.
- **Folder duplication** (`buildDuplicatedTracks`) — duplicating a folder row
  doesn't deep-copy children; refuse or implement properly.
- **AddTrackFlyout** has no Folder entry (creation is select→Group only);
  no `folder` icon in the icon font.
- **Track kebab menu** has no Ungroup/Collapse items (chevron + delete-as-
  ungroup cover it).
- **Drop semantics are "insert at the row you hit"** — there is no
  lower-half "insert after" zone, so dropping between a group's last
  child and the next plain track can't be expressed; drop above a row
  or onto the folder header instead. (A drop INDICATOR now previews the
  landing, indented when it would join a group.)
- **The canvas parts but carries no ghost** — the dragged row's
  waveform isn't shown floating over the canvas, only over the panel
  column.
- **The reflow doesn't animate** — rows jump to their parted positions
  rather than easing (a transform-based transition would need the rows
  to be positioned rather than in flow).
- **A lifted row must stay MOUNTED** (`display: none`, not removed):
  the dragged panel owns the gesture's document listeners, so
  unmounting it mid-drag swallows the mouseup and the drop never
  commits. Any future refactor of that list must preserve this.
- **Membership on multi-track drags**: only the dragged row re-parents
  (multi-select drag-reorder isn't wired in the panel column).
- **Solo is still visual-only in playback** (pre-existing:
  `applyTrackGains` ignores `soloed`); folder-solo cascades visually but
  not audibly until that gap is fixed. Mixdown applies no mute/solo at all.
- **Clip drag onto a folder's slim canvas band** falls through to no
  target (deliberate); dropping INTO a folder should re-parent one day.
- ~~packages/core coordinates.ts duplicate y-math~~ — it was NOT dead
  (`useTimeSelection` imports `yToTrackIndex`); it is now the CANONICAL
  folder-aware rule that the other two layers delegate to.

## Minor (batch into related work, don't do standalone)


- `stretchFactor` onto the sandbox `Clip` type — would remove 2 justified `as any` casts in `utils/clipKeyboardEdit.ts` (plain `as Clip` does NOT typecheck today).
- Relocate `CanvasProps` out of Canvas.tsx (type-only import cycle with `useCanvasPointerHandlers`).
- `components/editor/LoopRegionStalks.tsx` — inactive-color ternary branch is unreachable (both call sites gate on enabled).
- `components/editor/PunchPointIndicator.tsx` — hard-coded `#FF2672`; fold into any design-token sweep.
- GitHub workflows pin `node-version: '20'` (deprecated on runners, forced to 24) — bump repo-wide (test/deploy/release) in one pass.
- `resetPreferences` + full-blob `usePreferences` context value are recreated per render (pre-existing; matters only if modal re-renders ever get audited).
