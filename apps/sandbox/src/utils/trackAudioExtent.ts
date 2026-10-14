/**
 * The span of everything on a track — its first clip's start to its last
 * clip's end, audio and MIDI alike — for "select all audio in the track"
 * (2026-10-14, a double-click on the track header; Audacity 3's
 * double-click in the Track Control Panel). Null for a track with no clips.
 */
export interface ExtentClip { start: number; duration: number }
export interface ExtentTrack { clips: ReadonlyArray<ExtentClip>; midiClips?: ReadonlyArray<ExtentClip> }

export function trackAudioExtent(track: ExtentTrack): { startTime: number; endTime: number } | null {
  const all = [...track.clips, ...(track.midiClips ?? [])];
  if (all.length === 0) return null;
  let startTime = Infinity;
  let endTime = -Infinity;
  for (const c of all) {
    startTime = Math.min(startTime, c.start);
    endTime = Math.max(endTime, c.start + c.duration);
  }
  return endTime > startTime ? { startTime, endTime } : null;
}
