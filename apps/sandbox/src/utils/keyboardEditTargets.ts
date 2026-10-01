/**
 * Which clips a KEYBOARD edit on a focused clip — [ ] trim, Cmd+[ ]
 * stretch — applies to. The mouse trim's rule (`trimParticipants.ts`,
 * 2026-09-29), applied to the keyboard on 2026-10-01 after a bug: with
 * one clip selected and the focus on another, [ trimmed BOTH, then
 * selected the focused clip so the next press trimmed only it.
 *
 *  - the focused clip is SELECTED: every selected clip edits with it,
 *    as a group (audio and MIDI, on every track);
 *  - it is NOT selected: it edits ALONE, and the selection is left as
 *    it was — editing a clip is not a reason to select it, and the
 *    clips that ARE selected are not the ones being edited.
 */
export interface KeyboardEditTarget<C> {
  trackIndex: number;
  clip: C;
}

interface EditableClipLike {
  id: number | string;
  selected?: boolean;
}

export function keyboardEditTargets<A extends EditableClipLike, M extends EditableClipLike>(
  tracks: ReadonlyArray<{ clips: ReadonlyArray<A>; midiClips?: ReadonlyArray<M> }>,
  trackIndex: number,
  clipId: number | string,
): Array<KeyboardEditTarget<A | M>> {
  const track = tracks[trackIndex];
  const focused: A | M | undefined = track?.clips.find((c) => c.id === clipId) ?? (track?.midiClips ?? []).find((c) => c.id === clipId);
  if (!focused) return [];
  if (!focused.selected) return [{ trackIndex, clip: focused }];
  const out: Array<KeyboardEditTarget<A | M>> = [];
  tracks.forEach((t, tIndex) => {
    for (const c of [...t.clips, ...(t.midiClips ?? [])] as Array<A | M>) {
      if (c.selected) out.push({ trackIndex: tIndex, clip: c });
    }
  });
  return out;
}
