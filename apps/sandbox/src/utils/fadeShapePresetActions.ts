/**
 * A curve type picked for a fade — from the handle's menu or the keys
 * 1–5 on a focused handle — as the actions that apply it, by the fade
 * rule (a selected clip's fade is every selected clip's).
 *
 * A CURVE PICKED WHERE THERE IS NO FADE MAKES ONE (2026-10-29, "if I
 * select a curve type from the right click menu and there is no curve…
 * what should happen?" → "go with 0.5s"): a target with no fade on that
 * side gets one of `PRESET_FADE_SECONDS`, held to a quarter of the clip
 * so a short clip is not swallowed, in the picked shape. Until then the
 * pick stored a shape on a zero-length fade — nothing on screen changed,
 * and the next fade dragged out came in that shape with no warning.
 * When anything is made the whole pick is ONE undo step (the undo
 * gesture bracket).
 */
import type { FadeShape } from '@audacity-ui/components';
import type { TracksAction, Track } from '../contexts/TracksContext';
import { fadeTargets } from './fadeTargets';

/** The length a fade is made at when a curve is picked with none */
export const PRESET_FADE_SECONDS = 0.5;
/** …held to this share of the clip's length */
const PRESET_FADE_MAX_SHARE = 0.25;

export function fadeShapePresetActions(
  tracks: readonly Track[],
  trackIndex: number,
  clipId: number,
  side: 'in' | 'out',
  shape: FadeShape,
): TracksAction[] {
  const actions: TracksAction[] = [];
  let made = false;
  for (const t of fadeTargets(tracks, trackIndex, clipId)) {
    const clip = tracks[t.trackIndex]?.clips.find((c) => c.id === t.clipId);
    if (!clip) continue;
    const length = (side === 'in' ? clip.fadeIn : clip.fadeOut) ?? 0;
    if (length <= 0) {
      const seconds = Math.min(PRESET_FADE_SECONDS, clip.duration * PRESET_FADE_MAX_SHARE);
      actions.push({ type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side, seconds } });
      made = true;
    }
    actions.push({ type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side, shape } });
  }
  return made ? [{ type: 'BEGIN_UNDO_GESTURE' }, ...actions, { type: 'END_UNDO_GESTURE' }] : actions;
}
