# Accessibility Docs vs Code — Discrepancy Report

> Produced by Task 1 (2026-07-13). Companion to `2026-07-13-a11y-behaviour-inventory.md`.
> Every row states what a doc claims, what the code actually does, and a verdict.
> **The code is the source of truth.** Docs referenced:
> `track-view-navigation.md` (TVN), `keyboard-handlers-map.md` (KHM),
> `accessibility-architecture.md` (AA), `export-modal-accessibility.md` (EMA),
> plus `CLAUDE.md`.

## The 10 planned conflicts — explicit verdicts

| # | Claim | Source doc(s) | What the code actually does | Verdict |
|---|-------|---------------|-----------------------------|---------|
| 1 | Track tab-order stride | AA says stride 3 (container 100 / panel 101 / clips 102); TVN audit + CLAUDE.md say stride 2 (panels 100/102, clips 101/103) | **Stride 4.** container=`base+i*4`, clips=`base+2+i*4`, ruler=`base+3+i*4`; the `+1` slot is unused and the side-panel is `tabIndex=-1`. `profiles.ts:219` comment ("stride 4: container+0, panel+1, clips+2, ruler+3") is correct on the number but "panel+1" is not a live tab stop. (`CanvasTrackList.tsx:250-251`, `EditorLayout.tsx:226,492`) | Both docs WRONG; code = stride 4 |
| 2 | Label keyboard move/trim (Cmd/Shift+Arrow) | KHM says DEAD CODE; TVN documents it as live | `useLabelKeyboardHandling.ts` + `LabelMarker` are exported from barrels only, imported by no render-tree component; live `LabelRenderer.tsx` has no `onKeyDown`. Shortcuts never run. | KHM correct; TVN WRONG → **DEAD-CODE** |
| 3 | F2 rename (clip and label) | TVN only | No F2 handler on clips or labels anywhere. The only F2 renames the **track name** (`TrackControlPanel.tsx:831`). | Clip/label F2 = **NOT-FOUND**; track-name F2 = VERIFIED (undocumented) |
| 4 | Playhead `,`/`.` (+ Shift / Cmd+Shift variants) | TVN | `,`/`<` = playhead **LEFT** 1s, `.`/`>` = **RIGHT** 1s (TVN has directions reversed). Shift extends selection. Cmd/Ctrl **excludes** comma/period (Cmd+, = Preferences), so the claimed `Cmd+Shift+,`/`Cmd+Shift+.` selection-reduce does not exist there — reduce is on **Cmd+Shift+Arrow**. (`useKeyboardShortcuts.ts:782`, `playheadSelectionHandlers.ts:15`) | Partly VERIFIED, directions REVERSED; Cmd+Shift comma/period = NOT-FOUND |
| 5 | Delete/Backspace on clips | KHM: global handler reads `data-clip-id` from `document.activeElement`; TVN implies clip-level AU4-only | Plain Delete is a **global** priority cascade (labels→time→clips→tracks); it reads the focused clip's `data-clip-id` **only when keyboard-navigating**. Cmd+Delete separately reads `data-clip-id` directly. **Not profile-gated** — works in flat too. (`useKeyboardShortcuts.ts:903,886`; `deleteHandlers.ts:19,146`) | KHM mostly correct; TVN's "AU4-only" WRONG (always active) |
| 6 | Effects panel arrows | TVN: "arrows disabled, Enter to open"; CLAUDE.md: grid keyboard nav | AU4 `effects-panel` config = `arrows:true`; `EffectsPanel` delegates to `useContainerTabGroup`; `EffectSlot` adds Enter-move-mode + Up/Down reorder. Arrows are enabled. (`EffectsPanel.tsx:359,421`; `EffectSlot.tsx:171`; `profiles.ts:81`) | CLAUDE.md correct; TVN WRONG |
| 7 | Export modal group IDs | EMA: top says `export-type/file/audio-options/rendering/footer`; its "Implementation Details" says `export-settings/format-options/additional-options/footer` | Code uses `export-type`, `file`, `audio-options`, `rendering`, `footer` (match `profiles.ts`). `export-settings`/`format-options`/`additional-options` exist nowhere. (`ExportModal.tsx:464,497,630,1078,1099`) | Top-of-doc CORRECT; Implementation-Details names WRONG/nonexistent |
| 8 | Selection-toolbar tab position | `tabOrder`=200, but live audit shows timecode at tabIndex 0 appearing first & last | `SelectionToolbar` resolves startTabIndex 200 for its `[role=group]` timecode, but `TimeCode` hardcodes `tabIndex={0}` on its container and re-asserts 0 after menu use — so it sits at 0, after all positive tabIndexes, as the last stop that wraps. (`SelectionToolbar.tsx:126`; `TimeCode.tsx:407,470`) | Explained: component tabIndex=0 overrides profile 200 |
| 9 | Track-header child nav "after last child → back to panel" | KHM (and AA table) | Child-level arrows **wrap child-to-child** (`(i+1)%len`), never returning to the panel; only **Escape** returns to the panel. (`TrackControlPanel.tsx:597,466`) | Doc WRONG (wraps, no auto-return) |
| 10 | Cmd+Up/Down clip-move-to-track + Cmd-release overlap resolution | KHM/TVN | Cmd+Up/Down moves clip to adjacent track (`TrackNew.tsx:668`); Cmd+Arrow nudges set `pendingClipMoveResolution`; overlap reconciliation fires on **Meta/Control keyup** via `useCmdArrowMove` (`resolveOverlap`). (`useCmdArrowMove.ts:52`; `pendingClipMoveResolution.ts:9`) | VERIFIED — fires on release |

