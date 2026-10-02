import { describe, it, expect } from 'vitest';
import { resolveClipPropertiesClip } from '../clipPropertiesTarget';

describe('resolveClipPropertiesClip — what the Clip properties panel shows (2026-10-02)', () => {
  const tracks = [
    { clips: [{ id: 1 }, { id: 2, selected: true }] },
    { clips: [{ id: 3 }] },
  ];

  it('the target while it exists, whatever is selected', () => {
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 1, clipId: 3 })).toEqual({ trackIndex: 1, clip: { id: 3 } });
  });

  it('without a target (or a stale one), the single selected clip', () => {
    expect(resolveClipPropertiesClip(tracks, null)).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 0, clipId: 99 })).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
  });

  it('several selected, or none: nothing — it never guesses', () => {
    expect(resolveClipPropertiesClip([{ clips: [{ id: 1, selected: true }, { id: 2, selected: true }] }], null)).toBeNull();
    expect(resolveClipPropertiesClip([{ clips: [{ id: 1 }] }], null)).toBeNull();
  });
});
