import { describe, it, expect } from 'vitest';
import { handleHintText } from '../handleHints';
import type { ClipHandleHint } from '@audacity-ui/components';

const ALL: ClipHandleHint[] = ['trim', 'stretch', 'edge-trim', 'edge-stretch', 'fade-length', 'fade-shape', 'crossfade', 'crossfade-roll'];

describe('handleHintText — what the status bar says for the handle under the pointer', () => {
  it('every handle has a line, and none of them is the time-selection default', () => {
    for (const hint of ALL) {
      for (const os of ['macos', 'windows'] as const) {
        const text = handleHintText(hint, os);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe('Click and drag to select audio');
      }
    }
  });

  it('modifier names follow the operating system', () => {
    expect(handleHintText('edge-trim', 'macos')).toContain('Option-drag');
    expect(handleHintText('edge-trim', 'windows')).toContain('Alt-drag');
    expect(handleHintText('fade-shape', 'macos')).toContain('Cmd-click');
    expect(handleHintText('fade-shape', 'windows')).toContain('Ctrl-click');
  });

  it('names the gestures TrackNew implements', () => {
    expect(handleHintText('fade-length', 'macos', { snapEnabled: true })).toBe('Drag to set the fade length · Shift-drag to ignore snapping');
    expect(handleHintText('fade-length', 'macos', { snapEnabled: false })).toBe('Drag to set the fade length · Shift-drag to snap to the grid');
    expect(handleHintText('fade-shape', 'macos')).toBe('Drag up or down to shape the fade · Cmd-click to toggle linear · Double-click to reset');
    expect(handleHintText('crossfade', 'macos')).toBe('Drag up or down to shape the crossfade · Option-drag to roll · Cmd-click to toggle linear · Double-click to reset');
    expect(handleHintText('crossfade-roll', 'macos')).toBe('Drag left or right to roll the crossfade · only as far as the clips have hidden audio');
    expect(handleHintText('edge-stretch', 'windows')).toBe('Drag to stretch the clip');
  });
});
