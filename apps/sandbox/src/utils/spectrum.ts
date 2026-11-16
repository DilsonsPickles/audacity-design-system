/**
 * PLOT SPECTRUM's maths (2026-11-16, the Figma "Plot spectrum" flow in
 * 44 - Analyzers): Audacity 3's Frequency Analysis "Spectrum" algorithm —
 * the selection cut into windows of `size` samples, half overlapped, each
 * windowed and FFT'd, the power averaged (Welch), shown in dB.
 */

export type WindowFunctionId =
  | 'rectangular' | 'bartlett' | 'hamming' | 'hann' | 'blackman' | 'blackman-harris' | 'welch';

/** Audacity 3's window list (the Gaussians left out), in its order */
export const WINDOW_FUNCTIONS: { id: WindowFunctionId; label: string }[] = [
  { id: 'rectangular', label: 'Rectangular window' },
  { id: 'bartlett', label: 'Bartlett window' },
  { id: 'hamming', label: 'Hamming window' },
  { id: 'hann', label: 'Hann window' },
  { id: 'blackman', label: 'Blackman window' },
  { id: 'blackman-harris', label: 'Blackman-Harris window' },
  { id: 'welch', label: 'Welch window' },
];

/** Audacity 3's sizes, 128 to 65536 */
export const SPECTRUM_SIZES = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];

/** Audacity 3's algorithms; only Spectrum is built — the others dim */
export const SPECTRUM_ALGORITHMS: { id: string; label: string; built: boolean }[] = [
  { id: 'spectrum', label: 'Spectrum', built: true },
  { id: 'std-autocorrelation', label: 'Standard autocorrelation', built: false },
  { id: 'cuberoot-autocorrelation', label: 'Cuberoot autocorrelation', built: false },
  { id: 'enhanced-autocorrelation', label: 'Enhanced autocorrelation', built: false },
  { id: 'cepstrum', label: 'Cepstrum', built: false },
];

export function windowCoefficients(fn: WindowFunctionId, n: number): Float32Array {
  const w = new Float32Array(n);
  const m = n - 1 || 1;
  for (let i = 0; i < n; i++) {
    const x = i / m;
    switch (fn) {
      case 'rectangular': w[i] = 1; break;
      case 'bartlett': w[i] = 1 - Math.abs(2 * x - 1); break;
      case 'hamming': w[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * x); break;
      case 'hann': w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * x); break;
      case 'blackman': w[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * x) + 0.08 * Math.cos(4 * Math.PI * x); break;
      case 'blackman-harris':
        w[i] = 0.35875 - 0.48829 * Math.cos(2 * Math.PI * x) + 0.14128 * Math.cos(4 * Math.PI * x) - 0.01168 * Math.cos(6 * Math.PI * x);
        break;
      case 'welch': w[i] = 1 - (2 * x - 1) ** 2; break;
    }
  }
  return w;
}

/** In-place radix-2 FFT; `re.length` must be a power of two */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export interface Spectrum {
  /** Hz per bin; bin k is at k × binHz */
  binHz: number;
  /** dB per bin, 0 … size/2 (bin 0 is DC) */
  db: Float32Array;
}

/** The floor a silent bin reads */
export const SPECTRUM_FLOOR_DB = -150;

/**
 * The averaged power spectrum of `samples`, in dB. Scaled so a full-scale
 * sine reads about 0 dB at its frequency, whatever the window. A selection
 * shorter than `size` is zero-padded into one window.
 */
export function computeSpectrum(samples: Float32Array, sampleRate: number, size: number, fn: WindowFunctionId): Spectrum {
  const half = size / 2;
  const power = new Float64Array(half + 1);
  const win = windowCoefficients(fn, size);
  let winSum = 0;
  for (let i = 0; i < size; i++) winSum += win[i];
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const hop = half;
  let windows = 0;
  for (let start = 0; windows === 0 || start + size <= samples.length; start += hop) {
    for (let i = 0; i < size; i++) {
      re[i] = (samples[start + i] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= half; k++) power[k] += re[k] * re[k] + im[k] * im[k];
    windows++;
    if (start + size >= samples.length) break;
  }
  // amplitude of a sine of amplitude A at bin k ≈ A × winSum / 2
  const scale = 2 / winSum;
  const db = new Float32Array(half + 1);
  for (let k = 0; k <= half; k++) {
    const amp = Math.sqrt(power[k] / windows) * scale;
    db[k] = amp > 0 ? Math.max(SPECTRUM_FLOOR_DB, 20 * Math.log10(amp)) : SPECTRUM_FLOOR_DB;
  }
  return { binHz: sampleRate / size, db };
}

/** The dB at a frequency, read between the two bins either side */
export function spectrumDbAt(spectrum: Spectrum, hz: number): number {
  const x = hz / spectrum.binHz;
  const k = Math.floor(x);
  if (k < 0) return spectrum.db[0];
  if (k >= spectrum.db.length - 1) return spectrum.db[spectrum.db.length - 1];
  const f = x - k;
  return spectrum.db[k] * (1 - f) + spectrum.db[k + 1] * f;
}

/**
 * A peak at bin k, refined between bins by a parabola through it and its
 * two neighbours (Audacity 3's Frequency Analysis does the same for its
 * Peak readout), so the frequency is not stuck to the bin grid.
 */
export function refinePeak(spectrum: Spectrum, k: number): { hz: number; db: number } {
  const { db, binHz } = spectrum;
  if (k <= 0 || k >= db.length - 1) return { hz: k * binHz, db: db[k] };
  const a = db[k - 1];
  const b = db[k];
  const c = db[k + 1];
  const denom = a - 2 * b + c;
  if (denom >= 0) return { hz: k * binHz, db: b };
  const p = Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom));
  return { hz: (k + p) * binHz, db: b - 0.25 * (a - c) * p };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** "A4" for 440 Hz — the nearest equal-tempered note (Audacity 3 shows it beside the frequency) */
export function noteName(hz: number): string {
  if (!(hz > 0)) return '';
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function formatHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz >= 10000 ? 1 : 2)} kHz`;
  return `${Math.round(hz)} Hz`;
}

/** "0:05:00.25" — h:mm:ss.cc */
export function formatPlotTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`;
}

/** "30.00 s" */
export function formatPlotDuration(seconds: number): string {
  return `${Math.max(0, seconds).toFixed(2)} s`;
}

/**
 * The CSV Export writes: one row per frequency bin of the first curve,
 * one dB column per curve (each read at that frequency), so curves of
 * different sample rates still line up.
 */
export function spectrumCsv(curves: { name: string; spectrum: Spectrum }[]): string {
  if (curves.length === 0) return '';
  const base = curves[0].spectrum;
  const lines = [['Frequency (Hz)', ...curves.map((c) => `${c.name} (dB)`)].join(',')];
  for (let k = 1; k < base.db.length; k++) {
    const hz = k * base.binHz;
    lines.push([hz.toFixed(3), ...curves.map((c) => spectrumDbAt(c.spectrum, hz).toFixed(3))].join(','));
  }
  return lines.join('\n');
}
