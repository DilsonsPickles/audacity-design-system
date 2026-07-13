# Code-Verified Accessibility Behaviour Inventory

> Produced by Task 1 (2026-07-13). **This file is the single source of truth** for
> the keyboard-accessibility handbook (Tasks 3–6). Every entry is grounded in a
> `file:line` reference that was read directly. Where code and the four prototype
> docs disagree, **the code wins** and the entry records what the code does.
>
> Status legend:
> - **VERIFIED** — handler exists in the active render tree and does what is recorded.
> - **DEAD-CODE** — implemented but not wired into the live tree.
> - **NOT-FOUND** — claimed in a doc, no implementation exists.
> - **UNCLEAR** — could not be fully established from code reading alone (Task 2 spot-checks live).
>
> **Profile-gated** answers "does the WCAG-flat profile disable this?" It is grounded in
> `packages/core/src/accessibility/profiles.ts` — see the Navigation-model section for the
> critical finding that the `keyboardShortcuts` gating block is **only read by dead code**.

---

## Cross-cutting foundational facts (read first)

### Two profiles, resolved by id
- **Behaviour:** `getProfileById(id)` returns `AU4_TAB_GROUPS_PROFILE` or `WCAG_FLAT_PROFILE`; **any unknown id silently falls back to `WCAG_FLAT_PROFILE`** (not AU4).
- **Status:** VERIFIED
- **Code:** `packages/core/src/accessibility/profiles.ts:439`
- **Profile-gated:** n/a

### `keyboardShortcuts` gating config is dead
- **Behaviour:** The `config.keyboardShortcuts` block (clips: shiftArrowExtend/cmdShiftArrowReduce/cmdArrowMove/cmdUpDownTrackMove; labels: …/deleteKey) exists in both profiles, but the **only** code that reads it is `useLabelKeyboardHandling.ts` — which is itself dead code (not in the render tree). No clip handler, and no global handler, consults it. Therefore all clip move/trim/stretch/delete shortcuts run **in both profiles**; the flat profile does NOT disable them.
- **Status:** VERIFIED (that the config is unused by live code)
- **Code:** config defined `packages/core/src/accessibility/profiles.ts:224` & `:411`; sole consumer `packages/components/src/hooks/useLabelKeyboardHandling.ts:67`
- **Profile-gated:** n/a — this IS the gating mechanism, and it is inert.

### What the flat profile actually changes
- **Behaviour:** `isFlatNavigation = activeProfile.config.tabNavigation === 'sequential'` drives (a) every focusable becoming `tabIndex=0` instead of roving, and (b) arrow-key sibling navigation being suppressed inside tab-group hooks. It does **not** disable the document-level keyboard shortcuts.
- **Status:** VERIFIED
- **Code:** `packages/components/src/hooks/useContainerTabGroup.ts:102`; `packages/components/src/hooks/useTabGroup.ts:147`; `packages/components/src/Track/TrackNew.tsx:429`

---

## Handbook page 1 — Navigation model

### Tab order — source of truth (`tabOrder`)
- **Behaviour:** AU4 assigns fixed positive tabIndex per group: `file-menu`=1, `project-toolbar`=2, `project-toolbar-actions`=3, `project-toolbar-workspace`=4, `project-toolbar-history`=5, `tool-toolbar`=6, `effects-panel`=7, `add-track`=98, `timeline-ruler`=99, `tracks`=100 (base), `selection-toolbar`=200. WCAG-flat `tabOrder` is `{}` (everything tabIndex 0, DOM order).
- **Status:** VERIFIED
- **Code:** `packages/core/src/accessibility/profiles.ts:209` (AU4), `:408` (flat)
- **Profile-gated:** n/a
- **Note:** The docs list a stale set (`tool-toolbar`=5, `effects-panel`=6, `add-track`=99, no `project-toolbar-history`, no `timeline-ruler`). Current code differs — see discrepancy report.

### Track tab-order stride = 4 (container +0, [unused +1], clips +2, ruler +3)
- **Behaviour:** Per track `i`, tab stops are: `.track` container = `trackBase + i*4`; clips group start = `trackBase + 2 + i*4`; per-track vertical ruler = `trackBase + 3 + i*4`. The `+1` slot is reserved but **not assigned** to any positive-tabIndex element. The side-panel `TrackControlPanel` is `tabIndex={-1}` (NOT a tab stop). `trackBase = useTabOrder('tracks') = 100`.
- **Status:** VERIFIED (spot-checked — live DOM with 4 tracks: container=100/104/108/112, clip=102/106/110/114, ruler=103/107/111/115; the `+1` slot unused; all `.track-control-panel` side panels `tabIndex=-1`; add-track=98, timeline-ruler=99)
- **Code:** container/clips `apps/sandbox/src/components/canvas/CanvasTrackList.tsx:250` (clips `trackBase+2+trackIndex*4`), `:251` (`trackTabIndex = trackBase+trackIndex*4`); ruler `apps/sandbox/src/components/EditorLayout.tsx:226`; panel `-1` `apps/sandbox/src/components/EditorLayout.tsx:492`; base `apps/sandbox/src/components/EditorLayout.tsx:220`
- **Profile-gated:** in flat mode all of these become `0` (same file lines, `isFlatNavigation ? 0 : …`).
- **Note:** Resolves Conflict 1. The `profiles.ts:219` comment ("stride 4 … container +0, panel +1, clips +2, ruler +3") is correct on the stride but its "panel +1" is misleading — the panel is not a live tab stop.

