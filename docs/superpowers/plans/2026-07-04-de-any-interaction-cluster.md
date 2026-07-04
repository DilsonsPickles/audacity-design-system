# De-`any` the Interaction Cluster — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant `any` from the interaction core (Canvas + keyboard handlers + clip hooks) so the compiler type-checks the code agents edit most. Annotation-only, zero behavior change.

**Architecture:** Canvas already consumes the typed context (`useTracksState()`/`useTracksDispatch()`), and the handler modules already take typed `deps.state: TracksState`. So the `(t: any)`/`(c: any)` annotations are redundant — removing them lets inference supply `Track`/`Clip`/`Label`/`MidiClip`. `tsc` verifies each removal; a surfaced error is a real masked access to fix, never to silence with a new `any`.

**Tech Stack:** TypeScript 5, Vitest 4 (behavior backstop; `tsc` is the primary gate).

## Global Constraints

- Work on branch `refactor/de-any-interaction-cluster` (already created).
- **Annotation-only. ZERO behavior change** — remove/correct only type annotations and casts; no logic, control-flow, payload, or value edits.
- **Never add `any` to silence a `tsc` error.** A surfaced error means the annotation masked a real access — fix the access; if it reveals a genuine type gap, fix the type correctly or leave that one annotation with a `// justified: <reason>` comment. Report any such case.
- `as any` casts: remove the lazy ones; keep genuinely-justified ones (dynamic string-index with no index signature, loose-string fields like `Track.icon` vs `IconName`, external-lib boundaries) with a one-line justification comment.
- Verify: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` (primary), `pnpm --filter @audacity-ui/sandbox test` (backstop), `pnpm --filter @audacity-ui/sandbox build`.

---

## Shared Procedure `P` (every de-any task follows this)

For the file(s) named in the task:
1. Inventory: `grep -nE ': any|as any' <file>` — list each occurrence.
2. **Inline annotations** (`(x: any)`, `param: any` on a `.map`/`.filter`/`.forEach`/`.find`/`.some`/`.sort`/`.findIndex` callback, or a local `const x: any` that inference can supply): delete the `: any`. Work in small batches; after each batch run `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json 2>&1 | grep <file-basename>` and confirm clean. If an error surfaces, the annotation masked a real access — fix the access (the property exists on the inferred `Track`/`Clip`/etc.), do NOT re-add `any`. If it reveals a genuine type gap you cannot resolve cleanly, restore that ONE annotation with a `// justified: <reason>` comment and record it in the report.
3. **`as any` casts**: for each, decide remove-or-keep. Remove if unnecessary (inference now covers it) or replaceable by a precise cast/`keyof` access. Keep with a `// justified: <reason>` comment if it's a genuine dynamic-index / loose-string / external-lib boundary.
4. After the file(s) are done: `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` fully clean (no errors anywhere), then `pnpm --filter @audacity-ui/sandbox test` (full suite green) and `pnpm --filter @audacity-ui/sandbox build` (green).
5. Commit.