## Additional discrepancies found (beyond the 10)

| Claim | Source | What the code does | Verdict |
|-------|--------|--------------------|---------|
| Clip trim/extend on **Shift+Arrow / Cmd+Shift+Arrow** | TVN, KHM, AA | No Shift+Arrow clip-trim handler exists. Clip edge editing is on the **bracket keys** `[` `]` (`±Shift` edge, `±Cmd` stretch). Shift+ArrowUp/Down on a clip is a swallowed no-op; Shift+ArrowLeft/Right falls through to global selection-extend. (`TrackNew.tsx:708,836`) | Doc WRONG — wrong keys |
| Clip **ArrowLeft/Right cycles clips** via `useContainerTabGroup` | KHM, AA | Container returns early for all arrows; only Home/End delegate to the roving hook. Clip-to-clip stepping is on **Tab/Shift+Tab**; plain ArrowLeft/Right nudges the playhead. (`TrackNew.tsx:862,1257,1263`) | Doc WRONG — arrows don't cycle clips |
| `keyboardShortcuts` config gates clip shortcuts by profile ("AU4 only, disabled in Flat") | TVN, AA | The config is read **only** by the dead `useLabelKeyboardHandling.ts`. No clip/global handler consults it → clip move/trim/stretch/delete run in **both** profiles. Flat mode only changes tabIndex/arrow-roving. (`profiles.ts:224`; `useLabelKeyboardHandling.ts:67`) | Doc misleading — gate is inert |
| `tabOrder` values (TVN/AA tables) | TVN, AA | Current AU4 `tabOrder` differs: adds `project-toolbar-history`=5, shifts `tool-toolbar`=6, `effects-panel`=7, `add-track`=98, adds `timeline-ruler`=99. (`profiles.ts:209`) | Docs STALE |
| Export-modal groups use `wrap:false` | EMA | AU4 profile sets these groups `wrap:true`. (`profiles.ts:165-197`) | Doc WRONG |
| Application-header menu ArrowLeft/Right only | KHM, AA | Menubar handles all four arrows (Up/Down too) with wrap, and exists **only** in the Windows `os` variant; macOS renders no menubar. (`ApplicationHeader.tsx:159,183`) | Doc incomplete |
| TVN "Actual Tab Flow Audit" (Feb 2026) | TVN | Stale: predates stride-4 layout, per-track rulers (tabOrder 99/… `base+3`), and `project-toolbar-history`; shows panels as tab stops though the live side-panel is `tabIndex=-1`. | Audit STALE |
| Unknown-profile-id fallback | (implicit) | `getProfileById` falls back to **WCAG_FLAT**, not AU4 — a real footfun for test wrappers passing a bad id. (`profiles.ts:439`) | Note for handbook |

## Items by status (for handbook authors)

- **DEAD-CODE:** label keyboard move/trim (`useLabelKeyboardHandling.ts`), `LabelMarker` component, and the entire `keyboardShortcuts` gating config (only consumer is the dead hook).
- **NOT-FOUND:** F2 rename on clips; F2 rename on labels; `Cmd+Shift+,` / `Cmd+Shift+.` selection-reduce; clip trim on Shift+Arrow; clip cycling on ArrowLeft/Right.
- **UNCLEAR (Task 2 to spot-check live):** export-modal Escape-to-close & dropdown focus-restoration wiring; preferences-modal per-control roving detail; intra-context-menu arrow navigation; whether the running app uses `os='macos'` (no menubar) or `os='windows'` (menubar live) by default.
