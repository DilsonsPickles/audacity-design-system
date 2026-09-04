/**
 * clipKeyboardEdit — pure math for the keyboard trim ([ / ]) and
 * time-stretch (Alt+ArrowLeft / Alt+ArrowRight) shortcuts.
 *
 * Extracted verbatim from Canvas.tsx's onClipTrim / onClipStretch handlers.
 * Canvas is responsible for gathering the affected clips (selection
 * expansion), calling these functions, dispatching the resulting
 * TRIM_CLIP / STRETCH_CLIP / APPLY_CLIP_PLACEMENT actions, and firing
 * `announce()` with the returned announcement text. This module never
 * dispatches or announces — pure state in, intent out.
 */

import type { Clip, Track } from '../contexts/TracksContext';
import type { MidiClip } from '@audacity-ui/core';
import { formatTimeForA11y } from '@audacity-ui/components';
import {
  resolveOverlap,
  type ClipPlacement,
  type ClipMutation,
} from './resolveOverlap';

const MIN_CLIP_DURATION = 0.1;
const NO_OP_EPSILON = 0.0005;
const AVAILABLE_EPSILON = 0.0005;
const MAX_DURATION_EPSILON = 0.001;

export type KeyboardEditableClip = Clip | MidiClip;

// ---------------------------------------------------------------------
// Trim ([ / ] — shrink/extend a clip edge, eating into neighbors)
// ---------------------------------------------------------------------

export interface KeyboardTrimArgs {
  clip: KeyboardEditableClip;
  edge: 'left' | 'right';
  deltaSeconds: number;
}

export interface KeyboardTrimResult {
  newTrimStart: number;
  newDuration: number;
  /** Only set for edge === 'left' — mirrors the TRIM_CLIP payload, which
   *  only moves `start` when the left edge is the one being trimmed. */
  newStart?: number;
}

/**
 * Pure per-clip trim math. Returns null when the trim is a no-op —
 * either because the requested edge has nothing left to give (source
 * boundary reached) or because the resulting delta rounds to ~0.
 */
export function computeKeyboardTrim(args: KeyboardTrimArgs): KeyboardTrimResult | null {
  const { clip, edge, deltaSeconds } = args;

  const stretch = (clip as any).stretchFactor ?? 1; // justified: stretchFactor is audio-only, not on Clip/MidiClip type
  const currentTrimStart = clip.trimStart || 0;
  const currentDuration = clip.duration;
  const currentStart = clip.start;
  const fullDuration = (clip as Clip).fullDuration || (currentTrimStart + currentDuration / stretch);
  const currentMaxDuration = (fullDuration - currentTrimStart) * stretch;
  const isAtMaxDuration = Math.abs(currentDuration - currentMaxDuration) < MAX_DURATION_EPSILON;

  let newTrimStart = currentTrimStart;
  let newDuration = currentDuration;
  let newStart = currentStart;
  // Cap the delta up front to what's actually available on the affected
  // side. This prevents the classic "overshoot" bug where newTrimStart
  // clamps to 0 but newDuration still reflects the uncapped delta,
  // leaving the clip showing empty source at the edge.
  let effectiveDelta = deltaSeconds;

  if (edge === 'left') {
    if (deltaSeconds < 0) {
      // Extending left — can't reveal more than the source already
      // hides on that side.
      const availableCanvas = currentTrimStart * stretch;
      effectiveDelta = Math.max(deltaSeconds, -availableCanvas);
      if (availableCanvas <= AVAILABLE_EPSILON) return null;
    } else {
      // Shrinking left — can't cross the right edge.
      const maxShrink = Math.max(0, currentDuration - MIN_CLIP_DURATION);
      effectiveDelta = Math.min(deltaSeconds, maxShrink);
    }
    newTrimStart = currentTrimStart + effectiveDelta / stretch;
    newDuration = Math.max(MIN_CLIP_DURATION, currentDuration - effectiveDelta);
    newStart = currentStart + effectiveDelta;
  } else {
    if (deltaSeconds < 0) {
      // Extending right — cap to available tail.
      const availableCanvas = (fullDuration - currentTrimStart) * stretch - currentDuration;
      effectiveDelta = Math.max(deltaSeconds, -availableCanvas);
      if (availableCanvas <= AVAILABLE_EPSILON || isAtMaxDuration) return null;
    } else {
      // Shrinking right — can't cross the left edge.
      const maxShrink = Math.max(0, currentDuration - MIN_CLIP_DURATION);
      effectiveDelta = Math.min(deltaSeconds, maxShrink);
    }
    newDuration = Math.max(MIN_CLIP_DURATION, currentDuration - effectiveDelta);
  }

  newTrimStart = Math.max(0, newTrimStart);
  // Skip when nothing actually changed (e.g. a delta so small it
  // round-tripped to zero).
  if (
    Math.abs(newTrimStart - currentTrimStart) < NO_OP_EPSILON
    && Math.abs(newDuration - currentDuration) < NO_OP_EPSILON
    && Math.abs(newStart - currentStart) < NO_OP_EPSILON
  ) {
    return null;
  }

  return {
    newTrimStart,
    newDuration,
    newStart: edge === 'left' ? newStart : undefined,
  };
}