Because this is annotation-only, there is no new unit test — `tsc` + the existing suite are the gates. If a masked-access fix in step 2 changes any value/behavior (should be rare), STOP and report it (it's no longer annotation-only).

---

## Task 0: Baseline

- [ ] **Step 1:** `git branch --show-current` → `refactor/de-any-interaction-cluster`.
- [ ] **Step 2:** `pnpm --filter @audacity-ui/sandbox test` → all pass (~168). If red, STOP.
- [ ] **Step 3:** `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` → clean. If not, STOP.
- [ ] **Step 4:** Record the cluster baseline: `grep -rcE ': any|as any' apps/sandbox/src/components/Canvas.tsx apps/sandbox/src/hooks/handlers apps/sandbox/src/hooks/useClip*.ts` — note per-file counts for the final comparison.

---

## Task 1: Group A — `Canvas.tsx`

**Files:** Modify `apps/sandbox/src/components/Canvas.tsx` (~44 `any`).

Apply **Procedure `P`**. Notes specific to this file:
- `tracks` (and the other destructured fields) come from `useTracksState()` (line ~209) and are already typed, so `tracks.map((t: any) => …)`, `t.clips.forEach((c: any) => …)`, `track.midiClips.map((mc: any) => …)`, etc. are all redundant — drop the annotations.
- Watch for `(track.clips as any).map(...)` and `track.clips as any` (~line 1040) and the theme dynamic-index cast (`(theme.audio.clip as any)[track.color]`) — the latter is the documented dynamic-index case: keep with `// justified:` (mirrors EditorLayout). The `track.clips as any` casts are likely removable now that `track` is `Track` — verify with `tsc`.

- [ ] **Step 1:** Apply Procedure `P` to `Canvas.tsx`.
- [ ] **Step 2:** Commit — `git commit -am "refactor(types): drop redundant any in Canvas.tsx (annotation-only)"`

---

## Task 2: Group B — split & duplicate handlers

**Files:** Modify `apps/sandbox/src/hooks/handlers/splitHandlers.ts` (~16), `apps/sandbox/src/hooks/handlers/duplicateHandlers.ts` (~12).

Apply **Procedure `P`**. Notes: both take `deps.state: TracksState`, so their `(t: any)`/`(c: any)` inline annotations (carried verbatim from Canvas when these were extracted) are redundant — drop them; inference supplies `Track`/`Clip`.

- [ ] **Step 1:** Apply Procedure `P` to both files.
- [ ] **Step 2:** Commit — `git commit -am "refactor(types): drop redundant any in split/duplicate handlers"`

---

## Task 3: Group C — delete / clipboard / trackCreation handlers

**Files:** Modify `apps/sandbox/src/hooks/handlers/deleteHandlers.ts` (~8), `clipboardHandlers.ts` (~5), `trackCreationHandlers.ts` (~4).

Apply **Procedure `P`**. Note: `clipboardHandlers` defines `ClipboardState { clips: any[] }` (re-exported via `useKeyboardShortcuts`) — if the clips are `Clip[]`, type it precisely (`clips: Clip[]`); if that cast cascades beyond these three files, leave it and note it for a later slice rather than widening scope.

- [ ] **Step 1:** Apply Procedure `P` to the three files.
- [ ] **Step 2:** Commit — `git commit -am "refactor(types): drop redundant any in delete/clipboard/trackCreation handlers"`

---

## Task 4: Group D — clip interaction hooks

**Files:** Modify `apps/sandbox/src/hooks/useClipTrimming.ts` (~9), `useClipDragging.ts` (~4), `useClipMouseDown.ts` (~3), `useClipStretching.ts` (~1).

Apply **Procedure `P`**. These read tracks/clips from typed context or typed params; the inline annotations are redundant.

- [ ] **Step 1:** Apply Procedure `P` to the four files.
- [ ] **Step 2:** Commit — `git commit -am "refactor(types): drop redundant any in clip interaction hooks"`

---

## Task 5: Final verification + report

- [ ] **Step 1:** `pnpm --filter @audacity-ui/sandbox test` (all green) + `pnpm --filter @audacity-ui/sandbox build` (green) + `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` (clean).
- [ ] **Step 2:** Recount: `grep -rcE ': any|as any' apps/sandbox/src/components/Canvas.tsx apps/sandbox/src/hooks/handlers apps/sandbox/src/hooks/useClip*.ts`. Report the before→after per file and the total reduction; list every `as any` kept and its justification.
- [ ] **Step 3:** Manual smoke (fast): run `cd apps/sandbox && pnpm dev`, confirm clips render, drag/trim/split/duplicate/delete a clip, and marquee-select still work — since this touches interaction files (annotation-only, but confirm nothing regressed).
- [ ] **Step 4:** Commit any residual (e.g. a justification comment) — otherwise nothing to commit; note completion.

---

## Self-Review notes (author)

- **Spec coverage:** Groups A–D (all four spec file groups) → Tasks 1–4; the two-kinds-of-any handling → Procedure `P` steps 2–3; verification/report → Task 5. All spec items mapped.
- **No behavior change:** annotation-only; `tsc` + full suite + build gate every task; Procedure `P` step 5 forces a STOP-and-report if a masked-access fix changes behavior.
- **No placeholders:** Procedure `P` is a concrete shared procedure (not "similar to Task N"); each task names exact files + file-specific `as any` guidance.
- **Open item for executor:** the `ClipboardState.clips: any[]` typing (Task 3) may cascade beyond scope — if so, leave it and flag for the later `useKeyboardShortcuts`/clipboard slice rather than widening this one.
