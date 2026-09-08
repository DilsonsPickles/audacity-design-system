import { describe, it, expect } from 'vitest';
import {
  nextTrackId,
  nextClipId,
  trackTypePrefix,
  nextTrackNameNumber,
  buildNewTrack,
  buildDuplicatedTracks,
  computeFitTrackHeight,
} from '../trackManagement';
import type { Clip, Track } from '../../contexts/TracksContext';

const clip = (o: Partial<Clip> & { id: number }): Clip => ({
  name: '',
  start: 0,
  duration: 1,
  envelopePoints: [],
  ...o,
});

const track = (o: Partial<Track> & { id: number }): Track => ({
  name: `Track ${o.id}`,
  clips: [],
  ...o,
});

describe('nextTrackId', () => {
  it('returns 1 for an empty track list (Math.max(...[], 0) guard)', () => {
    expect(nextTrackId([])).toBe(1);
  });

  it('returns max(id)+1, not length+1 — immune to gaps left by deletes', () => {
    // Only ids 1 and 3 remain (2 was deleted) — length is 2, but next id must be 4.
    const tracks = [track({ id: 1 }), track({ id: 3 })];
    expect(nextTrackId(tracks)).toBe(4);
  });

  it('handles unsorted ids', () => {
    const tracks = [track({ id: 5 }), track({ id: 2 }), track({ id: 9 })];
    expect(nextTrackId(tracks)).toBe(10);
  });
});

describe('nextClipId', () => {
  it('returns 1 when there are no clips anywhere (Math.max(...[], 0) guard)', () => {
    expect(nextClipId([track({ id: 1, clips: [] })])).toBe(1);
    expect(nextClipId([])).toBe(1);
  });

  it('returns max(id)+1 across all tracks combined', () => {
    const tracks = [
      track({ id: 1, clips: [clip({ id: 1 }), clip({ id: 5 })] }),
      track({ id: 2, clips: [clip({ id: 3 })] }),
    ];
    expect(nextClipId(tracks)).toBe(6);
  });
});

describe('trackTypePrefix', () => {
  it('maps each track type to its display prefix', () => {
    expect(trackTypePrefix('label')).toBe('Label');
    expect(trackTypePrefix('stereo')).toBe('Stereo');
    expect(trackTypePrefix('mono')).toBe('Mono');
    expect(trackTypePrefix('midi')).toBe('MIDI');
  });
});

describe('nextTrackNameNumber', () => {
  it('returns 1 when no track uses the prefix', () => {
    expect(nextTrackNameNumber([], 'Mono')).toBe(1);
    expect(nextTrackNameNumber([track({ id: 1, name: 'Stereo 1' })], 'Mono')).toBe(1);
  });

  it('returns max(used numbers)+1, not count+1 — immune to gaps left by deletes', () => {
    // "Mono 1" was deleted; only "Mono 2" remains — next must be 3, not 2.
    const tracks = [track({ id: 1, name: 'Mono 2' })];
    expect(nextTrackNameNumber(tracks, 'Mono')).toBe(3);
  });

  it('ignores names that do not match the exact prefix pattern', () => {
    const tracks = [
      track({ id: 1, name: 'Mono 1' }),
      track({ id: 2, name: 'Mono Special' }),
      track({ id: 3, name: 'Stereo 9' }),
    ];
    expect(nextTrackNameNumber(tracks, 'Mono')).toBe(2);
  });
});

describe('buildNewTrack', () => {
  it('names the first mono track "Mono 1" and the second "Mono 2"', () => {
    const first = buildNewTrack('mono', []);
    expect(first.name).toBe('Mono 1');
    const second = buildNewTrack('mono', [first]);
    expect(second.name).toBe('Mono 2');
  });

  it('builds a stereo track with channelSplitRatio 0.5', () => {
    const t = buildNewTrack('stereo', []);
    expect(t.channelSplitRatio).toBe(0.5);
    expect(t.type).toBe('audio');
    expect(t.height).toBe(114);
  });

  it('builds a label track with type "label" and height 76', () => {
    const t = buildNewTrack('label', []);
    expect(t.type).toBe('label');
    expect(t.height).toBe(76);
    expect(t.name).toBe('Label 1');
  });

  it('builds a midi track with type "midi" and an empty midiClips array', () => {
    const t = buildNewTrack('midi', []);
    expect(t.type).toBe('midi');
    expect(t.midiClips).toEqual([]);
    expect(t.name).toBe('MIDI 1');
  });

  it('allocates a non-colliding id after a middle track was deleted', () => {
    const tracks = [track({ id: 1 }), track({ id: 4 })];
    expect(buildNewTrack('mono', tracks).id).toBe(5);
  });

  it('starts every new track with no clips', () => {
    expect(buildNewTrack('mono', []).clips).toEqual([]);
  });
});