### `useContainerTabGroup` — container-level roving
- **Behaviour:** Resolves `startTabIndex` = explicit prop ?? `tabOrder[groupId]` ?? 0. Roving: first visible focusable gets `startTabIndex`, rest `-1`. Arrow Right/Down → next, Left/Up → prev (wrap per config), Home → first, End → last; skips hidden/disabled; blur resets first element to `startTabIndex`. Flat mode forces all to `0` and disables arrows. Falls back to roving+arrows+wrap when `groupId` is absent from the profile map.
- **Status:** VERIFIED
- **Code:** `packages/components/src/hooks/useContainerTabGroup.ts:95` (resolve), `:129` (arrows/Home/End), `:202` (blur reset), `:103` (flat/fallback)
- **Profile-gated:** arrows/roving disabled in flat.
- **Used by:** Toolbar, SelectionToolbar, TrackNew (clip cycling), EffectsPanel.

### `useTabGroup` — per-item roving
- **Behaviour:** Per-item hook: `baseTabIndex` = prop ?? `tabOrder[groupId]` ?? 0. Roving item gets baseTabIndex when active else `-1`; sequential gets 0. Arrow Right/Down → next, Left/Up → prev (wrap per config), Home/End; hidden-item skipping; entering the group from outside resets to item 0.
- **Status:** VERIFIED
- **Code:** `packages/components/src/hooks/useTabGroup.ts:120` (base), `:142` (tabIndex), `:202` (arrows), `:335` (focus-entry reset)
- **Profile-gated:** arrows only fire when `groupConfig.arrows` (false in flat).
- **Used by:** ProjectToolbar tabs, EffectsPanel grid cells, ExportModal/PreferencesModal `TabGroupField`.

### Global ArrowUp/Down = move track focus outline (with tab-group guard)
- **Behaviour:** Document handler moves the focused-track outline on ArrowUp/Down. Early-exits when the target is a clip (`data-clip-id`), a per-track ruler (`data-track-ruler-index`), inside `.project-toolbar`/`.transport-toolbar`, the add-track group, or inside a multi-item `[role=toolbar|group|menubar|region|menu]`. If a clip is selected-but-unfocused it steps from that clip's track; single-item groups fall through to first/last track. Shift held → range-extend track selection; Cmd/Ctrl held → focus moves but selection is left (peek). Track panel is explicitly exempted so its own arrow nav wins.
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:362` (guard chain), handler `apps/sandbox/src/hooks/handlers/navigationHandlers.ts:114`
- **Profile-gated:** no (always active).

### Global ArrowLeft/Right = playhead nudge / time-selection / clip move
- **Behaviour:** When nothing else claims the arrow (`defaultPrevented` short-circuits): plain = nudge playhead 0.1s (Alt = 1s); Shift = extend time selection 0.1s (Alt 1s); Cmd/Ctrl (no Shift) = move the focused clip / time-selection-overlapped clips / current clip selection (no playhead fallback), setting `pendingClipMoveResolution`; Cmd+Shift = reduce the time selection from that edge (via `handlePlayheadMove` reduce mode). Skipped inside inputs, sliders, and the project/transport toolbars.
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:622`; selection math `apps/sandbox/src/hooks/handlers/playheadSelectionHandlers.ts:15`
- **Profile-gated:** no (always active).

### F6 — block navigation (flat profile only)
- **Behaviour:** Cycles focus between major UI blocks (File → Home → Play → Add Track → track controls); Shift+F6 reverses. Only wired when `isFlatNavigation`.
- **Status:** VERIFIED
- **Code:** guard `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:355`; impl `apps/sandbox/src/hooks/handlers/navigationHandlers.ts:83`
- **Profile-gated:** yes — active only in WCAG-flat. (Undocumented in the four docs.)

---

## Handbook page 2 — Track view

