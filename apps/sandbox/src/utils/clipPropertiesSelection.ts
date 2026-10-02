/**
 * The Clip properties panel's view of SEVERAL selected clips
 * (2026-10-02): every per-clip field merged — the value when all agree,
 * MIXED when they do not — plus the selection's earliest start, latest
 * end and the tracks it spans. Pure; the dock panel feeds it the
 * selected clips with their track names.
 */
import { MIXED, type ClipPropertiesSelection, type Mixed } from '@audacity-ui/components';
import type { Clip } from '../contexts/TracksContext';
import { fadeShapePresetOf } from './fadeShapePresets';

export interface SelectedClipEntry {
  trackIndex: number;
  trackName: string;
  clip: Clip;
}

/** The selected audio clips, in track order */
export function selectedClipEntries(tracks: ReadonlyArray<{ name: string; clips: ReadonlyArray<Clip> }>): SelectedClipEntry[] {
  const out: SelectedClipEntry[] = [];
  tracks.forEach((t, trackIndex) => {
    for (const clip of t.clips) if (clip.selected) out.push({ trackIndex, trackName: t.name, clip });
  });
  return out;
}

/** One value if every entry has it, else MIXED */
function merge<T>(values: readonly T[]): T | Mixed {
  const first = values[0];
  return values.every((v) => v === first) ? first : MIXED;
}

export function mergeSelectedClips(entries: readonly SelectedClipEntry[], trackColorId: string): ClipPropertiesSelection {
  const clips = entries.map((e) => e.clip);
  const trackNames = [...new Set(entries.map((e) => e.trackName))];
  return {
    count: clips.length,
    trackNames,
    start: Math.min(...clips.map((c) => c.start)),
    end: Math.max(...clips.map((c) => c.start + c.duration)),
    color: merge(clips.map((c) => c.ownColor ?? trackColorId)),
    stretchFactor: merge(clips.map((c) => (c as { stretchFactor?: number }).stretchFactor ?? 1)),
    pitchSemitones: merge(clips.map((c) => c.pitchSemitones ?? 0)),
    fadeIn: merge(clips.map((c) => c.fadeIn ?? 0)),
    fadeOut: merge(clips.map((c) => c.fadeOut ?? 0)),
    fadeInShapeId: merge(clips.map((c) => fadeShapePresetOf(c.fadeInShape))),
    fadeOutShapeId: merge(clips.map((c) => fadeShapePresetOf(c.fadeOutShape))),
  };
}
