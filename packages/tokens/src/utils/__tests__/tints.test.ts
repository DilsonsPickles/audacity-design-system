import { describe, it, expect } from 'vitest';
import { colors, darkColors, darkTints, lightTints, mixHex, DARK_RAMP_MIX } from '../../index';

describe('dark-mode ramps (2026-10-06) — every hue, derived from its light ramp by role', () => {
  it('mixHex mixes in sRGB like color-mix, rounding half up', () => {
    expect(mixHex('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(mixHex('#E85B5B', '#262932', 0.25)).toBe('#57363C');
  });

  it('a dark ramp: 100–600 the hue\'s 700 sunk into midnight-200 at a rising mix, 700 the hue itself, 800/900 its 400/300', () => {
    const red = darkColors.red;
    expect(red[200]).toBe(mixHex(colors.red[700], colors.midnight[200], DARK_RAMP_MIX[200]));
    expect(red[500]).toBe(mixHex(colors.red[700], colors.midnight[200], DARK_RAMP_MIX[500]));
    expect(red[700]).toBe(colors.red[700]);
    expect(red[800]).toBe(colors.red[400]);
    expect(red[900]).toBe(colors.red[300]);
    // Pinned: the Figma's hand-drawn dark error banner
    expect([red[200], red[500], red[800]]).toEqual(['#57363C', '#914549', '#F6B2B2']);
  });

  it('the banner tints are the ramps\' 200 / 500 / 800 in both modes', () => {
    for (const hue of Object.keys(darkTints) as Array<keyof typeof darkTints>) {
      expect(darkTints[hue]).toEqual({ fill: darkColors[hue][200], border: darkColors[hue][500], accent: darkColors[hue][800] });
      expect(lightTints[hue]).toEqual({ fill: colors[hue][200], border: colors[hue][500], accent: colors[hue][800] });
    }
  });

  it('covers every chromatic hue — not shade, nor the neutrals slate and midnight — nine steps each', () => {
    const hues = Object.keys(colors).filter((h) => !['shade', 'slate', 'midnight'].includes(h)).sort();
    expect(Object.keys(darkColors).sort()).toEqual(hues);
    for (const hue of hues) expect(Object.keys(darkColors[hue as keyof typeof darkColors])).toHaveLength(9);
  });
});