### Clip container tabIndex & flat-mode opt-in
- **Behaviour:** In roving mode only the first clip on a track carries the group `tabIndex` (rest `-1`); in flat mode every clip is `tabIndex=0`.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:573`
- **Profile-gated:** flat opts every clip into Tab order.

### Clip — Enter = toggle/select
- **Behaviour:** Enter toggles clip selection; Shift+Enter range-select; Cmd/Ctrl+Enter toggle-in/out of multi-selection (`onClipClick(id, shiftKey, meta||ctrl)`).
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:633`
- **Profile-gated:** no.

### Clip — Shift+F10 / ContextMenu = open clip menu
- **Behaviour:** Opens the clip context menu at the clip's top-right, flagged keyboard-opened.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:645`
- **Profile-gated:** no.

### Clip — Cmd/Ctrl+Left/Right = move clip horizontally
- **Behaviour:** Moves the clip by ±0.1s (Alt = ±1s). `onClipMove`.
- **Status:** VERIFIED (spot-checked — Cmd+ArrowRight on a focused clip moved its start 2.7s→2.8s, +10px)
- **Code:** `packages/components/src/Track/TrackNew.tsx:659`
- **Profile-gated:** no (config exists but is not consulted — see foundational facts). Docs claim AU4-only; that gate is inert.

### Clip — Cmd/Ctrl+Up/Down = move clip to adjacent track
- **Behaviour:** Moves the clip to the track above/below. `onClipMoveToTrack(id, dir)`.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:668`
- **Profile-gated:** no (inert gate).

### Clip — Cmd/Ctrl release = overlap resolution
- **Behaviour:** Cmd+Arrow nudges set the module-scoped `pendingClipMoveResolution.current=true`; on Meta/Control **keyup**, `useCmdArrowMove` reconciles the moved clips' final resting positions against neighbours (`resolveOverlap` → `APPLY_CLIP_PLACEMENT`). Resolution fires on release, not per-nudge.
- **Status:** VERIFIED (spot-checked — after Cmd+ArrowRight nudges left clip 1 overlapping clip 32 mid-move, dispatching `keyup{key:'Meta'}` on document reconciled the neighbour: clip 32 start 3.8s→3.9s / 1.2s→1.1s. Nothing moved during the nudges; resolution fired only on release.)
- **Code:** `apps/sandbox/src/hooks/useCmdArrowMove.ts:52`; flag `apps/sandbox/src/utils/pendingClipMoveResolution.ts:9`; write sites `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:717` & `:742`
- **Profile-gated:** no. (Resolves Conflict 10.)

### Clip — edge editing lives on BRACKET keys, not Shift+Arrow
- **Behaviour:** `[` = right edge moves left (contract); `]` = right edge moves right (extend); `Shift+[` = left edge moves left (extend); `Shift+]` = left edge moves right (contract); step 0.1s; blocked-extend triggers a shake animation. Adding Cmd/Ctrl converts trim→stretch on the same edge/direction. Matched via `e.code`/`e.key`/`keyCode`.
- **Status:** VERIFIED (spot-checked — on a focused clip: `[` shrank the RIGHT edge (width −10px, left unchanged); `Shift+]` moved the LEFT edge right (left +10px, width −10px). On a clip already at full source, plain `]` was boundary-blocked (no change) while `Cmd+]` extended it 4.5s→4.6s — proving Cmd takes the stretch path, which ignores the source boundary that trim respects.)
- **Code:** `packages/components/src/Track/TrackNew.tsx:708`
- **Profile-gated:** no.
- **Note:** The docs claim clip trim is on **Shift+Arrow / Cmd+Shift+Arrow**. In code there is **no** Shift+Arrow clip-trim handler; trim/extend is the bracket family. See discrepancy report.

### Clip — Alt+Shift+Left/Right = time-stretch
- **Behaviour:** `Alt+Shift+ArrowLeft/Right` lengthens (left/right edge outward); adding Cmd/Ctrl shortens. Step 0.1s. `onClipStretch`.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:685`
- **Profile-gated:** no. (Undocumented in the four docs.)

### Clip — Shift+ArrowUp/Down = no-op (swallowed)
- **Behaviour:** Shift+Arrow Up/Down on a clip calls `preventDefault` and does nothing else.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:836`
- **Profile-gated:** no.

### Clip — plain ArrowUp/Down = move track focus
- **Behaviour:** Plain Arrow Up/Down on a focused clip moves TRACK focus to the row above/below (`onTrackNavigateVertical`); the clip loses focus.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:850`
- **Profile-gated:** no.

### Clip — plain ArrowLeft/Right = playhead (NOT clip cycling)
- **Behaviour:** Plain Arrow Left/Right on a clip is deliberately NOT handled locally and NOT delegated to the clip roving hook — it falls through to the global playhead nudge. Clip-to-clip stepping is on **Tab / Shift+Tab**, not arrows.
- **Status:** VERIFIED (spot-checked — plain ArrowLeft and ArrowRight on a focused clip left focus on that same clip; no clip-to-clip focus change)
- **Code:** clip falls through (comment) `packages/components/src/Track/TrackNew.tsx:862`; container returns for all arrows `:1257`; only Home/End delegate `:1263`
- **Profile-gated:** no.
- **Note:** Docs say ArrowLeft/Right cycles clips via `useContainerTabGroup`. Not true in current code — see discrepancy report.

