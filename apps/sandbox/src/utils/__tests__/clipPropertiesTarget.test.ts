import { describe, it, expect } from 'vitest';
import { resolveClipPropertiesClip, singleSelectedClip } from '../clipPropertiesTarget';

describe('resolveClipPropertiesClip — what the Clip properties panel shows (2026-10-02; focus first since 2026-10-06)', () => {
  const tracks = [
    { clips: [{ id: 1 }, { id: 2, selected: true }] },
    { clips: [{ id: 3 }] },
  ];

  it('the focused clip first — arrowing to another clip switches the panel; a focused clip that is gone is skipped', () => {
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 1, clipId: 3 }, { trackIndex: 0, clipId: 1 })).toEqual({ trackIndex: 0, clip: { id: 1 } });
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 1, clipId: 3 }, { trackIndex: 0, clipId: 99 })).toEqual({ trackIndex: 1, clip: { id: 3 } });
  });

  it('then the clip it last showed (the target), then the single selected clip', () => {
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 1, clipId: 3 })).toEqual({ trackIndex: 1, clip: { id: 3 } });
    expect(resolveClipPropertiesClip(tracks, null)).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
    expect(singleSelectedClip(tracks)).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
  });

  it('with no single selection, the clip it last showed, while it exists', () => {
    const none = [{ clips: [{ id: 1 }, { id: 2 }] }, { clips: [{ id: 3 }] }];
    expect(resolveClipPropertiesClip(none, { trackIndex: 1, clipId: 3 })).toEqual({ trackIndex: 1, clip: { id: 3 } });
    expect(resolveClipPropertiesClip(none, { trackIndex: 1, clipId: 99 })).toBeNull();
    expect(resolveClipPropertiesClip(none, null)).toBeNull();
  });

  it('several selected: not a single selection — it never guesses; the target stands in', () => {
    const many = [{ clips: [{ id: 1, selected: true }, { id: 2, selected: true }] }];
    expect(singleSelectedClip(many)).toBeNull();
    expect(resolveClipPropertiesClip(many, null)).toBeNull();
    expect(resolveClipPropertiesClip(many, { trackIndex: 0, clipId: 2 })).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
  });
});
