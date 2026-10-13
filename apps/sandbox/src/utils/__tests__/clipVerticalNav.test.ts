import { describe, it, expect } from 'vitest';
import { nearestClipTo, nearestClipOnNeighbourTrack } from '../clipVerticalNav';

const tracks = [
  { id: 1, name: 'A', clips: [{ id: 1, start: 0, duration: 4 }, { id: 2, start: 6, duration: 2 }] },
  { id: 2, name: 'Labels', type: 'label' as const, clips: [] },
  { id: 3, name: 'B', clips: [{ id: 3, start: 3, duration: 2 }, { id: 4, start: 1, duration: 1 }, { id: 5, start: 10, duration: 1 }] },
  { id: 4, name: 'Folder', type: 'folder' as const, clips: [] },
  { id: 5, name: 'C', clips: [], midiClips: [{ id: 6, start: 7, duration: 1 }] },
];

describe('↑ / ↓ on a focused clip: the nearest clip on the nearest track with one (2026-10-13)', () => {
  it('nearest by time: the most overlap, else the closest edge, a tie to the earlier clip', () => {
    expect(nearestClipTo(tracks[2], 0, 4)?.id).toBe(4); // 1..2 overlaps 1, 3..5 overlaps 1 — the tie goes to the earlier
    expect(nearestClipTo(tracks[2], 2, 5)?.id).toBe(3); // 3..5 overlaps 2
    expect(nearestClipTo(tracks[2], 6, 8)?.id).toBe(3); // no overlap: 3..5 is 1 away, 10..11 is 2 away
    expect(nearestClipTo(tracks[2], 8.5, 9)?.id).toBe(5);
    expect(nearestClipTo(tracks[1], 0, 4)).toBeNull();
  });
  it('steps over tracks with no clip, folder headers included, and reads MIDI clips too; nothing past the ends', () => {
    expect(nearestClipOnNeighbourTrack(tracks, 0, 1, 1)).toEqual({ trackIndex: 2, clipId: 4 }); // over the label track
    expect(nearestClipOnNeighbourTrack(tracks, 0, 2, 1)).toEqual({ trackIndex: 2, clipId: 3 }); // 6..8: 3..5 is nearest
    expect(nearestClipOnNeighbourTrack(tracks, 2, 5, 1)).toEqual({ trackIndex: 4, clipId: 6 }); // over the folder header, to a MIDI clip
    expect(nearestClipOnNeighbourTrack(tracks, 2, 3, -1)).toEqual({ trackIndex: 0, clipId: 1 });
    expect(nearestClipOnNeighbourTrack(tracks, 0, 1, -1)).toBeNull();
    expect(nearestClipOnNeighbourTrack(tracks, 4, 6, 1)).toBeNull();
    expect(nearestClipOnNeighbourTrack(tracks, 0, 99, 1)).toBeNull();
  });
});