### Clip — Tab / Shift+Tab = clip-to-clip / panel handoff
- **Behaviour:** Tab steps to the next clip in DOM order; on the last clip Tab hands off via `onTabFromLastClip` (ruler/next track). Shift+Tab on the first clip returns to the track panel (`onEnterPanel`); elsewhere steps to the previous clip. First Tab after a mouse-focus reveals the outline.
- **Status:** VERIFIED (spot-checked — after splitting clip 1 into two on one track: Tab from clip 1 → clip 32 (next clip), Tab from clip 32 (last) → Track 1 amplitude ruler, Shift+Tab from clip 32 → clip 1 (prev), Shift+Tab from first clip → Track 1 panel icon button)
- **Code:** `packages/components/src/Track/TrackNew.tsx:790`
- **Profile-gated:** no (behaviour differs implicitly because flat mode makes each clip its own native tab stop).

### Clip — Delete/Backspace = global cascade (bubbles up)
- **Behaviour:** The clip's own handler does **not** delete — it lets Delete/Backspace bubble to the document handler, which runs a priority cascade: selected labels → canvas time selection → focused/selected clips → tracks. The focused clip is read from `document.activeElement`'s `data-clip-id`/`data-track-index` **only when the user is keyboard-navigating**. Cmd/Ctrl+Delete is a separate always-delete-the-focused-clip path that reads `data-clip-id` directly and skips the cascade.
- **Status:** VERIFIED
- **Code:** clip bubbles `packages/components/src/Track/TrackNew.tsx:627`; cascade entry `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:903`; Cmd+Delete `:886`; impl `apps/sandbox/src/hooks/handlers/deleteHandlers.ts:19` (clip path reads DOM at `:146`)
- **Profile-gated:** no — Delete is NOT disabled in flat mode. (Resolves Conflict 5.)

### Track container — Enter = select/deselect track
- **Behaviour:** Enter on the `.track` container selects the track and deselects clips; Shift/Cmd variants passed through (`onContainerEnter`).
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:1154`
- **Profile-gated:** no.

### Track container — Cmd/Ctrl+Up/Down = reorder track
- **Behaviour:** Cmd/Ctrl+Arrow Up/Down on the focused `.track` reorders the track row (`onTrackReorder`), passing whether it was container-focused.
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:1161`
- **Profile-gated:** no.

### Track container — plain/Shift Up/Down = navigate / range-select tracks
- **Behaviour:** Plain Arrow Up/Down navigates between tracks (selection follows focus in follows-focus mode); Shift extends the range (`onTrackNavigateVertical`).
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:1170`
- **Profile-gated:** no.

### Track container — Tab / Shift+Tab = enter panel / previous track
- **Behaviour:** (non-flat) Tab from a keyboard-focused container enters the panel controls (`onEnterPanel`); empty track hands off to ruler/next track; mouse-invisible-focus Tab jumps to the nearest clip. Shift+Tab goes to the previous track (`onShiftTabOut`).
- **Status:** VERIFIED
- **Code:** `packages/components/src/Track/TrackNew.tsx:1183` (Tab), `:1237` (Shift+Tab)
- **Profile-gated:** yes — this custom Tab routing is gated `!isFlatNavigation`; flat mode lets the browser walk natively.

### Playhead — `,` and `.` = 1s jumps (directions are , = LEFT, . = RIGHT)
- **Behaviour:** `,`/`<` move the playhead LEFT 1s; `.`/`>` move it RIGHT 1s. Shift extends the time selection in that direction (via `handlePlayheadMove`). Skipped when Cmd/Ctrl held (Cmd+, opens Preferences).
- **Status:** VERIFIED
- **Code:** dispatch `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:782` (`isLeftward = ',' || '<'`); impl `apps/sandbox/src/hooks/handlers/playheadSelectionHandlers.ts:15`
- **Profile-gated:** no.
- **Note:** Docs state `,`=right, `.`=left — reversed. And docs' `Cmd+Shift+,`/`Cmd+Shift+.` selection-reduce does not exist on comma/period (Cmd excludes them); reduce is on Cmd+Shift+Arrow. (Resolves Conflict 4.)

### Playhead — J/K = clip-edge jumps (undocumented)
- **Behaviour:** Plain J/K jump the playhead to the previous/next clip edge on the focused track; Shift+J/Shift+K jump to the earliest-start / latest-end of that track's clips (project fallback when none focused).
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:511`
- **Profile-gated:** no. (Undocumented in the four docs.)

