import { beatSeconds } from './musicalTime';

/**
 * THE SELECTION READOUT (2026-11-19, "remove the selection and duration
 * timecodes by providing realtime selection info on, or close to the time
 * selection when it's made" → a label in the timeline ruler over the
 * selection): its text, and where it sits.
 */

export interface SelectionReadoutFormat {
  format: 'minutes-seconds' | 'beats-measures';
  bpm?: number;
  beatsPerMeasure?: number;
  noteValue?: number;
}

/** A position: m:ss.mmm, h:mm:ss.mmm from an hour */
function clock(seconds: number): string {
  const ms = Math.round(Math.max(0, seconds) * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const frac = String(ms % 1000).padStart(3, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}.${frac}` : `${m}:${ss}.${frac}`;
}

/** A length: S.mmm s under a minute, the position form from a minute */
function length(seconds: number): string {
  return seconds < 60 ? `${(Math.round(seconds * 1000) / 1000).toFixed(3)} s` : clock(seconds);
}

/**
 * The label: the LENGTH first, then the range — `1.250 s · 0:01.300 –
 * 0:02.550`; in beats and bars, `7 beats · 1.2 – 3.1` (a beat the lower
 * number's note, bar.beat 1-based). `short` is the length alone, for a
 * selection narrower than the full label. Reversed input reads start-first.
 */
export function formatSelectionReadout(start: number, end: number, opts: SelectionReadoutFormat): { full: string; short: string } {
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  if (opts.format === 'beats-measures') {
    const beat = beatSeconds(opts.bpm ?? 120, opts.noteValue ?? 4);
    const perBar = opts.beatsPerMeasure ?? 4;
    const at = (t: number) => {
      const n = Math.floor(t / beat + 1e-9);
      return `${Math.floor(n / perBar) + 1}.${(n % perBar) + 1}`;
    };
    const beats = Math.round((b - a) / beat);
    const short = `${beats} ${beats === 1 ? 'beat' : 'beats'}`;
    return { full: `${short} · ${at(a)} – ${at(b)}`, short };
  }
  const short = length(b - a);
  return { full: `${short} · ${clock(a)} – ${clock(b)}`, short };
}

/** Clear of the ruler's ends */
const EDGE_INSET = 4;

/**
 * Where the label sits: centred over the VISIBLE part of the selection,
 * kept EDGE_INSET inside the ruler; the full text when that visible part is
 * at least `fullWidth`, else the short one. Null when nothing of the
 * selection is in view or it has no length.
 */
export function placeSelectionReadout(args: { startX: number; endX: number; labelWidth: number; viewportWidth: number; fullWidth: number }): { left: number; full: boolean } | null {
  const { startX, endX, labelWidth, viewportWidth, fullWidth } = args;
  const from = Math.max(0, Math.min(startX, endX));
  const to = Math.min(viewportWidth, Math.max(startX, endX));
  if (to - from <= 0) return null;
  const centred = (from + to) / 2 - labelWidth / 2;
  const left = Math.max(EDGE_INSET, Math.min(centred, viewportWidth - labelWidth - EDGE_INSET));
  return { left, full: to - from >= fullWidth };
}
