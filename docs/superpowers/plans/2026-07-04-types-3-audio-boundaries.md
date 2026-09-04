# types-3 — Audio boundaries: delete the Tone shim, de-`any` AudioEngineContext + RecordingManager (spec + plan)

> Single-implementer slice (one coupled change). Task review doubles as branch review.

**Root cause (verified):** `apps/sandbox/src/tone.d.ts` is a local `declare module 'tone'` shim written around early strict-mode friction. It SHADOWS Tone v15's real shipped types (`node_modules/tone/build/esm/index.d.ts`) with a skeleton (`context: any`, `Transport: any`, only ~5 classes) — which is why every synth/recorder call needs `(Tone as any)`. Recon: **deleting the shim → sandbox tsc = 0 errors** (current code compiles against real types as-is). `packages/audio` already uses real Tone types (no shim, 3 casts total).

**Goal:** delete the shim; drop the now-unnecessary `(Tone as any)` casts and `any` fields in `AudioEngineContext.tsx` (14) and `RecordingManager.ts` (9); real Tone types + in-repo types flow. TYPE-ONLY, zero behavior change.

**Tasks (one implementer, commits per step):**
1. **Delete `apps/sandbox/src/tone.d.ts`.** Run sandbox tsc — expect 0 (verified by recon).
2. **AudioEngineContext.tsx (14):** drop every `(Tone as any).X` → `Tone.X` (PolySynth/AMSynth/FMSynth/DuoSynth/MembraneSynth/PluckSynth/MetalSynth/Synth/Reverb). Type `createSynth`'s return honestly (a union of the synth types or the narrowest common Tone base class that supports the call sites — read how the return is used: `.triggerAttackRelease`, `.dispose`, `.connect`?, and pick the real common type; if Tone's class hierarchy makes a clean common type impractical, a small local `interface PlayableSynth { ... }` of the actually-used methods is acceptable and honest). `updateEffectChains(tracks: any[], masterEffects: any[])` → these are IN-REPO types: `import type { Track, Effect } from '../contexts/TracksContext'` → `(tracks: Track[], masterEffects: Effect[])`; `(effect: any, ...)` → inference. NOTE the interface at line 29 mirrors the impl at 212 — fix both.
3. **RecordingManager.ts (9):** private fields → real types (`Tone.Recorder`, `Tone.Meter`, `Tone.UserMedia`, `Tone.Waveform`, nullable), drop the `(Tone as any)` constructors, `(Tone as any).context.rawContext` → `Tone.getContext().rawContext` or the properly typed access (check the real API; keep runtime call IDENTICAL — if the typed API surface differs from the current runtime expression, keep the current expression and cast THAT ONE precisely with `// justified:`).

**Rules:** TYPE-ONLY; runtime expressions must remain byte-identical wherever possible — if dropping a specific cast surfaces a genuinely hard Tone typing conflict, keep THAT ONE cast with `// justified: Tone v15 types — <reason>`; NEVER restore the shim or add a new module declaration; no new `any`. If a fix would change a runtime call path, STOP → DONE_WITH_CONCERNS. `Effect.parameters?: Record<string, any>` in TracksContext is OUT OF SCOPE (types-4).

**Gates:** sandbox tsc 0; core tsc 0; 168 tests; sandbox build; ALSO `pnpm --filter @audacity-ui/audio build` + `pnpm --filter @audacity-ui/components build` (shim deletion must not affect package builds — it shouldn't, it's app-local, but verify).

**Manual smoke (deferred to user):** playback, MIDI note preview (synths), record a clip, meters move.
