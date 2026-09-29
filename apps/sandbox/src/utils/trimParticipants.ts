/**
 * Which clips a trim drag moves, captured when the drag starts.
 *
 * Two cases, decided by the clip whose edge is in hand (user decision
 * 2026-09-29):
 *
 *  - it is SELECTED (the drag came from its trim handle): every
 *    selected clip trims with it, as a group;
 *  - it is NOT selected (the drag came from its edge): it trims ALONE,
 *    and the selection is left exactly as it was. Trimming a clip is
 *    not a reason to select it — and the clips that ARE selected are
 *    not the ones being trimmed.
 *
 * The map is the drag's list of participants: `useClipTrimming` trims
 * the clips named in it, whatever is or is not selected by then.
 */
import type { Track, Clip } from '../contexts/TracksContext';
import type { MidiClip } from '@audacity-ui/core';

export interface TrimInitialState {
  trimStart: number;
  duration: number;
  start: number;
  fullDuration: number;
  isMidi?: boolean;
  stretchFactor?: number;
}

export const trimParticipantKey = (trackIndex: number, clipId: number | string) => `${trackIndex}-${clipId}`;

export function buildTrimParticipants(
  tracks: readonly Track[],
  trackIndex: number,
  clipId: number,
): Map<string, TrimInitialState> {
  const out = new Map<string, TrimInitialState>();
  const grabbedTrack = tracks[trackIndex];
  const grabbed: Clip | MidiClip | undefined = grabbedTrack?.clips.find((c) => c.id === clipId)
    || (grabbedTrack?.midiClips || []).find((c) => c.id === clipId);
  if (!grabbed) return out;
  const asGroup = !!grabbed.selected;

  tracks.forEach((t, tIndex) => {
    const isMidiTrack = t.type === 'midi';
    const allTrackClips: Array<Clip | MidiClip> = [...t.clips, ...(t.midiClips || [])];
    allTrackClips.forEach((c) => {
      const isGrabbed = tIndex === trackIndex && c.id === clipId;
      if (!(isGrabbed || (asGroup && c.selected))) return;
      const isMidi = isMidiTrack || (t.midiClips || []).some((mc) => mc.id === c.id);
      const trimStart = (c as Clip).trimStart || 0;
      const stretchFactor = (c as { stretchFactor?: number }).stretchFactor ?? 1;
      // fullDuration is the source-audio length. If we don't have it
      // stored yet, recover it from the visible duration by dividing by
      // stretchFactor (canvas → source seconds).
      const fullDuration = (c as Clip).fullDuration || (trimStart + c.duration / stretchFactor);
      out.set(trimParticipantKey(tIndex, c.id), {
        trimStart,
        duration: c.duration,
        start: c.start,
        fullDuration,
        isMidi,
        stretchFactor,
      });
    });
  });
  return out;
}
