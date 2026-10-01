/**
 * How many clips are selected across the project — audio and MIDI,
 * on every track. One is the number that matters: handles follow the
 * pointer, but a SINGLE selected clip keeps its trim and stretch
 * handles (user decision 2026-10-01). TrackNew sees one track, so the
 * count is the host's.
 */
export interface SelectableClipLike {
  selected?: boolean;
}

export interface SelectionCountTrackLike {
  clips?: ReadonlyArray<SelectableClipLike>;
  midiClips?: ReadonlyArray<SelectableClipLike>;
}

export function countSelectedClips(tracks: ReadonlyArray<SelectionCountTrackLike>): number {
  let n = 0;
  for (const t of tracks) {
    for (const c of t.clips ?? []) if (c.selected) n++;
    for (const c of t.midiClips ?? []) if (c.selected) n++;
  }
  return n;
}
