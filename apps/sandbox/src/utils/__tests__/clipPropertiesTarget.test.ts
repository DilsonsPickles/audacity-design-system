import { describe, it, expect } from 'vitest';
import { resolveClipPropertiesClip, singleSelectedClip } from '../clipPropertiesTarget';

describe('resolveClipPropertiesClip — what the Clip properties panel shows (focus first since 2026-10-06; empty otherwise since 2026-10-07)', () => {
  const tracks = [
    { clips: [{ id: 1 }, { id: 2, selected: true }] },
    { clips: [{ id: 3 }] },
  ];

  it('the focused clip first — arrowing to another clip switches the panel; a focused clip that is gone is skipped', () => {
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 0, clipId: 1 })).toEqual({ trackIndex: 0, clip: { id: 1 } });
    expect(resolveClipPropertiesClip(tracks, { trackIndex: 0, clipId: 99 })).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
  });

  it('then the single selected clip', () => {
    expect(resolveClipPropertiesClip(tracks, null)).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
    expect(singleSelectedClip(tracks)).toEqual({ trackIndex: 0, clip: { id: 2, selected: true } });
  });

  it('with no focus and no single selection: nothing — the empty state, not the last clip shown', () => {
    const none = [{ clips: [{ id: 1 }, { id: 2 }] }, { clips: [{ id: 3 }] }];
    expect(resolveClipPropertiesClip(none, null)).toBeNull();
    const many = [{ clips: [{ id: 1, selected: true }, { id: 2, selected: true }] }];
    expect(singleSelectedClip(many)).toBeNull();
    expect(resolveClipPropertiesClip(many, null)).toBeNull();
  });
});
