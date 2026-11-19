import { beatSeconds } from './musicalTime';

/**
 * THE SELECTION MEASURE (2026-11-19, "remove the selection and duration
 * timecodes by providing realtime selection info on, or close to the time
 * selection when it's made" — a ruler label first, then D2 of the mockups,
 * a dimension line under the selection): its readings, and where they sit.
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

export interface SelectionParts {
  length: string;
  start: string;
  end: string;
}

/**
 * The bracket's three readings: the LENGTH (`1.250 s`; a minute or more in
 * the position form) and each EDGE's time (`0:01.300`, `h:mm:ss.mmm` from an
 * hour); in beats and bars the length in beats — to a tenth between whole
 * beats (final review: an unsnapped 0.3 beats read "0 beats") — and the edges
 * as bar.beat, 1-based. Reversed input reads start-first.
 */
export function formatSelectionParts(start: number, end: number, opts: SelectionReadoutFormat): SelectionParts {
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  if (opts.format === 'beats-measures') {
    const beat = beatSeconds(opts.bpm ?? 120, opts.noteValue ?? 4);
    const perBar = opts.beatsPerMeasure ?? 4;
    const at = (t: number) => {
      const n = Math.floor(t / beat + 1e-9);
      return `${Math.floor(n / perBar) + 1}.${(n % perBar) + 1}`;
    };
    const tenths = Math.round(((b - a) / beat) * 10) / 10;
    const beats = Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1);
    return { length: `${beats} ${tenths === 1 ? 'beat' : 'beats'}`, start: at(a), end: at(b) };
  }
  return { length: length(b - a), start: clock(a), end: clock(b) };
}

/** Clear of the view's ends */
const EDGE_INSET = 4;
/** Room kept between the length and each edge's time */
const PART_GAP = 8;

/**
 * Where the bracket's parts go, all x in the same coordinates as `startX` /
 * `endX`: the length PILL centred over the VISIBLE part of the selection and
 * kept EDGE_INSET inside the view; an edge's TIME shown only when its tick is
 * in view and the whole selection has room for the pill with half of each
 * time beside it. Null when nothing of the selection is in view or it has no
 * length.
 */
export function placeSelectionMeasure(args: {
  startX: number; endX: number; visibleLeft: number; visibleRight: number;
  pillWidth: number; startWidth: number; endWidth: number;
}): { pillLeft: number; showStart: boolean; showEnd: boolean } | null {
  const { startX, endX, visibleLeft, visibleRight, pillWidth, startWidth, endWidth } = args;
  const from = Math.max(startX, visibleLeft);
  const to = Math.min(endX, visibleRight);
  if (to - from <= 0) return null;
  const centred = (from + to) / 2 - pillWidth / 2;
  const pillLeft = Math.max(visibleLeft + EDGE_INSET, Math.min(centred, visibleRight - pillWidth - EDGE_INSET));
  const room = endX - startX >= pillWidth + (startWidth + endWidth) / 2 + PART_GAP * 2;
  const inView = (x: number) => x >= visibleLeft && x <= visibleRight;
  return { pillLeft, showStart: room && inView(startX), showEnd: room && inView(endX) };
}
