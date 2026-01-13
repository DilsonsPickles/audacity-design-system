/**
 * Generate consistent time selection colors based on body color
 *
 * Rule:
 * - Time Selection Body: L=88%, S=100%, H=original
 * - Time Selection Header: L=83%, S=100%, H=original
 * - Time Selection Waveform: L=18%, S=35%, H=original
 */

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

// Hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

// RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// Generate time selection colors from header color using consistent rule
function generateTimeSelectionColors(headerHex: string) {
  const [r, g, b] = hexToRgb(headerHex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Rule:
  // - Time Selection Body: L = header_L + 15%, clamped to 85-95%, S = 100%
  // - Time Selection Header: L = header_L + 5%, clamped to 75-88%, S = 100%
  // - Time Selection Waveform: L = 17%, S = 35%

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const tsBodyL = clamp(l + 15, 85, 95);
  const tsHeaderL = clamp(l + 5, 75, 88);

  const bodyRgb = hslToRgb(h, 100, tsBodyL);
  const timeSelectionBody = rgbToHex(...bodyRgb);

  const headerRgb = hslToRgb(h, 100, tsHeaderL);
  const timeSelectionHeader = rgbToHex(...headerRgb);

  const waveformRgb = hslToRgb(h, 35, 17);
  const timeSelectionWaveform = rgbToHex(...waveformRgb);

  return {
    original: { hex: headerHex, hsl: { h: h.toFixed(0), s: s.toFixed(0), l: l.toFixed(0) } },
    timeSelectionBody,
    timeSelectionHeader,
    timeSelectionWaveform,
    calculatedL: { body: tsBodyL.toFixed(0), header: tsHeaderL.toFixed(0) }
  };
}

// All clip colors from the theme
const clipColors = {
  cyan: {
    header: '#6CCBD8',
    headerSelected: '#D8F2F3',
    body: '#90D8E1',
    timeSelectionBody: '#9FFFFF',
    timeSelectionHeader: '#7BFFFF',
    timeSelectionWaveform: '#163134',
  },
  blue: {
    header: '#84B5FF',
    headerSelected: '#DEEBFF',
    body: '#A2C7FF',
    timeSelectionBody: '#B7FAFF',
    timeSelectionHeader: '#99E8FF',
    timeSelectionWaveform: '#1D2B3F',
  },
  violet: {
    header: '#ADABFC',
    headerSelected: '#E9E8FF',
    body: '#C1BFFE',
    timeSelectionBody: '#E0F0FF',
    timeSelectionHeader: '#CCDBFF',
    timeSelectionWaveform: '#28283F',
  },
  magenta: {
    header: '#E1A3D6',
    headerSelected: '#F6E8F4',
    body: '#E8BAE0',
    timeSelectionBody: '#FFE8FF',
    timeSelectionHeader: '#FFD1FF',
    timeSelectionWaveform: '#372534',
  },
  red: {
    header: '#F39999',
    headerSelected: '#FCE4E4',
    body: '#F6B2B2',
    timeSelectionBody: '#FFDEE6',
    timeSelectionHeader: '#FFC5CD',
    timeSelectionWaveform: '#3C2323',
  },
  orange: {
    header: '#FFB183',
    headerSelected: '#FFEADD',
    body: '#FFC4A1',
    timeSelectionBody: '#FFF6D0',
    timeSelectionHeader: '#FFE3B2',
    timeSelectionWaveform: '#3F291D',
  },
  yellow: {
    header: '#ECCC73',
    headerSelected: '#F8F0DC',
    body: '#F0D896',
    timeSelectionBody: '#FFFFC0',
    timeSelectionHeader: '#FFFF9D',
    timeSelectionWaveform: '#3A3118',
  },
  green: {
    header: '#8FCB7A',
    headerSelected: '#E0F2DD',
    body: '#AAD89B',
    timeSelectionBody: '#C2FFC7',
    timeSelectionHeader: '#A7FFA6',
    timeSelectionWaveform: '#20311A',
  },
  teal: {
    header: '#5CC3A9',
    headerSelected: '#D4F0E8',
    body: '#84D2BE',
    timeSelectionBody: '#8FFFF6',
    timeSelectionHeader: '#67F9E1',
    timeSelectionWaveform: '#122E27',
  },
};

console.log('COMPARISON: Current vs Consistent Rule\n');
console.log('Rule: timeSelectionBody L=header+15% (85-95%), timeSelectionHeader L=header+5% (75-88%), S=100%\n');

for (const [colorName, colors] of Object.entries(clipColors)) {
  const generated = generateTimeSelectionColors(colors.header);

  console.log(`${colorName.toUpperCase()}:`);
  console.log(`  Current timeSelectionBody:   ${colors.timeSelectionBody}`);
  console.log(`  Generated timeSelectionBody: ${generated.timeSelectionBody} (L=${generated.calculatedL.body}%)`);
  console.log(`  Current timeSelectionHeader: ${colors.timeSelectionHeader}`);
  console.log(`  Generated timeSelectionHeader: ${generated.timeSelectionHeader} (L=${generated.calculatedL.header}%)`);
  console.log(`  Current timeSelectionWave:   ${colors.timeSelectionWaveform}`);
  console.log(`  Generated timeSelectionWave: ${generated.timeSelectionWaveform}`);

  const match =
    colors.timeSelectionBody === generated.timeSelectionBody &&
    colors.timeSelectionHeader === generated.timeSelectionHeader &&
    colors.timeSelectionWaveform === generated.timeSelectionWaveform;

  console.log(`  ${match ? '✓ MATCHES' : '✗ DIFFERS'}`);
  console.log();
}

console.log('\n--- RECOMMENDED TOKENS (copy to light.v2.ts and dark.v2.ts) ---\n');
for (const [colorName, colors] of Object.entries(clipColors)) {
  const generated = generateTimeSelectionColors(colors.header);
  console.log(`      ${colorName}: {`);
  console.log(`        timeSelectionBody: '${generated.timeSelectionBody}',`);
  console.log(`        timeSelectionHeader: '${generated.timeSelectionHeader}',`);
  console.log(`        timeSelectionWaveform: '${generated.timeSelectionWaveform}',`);
  console.log(`      },`);
}
