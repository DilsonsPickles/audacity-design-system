import { describe, it, expect } from 'vitest';
import { colors, darkTints, lightTints, mixHex } from '../../index';

describe('dark-mode tints (2026-10-06) — every hue, derived from its ramp', () => {
  it('mixHex mixes in sRGB like color-mix', () => {
    expect(mixHex('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(mixHex('#E85B5B', '#262932', 0.25)).toBe('#57363C'); // Math.round, as color-mix rounds half up
  });

  it('the banner values match the Figma dark error banner, and the light ones are ramp steps', () => {
    expect(darkTints.red).toEqual({fill:  '#57363C',  border:  '#914549',  accent:  '#F6B2B2'});
    expect(darkTints.blue).toEqual({fill:  '#2F3F5F',  border:  '#3A5895',  accent:  '#A2C7FF'});
    expect(darkTints.yellow).toEqual({fill:  '#524932',  border:  '#866F31',  accent:  '#F0D896'});
    expect(lightTints.blue).toEqual({ fill: colors.blue[200], border: colors.blue[500], accent: colors.blue[800] });
  });

  it('covers every hue but shade', () => {
    const hues = Object.keys(colors).filter((h) => h !== 'shade');
    expect(Object.keys(darkTints).sort()).toEqual(hues.sort());
    expect(Object.keys(lightTints).sort()).toEqual(hues.sort());
  });
});
