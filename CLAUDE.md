# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Navigation

Start with **`docs/codebase-map.md`** — the canonical "where does X live" index for this monorepo. Prefer it over hunting through directories.

## Working Here — Agent Onboarding

This codebase is deliberately kept agent-ready: typed (no unguarded `any`), tested, and mapped. Keep it that way.

### Gates — run before every commit

```bash
pnpm --filter @audacity-ui/sandbox test        # sandbox suite
pnpm --filter @audacity-ui/components test  # components suite
npx tsc --noEmit                               # inside whichever package you touched
node scripts/check-any.mjs                     # from repo root
```

CI runs these same gates on every push/PR — `.github/workflows/test.yml`.

**The sandbox imports `@audacity-ui/components` AND `@audacity-ui/audio` from their `dist`.** After editing either package, run `pnpm build` in it (the Vite page reloads itself) — or the app keeps running the old build while the source and the tests say otherwise. (2026-10-02: pitch "not changing" was a stale audio dist from 2026-09-29.) The audio package's `tsc` cannot resolve any Tone type (53 errors, its known state) — build with tsup regardless; it is not a gate.

**The baseline is fully green**: all tests pass with no skips, `tsc --noEmit` reports 0 errors in both packages, and the `any` guard reports 0 violations. If a gate fails, your change caused it — do not assume pre-existing breakage. Every `any` (including `as any`, `Record<string, any>`, etc.) needs a `// justified: <reason>` comment or the guard fails.

**One exception to "your change caused it" — the Node version.** CI pins Node 20. Node 22+ ships native `localStorage`/`sessionStorage` globals that take precedence over the ones jsdom installs on `window`, but resolve to `undefined` unless `--localstorage-file` is passed — so on a newer local Node, every test touching storage fails with `Cannot read properties of undefined (reading 'clear')` (~96 of them) while CI stays green.

Both test setup files (`packages/components/src/__tests__/setup.ts`, `apps/sandbox/src/__tests__/setup.ts`) carry a `MemoryStorage` shim that restores the globals when they're missing; on Node 20 jsdom's own Storage is already there and the shim is skipped. **Do not "simplify" this into a Node flag** — Node 20 rejects both `--localstorage-file` and `--no-experimental-webstorage` with `is not allowed in NODE_OPTIONS` and refuses to start, which turns a local-only failure into a red CI. A new test setup file needs the shim copied in.

`pnpm test` from the repo root runs all four projects at once (71 files / 615 tests) via `test.projects` in the root `vitest.config.ts`. The per-package gates above are still what CI runs.

**Second Node-26 casualty — electron's binary install.** electron's postinstall (`install.js` → `extract-zip`/`yauzl`) silently breaks on Node 26: it verifies the checksum, extracts ONE file into `dist/`, then exits 0 without error — leaving a stub that later crashes `pnpm --filter @audacity-ui/desktop dev` at `getElectronPath` ("Electron failed to install correctly"-style stack). Packaged builds (`build:mac`) are unaffected (electron-builder ships its own extraction). After any `node_modules` wipe, fix it manually: `ditto -x -k ~/Library/Caches/electron/<hash>/electron-v<ver>-darwin-arm64.zip node_modules/.pnpm/electron@<ver>/node_modules/electron/dist` then write `Electron.app/Contents/MacOS/Electron` (no trailing newline) to `path.txt` next to `dist/`. The zip is already in the cache — `node install.js` in that directory re-downloads/verifies it if not.

### Load-bearing conventions — violating these causes real bugs

- **Ref-mirror for document listeners**: hooks that bind document-level `mousemove`/`mouseup`/`keyup` listeners bind ONCE and mirror frequently-changing props into refs (`useEffect(() => { ref.current = val }, [val])`) so the handler reads live state without re-binding. See the explanatory comment in `apps/sandbox/src/hooks/useClipTrimming.ts` (~lines 85–96). Exception: self-cleaning attach-on-mousedown/remove-on-mouseup handlers (e.g. `useDraggableToolbar`) don't need it.
- **App.tsx hook order is a dependency chain** — never reorder: `recordingManagerRef` → `usePlaybackControls` (creates `audioManagerRef`) → `useRecording` → `useLoopRegion` → `useKeyboardShortcuts`. Also: `useCanvasScrollSync` must come after `useZoomControls`.
- **Provider order**: `PreferencesProvider` sits ABOVE `ThemeProvider` (`preferences.theme` gates `ThemedApp`); `LoopRegionProvider` sits inside `PlaybackProvider` (its consumers use `usePlayback().audioManagerRef`).
- **Canvas Shift+Click time-range logic lives on `click`, not `mousedown`** (it must fire after `useAudioSelection`'s mouseup). In `useCanvasPointerHandlers`, `onMouseMove`/`onMouseLeave` must keep chaining `containerProps.*` or the ew-resize hover cursor strands.
- **ClipBody perf contract**: the pixel redraw is keyed on `useDeferredValue(height)` (`drawHeight`); CSS sizing uses the live `height`. Never swap these. No allocations inside per-pixel draw loops.
- **`useKeyboardShortcuts` is an order-coupled guard chain** — handlers early-return in sequence; insert new handlers deliberately, don't append blindly.
- **`pendingClipMoveResolution`** is a module-scoped singleton ref shared by Canvas, `useCmdArrowMove`, `useTrackKeyboardHandlers`, and `useKeyboardShortcuts` — import it, never recreate it.
- **Accessibility profile ids** are `'au4-tab-groups'` and `'wcag-flat'`. Unknown ids silently fall back to flat navigation — always pass a real id (this exact footgun silently broke the TrackNew tests for months).
- **Preferences persistence**: ONE localStorage key (`'audacity-preferences'`), whole-blob JSON, merge-on-load (`{ ...defaults, ...stored }`). Hot consumers use the domain slice hooks (`useGeneralPrefs` / `useAppearancePrefs` / `useEditingBehaviorPrefs`); the preferences modal uses the full `usePreferences`.

### Refactoring discipline

- Behavior-preserving is the default. Move code VERBATIM; disclose any deliberate change in the commit message.
- Deliberately-unwired UI exists — do not "fix" it in passing: the PreferencesModal footer Reset button is a stub; several EditingPage/AudioSettingsPage/SpectralDisplayPage controls are intentionally not persisted; the Music and Advanced-options nav items have no pages.

### Product rules (user decisions — never violate)

- Track FOLDERS are organisational only in v1 (2026-09-21; the folder-as-bus layer is staged for a later release — see also the real-build Tracktion constraint in memory). A folder is a `Track` with `type: 'folder'` in the FLAT tracks array; children carry `folderId` (track id) and sit contiguously below. Groups NEST, to any depth (2026-09-28, reversing the one-level rule): a folder row may carry a `folderId` too, and a folder's whole SUBTREE is contiguous below it — `folderChildIndices` is DIRECT children, `folderDescendantIndices` the subtree; anything that means "the family" wants the latter. The UI is designed for about three levels. Collapse is DERIVED (rows inside a collapsed group at ANY depth contribute zero height, nested headers included) and per-folder: an inner group stays shut when the group around it reopens. The CANONICAL row-height rule is `effectiveRowHeight` in **`packages/core/src/utils/coordinates.ts`** — core's `yToTrackIndex`/`trackIndexToY`, the components hit-tests (`utils/trackRowGeometry.ts` re-exports it) and the sandbox (`utils/trackFolders.ts` delegates to it) ALL share that one function; a fourth copy is how folder rows once counted as full-height tracks and every time-selection click resolved to the row above. Sandbox y-walks use `effectiveTrackHeight`/`effectiveTrackStride` (stride skips the gap for zero-height rows); hidden children keep zero-height DOM rows in the panel/ruler columns (DOM ordinals must stay aligned with track indices). Folder mute/solo CASCADES down the whole chain at consumption points; folder rows produce no audio (guarded like `type: 'label'`). Deleting a folder row via DELETE_TRACK UNGROUPS (children survive, handed to the group AROUND it — ungrouping one level never throws tracks out of the others); the row menu offers the full group CRUD — rename (click the name, as tracks do), `DUPLICATE_FOLDER` (deep-copies the subtree, nested groups included, with fresh track+clip ids and the copies pointing at each other, `sourceClipId` preserved so the audio engine still resolves buffers), Ungroup, and an explicit destructive "Delete group and tracks" (routed through DELETE_TRACKS for its index remapping). Membership is also editable from the row's kebab menu (`ADD_TRACK_TO_FOLDER` / `REMOVE_TRACK_FROM_FOLDER` / `UNGROUP_FOLDER`), which keeps the family contiguous by parking the row at the end of the target's subtree (join) or just below the family it left (leave — ONE level out, to the group around it). A group row can be added to another group (that nests it), never to itself or its own descendants; the host's `joinableFor` filters the list, and nested groups are named by path ("Drums ▸ Kick"). `GROUP_TRACKS` creates the new group WHERE ITS MEMBERS LIVE — inside the deepest group holding all of them — so grouping tracks that share a group makes a sub-group. For drags, MEMBERSHIP FOLLOWS THE LANDING SPOT: a moved track joins the folder of the row ABOVE it (a folder row itself = "first child"), and leaves when it lands under a plain track or at the top — so drag, Cmd+Arrow and drop-on-a-folder all re-parent by one rule, with no separate gesture; dragging a folder row (by its header) moves its whole subtree, and the SAME zones apply to it — dropping a group in another nests it. A group moved with NO stated membership (any caller that isn't the drag) keeps its parent. Where groups end, a slot can belong to several levels (`validParentsAt`, shallowest first): the default is ONE level out, and the pointer's SIDEWAYS travel from the press picks another — left = out, right = in, one level per `DEPTH_STEP_PX`, including in place (a drag that never moves vertically still changes level). `resolveDropLanding` / `resolveInPlaceLanding` (utils/trackFolders.ts) return `{ toIndex, parentId }` and `moveTrackWithFolders` takes that explicit parent; an exhaustive test pins that every landing promised is the one delivered. A group's BOUNDARY is a drop zone (2026-09-24), because otherwise nothing could get OUT: the upper half of a header = above the group, outside; the lower half of a header = first child; the lower half of the group's last visible member = after the group, outside; below the last visible row = the bottom slot (`toIndex === tracks.length`), outside. `moveTrackWithFolders` takes an explicit membership (`'follow' | 'leave' | { parentId }`), `MOVE_TRACK` carries it, and the drag preview stores it with `toIndex` so the drop commits the previewed landing (`useTrackPanelHandlers.resolveDragTarget`). Folder headers are NEVER focusable (2026-09-23): `utils/trackFocus.ts` holds the rule, `tracksReducer` enforces it on every action (a request to focus a header lands on its first visible child), and both arrow-key paths step over headers and hidden children. Grouping NEVER resizes a track: the panel draws a group as a BOX BEHIND its rows, one box per nesting level (`groupUnderlay` in TrackControlSidePanel — real elements, because each level has its own left edge, corners and floor), in `trackHeader.group` stepping toward the card tone per level (a new token — no shared surface separates from both the rail and the cards). Level k starts at 8px + 4px × (k − 1); the list gutter is 8px + 4px per level IN USE and applies to EVERY row, so all rows start on one line whatever they are in. Nested group NAMES read as a tree (2026-09-28): a group row's LABEL (chevron, icon, name) steps right by core's `groupLabelIndent(depth)` — 12px per level, capped at four — and the canvas field's label steps by the same amount; the row's box, band, M/S and kebab do not move, and TRACK rows are never indented. A group closes with a floor of core's `GROUP_END_PAD` (= the side strip) that is MARGIN, never padding; groups ending on the same row STACK their floors, innermost first. ALL of it is read from core's `computeGroupLayout` (`GroupRowLayout`: depth / closing / opensBelow / hidden) — the panel, the canvas fields and the ruler's `endPad` take the same layout, and during a reorder drag they take the PREVIEWED list's (`dragPreview.layout`); `rowGapAfter` in core adds the floors to every y-walk (core, sandbox stride, panel, canvas band, ruler `endPad`) — a private copy in one column drifts them. Collapse/expand tweens on core's `GROUP_COLLAPSE_MS`/`GROUP_COLLAPSE_EASING` via `useCollapseTransition` (components), which captures hiding/revealing rows IN the render where the flags change; panel rows need `flex-shrink: 0` or an `overflow: hidden` tween collapses them instantly. While a reorder drag is in flight BOTH columns render the tracks in the previewed order with the dragged row(s) ghosted in their landing spot (no floating ghost, no insertion line) — the preview IS the pending move, and the drop commits exactly it rather than re-hit-testing (the ghost sits under the pointer by then, so a fresh resolve would find the dragged row itself and silently no-op). Keep rows MOUNTED throughout (reorder keyed children; never unmount): the dragged panel owns the gesture's document listeners, and unmounting it mid-drag swallows the mouseup. Panels resolve by `data-track-panel-index`, NEVER by DOM ordinal (a collapsed folder's children render no panel, so the two diverge — see `utils/focusRouting.ts`).