/** Screen-reader text for a keyboard trim, computed independently of
 *  whether the trim on the focused clip actually moved anything —
 *  matches the original handler, which announces unconditionally
 *  from the focused clip's pre-trim duration and the raw delta. */
export function computeKeyboardTrimAnnouncement(clip: { duration: number }, deltaSeconds: number): string {
  const finalDuration = Math.max(MIN_CLIP_DURATION, clip.duration - deltaSeconds);
  return `Clip is now ${formatTimeForA11y(finalDuration)} long`;
}

export interface KeyboardTrimTarget {
  trackIndex: number;
  clip: KeyboardEditableClip;
}

export interface KeyboardTrimUpdate {
  trackIndex: number;
  clipId: number;
  newTrimStart: number;
  newDuration: number;
  newStart?: number;
}

export interface KeyboardTrimBatchResult {
  updates: KeyboardTrimUpdate[];
  mutations: ClipMutation[];
}

/**
 * Runs computeKeyboardTrim across every target clip (the already
 * selection-expanded, deduped list Canvas builds) and folds the
 * resulting placements through the already-tested resolveOverlap to
 * produce the non-destructive eat/trim/split/delete mutations for any
 * neighbor a trim pushed into. Canvas dispatches TRIM_CLIP for each
 * update and APPLY_CLIP_PLACEMENT for the mutations (if any).
 */
export function computeKeyboardTrimBatch(
  targets: KeyboardTrimTarget[],
  edge: 'left' | 'right',
  deltaSeconds: number,
  tracks: Track[],
): KeyboardTrimBatchResult {
  const updates: KeyboardTrimUpdate[] = [];
  const trimIntent: ClipPlacement[] = [];
  const movingIds = new Set<number>();

  for (const { trackIndex, clip } of targets) {
    const result = computeKeyboardTrim({ clip, edge, deltaSeconds });
    if (!result) continue;

    updates.push({ trackIndex, clipId: clip.id, ...result });
    trimIntent.push({
      clipId: clip.id,
      trackIndex,
      start: edge === 'left' ? (result.newStart as number) : clip.start,
      duration: result.newDuration,
    });
    movingIds.add(clip.id);
  }

  const mutations = trimIntent.length > 0
    ? resolveOverlap(tracks, trimIntent, movingIds).mutations
    : [];

  return { updates, mutations };
}

// ---------------------------------------------------------------------
// Stretch (Alt+ArrowLeft / Alt+ArrowRight — audio clips only)
// ---------------------------------------------------------------------

const MIN_STRETCH_FACTOR = 0.1;
const MAX_STRETCH_FACTOR = 10;

export interface KeyboardStretchArgs {
  clip: Clip;
  edge: 'left' | 'right';
  deltaSeconds: number;
}

export interface KeyboardStretchResult {
  newDuration: number;
  newStretchFactor: number;
  /** Only set for edge === 'left' — mirrors the STRETCH_CLIP payload. */
  newStart?: number;
}

/**
 * Pure per-clip time-stretch math. Audio clips only — stretchFactor
 * never applies to MidiClip (product rule; the STRETCH_CLIP reducer
 * only touches track.clips, never track.midiClips). Returns null when
 * the computed stretch factor doesn't actually change (no-op).
 */
export function computeKeyboardStretch(args: KeyboardStretchArgs): KeyboardStretchResult | null {
  const { clip, edge, deltaSeconds } = args;

  const currentDuration = clip.duration;
  const currentStart = clip.start;
  const currentStretch = (clip as any).stretchFactor ?? 1; // justified: stretchFactor not on Clip type
  const newDuration = Math.max(MIN_CLIP_DURATION, currentDuration - deltaSeconds);
  const ratio = newDuration / currentDuration;
  const newStretchFactor = Math.max(
    MIN_STRETCH_FACTOR,
    Math.min(MAX_STRETCH_FACTOR, currentStretch * ratio),
  );
  if (newStretchFactor === currentStretch) return null;

  return {
    newDuration,
    newStretchFactor,
    newStart: edge === 'left' ? currentStart + deltaSeconds : undefined,
  };
}

/** Screen-reader text for a keyboard stretch, computed from the
 *  focused clip's pre-stretch duration and the raw delta (matches
 *  computeKeyboardTrimAnnouncement's unconditional-announce behavior). */
export function computeKeyboardStretchAnnouncement(clip: { duration: number }, deltaSeconds: number): string {
  const finalDuration = Math.max(MIN_CLIP_DURATION, clip.duration - deltaSeconds);
  return `Clip stretched to ${formatTimeForA11y(finalDuration)}`;
}
