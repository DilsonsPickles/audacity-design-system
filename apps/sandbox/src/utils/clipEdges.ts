/**
 * The clip EDGES of the timeline, for the bracket keys (user decision
 * 2026-10-13, "use [ and ] to jump between clip edges and shift + [ / ]
 * to select in between"): every clip's start and end on the tracks
 * given — the FOCUSED track for the brackets, every track when none is
 * focused — audio and MIDI, deduplicated and sorted, so the keys walk
 * that track's edges in order. An edge within EDGE_EPSILON of the
 * time is the time itself, so a playhead sitting on an edge steps past
 * it rather than sticking.
 */
export interface EdgedClip {
  start: number;
  duration: number;
}

export interface EdgedTrack {
  clips?: ReadonlyArray<EdgedClip>;
  midiClips?: ReadonlyArray<EdgedClip>;
}

export const EDGE_EPSILON = 0.0001;

export function clipEdgesOf(tracks: ReadonlyArray<EdgedTrack>): number[] {
  const edges = new Set<number>();
  for (const t of tracks) {
    for (const c of [...(t.clips ?? []), ...(t.midiClips ?? [])]) {
      edges.add(c.start);
      edges.add(c.start + c.duration);
    }
  }
  return Array.from(edges).sort((a, b) => a - b);
}

/** The first edge after `time`, or null */
export function nextClipEdge(tracks: ReadonlyArray<EdgedTrack>, time: number): number | null {
  for (const edge of clipEdgesOf(tracks)) {
    if (edge > time + EDGE_EPSILON) return edge;
  }
  return null;
}

/** The last edge before `time`, or null */
export function prevClipEdge(tracks: ReadonlyArray<EdgedTrack>, time: number): number | null {
  const edges = clipEdgesOf(tracks);
  for (let i = edges.length - 1; i >= 0; i--) {
    if (edges[i] < time - EDGE_EPSILON) return edges[i];
  }
  return null;
}
