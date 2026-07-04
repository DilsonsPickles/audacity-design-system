# Design: De-`any` the Interaction Cluster

**Date:** 2026-07-04
**Base branch:** `master`
**Status:** Approved for planning

## Goal

Remove redundant `any` from the interaction core of the app — `Canvas.tsx`, the keyboard-handler modules, and the clip-interaction hooks — so the compiler type-checks the code agents touch most. Annotation-only, zero behavior change. This is slice 1 of the whole-app `any`-elimination campaign (see `memory/project-prototyping-machine-mission.md`).

## Motivation

An agent editing untyped code flies blind: `tracks.map((t: any) => …)` gives it no safety, and mistakes surface at runtime or in human review instead of at the compiler. Typed code turns `tsc` into a free reviewer on every agent edit. The interaction cluster is the highest-traffic code in the repo and carries the densest `any`.

**Key fact (verified):** `Canvas.tsx` already consumes the typed context — `const { tracks, … } = useTracksState()` (line 209), `dispatch = useTracksDispatch()` (line 211) — so `tracks` is already `Track[]`. Its `(t: any)`/`(c: any)` annotations are therefore **redundant**: inference already knows the types; the `any` just discards them. Same for the handler modules, whose `deps.state` is typed `TracksState`. So this slice needs no context adoption and no prop changes — only annotation removal, which `tsc` verifies.

## Constraints

- **Behavior-preserving, annotation-only.** No logic, control-flow, payload, or value changes — only type annotations/casts removed or corrected. `tsc` is the verifier; the full test suite is the backstop.
- **Never re-introduce `any` to silence an error.** If removing an annotation surfaces a `tsc` error, that annotation was masking a real access — fix the access (the property exists on the typed shape) or, if it reveals a genuine type gap, fix the type correctly or leave that single annotation and note it. No new `any`.
- Work on a feature branch off `master`.
- No unrelated refactoring; other `any` clusters (context-adoption consumers, Tone.js/AudioEngine boundaries) are separate later slices.

## Scope — files (grouped for task boundaries)

Redundant-`any` counts (`: any` + `as any`) at baseline:

| Group | Files | ~any |
|---|---|---|
| A — Canvas | `components/Canvas.tsx` | 44 |
| B — split/duplicate handlers | `hooks/handlers/splitHandlers.ts`, `hooks/handlers/duplicateHandlers.ts` | 28 |
| C — other handlers | `hooks/handlers/deleteHandlers.ts`, `clipboardHandlers.ts`, `trackCreationHandlers.ts` | 17 |
| D — clip hooks | `hooks/useClipTrimming.ts`, `useClipDragging.ts`, `useClipMouseDown.ts`, `useClipStretching.ts` | 17 |

(`navigationHandlers.ts` and `playheadSelectionHandlers.ts` are already `any`-free — excluded.)

## Approach — two kinds of `any`, handled differently

1. **Inline callback annotations** — `(t: any)`, `(c: any)`, `(clip: any)`, etc. These are the redundant majority. Remove the `: any` and let inference supply `Track`/`Clip`/`Label`/`MidiClip`. Batch per file, run `tsc` after each batch; a surfaced error = a real masked access to fix (not silence).
2. **`as any` casts** — judged individually:
   - **Lazy/removable** (the cast isn't needed once inference works, or a precise cast suffices) → remove or narrow to a precise cast.
   - **Genuinely justified** (dynamic string-index access with no index signature, a loose-string field like `Track.icon` vs `IconName`, an external-library boundary) → keep, and add a one-line comment explaining why, so the residual `any` is documented intent, not laziness. (Precedent: EditorLayout kept `track.icon as any` and `(theme.audio.clip as any)[track.color]` with documented reasons.)

## Testing

`tsc` clean is the primary correctness gate (this is a typing change — the type system is the test). No new unit tests are required for annotation removal. The full existing suite runs as a behavior backstop after each group. Where a masked-access fix changes a value path (should be rare), note it explicitly for review.

## Verification

- `cd apps/sandbox && npx tsc --noEmit -p tsconfig.json` — clean after each group and at the end.
- Full sandbox suite green: `pnpm --filter @audacity-ui/sandbox test`.
- Production build green: `pnpm --filter @audacity-ui/sandbox build`.
- Net `any` reduction across the cluster reported (target: ~77 `: any` removed; `as any` reduced to a documented, justified residual).

## Explicitly out of scope

- Any behavior change; any logic refactor.
- Context adoption / prop-typing for the true `state: any`/`dispatch: any` consumers (`AppDialogs`, `AppContextMenus`, `LabelRenderer`) — later slice.
- The genuine-`any` tail needing external types (`AudioEngineContext`/Tone.js, `Record<string, any>` effect params) — later slice.
- `navigationHandlers.ts` / `playheadSelectionHandlers.ts` (already clean).

## Success criteria

- The redundant inline `: any` annotations in the four file groups are gone; inference supplies the real types.
- Every remaining `as any` in these files is either removed or carries a one-line justification comment.
- `tsc` clean, full suite green, build green — no behavior change.
- The interaction core an agent is most likely to edit is now compiler-checked.
