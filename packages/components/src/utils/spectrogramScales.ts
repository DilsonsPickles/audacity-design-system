/**
 * Spectrogram frequency scale utilities
 *
 * Shared functions for mapping between frequency (Hz) and normalised
 * 0–1 position (0 = bottom / lowest freq, 1 = top / highest freq) for
 * all six supported spectrogram scale formats.
 *
 * Both the FrequencyRuler and the spectrogram canvas renderer use these
 * functions so the ruler ticks always align with the rendered data.
 */

export type SpectrogramScale = 'linear' | 'logarithmic' | 'mel' | 'bark' | 'erb' | 'period';

// ---------------------------------------------------------------------------
// Scale conversion primitives
// ---------------------------------------------------------------------------

// Mel
const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

// Bark  (Traunmüller 1990)
const hzToBark = (hz: number) => 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan(Math.pow(hz / 7500, 2));
// Inverse Bark via Newton's method (no closed form)
const barkToHz = (bark: number): number => {
  let hz = bark * 100; // initial guess
  for (let i = 0; i < 20; i++) {
    const f = hzToBark(hz) - bark;
    const df = 13 * 0.00076 / (1 + Math.pow(0.00076 * hz, 2)) + 3.5 * 2 * hz / (7500 * 7500) / (1 + Math.pow(hz / 7500, 4));
    hz -= f / df;
    if (Math.abs(f) < 0.0001) break;
  }
  return Math.max(0, hz);
};

// ERB  (Moore & Glasberg 1983)
const hzToErb = (hz: number) => 21.4 * Math.log10(1 + 0.00437 * hz);
const erbToHz = (erb: number) => (Math.pow(10, erb / 21.4) - 1) / 0.00437;

// ---------------------------------------------------------------------------
// Generic freqToNorm / normToFreq for each scale
// norm = 0 at minFreq, norm = 1 at maxFreq
// ---------------------------------------------------------------------------

function scaleValue(hz: number, scale: SpectrogramScale): number {
  switch (scale) {
    case 'linear':      return hz;
    case 'logarithmic': return Math.log10(Math.max(hz, 1));
    case 'mel':         return hzToMel(hz);
    case 'bark':        return hzToBark(hz);
    case 'erb':         return hzToErb(hz);
    case 'period':      return 1 / Math.max(hz, 0.001); // period = 1/f (higher freq → smaller period → top)
  }
}

function inverseScaleValue(v: number, scale: SpectrogramScale): number {
  switch (scale) {
    case 'linear':      return v;
    case 'logarithmic': return Math.pow(10, v);
    case 'mel':         return melToHz(v);
    case 'bark':        return barkToHz(v);
    case 'erb':         return erbToHz(v);
    case 'period':      return 1 / Math.max(v, 0.000001);
  }
}

/**
 * Convert a frequency (Hz) to a normalised 0–1 position.
 * 0 = bottom of display (minFreq), 1 = top of display (maxFreq).
 */
export function freqToNorm(hz: number, minFreq: number, maxFreq: number, scale: SpectrogramScale): number {
  const vMin = scaleValue(minFreq, scale);
  const vMax = scaleValue(maxFreq, scale);
  const v    = scaleValue(hz, scale);

  // For 'period', higher freq = smaller period = top, so inversion is natural
  // For all other scales, higher freq = larger value = top
  if (scale === 'period') {
    // period is inverted: minFreq has the largest period (bottom), maxFreq smallest (top)
    return (vMin - v) / (vMin - vMax);
  }
  return (v - vMin) / (vMax - vMin);
}

/**
 * Convert a normalised 0–1 position back to Hz.
 * 0 = minFreq, 1 = maxFreq.
 */
export function normToFreq(norm: number, minFreq: number, maxFreq: number, scale: SpectrogramScale): number {
  const vMin = scaleValue(minFreq, scale);
  const vMax = scaleValue(maxFreq, scale);

  let v: number;
  if (scale === 'period') {
    v = vMin - norm * (vMin - vMax);
  } else {
    v = vMin + norm * (vMax - vMin);
  }
  return inverseScaleValue(v, scale);
}

/**
 * Convert a normalised 0–1 position to a canvas Y pixel.
 * norm=0 (low freq) → y = height (bottom), norm=1 (high freq) → y = 0 (top).
 */
export function normToY(norm: number, height: number): number {
  return height * (1 - norm);
}

/**
 * Convert a frequency (Hz) directly to a canvas Y pixel.
 */
export function freqToY(hz: number, minFreq: number, maxFreq: number, height: number, scale: SpectrogramScale): number {
  return normToY(freqToNorm(hz, minFreq, maxFreq, scale), height);
}

// ---------------------------------------------------------------------------
// Per-scale tick definitions
// ---------------------------------------------------------------------------

export interface TickDef {
  /** Value in Hz (or seconds for Period scale) */
  value: number;
  /** Display label */
  label: string;
  isMajor: boolean;
}