### Home / End (and Shift variants)
- **Behaviour:** Home → playhead to 0 + clear time selection; End → playhead to project end. Shift+Home / Shift+End extend/create a time selection from the playhead to 0 / project end. Skipped inside toolbars/menubars (native Home/End there).
- **Status:** VERIFIED
- **Code:** guard `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:224`; impl `apps/sandbox/src/hooks/handlers/navigationHandlers.ts:17`
- **Profile-gated:** no.

### Labels — keyboard move/trim (Cmd+Arrow, Shift/Cmd+Shift+Arrow) is DEAD CODE
- **Behaviour:** `useLabelKeyboardHandling.ts` implements Cmd+Arrow move and Shift/Cmd+Shift+Arrow region-edge trim, gated on the (also-dead) `keyboardShortcuts.labels` config — but it is only exported from barrels and imported by nothing in the render tree. The live `LabelRenderer.tsx` has no `onKeyDown`. These label shortcuts do not run.
- **Status:** DEAD-CODE
- **Code:** impl `packages/components/src/hooks/useLabelKeyboardHandling.ts:53`; only references are barrel exports (`packages/components/src/hooks/index.ts:14`, `packages/components/src/index.ts:120`) — no render-tree import
- **Profile-gated:** n/a (never runs). (Resolves Conflict 2.)

### Labels — Delete/Backspace = delete selected labels (live)
- **Behaviour:** Delete/Backspace with labels selected deletes them via the global cascade priority 1 (`handleDeleteLabels`, dispatches `UPDATE_TRACK` with a filtered `labels` array — there is no `DELETE_LABEL` action).
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/hooks/handlers/deleteHandlers.ts:43` (via cascade `:23`)
- **Profile-gated:** no.

### Labels — mouse move/resize/expand (live)
- **Behaviour:** Ear mouse-down resizes region-label edges; banner mouse-down/click moves a label or expands a point label to all tracks (`UPDATE_LABEL`). Rendered by `LabelRenderer.tsx` from `CanvasTrackList.tsx`.
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/components/LabelRenderer.tsx` (rendered from `apps/sandbox/src/components/canvas/CanvasTrackList.tsx`)
- **Profile-gated:** no (mouse).

### F2 rename — clip and label: NOT-FOUND; track name: VERIFIED (undocumented)
- **Behaviour:** There is **no** F2 handler on clips or labels. The only F2 in the codebase renames the **track name** (Enter or F2 on the focused track-name span starts inline rename).
- **Status:** clip F2 = NOT-FOUND; label F2 = NOT-FOUND; track-name F2 = VERIFIED
- **Code:** sole F2 `packages/components/src/TrackControlPanel/TrackControlPanel.tsx:831`
- **Profile-gated:** no. (Resolves Conflict 3.)

---

## Handbook page 3 — Toolbars & panels

### Toolbars (transport, tool) — roving via `useContainerTabGroup`
- **Behaviour:** `role="toolbar"`, one Tab stop; ArrowLeft/Up = previous, ArrowRight/Down = next (wrap), Home/End, blur reset. Tool-toolbar filters out elements inside a `role="group"` (e.g. TimeCode) so the group is a single stop.
- **Status:** VERIFIED
- **Code:** `packages/components/src/hooks/useContainerTabGroup.ts:129`
- **Profile-gated:** flat → every button its own Tab stop, no arrows.

### Selection toolbar — configured tabIndex 200 but effectively 0
- **Behaviour:** `SelectionToolbar` uses `useContainerTabGroup(groupId:'selection-toolbar')`, resolving `startTabIndex` = `tabOrder['selection-toolbar']` = 200; its focusables selector is `[role="group"]` (the TimeCode groups). However the `TimeCode` component hardcodes `tabIndex={0}` on its `role="group"` container and re-asserts `0` after menu interactions — so the timecode group is observed at tabIndex 0, placing it after all positive tabIndexes (1–107) and making it the last stop that then wraps.
- **Status:** VERIFIED
- **Code:** container `packages/components/src/SelectionToolbar/SelectionToolbar.tsx:126`; hardcoded `packages/components/src/TimeCode/TimeCode.tsx:407`; re-assert `:470`
- **Profile-gated:** no.
- **Note:** Resolves Conflict 8 — the profile's 200 is effectively overridden by the component's own tabIndex=0.

