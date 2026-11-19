import { describe, it, expect } from 'vitest';
import { lightTheme } from '@audacity-ui/tokens';
import { trackColourEdge } from '../trackColourEdge';

describe('trackColourEdge (2026-11-19, the track colour on the header\'s left edge)', () => {
  it('the track\'s own colour, as its clips are drawn', () => {
    expect(trackColourEdge({ color: 'violet' }, 0, lightTheme, 'colourful')).toBe(lightTheme.audio.clip.violet.header);
  });
  it('with no colour stored, the clips\' cycle by track index', () => {
    expect(trackColourEdge({}, 0, lightTheme, 'colourful')).toBe(lightTheme.audio.clip.blue.header);
    expect(trackColourEdge({}, 2, lightTheme, 'colourful')).toBe(lightTheme.audio.clip.magenta.header);
  });
  it('none for a group row, or when clips are drawn classic', () => {
    expect(trackColourEdge({ type: 'folder', color: 'red' }, 0, lightTheme, 'colourful')).toBeUndefined();
    expect(trackColourEdge({ color: 'red' }, 0, lightTheme, 'classic')).toBeUndefined();
  });
});
