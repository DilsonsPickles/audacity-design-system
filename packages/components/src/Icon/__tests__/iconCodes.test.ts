import { describe, it, expect } from 'vitest';
import { ICON_CODES, iconNamesOf, glyphCodepoint } from '../Icon';

describe('icon codes — read back by the dev Inspector (2026-10-01)', () => {
  it('a glyph maps back to its name(s); an unknown glyph to none', () => {
    expect(iconNamesOf(ICON_CODES.play)).toEqual(['play']);
    expect(iconNamesOf(ICON_CODES.cloud)).toEqual(['cloud', 'cloud-sync']); // one codepoint, two names
    expect(iconNamesOf('A')).toEqual([]);
  });

  it('writes a codepoint as U+XXXX', () => {
    expect(glyphCodepoint(ICON_CODES.play)).toBe('U+F446');
    expect(glyphCodepoint('')).toBe('U+E007');
    expect(glyphCodepoint('')).toBe('');
  });
});
