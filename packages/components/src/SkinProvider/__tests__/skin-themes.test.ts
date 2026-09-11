import { describe, expect, it } from 'vitest';
import { SKIN_IDS } from '../skin-preferences';
import { resolveSkinTheme } from '../skin-themes';

function luminance(hex: string) {
  const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const skin of SKIN_IDS.filter(skin => skin !== 'default')) {
  describe(skin, () => {
    for (const mode of ['light', 'dark'] as const) it(`${mode} retains readable text, controls and clip identities`, () => {
      const theme = resolveSkinTheme(skin, mode);
      for (const surface of [theme.background.surface.default, theme.background.surface.elevated,
        theme.background.control.button.secondary.idle, theme.background.control.checkbox.idle]) {
        expect(contrast(theme.foreground.text.primary, surface)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast('#152132', theme.background.control.button.primary.idle)).toBeGreaterThanOrEqual(4.5);
      const colors = Object.values(theme.audio.clip).filter(value => 'header' in value);
      expect(new Set(colors.map(color => color.header)).size).toBe(colors.length);
      for (const clip of colors) expect(contrast(clip.waveform, clip.body)).toBeGreaterThanOrEqual(4.5);
    });
  });
}