function hzLabel(hz: number): string {
  if (hz >= 1000) return `${hz / 1000}k`;
  return `${hz}`;
}

const LINEAR_TICKS: TickDef[] = [
  { value: 0,     label: '0',    isMajor: true },
  { value: 1000,  label: '1k',   isMajor: true },
  { value: 2000,  label: '2k',   isMajor: true },
  { value: 3000,  label: '3k',   isMajor: false },
  { value: 4000,  label: '4k',   isMajor: true },
  { value: 5000,  label: '5k',   isMajor: true },
  { value: 6000,  label: '6k',   isMajor: false },
  { value: 7000,  label: '7k',   isMajor: false },
  { value: 8000,  label: '8k',   isMajor: true },
  { value: 9000,  label: '9k',   isMajor: false },
  { value: 10000, label: '10k',  isMajor: true },
  { value: 12000, label: '12k',  isMajor: false },
  { value: 14000, label: '14k',  isMajor: false },
  { value: 16000, label: '16k',  isMajor: true },
  { value: 18000, label: '18k',  isMajor: false },
  { value: 20000, label: '20k',  isMajor: true },
];

const LOG_TICKS: TickDef[] = [
  { value: 1,     label: '1',    isMajor: true  },
  { value: 2,     label: '',     isMajor: false },
  { value: 3,     label: '',     isMajor: false },
  { value: 5,     label: '5',    isMajor: false },
  { value: 10,    label: '10',   isMajor: true  },
  { value: 20,    label: '20',   isMajor: false },
  { value: 50,    label: '50',   isMajor: false },
  { value: 100,   label: '100',  isMajor: true  },
  { value: 200,   label: '200',  isMajor: false },
  { value: 500,   label: '500',  isMajor: false },
  { value: 1000,  label: '1000', isMajor: true  },
  { value: 2000,  label: '2000', isMajor: false },
  { value: 5000,  label: '5000', isMajor: false },
  { value: 10000, label: '10000',isMajor: true  },
  { value: 20000, label: '20000',isMajor: false },
];

const MEL_TICKS: TickDef[] = [
  { value: 100,   label: '100',  isMajor: false },
  { value: 200,   label: '200',  isMajor: false },
  { value: 500,   label: '500',  isMajor: true },
  { value: 1000,  label: '1k',   isMajor: true },
  { value: 2000,  label: '2k',   isMajor: true },
  { value: 5000,  label: '5k',   isMajor: true },
  { value: 10000, label: '10k',  isMajor: true },
  { value: 20000, label: '20k',  isMajor: true },
];

// Bark scale: label at critical band boundaries (approx)
const BARK_TICK_HZ = [100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700, 4400, 5300, 6400, 7700, 9500, 12000, 15500];
const BARK_TICKS: TickDef[] = BARK_TICK_HZ.map((hz, i) => ({
  value: hz,
  label: hzLabel(hz),
  isMajor: [100, 500, 1000, 2000, 5000, 10000].includes(hz),
}));

// ERB scale: similar to Mel but slightly different spacing
const ERB_TICKS: TickDef[] = [
  { value: 100,   label: '100',  isMajor: false },
  { value: 250,   label: '250',  isMajor: false },
  { value: 500,   label: '500',  isMajor: true },
  { value: 1000,  label: '1k',   isMajor: true },
  { value: 2000,  label: '2k',   isMajor: true },
  { value: 4000,  label: '4k',   isMajor: true },
  { value: 8000,  label: '8k',   isMajor: true },
  { value: 16000, label: '16k',  isMajor: true },
];

// Period scale: label in ms or s (1/f), shown from long period (low freq) at bottom to short (high freq) at top
const PERIOD_TICK_HZ = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const PERIOD_TICKS: TickDef[] = PERIOD_TICK_HZ.map(hz => {
  const period = 1 / hz;
  let label: string;
  if (period >= 0.01) label = `${Math.round(period * 1000)}ms`;
  else if (period >= 0.001) label = `${(period * 1000).toFixed(1)}ms`;
  else label = `${(period * 1000).toFixed(2)}ms`;
  return { value: hz, label, isMajor: [100, 1000, 10000].includes(hz) };
});

/**
 * Returns the recommended minimum frequency (Hz) for a given scale.
 * Logarithmic needs to start at 1 to show the full decade range.
 */
export function getScaleMinFreq(scale: SpectrogramScale): number {
  switch (scale) {
    case 'logarithmic': return 1;
    default:            return 10;
  }
}

export function getTicksForScale(scale: SpectrogramScale): TickDef[] {
  switch (scale) {
    case 'linear':      return LINEAR_TICKS;
    case 'logarithmic': return LOG_TICKS;
    case 'mel':         return MEL_TICKS;
    case 'bark':        return BARK_TICKS;
    case 'erb':         return ERB_TICKS;
    case 'period':      return PERIOD_TICKS;
  }
}