- Clips MAY OVERLAP on a track (rule changed 2026-09-21, reversing the original no-overlap law; the old `resolveOverlap` trim/split/delete machinery is deleted). Array position IS the z-order: later = painted on top = wins clicks; every MOVE raises the moved clips to the top of their track's stack, and `tracksReducer` then normalizes (utils/clipZOrder.ts): in every EDGE-overlapping pair the right-most (later-starting) clip stacks on top (rule added 2026-09-21); containment pairs keep their move-controlled order — there z decides audibility. Audible rules (v1 = edge fades): a partial edge overlap is an equal-power crossfade (earlier clip out, later in — z-independent); containment means the top clip occludes (hard cuts, bottom clip silent underneath — NO fades synthesized). The crossfade is entirely DERIVED state — geometry in `packages/components/src/utils/clipCrossfades.ts` (drawn X), gains in `packages/audio/src/crossfadeGain.ts` (baked like the envelope); the two must stay in agreement. ONE fade per clip edge, the CROSSFADE WINS ("consume", 2026-09-21, reversing the same-day inherit rule after side effects): an edge overlap always ramps over the shared region on both sides; an authored quick-fade EXTENT on a crossfaded edge is SUPPRESSED — stored value untouched, it returns when the clips separate. A CROSSFADE HAS ITS OWN SHAPE FIELDS (2026-10-01): `crossfadeInShape` / `crossfadeOutShape` on the clip's edges (an exponent or `'linear'`, never a handle; absent = equal-power), written only by the intersection node and read only by crossfade regions (`computeFadeCurves`, TrackNew's nodes, audio's `computeClipGainSegments`) — a crossfade NEVER reads the quick fades' `fadeInShape` / `fadeOutShape`, so a fresh overlap is SYMMETRIC whatever quick fades the two clips had, and those shapes come back untouched when the clips separate. (Before, the quick fades' shapes leaked into the X — pulling a clip with an authored fade over another made a lopsided crossfade with no way to square it, and shaping the X overwrote the quick fade.) Free edges keep their authored fades; fades never double-apply. Vocabulary: per-clip handle-set fades are QUICK FADES; overlap-derived transitions are CROSSFADES. The X's intersection renders as a draggable node and OWNS the crossfaded edges (their quick-fade handles hide; free edges keep theirs): a PLAIN drag sets the crossing's DEPTH, vertical only — both curves bend via per-edge shape exponents (`crossfadeInShape`/`crossfadeOutShape` on Clip, default 1 = equal-power, the crossfade's stored state; ~1 clears) so the crossing's gain lands under the pointer with its TIME held (the same exponent both sides; sideways travel ignored); ALT+drag ROLLS the crossfade, horizontal only — the content edit, `ROLL_CROSSFADE` via `utils/crossfadeRoll.ts`: both edges slide, the seam moves, the overlap's length holds, clamped to hidden material (the overlap's LENGTH is still changed by trimming either clip's edge). The node's CLICKS match the quick fade handle's (2026-10-01, replacing the 2026-09-24 double-click that toggled linear): CMD/CTRL+CLICK TOGGLES LINEAR ↔ equal-power on both sides, DOUBLE-CLICK RESETS to equal-power whatever it is, a Cmd press is never a drag; and a RIGHT-CLICK opens the crossfade's menu (`onCrossfadeContextMenu` → `setCrossfadeContextMenu` → `AppContextMenus`): the crossfade presets (`CROSSFADE_SHAPE_PRESETS` — Equal power = the default, Linear, S-curve; exponents or linear, never a handle, the same on both sides so the crossing stays in the middle; checked only when both sides are that preset, a depth-dragged crossing checks none). Settled 2026-10-01 after two rounds: the original plain-drag-bends rule was swapped for a plain-drag-rolls one (Reaper, Pro Tools and Cubase move a crossfade by its centre, and here the overlap IS the fade), and that was moved to Alt the same day because roll and shape reachable from one press "felt weird"; the asymmetric bend (crossing following the pointer in both axes) has no gesture now and is gone. The roll request is ABSOLUTE — `onCrossfadeRoll(out, in, seamTime)`, the seam at the press plus the pointer's travel — and the reducer takes the delta from the incoming clip's own `start`, so a repeated or stale request is idempotent: incremental deltas both drifted against the clamp (nothing applied on the way out, the seam rolled away on the way back) and stuttered (two moves between commits asked twice). The node's cursor is up/down arrows (`ns-resize`), left/right (`ew-resize`) while Alt is held, previewing the roll. CHROMIUM (so Electron) re-evaluates the cursor only after a LAYOUT change under the pointer or a mouse move, never for a change to `cursor` alone — so every Alt-driven cursor swap (the node, the edge zones' stretch cursor) also nudges the element's size by a pixel while Alt is held; without it the arrows turned on the next mouse movement, which read as lag (2026-10-01). HANDLES FOLLOW THE POINTER, NOT THE SELECTION (2026-10-01, a trial: six selected clips put ~40 icons on screen, most 24px outside the clips in empty track — the real app has the same, `ClipHandles.qml` `handlesVisible: clipSelected`): the TRIM and STRETCH handles (in the clip, and the buried-edge duplicates) show on a SELECTED clip UNDER THE POINTER — an UNSELECTED clip shows none, hovered or not; it trims by its edge zone ("unselected items don't need to show handles on hover", the same day) — and the corner FADE LENGTH handles show on ANY clip under the pointer, selected or not — HOVER ONLY since 2026-10-06 ("hide the quick fade handle when selected? Only needs to show on hover" — until then the clip with DOM FOCUS showed them too, 2026-10-01's "if a clip is in focus we need to show fade handles", and since a click both selects and focuses, a selected clip wore them; `focusedClipId` from the wrapper's focus/blur now feeds only the curve LINE's visibility, below; the shape handles were hover-only all along); "under the pointer" = anywhere on it or on one of its handles (`handleHoverClipId`, the wrapper's enter/move/leave with no button down; a handle is a descendant, so sitting on one 20px outside the clip still counts; the fade handles keep their "well inside" hover) — and for the length of a drag from one (`edgeDragClipId`, Clip's own `trimEdge`/`stretchEdge`, `fadeDragClipId`); SELECTION SHOWS NONE (`Clip.handlesVisible`, which TrackNew drives; undefined = the old `selected` rule for other hosts) — with ONE exception, the same day: when the project's selection is a SINGLE clip (`singleSelection`, the host's count via `utils/clipSelectionCount.ts`, audio and MIDI across every track), that clip keeps its TRIM and STRETCH handles without the pointer — one clip's furniture is not the mess, and it says "this is the clip you have"; its FADE handles do not join it, they are hover-only whatever the selection. A drag on a selected clip's handle still applies to every selected clip — the rule is just not advertised by every clip's furniture. The clip with its handles up has NO edge zones (the handles are its edges, with the zone's inside reach); every other clip, selected or not, trims by its zones. EVERY hover-dependent control FADES IN AND OUT rather than popping (2026-10-01, "subtle fade out, less than 0.5s", then "fade in and fade out, but quicker"), over `HANDLE_LEAVE_MS` (120 — the hover scale's tempo; the CSS durations must stay in step): the fade IN is CSS alone (`@starting-style` on the control selectors in Track.css / Clip.css, so a freshly mounted control transitions from 0); for the fade OUT `hooks/useLeavingKeys.ts` keeps a control mounted for `HANDLE_LEAVE_MS` after it stops applying, with `data-leaving`, and the CSS (`[data-leaving]` in Track.css, `.clip-display__handle[data-leaving]` in Clip.css) fades it and takes its pointer events; reduced motion turns both off. Covered: the in-clip trim/stretch pair (Clip's `useLeaveDelay`), the buried duplicates, the fade length handles, the shape handles, the crossfade node — one key set each in TrackNew, the render functions draw active ∪ leaving. Where nothing can animate — no `matchMedia` (jsdom), or reduced motion — the delay is ZERO, so the existing tests see instant exits; `TrackNewHandleLeave.test.tsx` supplies a matchMedia to test the tail. QUICK FADE CONTROLS: the white SHAPE handle on the curve shows on HOVER ONLY — selection alone never shows it (2026-09-29, widening the 2026-09-21 selected-only rule; the corner handles joined it on 2026-10-01). Fading a clip never changes the selection. The CROSSFADE node follows the SAME visibility rule as the shape handle (2026-09-30): it shows only while the pointer is well inside one of its two clips or on the node, or while it is dragged (`crossfadeDrag`); selection alone never shows it. The shape handle UNDER THE POINTER (or mid-drag) ENLARGES subtly — `.track-fade-shape-handle[data-hovered]`, the clip handles' hover scale — and stays a plain white dot — a 10px disc, radius 5 over a 1px outline in 60% black (the outline was 1.5px until 2026-10-07, "knock that back to 1px"); the envelope point's roundel was tried and dropped the same day (2026-09-29). Beside the drag, the shape handle takes two gestures: CMD/CTRL+CLICK TOGGLES LINEAR — a straight line, or back to the default S-curve from linear (2026-10-01; the 2026-09-29 rule had it one-way, which read oddly beside the CROSSFADE node's two-way double-click) — and DOUBLE-CLICK RESETS to the default S-curve whatever the fade is. A quick-fade edit on a SELECTED clip — length OR shape (drag, Cmd+click linear, double-click reset) — applies to EVERY selected audio clip, each length clamped to that clip's own LENGTH (`utils/fadeTargets.ts`, 2026-09-30; on an unselected clip it is that clip alone — the trim handles' rule). THE FADE BEING SET WINS THE ROOM (2026-10-06, "pull a fade handle into another one and have the other one pushed out of the way"): the opposite fade is NO CAP — `SET_CLIP_FADE` clamps the set fade to the clip and, where it reaches into the opposite fade, SHRINKS that fade to what is left (a sliver under 0.02 s clears), one rule for every way in (handle drag, panel, menu, dialog); the drag's own cap is the whole window (`maxSeconds = windowLen`), and a zero-extent handle hides only on a clip too narrow for any fade (`roomFor` reads the window alone). A fade LENGTH drag SNAPS when snapping is on (2026-09-30): `TrackNew` takes the host's grid as `snapTime(projectTime)` (Canvas passes `snapToGrid` bound to the current settings, memoised on them, WHETHER OR NOT snapping is on) plus the switch as `snapEnabled`, and snaps the fade's BOUNDARY (where the fade meets the clip's body), not its length; SHIFT INVERTS the switch, read live on each move, exactly as a clip drag's Shift does — on → none, off → the grid (2026-10-01; it was Alt-to-bypass, and Alt is now nothing to a fade length drag); the status-bar line names what Shift will do from where the switch is; a gridline past the fade's limits is not a snap (the pointer's value clamps instead); where it snapped goes out through `onFadeSnapGuideline(time, kind)` (null when not / at release) and joins the canvas's one-guideline chain LAST (`resolveSnapGuideline`'s 4th input). The boundary ALSO ALIGNS TO CLIP EDGES, by the clip drag's rule (2026-10-01): when the grid is not in play — snapping off, or off-with-Shift's opposite, on — it magnetically meets the nearest clip start or end on ANOTHER track within 6px (`alignFadeBoundary` from the host: `utils/fadeAlignment.ts` `nearestClipEdgeOnOtherTracks`, yellow 'alignment' guideline); the fade's OWN track is left out (a same-track neighbour's edge is inside an overlap or past the clip's edge, and the clip's own edges are the fade's zero and limit, not targets); Shift with snapping ON is no snap at all, the edge not consulted; an edge past the fade's limits is not a snap. Fade boundaries are NOT targets for other drags (a separate decision, not taken). A fade LENGTH drag also DROPS A GUIDELINE (2026-10-01, the dev's lining-up aid): a 1px DASHED line in the CURVE'S ink — 45% black, the same as `FADE_LINE_STROKE` (4px on / 4px off; `.track-fade-guideline` in Track.css — it was white-and-black and marched downward until 2026-10-06: "I'm not sure the marching ants line actually needs to be marching", then solid black, then on 2026-10-07 "if the line matches the curve line?" — keep the two in step) from the fade's boundary — where the curve meets the body's top — to the CLIP'S BOTTOM, and no further ("only down to the bottom of the clip"; a canvas-deep line through the tracks below was tried first the same day), so the boundary can be lined up against the waveform. It is TrackNew's own (`renderFadeHandles`, drawn beside the handles at the EFFECTIVE boundary, so a snapped drag's line sits on the gridline); it shows WHENEVER THE HANDLES DO — on HOVER, one line per fade with length (2026-10-07, "on hover, please show the dashed line as it helps the user line up the fade with the waveform"; drag-only before), during a length drag for the fade in hand alone — never on selection — fading with the handles (`data-leaving`, the @starting-style fade-in), and is separate from the snap guideline (which spans the canvas and shows only when snapped). The clip's TRIM and STRETCH handles use the APP's hit boxes (ClipHandles.qml; spec 2026-09-30, the Figma "hit zones" frame): each is 30×32, STRADDLING the edge — the app's 24px outside, and 6px inside (the app's is 12; cut to the edge zone's `EDGE_HIT_INSIDE_PX` on 2026-09-30 so the inside overhang is one number whatever the clip's state — Clip.css and clipEdgeHitZones.ts must agree by hand) — trim directly under the 20px header (20–52px down), stretch directly under the trim (52–84); the icon is centred in the box's OUTER 24 (`.clip-display__handle` in Clip.css, with padding on the inside end; TrackNew's buried-edge duplicates carry the same numbers), and hover/press grow the ICON, never the box, so the hit area holds still. The length handle's HIT BOX is 30×32 — `FADE_HIT_REACH` 15 either side of the body, the body in its MIDDLE — in the trim row (top 20), the same shape wherever the handle goes (2026-10-06, "can we try it not scaling up?" then "can the icon stay in the centre?"; from 2026-09-30 it was the trim box's 36×32 centred on the body, CLIPPED to the 6px line at rest and filling out to 36 away from the edge — "could the hit area expand when it comes away?"); it still never reaches into whatever owns the edge — the selected clip's trim box or the unselected clip's edge zone, both 6px in (`FADE_HANDLE_BOX_INSET` = `EDGE_HIT_INSIDE_PX`, the clamp) — so at rest it is the 24px from 6 to 30, butting up against the trim box or the zone (the 6px line was "make the overhang into the clip the same", 2026-09-30), and the full 30 from the boundary once there is a fade; the glyph svg is 36×32 with the body in its middle, takes no pointer events, and overflows the 30px box by 3 each side without adding to it. The BODY rests 10px in (`FADE_HANDLE_BODY_INSET` = 15 − half the body, since 2026-10-07: "make the dashed line align with the edge of the hit area" — with a fade the 30px box now STARTS EXACTLY ON THE FADE'S BOUNDARY, where the guideline is, the body's centre 15 past it; it was 16 from 2026-10-06 — the 6px line + 15 − half the body, the box centred and starting at the line, which put the box's edge 6px inside the guideline once there was a fade — and the spec's 13 before that; the fix moved the HANDLE, not the line, so the line keeps marking the true boundary and lands on the gridline when snapped), so at rest the box is clipped to 6..30 (24px) with the body at 10..20, centred in the row, its middle on the trim and stretch icons' middle, 36px below the clip's top. With a fade, the body sits that SAME 10px past the fade's boundary (the natural place at zero fade IS the rest place, so nothing clamps) — on the BODY side of its boundary until the two handles would meet: the boxes touch at 60px between the boundaries, and only once they would OVERLAP (`RETREAT_GAP` = 0, 2026-10-07, "let's do 0px" after a 4px trial; it was 8 over the glyph's 36, 14 in practice) BOTH retreat inside their own fade regions, each staying on its own curve rather than swapping sides — and the length drag is RELATIVE — the boundary moves by the pointer's travel from the press — so the handle stays under the pointer and bringing it back to its rest place brings the fade to nothing (2026-09-30; putting the boundary itself under the pointer left the last 13px — now 10 — of a retracting fade to be dragged past the parked handle). The corner LENGTH handle is ONE FAMILY with the clip's TRIM and STRETCH handles (2026-09-29): a solid BLACK 10px body with rounded corners (12px over its outline = the stretch disc; a 12px body read too big), a 1px WHITE outline in EVERY state, its mark (the fade curve) in white, clipped to the body (per-instance clip id via `useId`); hover grows it 18%, press 8% with a slight dim — `.track-fade-handle` in Track.css mirrors `.clip-display__handle` in Clip.css, keep them in step; the pressed look comes from the drag state (`data-pressed`), so it lasts the whole drag. They render at track level above the clip, so each control reports the hover itself (`fadeHoverProps`), a press already under way is not a hover, and a fade drag settles the hover from where the pointer is let go (`settleFadeHover` — pointer capture suppresses enter/leave during the drag). A curve being EDITED — its SHAPE handle mid-drag, and nothing less (not clip hover, not handle hover, not a length drag) — gains a WHITE edge along the UNDERSIDE of its line ONLY: a wide white stroke on the same curve, clipped to `fadeAreaBelowPath`, so nothing white shows above the line; the dark line never changes colour; one curve at a time (2026-09-29) — except a CROSSFADE, whose two curves take the edge TOGETHER while its node is in hand, depth drag or roll (2026-10-01): the X is one thing being edited. A quick fade DIMS THE AREA ABOVE ITS CURVE (2026-09-29; `fadeAreaAbovePath`, drawn in the curve's own SVG so its lower edge IS the curve — 20% black since 2026-10-06, was 14%; the LINE is 45% black (2026-10-07, "a bit darker"; 35% from 2026-10-06, 55% before): "the idle curve a little less bold… it just stops abruptly" where it met the clip's top; `FADE_DIM_FILL` / `FADE_LINE_STROKE` in TrackNew, one strength) — and since later that day THE LINE HIDES AT REST ("what if the line disappears entirely when not selected/hovered?"): it shows only while its clip is SELECTED, FOCUSED, UNDER THE POINTER (clip or handle hover) or being EDITED (shape drag, length drag) — a crossfade's line for either of its two clips — via `data-fade-line-visible` on the curve div and an opacity transition in Track.css at the handles' 120ms tempo (off under reduced motion); at rest the DIM alone says there is a fade) and has no white veil; a CROSSFADE'S two curves dim the same way, EACH above itself (2026-10-01, later the same day the X was left undimmed — the dims stack in the cap above the crossing, which is above both), and a crossfade has NO veils (2026-10-01, replacing "denser = shared"): IN AN OVERLAP YOU SEE WHAT PLAYS — the top clip's body draws its own waveform shrunk by its fade (ClipBody via `fadeRegions`, which include the crossfade's), and the clip UNDERNEATH, painted over by that body, gets a GHOST of its waveform drawn over the overlap (`Track/CrossfadeGhost.tsx`, z 449 under the curves, `data-crossfade-ghost=<clipId>`), shrunk by its own fade — dwindling as the other grows — in its colour at half opacity, with ClipBody's own column→sample mapping and gain so it IS the body's waveform continued; a stereo under clip ghosts its left channel; a containment overlap (top occludes, bottom silent) is not a crossfade and gets no ghost. Placeholder waveforms for clips that bring none are generated ONCE per clip (`clipWaveforms` memo in TrackNew — the generator is random, and body and ghost must draw the same array). A quick fade's SHAPE is a HANDLE (2026-09-29, replacing the re-centring midpoint node): `FadeShape = number | 'linear' | FadeHandle`, where a `FadeHandle` `{ t, g }` is the point (position along the fade, gain) the S-curve is bent to pass through. The handle IS the stored state — it stays where it is dropped, is always drawn from the curve (`fadeHandleOf`), and moves only inside `FADE_HANDLE_LIMITS` (since 2026-10-06 — "dragged up higher, and lower", then "down further and up further" — 5–95% gain and 30–70% along; it was 27.5–72.5% and 15–85%, measured off the user's reference images, then 10–90% and 25–75%; the along-the-fade box narrows as the gain widens because a 95% handle nearer the start than 30% begins steeper than a straight line — the position is held at the middle by the vertical-only drag anyway), so it can neither leave the curve nor bend it into a hard corner. The drag is VERTICAL only (2026-10-01, as the crossfade node's): the handle's place along the fade is held — the middle, unless a stored project put it elsewhere — and only its gain follows the pointer; sideways travel is ignored and the cursor is up/down arrows (`ns-resize`). The curve is `handleCurveGain`: time bent so the handle lands on the S's midpoint, the raised cosine, then gain bent (Schlick bias) to the handle's gain; a fade out is the fade in played backwards. Numeric exponents remain for crossfades (in their own fields — the intersection node writes them) and for stored quick fades; a stored exponent's handle sits at the middle of its curve until it is dragged. TWO DEFAULTS (2026-09-29): a QUICK FADE with no stored shape is an S-CURVE (exponent 2 = raised cosine = a handle at the centre); a CROSSFADE with no stored shape stays EQUAL-POWER (exponent 1 — S-curves there would dip 3 dB mid-overlap). A stored `undefined` therefore means "this kind's default", not a fixed curve. `DEFAULT_QUICK_FADE_SHAPE` / `DEFAULT_CROSSFADE_SHAPE` and `handleCurveGain` live in `clipCrossfades.ts` AND, mirrored, in `crossfadeGain.ts` (audio cannot import components; the sandbox's `crossfadeGain.test.ts` holds the copies together, to the bit). Never write `?? 1` for a fade shape — resolve through the constant for the kind. The reducers clear a shape that equals its kind's default (`SET_CLIP_FADE_SHAPE` via `isDefaultQuickFadeShape`, and STORES 1; `SET_CROSSFADE_SHAPE` clears ~1). midiClips never reorder (`pianoRollClipIndex` is positional).
- An UNSELECTED clip trims by its EDGE, ALONE, and STAYS UNSELECTED (2026-09-29; since 2026-10-01 the zone is every clip's that is NOT under the pointer, selected or not — handles follow the pointer, above). The hit box is ON the edge, with the APP's numbers (ClipItem.qml `leftTrimStretchEdgeHover`, matched 2026-09-30) — `EDGE_HIT_OUTSIDE_PX` (5) outside the clip, `EDGE_HIT_INSIDE_PX` (6) inside — and vertically it IS THE TRIM BOX'S ROW — the 32px directly under the 20px header, where the selected clip's trim handle sits — so selecting a clip never moves the grabbable edge and the header stays whole for dragging (the app's zone runs from the clip's very top for a third of it, over the header's ends; matched and then moved down the same day, 2026-09-30, the header overlap judged accidental); a collapsed clip (`MIN_CLIP_HEIGHT` and under, where Clip hides the header) gives the zone half of itself from its top, as the app does; the rest of the edge is left to the TIME SELECTION, which can then start exactly on a clip's edge — so it is drawn by `TrackNew` at TRACK level (`renderEdgeTrimZones`, z 440), not inside `Clip`: a clip's own box cannot reach past its edge and its stacking context would bury the zone under higher clips. Geometry is `packages/components/src/utils/clipEdgeHitZones.ts`: an edge under a higher clip gets no zone; zones never overlap — clips that touch each keep their own side of the joint, a small gap is split down the middle; every visible edge claims its ground, including edges of clips that get no zone (selected, recording), so a neighbour's zone cannot reach into them. A SELECTED clip has its trim handles and no zones — EXCEPT AT A CROSSFADED EDGE (2026-10-01, a trial against the pile-up in a short overlap: two selected clips put four 30×32 boxes, the node and a kebab in 40px): THE CROSSFADE OWNS ITS EDGES — a crossfaded edge shows NO trim or stretch button, selected or not (`Clip.handlesHiddenAt`, per edge; the free edge keeps its pair), and gets an EDGE ZONE instead (`computeEdgeHitZones` `eligible` is per EDGE, and `throughOverlap` waives rule 1 for it, so the UNDER clip's edge is reachable through the top clip's body — the zone sits above the clips at track level), so the overlap's length is still changed by dragging either edge, with the trim cursor, Option to stretch; the X's node is then the only visible control in a crossfade. FADE HANDLES AND ZONES SHARE THE EDGE: a zone ends 6px into the clip and the fade handle box starts exactly there (`FADE_HANDLE_BOX_INSET` = `EDGE_HIT_INSIDE_PX`; the selected clip's trim box reaches the same 6px), the fade controls are stacked above the zones (455 vs 440), and the fade controls do NOT SHOW until the pointer is WELL INSIDE the clip — at least `EDGE_HIT_INSIDE_PX` in from either side (`isWellInsideClip`; hover on the clip's surface follows the pointer's position, not just enter/leave) — so on the edge there is one thing to do, not two. OPTION/ALT HELD over an edge zone STRETCHES instead (2026-09-30): decided at the press (`stream = altKey ? onClipStretchEdge : onClipTrimEdge`), the zone wears the stretch cursor while Option is down (`altHeld` from document keydown/keyup, cleared on blur; `data-edge-mode`). STRETCHING NEVER SELECTS EITHER (the stretch seed in CanvasTrackList follows the trim rule: a selected clip stretches with every selected clip, an unselected one alone). TRIMMING NEVER SELECTS (reversing the old select-on-trim): `utils/trimParticipants.ts` names the drag's clips when it starts — a selected clip (handle) trims with every selected clip, an unselected one (edge) trims alone — and `useClipTrimming` trims the clips NAMED, never `clip.selected`. THE KEYBOARD EDITS FOLLOW THE SAME RULE (2026-10-01, after a bug: with one clip selected and the focus on another, `[` trimmed BOTH, then selected the focused clip): `[` `]` trim and Cmd+`[` `]` stretch act on the FOCUSED clip — with every selected clip if it is selected, alone if not — and never change the selection (`utils/keyboardEditTargets.ts`, both handlers in CanvasTrackList). `Clip` no longer turns the cursor into a resize arrow near its edges. Custom cursor HOTSPOTS sit on the bracket's spine at mid-height (Clip.css; Track.css mirrors the trim pair) — they were `8 10`, which drew every cursor 8px right of and 6px below the pointer.
- CANVAS POINTER GESTURES (2026-09-30): the MARQUEE is right-drag OR CMD/CTRL+LEFT-DRAG (`isMarqueeTrigger` in `useMarqueeSelection`; the button that began it ends it; below the 4px threshold a Cmd+click is still a Cmd+click — nothing on the bubble path acts on a Cmd press, and `useCanvasPointerHandlers.onClick` ignores the click the browser fires after a marquee via `wasMarqueeing()`). GRAB-TO-PAN is the MIDDLE button (`useGrabToPan` — it was Cmd+left; no modifier, no held-key cursor, `pan-active` = closed hand while dragging; the press is stopped at capture and default-prevented so the browser's autoscroll/paste never fire). `useClipMouseDown` still returns on a Cmd press: a Cmd+click ANYWHERE on a clip — header or body — is the selection toggle, run by the click (the clip wrapper's onClick in TrackNew handles the body; a plain click on the body still selects nothing); a SHIFT+CLICK on a clip BODY is the same as on bare canvas — it builds a TIME RANGE from the playhead (2026-09-30: the Shift blocks in `useCanvasPointerHandlers` exclude only `.clip-header`, not the whole clip; the header's Shift+click stays the clip range select); `CanvasTrackList.onClipClick` ignores the click after a marquee via `wasMarqueeing`.
- CLIP DRAG MODIFIERS (2026-09-30, the same day Cmd was tried for duplicate and moved to the marquee): OPTION/ALT+DRAG on a clip's header DUPLICATES it — `useClipMouseDown` seeds the drag with `duplicateOnFirstMove` and does NOT select or copy anything at the press (an Option+click that never moves is a plain click), and `useClipDragging`'s FIRST mousemove makes the copies IN PLACE over their sources (`utils/cloneClipsInPlace.ts` — Cmd+D's copy rules: fresh ids, shared waveform arrays, `sourceClipId`, the group-copy invariant), selects them, and rewrites the drag state to move THEM; the sources never move; audio clips only (an Option press on a MIDI clip is left alone). SHIFT+DRAG INVERTS SNAPPING for the drag, read LIVE on each move (`gridSnap = shift ? !snapEnabled : snapEnabled`): snapping on → none at all (no grid, no clip-edge alignment); snapping off → the grid — so Canvas builds `snapOptions` whether or not snapping is on, and every drag hook gates on `snapEnabled` itself. Alt no longer switches snapping off for CLIP drags or FADE LENGTH drags (it still does for trim, stretch and label drags). A Shift press on a header starts a drag that selects nothing at the press (`selectOnFirstMove` selects an unselected clip on the first movement) so a Shift+CLICK stays the range select; on the body it still blocks time selection. Neither modified press takes the time-selection sweep. THE SWEEP IS A DRAG'S, NOT THE PRESS'S (2026-09-30): pressing a clip inside a time selection selects THAT clip (as any press does); `useClipMouseDown` seeds `sweepOnFirstMove` with the bracketed clips and `useClipDragging`'s first movement selects them, drops the bracket and moves them together. WHILE CLIPS ARE DRAGGED NO DRAG HANDLE SHOWS anywhere on any track (`clipDragInProgress` in TrackNew from `draggingClipIds`; `Clip` takes `handlesHidden`): trim, stretch, fade length, fade shape, crossfade node, edge zones. WHILE A FADE IS DRAGGED (length handle or shape node) every OTHER clip's handles hide the same way and the clip in hand keeps its own (`fadeDragInHand` / `hidesHandlesOf` in TrackNew, 2026-10-01 — a selected clip elsewhere was still showing its handles beside a drag that was not its); crossfade nodes hide outright, belonging to two clips.
- A QUICK FADE HAS A RIGHT-CLICK MENU (2026-10-01, the "dive deeper" door beside the direct gestures, after a look at REAPER's shape picker): right-click on its length handle or shape handle → `TrackNew.onFadeContextMenu(clipId, side, x, y)` → CanvasTrackList → Canvas → EditorLayout → `setFadeContextMenu` (`useContextMenuState`), rendered in `AppContextMenus`. Items: the SHAPE PRESETS (`utils/fadeShapePresets.ts` — S-curve = the default, Linear, Equal power = exponent 1, Fast / Slow = the handle at the middle at its own gain limits; the fade's current one wears the check, a handle dragged between them checks none — a preset is a starting point, the handle drags on from it), a divider, "Fade in/out length…" (the existing `FadeDurationDialog`) and "Remove fade in/out" (length 0, dimmed while there is none). Every action follows the fade-edit rule (`fadeTargets`): a selected clip's fade is every selected clip's. THE CLIP CONTEXT MENU'S FADE SUBMENU IS THE SAME LIST (2026-10-06, "unify the fade options… the handle menu is a shortcut to the same options under the Fade parent item"): Fade ▸ holds Fade in ▸ and Fade out ▸, each rendered by `ClipContextMenu/FadeMenuItems.tsx` — the ONE component the handle menu renders too — fed by `fadePresets` / `fadeInState` / `fadeOutState` / `onFadeShape` / `onRemoveFade` (and the existing `onFadeIn` / `onFadeOut` for length…); `AppContextMenus` keeps the two edits in `setFadeShape` / `removeFade`, shared by both menus. A host that passes no presets still gets the old bare "Fade in…" / "Fade out…" pair.
- THE CLIP PROPERTIES PANEL (2026-10-02, built the way the Macro manager was): a dockable panel for ONE clip — name, colour, start, length, fades (length + shape preset) and speed; end and source are read-only. Opened from the clip context menu's "Clip properties…" (its first item; the menu's "Clip properties" heading and the panel's own title were both dropped on 2026-10-06 as doubles of the item and the tab), which SELECTS that clip; THE PANEL FOLLOWS THE FOCUSED CLIP (2026-10-06, "can it be the focused clip?", replacing 2026-10-02's follow-the-selection): the clip with DOM FOCUS is what it shows (`hooks/useFocusedClip.ts` — focusin/focusout on the clip wrapper's `data-clip-id` + `data-track-index`, the same ids the split and duplicate handlers read; focus moving to one of the clip's own controls is not a leave), so clicking, tabbing or arrowing to a clip switches the panel; with no clip focused, a single selected clip is shown (selection by menu or macro still switches the panel); with NEITHER, the EMPTY STATE (2026-10-07, "if no clip is selected, or focused, show empty state" — until then the panel kept the last clip it showed; focus moving INTO the panel's own fields keeps the clip SELECTED, so the panel holds); resolution is `resolveClipPropertiesClip(tracks, focused)`: focused → single selected → none. The recorded TARGET (`clipPropertiesTarget`) is for the ⌥⌘I hotkey's focus return and the menu's open, not for display. SEVERAL selected = the SELECTION STATE (2026-10-02) — shown when the focus is among the selected clips or on no clip; a focused clip OUTSIDE the selection is shown alone, focus wins: `ClipPropertiesSelection` from `utils/clipPropertiesSelection.ts` — the count and tracks in the header, the selection's first start / last end / span read-only, and every per-clip field MERGED (the value when all agree, `MIXED` when not: blank with a "Mixed" placeholder and the stepper's arrows hidden — no one value to step from); an edit there applies to EVERY selected clip, each clamped to its own room (the fade menu's rule made visible); name, start and length have no selection form. One or none selected: the last single clip it showed (`utils/clipPropertiesTarget.ts`); it never guesses. ITS LOOK IS FIGMA'S PROPERTIES PANEL (2026-10-06, "we can definitely do something like this"): groups of ROWS of TWO bordered fields, each a GLYPH beside its value and no label column (⇤ start, ⇥ end, ↔ length, ♪ pitch, a clock for speed; the field's name is its `title` and a visually-hidden span); the FADES DRAW THEMSELVES — each fade field's glyph is a live thumbnail of the clip's own curve via `fadeCurvePath` (the canvas's geometry, so a dragged handle shows where it went), and the shape picker is a DROPDOWN of the presets by name with the current preset's curve as the field's glyph (`ClipPropertiesShapeOption` carries the curve; a segmented row of all the curves was tried first and dropped the same day — "can be a dropdown rather than showing all of them at once"), reading "Custom" with the clip's own curve for a between-presets shape and "Mixed" for a mixed selection; the colour field leads with a swatch (`data-swatch`, the clip palette's header tones); the body sits on the dock's PRIMARY surface (`--dock-bg` = `background.surface.default`), not an inset well (2026-10-06). EVERY CONTROL IN THE PANEL HAS A TOOLTIP ON HOVER (2026-10-06, "all of that needs tooltips"): the design system's `Tooltip`, never the browser's `title` (no `title` attributes, no svg `<title>` — they would double up): one `data-tooltip` per control, read by ONE hover handler on the panel's root (`usePanelTooltip`: the nearest `data-tooltip` ancestor of whatever the pointer is over is armed for `TOOLTIP_DELAY_MS` = 350, re-crossing its own children does not re-arm, then the Tooltip shows above the control's middle; leaving it, a press or a wheel hides it). The text is the control's NAME and nothing more — "Clip name", "Fade in", "Pitch", "Reset pitch and speed", "Export clip" (user decision the same day, after a round of explanatory sentences: "just say the name of the control"). Steps still to come from that proposal: scrub-to-adjust on the glyphs, and an interactive clip strip. TWO ACTIONS JOIN THE FIELDS (2026-10-06): RESET on the Pitch & speed section's heading (the right-hand action slot, Figma's "+" place; live only while pitch or speed is off its default) puts every target back to 0 semitones and 100% through the fields' own actions (`UPDATE_CLIP` pitch undefined, `STRETCH_CLIP` to factor 1 with the duration unstretched); and an EXPORT section in the manner of Figma's export-selection block — format and sample rate side by side (`CLIP_EXPORT_FORMATS` / `CLIP_EXPORT_SAMPLE_RATES` in ClipPropertiesDockPanel), a wide "Export clip" / "Export N clips" button under them — renders each target AS IT PLAYS through the audio package's `AudioPlaybackManager.exportClip` (the clip's visible region, envelope and quick fades baked as live playback bakes them, pitch and speed through the same `makePlayer`, rendered with `Tone.Offline` at the chosen rate; the buffer resolved by loadClips's rule — `sourceClipId`, own id, then a waveform-sharing sibling, so the host passes the track's clips as `siblings`) and hands the browser a WAV named after the clip (`utils/downloadBlob.ts`). Only WAV is encoded in the prototype; the other formats render as WAV and the toast says so. The debug-generated tracks carry placeholder waveforms with NO buffers, so they export as "no audio" — use Generate → Tone, a recording or an import to try it. In the BOTTOM DRAWER its four groups sit in THREE COLUMNS (`layout="columns"`, `data-group` placed by CSS: Clip over Speed, then Position, then Fades); in a side dock they stack. A dockable panel's tab can be DRAGGED UP OUT OF THE DRAWER into its OS window (the drawer's `PanelHeader` takes `onTabTearOff` → `handleDockTabTearOff`, 2026-10-02 — until then the drawer had no way out but the kebab menu, for Macros too). A CLIP'S OWN COLOUR is `ownColor` (sandbox Clip + components TrackClip; the panel's Color and the clip menu's Clip color submenu, which is now the real palette + "Track color"): absent = the track's colour; TrackNew draws `ownColor ?? track colour` (and the crossfade ghost the under clip's). `clip.color` is NOT that — it is the track-colour MIRROR that MOVE_CLIP / paste / seeding keep in step with the destination track, never read for rendering; the user's choice is the separate field so no sync path overwrites it. The menu's colour applies to the clicked clip, or every selected clip when the clicked one is selected (`fadeTargets`). ⌥⌘I TOGGLES THE PANEL (2026-10-07, "what's a good shortcut?" — the inspector mnemonic; ⌘I is Split, ⌘⇧I is taken): `hooks/useClipPropertiesHotkey.ts`, a document listener mounted by EditorLayout INSIDE the provider (useKeyboardShortcuts runs in App, above it), matched on `e.code === 'KeyI'` because Option+I types a dead key on macOS; closed → opens on the FOCUSED clip (else the last target; else just opens, and the dock panel's own rule finds a single selection) and focuses the panel's first field; open → closes and focuses that clip's wrapper; works from inside the panel's own fields; yields to a dialog that owns the keyboard; listed on the Shortcuts page. Placement is the Macros triad — docked left / right / bottom drawer, or an OS window; first open lands in the RIGHT dock — moved by the tab kebab, tab tear-off or header drag like the others; every placement site keys off `components/editor/dockPanels.ts` `DockPanelId`. THE TRACK IS A FIELD (2026-10-06, "perhaps parent track can be changed too"): a Track dropdown of the AUDIO tracks (by track id) in the Clip group, under the name; a pick is `MOVE_CLIP` to that track with the start held, for every target in the selection state (clips may overlap, so several landing on one track is fine; a selection across tracks reads Mixed); the moved clip keeps its selection so the panel follows it, and a clip shown without a selection is re-pointed by hand (`setClipPropertiesTarget`). With the Track field present the single-clip header is gone (it said the same thing); the header stays for a selection (count · tracks), and for hosts that offer no tracks. THE CLIP STRIP (2026-10-06, "a diagram to represent the clip and its edges, kinda like Figma does for its column layouts"): in Position, between the Start | Length | End row and the Trim start | Trim end row, the SOURCE drawn as a lane and the clip as a block sitting in it where its trims put it (lengths along the lane are source seconds; the clip's length goes through the stretch), its fades as wedges, in the clip's colour (its own, or a neutral for the track's); the block's two EDGES are handles that drag the trims (pointer capture, the same `onTrimStartChange` / `onTrimEndChange` the steppers use — the mouse trim's coalescing makes a drag one undo step) and take arrow keys (a tenth, Shift a second). It replaced the read-only Source field ("4 s from 0.5"): the strip IS the source. START | LENGTH | END ARE ONE ROW, ALWAYS (2026-10-06, "should start, duration and end be together?", then "can't they be on the same row?" when a side dock wrapped End under — start + length = end): `Row three` is a fixed three columns; in that row the glyph cell is 20px and the stepper drops its left inset so the digits keep their room. BOTH EDGES TRIM FROM THE PANEL (2026-10-06, "right now via clip properties we can only trim the right edge"): a Trim start | Trim end row in Position, each the seconds of SOURCE hidden at that edge; Trim start is the mouse's left-edge trim (`TRIM_CLIP` with `newStart` — the start moves by the change through the stretch and the length gives it up, so the content stays put; clamped to the source's head, the clip's own end and the project's start), Trim end is the right-edge trim said from the other side (Length is the same edit as a length). Edits go through the EXISTING reducer actions (`ClipPropertiesDockPanel`) — the panel is one more way in, never a second rule; its numeric fields are STEPPERS (`NumberStepper`, user request 2026-10-02): the arrows commit at once, a typed value commits on Enter/blur and Escape reverts, so a half-typed number never reaches the reducer. PITCH exists since 2026-10-02 ("I thought we had pitch and speed" — speed was the visual-only stretch, pitch was a header badge with a demo value): `pitchSemitones` on the sandbox Clip and components TrackClip (absent = none; the panel clears 0; ±24 = `PITCH_LIMIT_SEMITONES`), shown as the header's ♪ badge (`Clip.clipPitchSemitones`, signed). REVERSE (2026-10-07, "an option to reverse the clip in the clip properties panel"): a switch under Pitch & speed; `reversed` on the sandbox Clip and components TrackClip; `REVERSE_CLIP` toggles it and REMAPS `trimStart` ONTO THE MIRRORED SOURCE (what was hidden at the head is hidden at the tail; the window is source seconds, through the stretch; fullDuration locked) — the source audio and waveform arrays are never touched: TrackNew's `clipWaveforms` hands the body and the ghost MIRRORED arrays (and RMS) for a reversed clip, and the engine's `playableBuffer` plays a reversed clip from a cached mirror of its source (loadClips, exportClip, mixdown; dropped when the source changes), so the same trimStart/duration offsets apply unchanged and waveform, audio and trims agree. In the selection state the switch reads mixed when the clips differ and a press sets them all on. BOTH PITCH AND SPEED ARE AUDIBLE now: `AudioPlaybackManager.makePlayer` plays a pitched or stretched clip through a Tone `GrainPlayer` (playbackRate = 1/stretchFactor stretches time without moving pitch; detune = semitones × 100 moves pitch without changing time) and a plain `Tone.Player` otherwise — the stretch had been visual-only. (The audio package's tsc cannot resolve ANY Tone type — Gain, Meter, GrainPlayer alike — its known pre-existing state, not a gate.)
- VARISPEED (2026-10-07, "a varispeed playback option"): a speed CHIP (`VarispeedControl` in components) after Loop in the transport group — gated as 'varispeed' in Customise toolbar. THE CHIP IS A TOGGLE (the same day, "try the chip toggle" — Logic's Varispeed button, chosen over AU3's second play button: AU3's Play-at-Speed grew out of the Transcription Toolbar, a standalone tool with its own transport, and its normal Play still ignores the slider; it could not change speed mid-play until 2.3.0): a SPLIT control, 28px like the transport buttons — the VALUE half reads the REMEMBERED speed ("0.500×", `VARISPEED_DEFAULT_SPEED` = ½× before the user sets one, the transcriber's speed so the first press does something) and its press switches varispeed ON and OFF (`aria-pressed`; on = the primary button tone with white text, the ToggleToolButton's on state; off = the secondary tones, the chip dim) — so slow ↔ normal is one press each, AU3's A/B without the second button; the CARET half opens the popover with the slider, the value and ½× / 1× / 2× presets — every one of them sets the speed AND switches on, 1× included: the presets are SPEEDS and the chip is the ONLY switch (a 1×-means-off preset was tried for an hour the same day and read as "weird logic"; on at 1× sounds like off and is allowed). THE SLIDER IS AUDACITY 3'S (the same day, "in terms of scale being linear or w/e we just stick to Audacity 3" — AU3's SPEED_SLIDER in ASlider.cpp, 0.01..3.0, "%.3fx"): LINEAR from 0.01× to 3.0× (`VARISPEED_MIN` / `VARISPEED_MAX`, the engine clamps to the same), in hundredths (the Slider runs 1–300), the readout to THREE DECIMALS, and 1× MARKED on the track (`.varispeed__unity` at `VARISPEED_UNITY_FRACTION`, a third of the way) — the first build's log ¼×–4× scale with 1× in the middle and its semitone wheel step were dropped for it; no preserve-pitch, as AU3 has none (that is Dan Fabulich's AU4 pull request of 2026-09-23, `pr-12271-play-at-speed` in the real checkout, which also dropped the second play button and added a sticky 1× — the same shape as ours). A WHEEL on the value half steps the speed (`stepVarispeed`; "what if we scroll on the button?", the same day): a TENTH of a speed per notch on the tenths grid (the AU4 PR's step; AU3's own wheel is a tenth of the RANGE, ~0.3×, too coarse for a chip) — the UP GESTURE = faster — a POSITIVE deltaY, which is fingers-up or wheel-up under macOS NATURAL SCROLLING, the default for trackpad and mouse alike ("you'd think scrolling up would make it faster", the same day, after the negative-delta mapping — the non-natural mouse-wheel convention — ran the wrong way on his Mac); the browser cannot read the setting, so the Mac default wins and a non-natural wheel reads reversed — clamped, accumulated over `WHEEL_NOTCH_PX` (24) of travel so a trackpad's small deltas and a mouse's large ones both step; SHIFT+WHEEL IS THE FINE STEP ("a fine tune precise change", the same day): a HUNDREDTH per notch (`stepVarispeedFine`, on the hundredths grid), read from the X axis too since Chromium turns a Shift+wheel's vertical delta horizontal; and the wheel turns the DIAL ONLY (`onDial` → `dialVarispeed`: stored, the switch untouched — live while on, remembered while off) and NEVER switches on ("you think scrolling should turn it on?", the same day: a wheel is not deliberate the way opening the popover is — trackpad inertia or a scroll meant for the canvas would silently engage a playback mode, the trap the toggle closes; dial and switch, like a muted fader); a native non-passive listener, since React's onWheel cannot preventDefault. WHILE ON THE TIMECODE TINTS too (`TimeCode.accent` — its display takes the primary button tone, Logic's orange LCD): a speed left on must be seen where the time is read, not only on its chip. Tape-style, as AU3: the PITCH FOLLOWS the speed. Session state in `usePlaybackControls` — two pieces, `varispeed` (remembered) and `varispeedOn`, with `setVarispeed(speed)` (store + on), `dialVarispeed(speed)` (store only) and `setVarispeedOn(on)`; the engine hears their product (the speed while on, 1× while off) — not a preference. The engine implements it as TEMPO: `AudioPlaybackManager.setVarispeed` sets the transport's bpm to BASE_BPM (120) × speed and every player's rate to its own × speed (a GrainPlayer also detunes by 1200·log₂(speed) cents so its pitch follows like a Player's; `playerBase` keeps each player's own rate/detune) — and EVERYTHING ON THE TRANSPORT IS IN TICKS (`songToTicks` / `atTicks`: clip and MIDI schedules, the loop points, play's start, seek) with the song position read from `ticks` at BASE_BPM (`ticksToSong`), never from `Transport.seconds` (wall-clock elapsed), so a schedule made at one speed is right at every other and the playhead runs speed× faster to where the audio is. Changing speed mid-play takes effect at once; so does the toggle.
- THE TOOLBAR'S COG OPENS "CUSTOMISE TOOLBAR" (2026-10-07, Figma CustomiseToolbar/Right 3399:83985): `CustomiseToolbarMenu` (components), built on ContextMenu, hung under the cog with the design's triangle asset on the cog's centre (26px in from the menu's right edge; assets in `assets/customise-toolbar/`): a 32px header and one 32px row per tool — an EYE (open \uEF53 = shown, shut \uEF54 = hidden), the tool's own glyph (the design's codes, in `CUSTOMISE_TOOLBAR_ENTRIES`, which is the design's list in its order and groups), its name — dividers between groups; a row press toggles the tool. Hidden ids are `preferences.toolbarHiddenTools` (persisted with the blob; `TransportToolbarContainer` wires it) and `TransportToolbar` gates each tool with `show(id)`: play, stop, record, step-back/forward, loop, automation (Clip envelope), zoom-in/out, fit-selection/project, zoom-toggle, spectral-editing (the Spectral view toggle), cut (both the Cut tool and the Cut/Split toggle), copy, paste, trim, silence, timecode, bpm, time-signature, snapping, microphone-levels, playback-meter. Entries with NO toolbar counterpart in the prototype (spectral-box-select, spectral-brush, metronome) are listed for the design's sake and toggle only their preference. A group whose every tool is hidden leaves its empty wrapper (a small gap) — not yet collapsed.
- THE STATUS BAR NAMES THE HANDLE UNDER THE POINTER (2026-10-01): `TrackNew` reports a `ClipHandleHint` id through `onHandleHint` (Alt folded in — `edge-stretch`, `crossfade-roll` — null on leave, on CHANGE only, never a null on mount), Canvas writes it to `HandleHintContext`, and the selection toolbar's `instructionText` shows `handleHintText(hint, os)` (`utils/handleHints.ts`, modifier names per the OS preference) in place of "Click and drag to select audio"; the focus debugger's text yields to it. The words name the gestures TrackNew implements — change a gesture, change the line. A line shown while a modifier is HELD (`edge-stretch`, `crossfade-roll`) names that modifier ("Option-drag …"), since the user is holding it (2026-10-01 — "drag left or right to roll" read as if plain).
- Time-stretch applies to AUDIO clips only; `MidiClip` never gets `stretchFactor`.
- Clip-group copies never tether to original groups: a fresh group is created iff a whole group is copied whole; otherwise copies are ungrouped.
- Selecting clips selects their tracks (rule changed 2026-09-10, reversing the earlier decoupling): every clip-selection reducer case (`SELECT_CLIP`, `SELECT_CLIPS`, `SELECT_CLIP_RANGE`, `TOGGLE_CLIP_SELECTION`) recomputes `selectedTrackIndices` via `tracksWithSelectedClips` (post group-expansion, `reducers/shared.ts`); deselecting a track's last clip deselects the track. Focus is still NOT moved by batch selects.
- THE CURSOR HAS A CLIP-EDGE MAGNET (2026-10-07, "snapping to the edge of clips for the cursor so it's easy to select from the edge of the clip"): a plain lane click parks the playhead ON the nearest clip start or end on ANY track within the clip drag's 6px (`useContainerClick` `alignTime`; `utils/fadeAlignment.ts` `nearestClipEdge`), and a time-selection drag's edges — the anchor and the edge in hand — meet one the same way whenever the grid is not in play (`useTimeSelection` `alignTime`, the fade handle's rule: snapping off, or on-with-Shift's opposite; snapping on → the grid wins; on + Shift → no snap at all, the edge not consulted), with the yellow 'alignment' guideline (`onSnapGuideline(time, kind)`). The edge in hand's own clip is not excluded (unlike a fade's boundary) — the cursor is on the lane, not in a clip. The magnet PREVIEWS ON HOVER ("a line and a bit of snapping on hover", the same day): while the pointer rests within reach of a clip edge with no button down, Canvas's `hoverSnapTime` puts the yellow guideline on the edge the click or drag would land on — the LAST input of `resolveSnapGuideline`, so any drag's own target wins; cleared on leave and while a button is down.
- A TIME-SELECTION DRAG SNAPS its moving edge to the grid while snapping is on, and SHIFT INVERTS that — on → none, off → the grid — read live on each move, exactly as a clip drag's and a fade handle's Shift do (2026-10-01; selections did not snap at all before): `useTimeSelection` takes `snapTime` / `snapEnabled` / `onSnapGuideline` (through `UseAudioSelectionConfig`), the anchor snaps too so a snapped selection starts on the grid as well as ending on it, edge resizes snap the edge in hand, and the selection's guideline is the LAST input of `resolveSnapGuideline`. Shift AT THE PRESS is still the extend-from-playhead click (no drag starts), so the inversion is reached by pressing Shift once the drag is under way.
- FINALIZING A SELECTION DRAG MOVES THE PLAYHEAD TO THE SELECTION'S START, ALWAYS (2026-10-07, "remove exception logic whereby it doesn't move if it's included in selection"; the 2026-07-09 rule had left a playhead parked inside the drawn range where it was — the spot is one click away afterwards, since a click inside the selection's rows parks the playhead without collapsing the selection; `playheadAfterFinalize.ts` and its test are deleted). Time and spectral finalize alike, in `Canvas.tsx`.
- A PLAIN LANE CLICK CLEARS THE TIME SELECTION, WHEREVER IT LANDS (2026-10-07, "remove the preserving selection area logic, just remove it if the user clicks away"): `useContainerClick` drops the range on every plain SINGLE click (`e.detail <= 1` — the later clicks of a double or triple click arrive around the dblclick that selects a clip or a gap and must not undo it) — inside the selection's rows too (until then a click inside the rows kept the range and only parked the playhead); the Developer Tools `laneClickBehavior` toggle now governs only whether the click also selects the clicked track ('playhead-only' = no; 'select-track' and the default 'select-and-collapse' = yes). Shift+click and Cmd+click keep their range and scope gestures.
- A time-range selection selects the tracks it spans (rule changed 2026-09-10, reversing the earlier "never mutate track selection" decision): the reducer mirrors a `SET_TIME_SELECTION` payload's `tracks` into `selectedTrackIndices`. A scope-less payload (`tracks` undefined — programmatic, e.g. macro Select Time) leaves track selection alone; an explicitly EMPTY `tracks: []` mirrors too. Cmd+clicking away the FINAL spanned track clears the whole time selection (both cmd+click handlers dispatch null + empty track selection — a range spanning no tracks has nothing selected). Operations resolve rows via `TimeSelection.tracks` (any defined value, `[]` = act on nothing) → `selectedTrackIndices` → fallback (`utils/timeSelectionScope.ts`).

## Repository Overview

This is a **pnpm monorepo** for the Audacity Design System - a collection of reusable UI components for audio editing applications.

**Current State**: Active monorepo with published packages. The sandbox app (`apps/sandbox/`) is the full Audacity UI implementation and uses components from the packages.

## Apps (`apps/`)

| App | Description |
|-----|-------------|
| `sandbox` | Vite + React 19 dev app — the full Audacity UI implementation lives here. Package name `@audacity-ui/sandbox`. Dev server on port 5173. |
| `desktop` | Electron wrapper that loads the built sandbox (`apps/desktop/src/main.cjs`, `preload.cjs`). |
| `docs` | Storybook site for component documentation. |
| `static-smoke` | Minimal standalone-render regression page. |

## Packages (`packages/`)

| Package | Description |
|---------|-------------|
| `@audacity-ui/core` | Core TypeScript types and accessibility utilities. |
| `@audacity-ui/tokens` | Design tokens (themes, colors). |
| `@audacity-ui/components` | UI component library (100+ components including ClipDisplay, TrackNew, EnvelopeInteractionLayer, EffectsPanel, etc.). |
| `@audacity-ui/audio` | Tone.js audio playback (`packages/audio/src/AudioPlaybackManager.ts`). |

## Development Commands

### Monorepo (Root)
```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Watch all packages in development mode
pnpm dev

# Run sandbox app only
pnpm sandbox

# Lint all packages
pnpm lint
```

### Individual Packages
```bash
# Build a specific package
cd packages/core
pnpm build

# Watch mode for a package
cd packages/tokens
pnpm dev
```

### Sandbox Application
```bash
# Run the sandbox app (port 5173)
cd apps/sandbox
pnpm dev
pnpm build
pnpm lint
```

## Testing

### Commands
```bash
# Run all tests across the monorepo
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Coverage report
pnpm test:coverage

# Run tests for a single package
pnpm --filter @audacity-ui/sandbox test
pnpm --filter @audacity-ui/components test

# Run a single test file (from inside the package)
npx vitest run TrackNew
```

### Stack
- **Vitest 4** — test runner (configured in each package's `vitest.config.ts`)
- **jsdom** — browser environment for component tests
- **@testing-library/react 16** — React 19 rendering and queries
- **@testing-library/jest-dom** — DOM assertion matchers (imported in setup file)
- **Canvas mock** — `packages/components/src/__tests__/setup.ts` stubs `HTMLCanvasElement.getContext`

### Test File Locations
```
packages/components/src/
  __tests__/setup.ts                           # Global setup (canvas mock, jest-dom)
  utils/__tests__/envelope.test.ts             # Envelope utility functions
  utils/__tests__/spectrogramScales.test.ts    # Spectrogram scale utilities
  Track/__tests__/TrackNew.test.tsx            # TrackNew interaction tests
```

### Writing Component Tests

**Required providers** — Components using hooks (`useContainerTabGroup`, `useTheme`, `usePreferences`, etc.) need context wrappers. IMPORTANT: pass a REAL profile id to `AccessibilityProfileProvider` — omitting it (or passing an unknown id) silently falls back to flat navigation and roving-tabindex assertions will fail mysteriously:
```tsx
import { ThemeProvider } from '../../ThemeProvider/ThemeProvider';
import { AccessibilityProfileProvider } from '../../contexts/AccessibilityProfileContext';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProfileProvider initialProfileId="au4-tab-groups">
        {children}
      </AccessibilityProfileProvider>
    </ThemeProvider>
  );
}
```
Components reading preferences additionally need `PreferencesProvider` (outermost — see `packages/components/src/PreferencesModal/__tests__/pages.test.tsx` for a working example).

**Scoped queries** — Always query from the `container` returned by `render()`, not from `document`. React 19 + jsdom does not reliably clean up between tests, so `document.querySelector` can return stale elements from previous renders:
```tsx
// GOOD — scoped to this render
const { container } = render(<Providers><MyComponent /></Providers>);
const el = container.querySelector('[data-clip-id="1"]');

// BAD — can find elements from previous tests
const el = document.querySelector('[data-clip-id="1"]');
```

**Explicit cleanup** — Add `afterEach(cleanup)` at the top of every test file:
```tsx
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
```

**Focus events** — Use `act(() => { element.focus(); })` for focus/blur, not `fireEvent.focus()`. React 19 processes native `focusin`/`focusout` events; `fireEvent.focus` dispatches a non-bubbling `focus` event that React's delegation may miss.

**Keyboard events** — Use `fireEvent.keyDown(element, { key, metaKey, shiftKey })` for keyboard interactions. Works correctly with React 19 event delegation when the target element is within a properly scoped render.

**Conventions:**
- Place tests in `__tests__/` directories adjacent to the code they test
- Use `fireEvent` (not `userEvent`) for direct control over modifier keys (`metaKey`, `shiftKey`, `ctrlKey`)
- Query elements by `data-*` attributes or ARIA roles, not CSS classes
- Each test should be independent — no shared mutable state between tests

## Architecture

### Key Components in `packages/components/`

**Clip Rendering:**
- `ClipDisplay.tsx` - Composite clip component (ClipHeader + ClipBody)
  - Manages header hover states and truncation mode
  - Passes props through to child components
- `ClipHeader.tsx` - Clip header with name and context menu button
- `ClipBody.tsx` - Clip body rendering (waveform, spectrogram, envelope)
  - Canvas-based rendering using HTML5 Canvas API
  - Filters hidden points during envelope eating behavior

**Track Rendering:**
- `TrackNew.tsx` - Component-based track renderer
  - Renders clips using ClipDisplay components
  - Positions EnvelopeInteractionLayers at track level as siblings to clips
  - Tracks hidden points per clip during drag (eating behavior)

**Envelope Interaction:**
- `EnvelopeInteractionLayer.tsx` - Transparent overlay for envelope editing
  - Handles all envelope mouse interactions (add, drag, delete points)
  - Implements eating behavior: calculates and reports hidden points during drag
  - Positioned absolutely at track level over clips
  - Uses non-linear dB scale for vertical positioning
  - Constants: `CLICK_THRESHOLD = 10px`, `ENVELOPE_LINE_FAR_THRESHOLD = 4px`, `SNAP_THRESHOLD_TIME = 0.05s`

**Selection:**
- `useAudioSelection` - Composite hook for time, track, clip, and spectral selection
- `TimeSelectionCanvasOverlay.tsx` - Renders time selection overlay
- `SpectralSelectionOverlay.tsx` - Renders spectral selection overlay

**Rulers:**
- `VerticalRuler.tsx` - Amplitude ruler for waveform view (linear scale)
- `FrequencyRuler.tsx` - Frequency ruler for spectrogram view (Mel scale)
- `VerticalRulerPanel.tsx` - Ruler panel with automatic mode switching
  - Single amplitude ruler for waveform mode
  - Single frequency ruler for spectrogram mode
  - Dual rulers (frequency on top, amplitude on bottom) for split view mode
  - Dual amplitude rulers (left/right channels) for stereo waveform mode

### Key Components in `apps/sandbox/`

**Main Canvas:**
- `Canvas.tsx` - Rendering coordinator (~770 lines after decomposition — see `docs/codebase-map.md`)
  - Wires interaction hooks together and assembles selection/overlay state
  - Per-track rendering lives in `components/canvas/CanvasTrackList.tsx` (TrackNew wiring + clip handler bodies + ~10 tracks-reducer dispatch types — deliberate, mirrors pre-decomposition Canvas)
  - Overlays are presentational components in `components/canvas/` (SnapGuideline, SplitPreviewLine, MarqueeRect)
  - Wraps labels in overflow container to clip without hiding focus outline

**Editor Layout:**
- `EditorLayout.tsx` - Editor chrome composition root (~1180 lines after decomposition — see `docs/codebase-map.md`)
  - Context wiring (`useTracks`, `usePlayback`, `useLoopRegionContext`, `useContextMenus`, `useMuseHub`) + layout scaffolding (effects panel / track control side panel / timeline ruler row / canvas + rulers row / bottom drawer / menus-modals) + `Canvas`/`TrackControlPanel`/`VerticalRulerPanel` prop assembly
  - Presentational blocks extracted to `components/editor/` (LoopRegionStalks, PunchPointIndicator, EditorBottomDrawer, TrackEffectsPanel)
  - Interaction bundles extracted to hooks (useMeasuredWidth, useRulerFlyout, useTimelineRulerInteractions, useTrackPanelHandlers)
  - Pure focus-routing DOM queries and track add/duplicate math extracted to `utils/focusRouting.ts` / `utils/trackManagement.ts`

**Custom Hooks (interaction):**
- `useClipDragging.ts` / `useClipTrimming.ts` / `useClipStretching.ts` - Mouse clip editing (ref-mirror pattern)
- `useLabelDragging.ts` - Label drag interactions
- `useCanvasPointerHandlers.ts` - The canvas container's nine mouse handlers (click/selection/context-menu/double-click)
- `useTrackKeyboardHandlers.ts` - Track navigate/reorder keyboard handling
- `useCmdArrowMove.ts` - Cmd/Ctrl-release overlap resolution for keyboard clip moves
- `useCanvasScrollSync.ts` - Wheel-zoom + two-pane scroll echo-absorb sync
- App-level: `useProjectLifecycle`, `useMenuDefinitions`, `useElectronMenuBridge`, `usePlugins`, `useDraggableToolbar`, `useMasterMeter`, `useAudioDeviceMenu` (see codebase-map for the full list)

**Label Rendering (rewritten 2026-09 — see `docs/label-interactions.md` for the full model):**
- `LabelRenderer.tsx` - Coordinator: maps labels to `components/labels/LabelItem.tsx`,
  owns inline-editing state, adjacency (shared junction stalks), and snap targets
- `components/labels/LabelItem.tsx` - One label: banner/ears/stalks, all gesture
  handlers (ears always stretch; banner is the only selecting element; double-click
  edits + parks the playhead), state colors from the build's clip palette
  (`labels/labelColors.ts`) via `color-mix` ladders — strap always lighter than ears
- `labels/labelDragTracker.ts` - Singleton letting `useContainerClick` swallow
  label-originated clicks so label gestures never move the playhead

**Label Utilities:**
- `labelLayout.ts` - Label metrics engine + layout
  - `getLabelMetrics(fontSizePx)` — ALL geometry derives from the label text size
    (pref `labelTextSizePt`, default 9pt = 12px): banner `max(20, round(1.5×text))`,
    4px-grid row gaps, text-derived padX/pointFlagGap. Constant chrome: ears 10×20,
    stalk 1px (9px hit zone), radius 2px. `labelPtToPx` converts at CSS 96dpi
  - `calculateLabelRows()` - Greedy packing (left-most label gets row 0); point-label
    width is measured text clamped to metrics min/max, not a fixed 60px
  - `isPointInLabel()` - Hit testing; takes the metrics param like the rest

**Track Type System:**
- Tracks have `type?: 'audio' | 'label'` property
- Label tracks (`type: 'label'`) hide the 20px clip header recess
- Audio tracks (default) show the darkened clip header area
- Track type determines rendering behavior, not just presence of labels

**Overflow Handling:**
- Labels wrapped in container with `overflow: hidden` to clip overflowing content
- Parent track wrapper uses `overflow: visible` to preserve focus outline
- Focus outline rendered outside element bounds (not clipped by overflow hidden)

### Audio Rendering Architecture

**Non-Linear dB Scale:**
- Uses cubic power curve (x³) for visual dB positioning
- 0dB positioned at ~2/3 down the clip height
- Range: -60dB to +12dB, with -∞ at bottom 1px
- Functions: `dbToYNonLinear()`, `yToDbNonLinear()` — canonical exported versions in `packages/components/src/utils/envelope.ts` (local copies also exist in `Track.tsx` and `EnvelopeInteractionLayer.tsx`)

**Automation Overlay States:**
There are 6 distinct overlay states based on envelope mode, selection, and time selection. See `docs/automation-overlay-states.md` for the complete state matrix.

Key states:
- **Active** (envelope mode ON): `rgba(255, 255, 255, 0.5)`
- **Idle** (envelope mode OFF, has points): `rgba(255, 255, 255, 0.6)`
- **Time selection overlays**: Track-specific blended colors or pure white

**Clip Styling States:**
Clips have 10 combined visual states based on:
- Selection (selected/unselected)
- Hover state (idle/hover on header)
- Time selection (present/absent)
- Envelope mode (on/off)

See `docs/clip-styling-states.md` for the complete state matrix.

### Envelope Interaction Model

**Simplified Interaction Model:**
- **Click near line (0-4px)**: Add new control point at click position
- **Click on existing point**: Delete the point
- **Drag existing point**: Move point, eating (hiding) any points passed over
- **Movement threshold**: 3px to distinguish click from drag

**Point Eating Behavior:**
- When dragging a point horizontally, any points between start and current position are hidden
- Hidden points are visually removed from both the line and control points during drag
- On mouse up, hidden points are permanently deleted
- Special case: dragging to time=0 (clip origin) hides ALL other points

**Horizontal Snapping:**
- Points snap to existing points within 0.05s (50ms)
- Helps align points across clips

**Mouse Event Flow:**
1. `EnvelopeInteractionLayer` handles all envelope mouse events (down, move, up)
2. Maintains drag state in ref: `dragStateRef` (type: 'point' | 'segment')
3. Calculates hidden points during drag and calls `onHiddenPointsChange` callback
4. `TrackNew` tracks hidden points per clip in Map state
5. Passes hidden indices to `ClipDisplay` → `ClipBody`
6. `ClipBody` filters envelope rendering to exclude hidden points

**Constants** (in `packages/components/src/EnvelopeInteractionLayer/EnvelopeInteractionLayer.tsx`):
- `CLICK_THRESHOLD = 10` (pixels for detecting clicks on points)
- `ENVELOPE_LINE_FAR_THRESHOLD = 4` (max distance from line for interaction)
- `ENVELOPE_MOVE_THRESHOLD = 3` (pixels to distinguish click from drag)
- `SNAP_THRESHOLD_TIME = 0.05` (snap within 0.05 seconds)
- `TIME_EPSILON = 0.001` (for detecting clip origin)

Other layout constants:
- `CLIP_HEADER_HEIGHT = 20` — local constant in `packages/components/src/Track/Track.tsx`
- `DEFAULT_TRACK_HEIGHT = 114` — in `apps/sandbox/src/constants/canvas.ts`

## Important Patterns

### State Management
- **Tracks reducer domain split**: `TracksContext.tsx` holds the state shape, `TracksProvider`, and the outer `tracksReducer` (undo/redo + coalescing). Domain mutation logic lives in `apps/sandbox/src/contexts/reducers/` (one sub-reducer per domain), routed by `reducers/domains.ts`. See `docs/codebase-map.md` → "Tracks reducer — domain split".
- **Ref-Based Drag State**: All drag operations use refs to avoid re-render during drag
- **Cursor Updates**: `updateCursor()` called on mouse move to set hover states and cursor style

### Theme System
- Centralized in `@audacity-ui/tokens` package
- Themes define colors for every visual state (see `Theme` interface)
- Track-specific colors: Blue (track1), Violet (track2), Magenta (track3)

### Canvas Performance
- Waveforms use high sample counts (50,000 samples per second) for solid appearance
- Canvas cleared and redrawn on every state change
- Drawing optimizations: batch operations, avoid unnecessary clears

## Current Development Status

- ✅ Monorepo infrastructure setup (pnpm workspaces)
- ✅ `@audacity-ui/core` package — types and accessibility utilities
- ✅ `@audacity-ui/tokens` package — theme tokens
- ✅ `@audacity-ui/components` package — full UI component library
- ✅ `@audacity-ui/audio` package — Tone.js audio playback
- ✅ Sandbox app (`apps/sandbox/`) — full Audacity UI implementation
- ✅ `desktop` app — Electron wrapper of sandbox
- ✅ **Track type system** - Audio vs label tracks properly differentiated
- ✅ **Vertical rulers** - Dual rulers for split view (frequency + amplitude)
- ✅ **Effects panel** - Complete with tab navigation and grid keyboard navigation
- ✅ **Accessibility** - Tab groups, roving tabindex, composite widgets, WCAG compliance
- ✅ **Type campaign** — whole-app `any` elimination, enforced by `scripts/check-any.mjs` (every `any` carries `// justified:`)
- ✅ **Structural decomposition** (fable5-finalize, 2026-07-11) — App.tsx 1864→1244, Canvas.tsx 1959→771, PreferencesModal 1979→210; LoopRegionContext + preference domain slices extracted; per-page modal files
- ✅ **EditorLayout decomposition** (2026-07-11/12) — EditorLayout.tsx 2170→1178 (composition root: context wiring + layout scaffolding + Canvas/TrackControlPanel prop assembly); `components/editor/` (LoopRegionStalks, PunchPointIndicator, EditorBottomDrawer, TrackEffectsPanel), interaction hooks (useMeasuredWidth, useRulerFlyout, useTimelineRulerInteractions, useTrackPanelHandlers), and pure utils (focusRouting, trackManagement) extracted — see `docs/codebase-map.md`
- ✅ **Green test/type baseline** — both packages fully green (no pre-existing failures to work around)

**Next Steps (per roadmap):**
1. Setup Storybook stories in `apps/docs/` for component documentation
2. Publish packages to npm registry

**When Extracting Components:**
- Prefer controlled component pattern (consumer manages state)
- Export both component and prop types
- Use composition over configuration
- Provide sensible defaults but allow full customization

## Key Files Reference

**Core Packages:**
- `packages/core/src/types/index.ts` - All TypeScript interfaces
- `packages/core/src/accessibility/` - Accessibility utilities (tab groups, profiles)
- `packages/components/src/hooks/useTabGroup.ts` - Per-item roving tabindex hook (ProjectToolbar, EffectsPanel)
- `packages/components/src/hooks/useContainerTabGroup.ts` - Container-level roving tabindex hook (Toolbar, SelectionToolbar, TrackNew clips)
- `packages/tokens/src/index.ts` - Theme definitions and tokens
- `packages/audio/src/AudioPlaybackManager.ts` - Tone.js audio playback manager

**Sandbox Application:**
- `apps/sandbox/src/App.tsx` - Application shell: context header, routing state, provider tree, JSX assembly (~1244 lines; orchestration extracted to hooks — see codebase-map)
- `apps/sandbox/src/components/Canvas.tsx` - Canvas coordinator (~770 lines); per-track render in `components/canvas/CanvasTrackList.tsx`
- `apps/sandbox/src/components/EditorLayout.tsx` - Editor chrome composition root (~1180 lines; presentational/hook/util pieces extracted to `components/editor/` — see codebase-map)
- `apps/sandbox/src/components/LabelRenderer.tsx` - Label rendering component
- `apps/sandbox/src/components/{Transport,Project}ToolbarContainer.tsx` - Toolbar wiring containers
- `apps/sandbox/src/hooks/` - Interaction + app-orchestration hooks (deps-object + typed-return convention; see codebase-map for the full table)
- `apps/sandbox/src/utils/labelLayout.ts` - Label layout utilities
- `apps/sandbox/src/contexts/TracksContext.tsx` - Track state (shape + provider + undo wrapper); domain logic in `contexts/reducers/`
- `apps/sandbox/src/contexts/PlaybackContext.tsx` / `LoopRegionContext.tsx` - Value-provider contexts (App calls the hook, provides the return object)
- `apps/sandbox/src/constants/canvas.ts` - Canvas layout constants (e.g. `DEFAULT_TRACK_HEIGHT`)

**Documentation:**
- `docs/codebase-map.md` - Canonical "where does X live" index (see Navigation section above)
- `docs/backlog.md` - Known follow-ups (confirmed bugs preserved during refactors, pending decisions, refactor tail) — check it before "fixing" a quirk in passing; it may be deliberate and tracked
- `docs/design-system-architecture.md` - Design system plan
- `docs/automation-overlay-states.md` - 6 automation overlay states
- `docs/clip-styling-states.md` - 10 clip styling states
- `docs/label-interactions.md` - Label selection, deletion, and track expansion behavior
- `docs/accessibility-architecture.md` - Roving tabindex hooks, tab group system, keyboard navigation patterns
- `docs/keyboard-handlers-map.md` - Complete keyboard handler location reference

## Build System

- **Packages**: Use tsup (esbuild-based) for fast TypeScript compilation
  - Outputs: CJS (`dist/index.js`), ESM (`dist/index.mjs`), Types (`dist/index.d.ts`)
  - Config in each `package.json` via `build` script

- **Sandbox**: Vite + React 19 (`apps/sandbox/vite.config.ts`)

- **Desktop**: Electron wrapping the built sandbox output

## Version Control

- Repository originally named `clip-envelopes-prototype`
- Default branch: `master`
- `.gitignore` excludes: `node_modules/`, `dist/`, `.claude/`. `pnpm-lock.yaml` is TRACKED (not ignored) — CI's `actions/setup-node` pnpm cache keys off it, so it must stay committed.

## Package Publishing (Future)

Packages will be published under their current scoped names to the npm registry:
- `@audacity-ui/core`
- `@audacity-ui/tokens`
- `@audacity-ui/components`
- `@audacity-ui/audio`

Use independent versioning (each package has its own version number).