### Effects panel — HAS arrow/roving navigation (docs "arrows disabled" is wrong)
- **Behaviour:** `EffectsPanel` uses `useContainerTabGroup(groupId:'effects-panel')` and delegates its `onKeyDown` to the hook; the AU4 profile config is `{tabindex:'roving', arrows:true, wrap:true}`, so arrows navigate between effect controls. Each `EffectSlot` adds its own keyboard model: Enter on the drag handle enters "move mode", Up/Down reorders, Enter/Escape exits; arrow keys otherwise step between focusable controls.
- **Status:** VERIFIED
- **Code:** panel `packages/components/src/EffectsPanel/EffectsPanel.tsx:359` (hook) & `:421` (delegate); config `packages/core/src/accessibility/profiles.ts:81`; slot `packages/components/src/EffectsPanel/EffectSlot.tsx:171`
- **Profile-gated:** flat disables arrows.
- **Note:** Resolves Conflict 6 — CLAUDE.md ("grid keyboard navigation") is right; `track-view-navigation.md` ("arrows disabled, Enter to open") is wrong.

### Track Control Panel (side panel) — manual two-level nav, panel is NOT a canvas tab stop
- **Behaviour:** Container `role="group"`, `tabIndex={-1}` in the live layout. Manual `handleKeyDown`:
  - Panel focused: Enter selects/toggles the track (Shift+Enter range, Cmd/Ctrl+Enter toggle, plain-Enter-on-selected deselects); Shift+F10/ContextMenu opens the track menu; ArrowUp/Down navigate between track headers (Cmd/Ctrl+Arrow reorders this track); **ArrowLeft/ArrowRight are no-ops** (they do NOT enter children — the `isPanelFocused` branch at `:530` returns before the first-child branch at `:583` can run); Tab → focus icon button (this is the only way INTO the children); Shift+Tab → out to container.
  - Child focused: all four arrows cycle children **with wrap** (last→first, first→last) — they do **NOT** return to the panel; the panel's own Escape handler (`:466`) focuses the panel, but because it does not `stopPropagation` the global Escape cascade (`useKeyboardShortcuts.ts:188`) then re-anchors focus to the `.track` canvas container when a `focusedTrackIndex` is set — so the observed resting place after Escape is the track container, not the panel; Tab (non-Shift) → out to clips; Shift+Tab → out to container.
  - Pan/Volume use a "slot" model: arrow lands on the slot, Enter pushes focus into the knob/slider, Escape/Enter pops back. Disabled in flat mode.
- **Status:** VERIFIED (spot-checked — CORRECTED: panel-focused ArrowLeft/ArrowRight left focus on the panel (no child entry); Tab from focused panel → "Change Track N icon" child; child-focused ArrowRight cycled icon→rename→menu→Pan; Escape from a child landed on the `.track` container, not the panel. See discrepancy report.)
- **Code:** `packages/components/src/TrackControlPanel/TrackControlPanel.tsx:380` (handler), Enter `:426`, menu `:450`, Escape `:466` (no stopPropagation → global cascade `useKeyboardShortcuts.ts:188` re-anchors to `.track`), Tab-into-children `:491`, panel-focused arrows return early `:530`, child-out `:516`, arrow track nav + reorder `:530`, **child wrap** `:597`, dead first-child branch `:583`, slot model `:392`; live `tabIndex={-1}` at `apps/sandbox/src/components/EditorLayout.tsx:492`
- **Profile-gated:** flat → children each get `tabIndex=0` (`childTabIndex`), manual arrow/slot nav suppressed.
- **Note:** Resolves Conflict 9 — the "after last child → back to panel" doc claim is wrong; children wrap child-to-child. Panel returns to via Escape only.

### Track Control Panel — icon picker flyout grid
- **Behaviour:** The track-icon button opens a roving 4-column grid: Left/Right wrap, Up/Down clamp by column, Home/End, Escape closes and returns to the trigger, Enter/Space commits (native button).
- **Status:** VERIFIED
- **Code:** `packages/components/src/TrackControlPanel/TrackControlPanel.tsx:734`
- **Profile-gated:** no. (Undocumented in the four docs.)