describe('buildDuplicatedTracks', () => {
  it('clones a single track with fresh clip/track ids and a "(copy)" name', () => {
    const source = track({
      id: 1,
      name: 'Mono 1',
      clips: [clip({ id: 10 }), clip({ id: 11 })],
    });
    const [dup] = buildDuplicatedTracks([0], [source]);
    expect(dup.id).toBe(2);
    expect(dup.name).toBe('Mono 1 (copy)');
    expect(dup.clips.map((c) => c.id)).toEqual([12, 13]);
    expect(dup.insertAt).toBe(1);
  });

  it('drops the copy directly after its source via insertAt', () => {
    const t0 = track({ id: 1, clips: [] });
    const t1 = track({ id: 2, clips: [] });
    const [dup] = buildDuplicatedTracks([1], [t0, t1]);
    expect(dup.insertAt).toBe(2);
  });

  it('allocates ids from the max across all tracks, not just the duplicated ones', () => {
    const t0 = track({ id: 1, clips: [clip({ id: 100 })] });
    const t1 = track({ id: 7, clips: [] });
    const [dup] = buildDuplicatedTracks([0], [t0, t1]);
    expect(dup.id).toBe(8); // max track id (7) + 1
    expect(dup.clips[0].id).toBe(101); // max clip id (100) + 1
  });

  it('duplicates multiple selected tracks, each getting a fresh id and adjacent insertAt', () => {
    const t0 = track({ id: 1, clips: [] });
    const t1 = track({ id: 2, clips: [] });
    const t2 = track({ id: 3, clips: [] });
    const dups = buildDuplicatedTracks([0, 2], [t0, t1, t2]);
    // Descending processing order (index 2 before index 0), but ids are
    // still allocated in ascending order relative to input order via idx.
    const byInsertAt = [...dups].sort((a, b) => a.insertAt - b.insertAt);
    expect(byInsertAt.map((d) => d.insertAt)).toEqual([1, 3]);
    expect(new Set(dups.map((d) => d.id)).size).toBe(2);
  });

  it('regroups a whole-copied group into a fresh shared groupId (clip-group copy invariant)', () => {
    const g1a = clip({ id: 10, groupId: 'g1' });
    const g1b = clip({ id: 11, groupId: 'g1' });
    const source = track({ id: 1, clips: [g1a, g1b] });
    const [dup] = buildDuplicatedTracks([0], [source]);
    expect(dup.clips[0].groupId).toBeDefined();
    expect(dup.clips[0].groupId).toBe(dup.clips[1].groupId);
    expect(dup.clips[0].groupId).not.toBe('g1');
  });

  it('ungroups a partially-copied group across a multi-track duplicate op', () => {
    // Group g1 spans both tracks; only track 0 is duplicated -> partial -> ungrouped.
    const g1a = clip({ id: 10, groupId: 'g1' });
    const g1b = clip({ id: 11, groupId: 'g1' });
    const t0 = track({ id: 1, clips: [g1a] });
    const t1 = track({ id: 2, clips: [g1b] });
    const [dup] = buildDuplicatedTracks([0], [t0, t1]);
    expect(dup.clips[0].groupId).toBeUndefined();
  });

  it('returns an empty array for an empty selection (Math.max(..., 0) guard)', () => {
    const source = track({ id: 1, clips: [] });
    expect(buildDuplicatedTracks([], [source])).toEqual([]);
  });

  it('skips out-of-range indices rather than throwing', () => {
    const source = track({ id: 1, clips: [] });
    expect(buildDuplicatedTracks([5], [source])).toEqual([]);
  });
});

describe('computeFitTrackHeight', () => {
  it('divides the viewport (minus gaps) evenly across tracks', () => {
    // (500 - topGap 2 - 3 x trackGap 2) / 3 = 164
    expect(computeFitTrackHeight(500, 3, 2, 2)).toBe(164);
  });

  it('snaps heights inside the forbidden 71-112 band to the nearer edge', () => {
    // (300 - 2 - 6) / 3 = 97.33 -> 97, closer to 112 than 71
    expect(computeFitTrackHeight(300, 3, 2, 2)).toBe(112);
    // (240 - 2 - 6) / 3 = 77.33 -> 77, closer to 71
    expect(computeFitTrackHeight(240, 3, 2, 2)).toBe(71);
  });

  it('clamps to the 44px control-panel minimum', () => {
    expect(computeFitTrackHeight(100, 4, 2, 2)).toBe(44);
  });

  it('returns null for an empty project or unmeasured viewport', () => {
    expect(computeFitTrackHeight(0, 3, 2, 2)).toBeNull();
    expect(computeFitTrackHeight(500, 0, 2, 2)).toBeNull();
  });
});