### Timeline ruler — focusable region
- **Behaviour:** The timeline ruler wrapper is `role="region"` aria-label "Timeline ruler", `tabIndex = useTabOrder('timeline-ruler')` (=99), with its own keydown (playhead nudge/escape/context menu).
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/components/EditorLayout.tsx:524`
- **Profile-gated:** flat → 0.

### Application header menubar — arrow nav, WINDOWS variant only
- **Behaviour:** In the Windows variant the menu bar is `role="menubar"`; ArrowRight/Down = next item, ArrowLeft/Up = previous (both wrap); Tab/Shift+Tab pass through; roving tabIndex (first item = `file-menu`=1, rest -1; flat → all get the menu tabIndex). The **macOS variant renders no menu bar** (traffic lights + app name only). `os` comes from `preferences.operatingSystem`.
- **Status:** VERIFIED (spot-checked, partial — the running app defaults to `os='windows'` (`PreferencesContext.tsx:78`; localStorage `audacity-preferences.operatingSystem='windows'`; Debug panel exposes a Windows/macOS toggle), and Windows chrome is live (observed `.dialog-header--windows` on modals). The menubar itself could NOT be rendered in the preview: `App.tsx:756` gates `ApplicationHeader` behind `!IS_ELECTRON`, and the preview browser's UA contains `Electron/…` so `IS_ELECTRON` is true and the header is suppressed. In a normal (non-Electron) browser with the default os=windows, the `role="menubar"` renders; the desktop Electron app suppresses it in favour of the native OS menu. Menubar arrow-nav remains code-verified only.)
- **Code:** menubar keydown `packages/components/src/ApplicationHeader/ApplicationHeader.tsx:159`; role `:252`; tabIndex `:262`; macOS no-menubar branch `:183`; wired `apps/sandbox/src/App.tsx:757`; render gate `apps/sandbox/src/App.tsx:756` (`!IS_ELECTRON`, defined `:27`)
- **Profile-gated:** flat → all menu buttons tab-stops; arrows suppressed. Also conditioned on `os==='windows'` AND `!IS_ELECTRON`.
- **Note:** Docs say ArrowLeft/Right; code also handles Up/Down and only exists in the Windows variant.

---

## Handbook page 4 — Modals & menus

### Export modal — group IDs are export-type / file / audio-options / rendering / footer
- **Behaviour:** `ExportModal` wraps fields in `TabGroupField` (→ `useTabGroup`) with groupIds `export-type`, `file`, `audio-options`, `rendering`, `footer`, all `resetKey="export-modal"`. These match `profiles.ts`. The alternate IDs `export-settings`/`format-options`/`additional-options` appear **nowhere** in code.
- **Status:** VERIFIED
- **Code:** `packages/components/src/ExportModal/ExportModal.tsx:464` (export-type), `:497` (file), `:630` (audio-options), `:1078` (rendering), `:1099` (footer); profile defs `packages/core/src/accessibility/profiles.ts:165`
- **Profile-gated:** flat → sequential, arrows off.
- **Note:** Resolves Conflict 7 — the doc's top-of-file names are correct; its "Implementation Details" names are wrong/nonexistent.

### Export/modal roving — arrows within group, Tab between groups, Escape closes
- **Behaviour:** Within each group Arrow Up/Down (and Left/Right) rove with wrap (AU4 `export-*`/`file`/`audio-options`/`rendering`/`footer` are `wrap:true`), Home/End; Tab moves between groups; Escape closes (documented behaviour of the modal shell).
- **Status:** VERIFIED (roving mechanics via `useTabGroup`); modal-Escape RESOLVED = **NOT wired** (spot-checked); dropdown focus-restoration RESOLVED = wired (spot-checked)
- **Code:** mechanics `packages/components/src/hooks/useTabGroup.ts:202`; config `packages/core/src/accessibility/profiles.ts:165`; modal close paths `packages/components/src/ExportModal/ExportModal.tsx:449` (overlay onClick), `:455` (DialogHeader X), `:1123` (Cancel); dropdown Escape+focus-restore `packages/components/src/Dropdown/Dropdown.tsx:125` (Escape) & `:132` (`triggerRef.current.focus()`)
- **Profile-gated:** flat disables arrows.
- **Note:** The export-modal doc says groups use `wrap:false`; the actual AU4 profile sets `wrap:true` for these groups. **Spot-check findings:** (1) The `ExportModal` has NO Escape handler — Escape does NOT close it (verified live: Escape dispatched at modal root, overlay, focused button, and document all left the modal open). It closes only via overlay-click, the DialogHeader X, or the Cancel button. (2) The nested `Dropdown` DOES restore focus to its trigger on Escape (code `Dropdown.tsx:125-134`; live: Enter opened the listbox, Escape closed it — the exact focus landing was inconclusive under synthetic dispatch because focus was not inside the dropdown menu). Live roving observed: within each `TabGroupField` group the first control is `tabIndex=0`, the rest `-1`.

### Preferences modal — tab groups
- **Behaviour:** Uses `preferences-content` (region id) and `dialog-footer` (roving footer buttons via `TabGroupField`/`useTabGroup`); the audio/playback/spectral sections use their own groupIds listed in `profiles.ts`.
- **Status:** VERIFIED (that these IDs/groups are wired); per-control detail RESOLVED (spot-checked)
- **Code:** `packages/components/src/PreferencesModal/PreferencesModal.tsx:132` (content), `:162` (dialog-footer); field wrapper `packages/components/src/PreferencesModal/TabGroupField.tsx:37`; profile groups `packages/core/src/accessibility/profiles.ts:88`
- **Profile-gated:** flat → sequential.
- **Note (spot-check):** The `dialog-footer` IS roving — live it showed "Reset preferences" `tabIndex=0`, "Cancel"/"OK" `tabIndex=-1`, and ArrowRight cycled Reset → Cancel → OK. The content-area controls are sequential (`tabIndex=0` in DOM order — sampled: language buttons, path input, Browse, checkboxes). The left-hand section nav items are all `role="tab"`, `tabIndex=0`. (Like the ExportModal, Escape did not close the Preferences modal in the live app; it closes via the DialogHeader controls / Cancel.)

### Cmd/Ctrl+, — open Preferences
- **Behaviour:** Opens the preferences modal (`onOpenPreferences`), consuming the comma so the playhead-jump handler never sees it.
- **Status:** VERIFIED
- **Code:** `apps/sandbox/src/hooks/useKeyboardShortcuts.ts:209`
- **Profile-gated:** no. (Undocumented in the four docs.)

### Context menus — Shift+F10 / ContextMenu open; menu is `role="menu"`
- **Behaviour:** Clip and track Shift+F10/ContextMenu open the respective context menu and (per the clip/panel handlers) place it for keyboard use. Menu internals render via `Menu`/`ContextMenu` components with `role="menu"`.
- **Status:** VERIFIED (open trigger); intra-menu arrow nav RESOLVED = VERIFIED (spot-checked)
- **Code:** clip `packages/components/src/Track/TrackNew.tsx:645`; panel `packages/components/src/TrackControlPanel/TrackControlPanel.tsx:450`
- **Profile-gated:** no.
- **Note (spot-check):** Shift+F10 on a focused clip opened the `role="menu"` `.clip-context-menu` (14 `role="menuitem"` items). With focus on a menu item, ArrowDown stepped Rename clip → Clip color → Cut → Copy and ArrowUp reversed — intra-menu arrow navigation works. (Under synthetic keyboard open, focus did not auto-enter the menu; a real render likely focuses the first item.)

---

## Undocumented behaviours found (not in any of the four docs) — must appear in the handbook

| Surface | Key(s) | Behaviour | Code |
|---|---|---|---|
| Global | Space | Play/pause transport (skips text fields) | `useKeyboardShortcuts.ts:235` |
| Global | R | Toggle record | `useKeyboardShortcuts.ts:249` |
| Global | E | Toggle effects panel for focused track (restores focus on close) | `useKeyboardShortcuts.ts:267` → `effectsPanelHandlers.ts:11` |
| Global | S | Toggle split tool | `useKeyboardShortcuts.ts:273` |
| Global | Shift+S / Shift+U | Solo / Mute focused (or selected) track(s) | `useKeyboardShortcuts.ts:289` |
| Global | L | Toggle loop region | `useKeyboardShortcuts.ts:343` |
| Global | F6 / Shift+F6 | Block navigation (flat profile only) | `useKeyboardShortcuts.ts:355` |
| Playhead | J/K, Shift+J/K | Jump playhead to clip edges / cluster bounds | `useKeyboardShortcuts.ts:511` |
| Global | Cmd/Ctrl+, | Open Preferences | `useKeyboardShortcuts.ts:209` |
| Global | Ctrl/Cmd+K | Delete selected time range | `useKeyboardShortcuts.ts:791` |
| Global | Cmd/Ctrl+I | Split clip(s) at playhead | `useKeyboardShortcuts.ts:800` |
| Global | Cmd/Ctrl+Shift+I | Split every track at playhead | `useKeyboardShortcuts.ts:810` |
| Global | Cmd/Ctrl+Z / Shift+Z / Y | Undo / Redo | `useKeyboardShortcuts.ts:816` |
| Global | Cmd/Ctrl+C / X / V | Copy / Cut / Paste clips | `useKeyboardShortcuts.ts:828` |
| Global | Cmd/Ctrl+T / Shift+T / Shift+L | New mono / stereo / label track | `useKeyboardShortcuts.ts:855` |
| Global | Cmd/Ctrl+D | Duplicate focused clip(s)/track(s) | `useKeyboardShortcuts.ts:861` |
| Global | Cmd/Ctrl+W | Close (delete) focused track | `useKeyboardShortcuts.ts:867` |
| Global | Cmd/Ctrl+Delete | Delete focused clip (skips cascade) | `useKeyboardShortcuts.ts:886` |
| Global | Escape | Priority cascade: split-mode → clear time/clip selection → narrow track selection → unwind track focus → blur | `useKeyboardShortcuts.ts:123` |
| Clip | Alt+Shift+Left/Right (±Cmd) | Time-stretch clip edges | `TrackNew.tsx:685` |
| Clip | `[` `]` `Shift+[` `Shift+]` (±Cmd) | Trim / stretch clip edges | `TrackNew.tsx:708` |
| Track name | F2 / Enter | Inline rename track | `TrackControlPanel.tsx:831` |
| Track panel | icon flyout grid arrows | Choose track icon | `TrackControlPanel.tsx:734` |
