/**
 * Crossfade geometry for overlapping clips (v1: edge fades only,
 * 2026-09-21).
 *
 * Clips on a track may overlap; array position is the z-order. The
 * audible/visual rules:
 *  - PARTIAL EDGE overlap (each clip has material outside the shared
 *    region, on opposite sides) = crossfade: the earlier clip fades
 *    out across the shared region while the later one fades in
 *    (equal-power). Symmetric — z does not affect the audio.
 *  - CONTAINMENT (one clip's span entirely inside the other's,
 *    including identical spans) = occlusion: the top (higher-z) clip
 *    simply plays; the covered region of the lower clip is silent.
 *    No fades are synthesized.
 *
 * Everything here is derived from clip geometry — a crossfade has no
 * stored state of its own.
 */

export interface CrossfadeClipLike {
  id: number | string;
  start: number;
  duration: number;
  /** Authored clip fades in seconds. An authored fade OWNS its edge:
   *  a crossfade honours it instead of the overlap-default ramp. */
  fadeIn?: number;
  fadeOut?: number;
  /** The QUICK fades' curve shapes — see `FadeShape`. Absent = the
   *  S-curve (DEFAULT_QUICK_FADE_SHAPE). A crossfade never reads these
   *  (2026-10-01): they are kept for when the clips come apart. */
  fadeInShape?: FadeShape;
  fadeOutShape?: FadeShape;
  /** The CROSSFADE's curve shapes on this clip's edges, written by the
   *  intersection node — an exponent on the equal-power base, or
   *  'linear'; never a handle. Absent = equal-power
   *  (DEFAULT_CROSSFADE_SHAPE), so a fresh overlap is symmetric whatever
   *  quick fades the two clips had (user decision 2026-10-01: the quick
   *  fades' shapes used to leak into the X and make it lopsided, with
   *  no way back). */
  crossfadeInShape?: number | 'linear';
  crossfadeOutShape?: number | 'linear';
  /** A FADE PIECE (2026-10-27, the cut tool through a fade: "try the
   *  partial fade approach"). Present — even 0 — means this edge's fade
   *  is a PIECE of a longer curve, the part a split left on this clip:
   *  `fadeIn` / `fadeOut` stay the WHOLE curve's length, and the piece
   *  shows its slice of it, never squashed to fit. `fadeInLead` is how
   *  many seconds of the fade-in curve ran BEFORE this clip's start (the
   *  right half of a cut starts part-way up); `fadeOutTail` how many
   *  seconds of the fade-out curve run on AFTER its end. A piece runs
   *  until the curve or the clip's free window ends. Absent = an ordinary
   *  fade. Editing a piece's length makes it ordinary again. MUST MATCH
   *  packages/audio/src/crossfadeGain.ts. */
  fadeInLead?: number;
  fadeOutTail?: number;
}

/** The slice of a fade's curve a clip shows, in timeline seconds and in
 *  the curve's own 0..1 time: an ordinary fade is the whole curve
 *  (u0 0, u1 1); a piece is part of it. */
export interface FadePiece {
  start: number;
  end: number;
  u0: number;
  u1: number;
}

/** A clip's quick fades as the slices of curve it shows, inside its free
 *  window (crossfades consume the window's edges; a crossfaded edge has
 *  no quick fade). Ordinary fades keep effectiveFades' rule — shrunk in
 *  proportion when the two would cross; a PIECE is never squashed, it is
 *  cut off where the window ends, and an ordinary fade beside a piece
 *  takes what the piece leaves. MUST MATCH quickFadePieces in
 *  packages/audio/src/crossfadeGain.ts. */
export function quickFadePieces(
  clip: CrossfadeClipLike,
  window: { start: number; end: number },
  crossfadedIn: boolean,
  crossfadedOut: boolean,
): { fadeIn: FadePiece | null; fadeOut: FadePiece | null } {
  const windowLen = Math.max(0, window.end - window.start);
  const clipStart = clip.start;
  const clipEnd = clip.start + clip.duration;
  const lenIn = crossfadedIn ? 0 : Math.max(0, clip.fadeIn ?? 0);
  const lenOut = crossfadedOut ? 0 : Math.max(0, clip.fadeOut ?? 0);
  const inIsPiece = lenIn > EPSILON && clip.fadeInLead !== undefined;
  const outIsPiece = lenOut > EPSILON && clip.fadeOutTail !== undefined;
  let fadeIn: FadePiece | null = null;
  let fadeOut: FadePiece | null = null;
  if (inIsPiece) {
    const lead = Math.max(0, Math.min(lenIn, clip.fadeInLead ?? 0));
    const curveStart = clipStart - lead;
    const end = Math.min(window.end, curveStart + lenIn);
    if (end - clipStart > EPSILON) fadeIn = { start: clipStart, end, u0: lead / lenIn, u1: (end - curveStart) / lenIn };
  }
  if (outIsPiece) {
    const tail = Math.max(0, Math.min(lenOut, clip.fadeOutTail ?? 0));
    const curveStart = clipEnd + tail - lenOut;
    const start = Math.max(window.start, curveStart);
    if (clipEnd - start > EPSILON) fadeOut = { start, end: clipEnd, u0: (start - curveStart) / lenOut, u1: (clipEnd - curveStart) / lenOut };
  }
  const whole = (start: number, end: number): FadePiece | null => (end - start > EPSILON ? { start, end, u0: 0, u1: 1 } : null);
  if (!inIsPiece && !outIsPiece) {
    const eff = effectiveFades(lenIn, lenOut, windowLen);
    return { fadeIn: whole(clipStart, clipStart + eff.fadeIn), fadeOut: whole(clipEnd - eff.fadeOut, clipEnd) };
  }
  if (!inIsPiece) {
    const room = Math.max(0, windowLen - (fadeOut ? fadeOut.end - fadeOut.start : 0));
    fadeIn = whole(clipStart, clipStart + Math.min(lenIn, room));
  }
  if (!outIsPiece) {
    const room = Math.max(0, windowLen - (fadeIn ? fadeIn.end - fadeIn.start : 0));
    fadeOut = whole(clipEnd - Math.min(lenOut, room), clipEnd);
  }
  return { fadeIn, fadeOut };
}

/** A piece's slice as a region's `span`, or undefined for the whole curve */
function spanOf(piece: FadePiece): readonly [number, number] | undefined {
  return piece.u0 > 1e-6 || piece.u1 < 1 - 1e-6 ? [piece.u0, piece.u1] : undefined;
}

export interface CrossfadeRegion {
  /** Shared region, in seconds */
  start: number;
  end: number;
  /** The earlier clip — its tail fades OUT across the region */
  outgoingClipId: number | string;
  /** The later clip — its head fades IN across the region */
  incomingClipId: number | string;
}

const EPSILON = 1e-9;

/** Pairwise edge-overlap crossfade regions for one track's clips. */
export function computeCrossfades(clips: readonly CrossfadeClipLike[]): CrossfadeRegion[] {
  const regions: CrossfadeRegion[] = [];
  for (let i = 0; i < clips.length; i++) {
    for (let j = i + 1; j < clips.length; j++) {
      const a = clips[i];
      const b = clips[j];
      const aEnd = a.start + a.duration;
      const bEnd = b.start + b.duration;
      const s = Math.max(a.start, b.start);
      const e = Math.min(aEnd, bEnd);
      if (e - s <= EPSILON) continue;
      const aInsideB = a.start >= b.start - EPSILON && aEnd <= bEnd + EPSILON;
      const bInsideA = b.start >= a.start - EPSILON && bEnd <= aEnd + EPSILON;
      if (aInsideB || bInsideA) continue; // containment → occlusion, no fade
      const [earlier, later] = a.start <= b.start ? [a, b] : [b, a];
      regions.push({
        start: s,
        end: e,
        outgoingClipId: earlier.id,
        incomingClipId: later.id,
      });
    }
  }
  return regions.sort((x, y) => x.start - y.start);
}

/** Effective quick-fade extents: fades may not overlap EACH OTHER on
 *  a clip (curves never cross on the same clip). Stored values stay
 *  untouched — a clip that shrank under its fades renders/plays them
 *  proportionally scaled to fit, and regrowing restores them. */
export function effectiveFades(
  fadeIn: number | undefined,
  fadeOut: number | undefined,
  duration: number,
): { fadeIn: number; fadeOut: number } {
  const fi = Math.min(Math.max(0, fadeIn ?? 0), duration);
  const fo = Math.min(Math.max(0, fadeOut ?? 0), duration);
  const sum = fi + fo;
  if (sum <= duration || sum <= 0) return { fadeIn: fi, fadeOut: fo };
  const scale = duration / sum;
  return { fadeIn: fi * scale, fadeOut: fo * scale };
}

/** The span of a clip NOT consumed by crossfades — quick fades must
 *  live inside it (a quick fade may never overlap a crossfade). A
 *  crossfade region always touches the incoming clip's head or the
 *  outgoing clip's tail, so consumption only ever moves the window's
 *  edges inward. */
export function quickFadeWindows(
  clips: readonly CrossfadeClipLike[],
): Map<string, { start: number; end: number }> {
  const windows = new Map<string, { start: number; end: number }>(
    clips.map((c) => [String(c.id), { start: c.start, end: c.start + c.duration }]),
  );
  for (const r of computeCrossfades(clips)) {
    const inWindow = windows.get(String(r.incomingClipId));
    if (inWindow) inWindow.start = Math.max(inWindow.start, r.end);
    const outWindow = windows.get(String(r.outgoingClipId));
    if (outWindow) outWindow.end = Math.min(outWindow.end, r.start);
  }
  return windows;
}

export interface FadeCurveRegion {
  clipId: number | string;
  side: 'in' | 'out';
  /** Timeline seconds */
  start: number;
  end: number;
  /** True when the region is the clip's own fadeIn/fadeOut; false when
   *  it is the overlap-default crossfade ramp. */
  authored: boolean;
  /** Curve shape, resolved: the stored one, else the default for
   *  this kind of fade (see `authored`) */
  shape: FadeShape;
  /** A FADE PIECE's slice of its curve, in the curve's 0..1 time, drawn
   *  across start..end. Absent = the whole curve. */
  span?: readonly [number, number];
}

/** ONE fade per clip edge — the CROSSFADE wins (2026-09-21 "consume"
 *  decision, reversing the earlier inherit rule): every edge overlap
 *  draws its equal-power ramps over the shared region on BOTH sides;
 *  an authored quick fade on a crossfaded edge is SUPPRESSED (stored
 *  value untouched — separating the clips brings it back). Shape
 *  exponents still apply to the crossfade ramps (they are the
 *  intersection node's control). Free edges keep their authored
 *  fades. This is the drawn mirror of crossfadeGain.ts in
 *  @audacity-ui/audio — keep them in agreement. */
export function computeFadeCurves(clips: readonly CrossfadeClipLike[]): FadeCurveRegion[] {
  const regions: FadeCurveRegion[] = [];
  const crossfadedIn = new Set<string>();
  const crossfadedOut = new Set<string>();
  for (const r of computeCrossfades(clips)) {
    const outClip = clips.find((c) => c.id === r.outgoingClipId);
    const inClip = clips.find((c) => c.id === r.incomingClipId);
    if (outClip) {
      crossfadedOut.add(String(outClip.id));
      regions.push({ clipId: outClip.id, side: 'out', start: r.start, end: r.end, authored: false, shape: outClip.crossfadeOutShape ?? DEFAULT_CROSSFADE_SHAPE });
    }
    if (inClip) {
      crossfadedIn.add(String(inClip.id));
      regions.push({ clipId: inClip.id, side: 'in', start: r.start, end: r.end, authored: false, shape: inClip.crossfadeInShape ?? DEFAULT_CROSSFADE_SHAPE });
    }
  }
  const windows = quickFadeWindows(clips);
  for (const c of clips) {
    // Quick fades are confined to the free window (never overlapping a
    // crossfade) and may not cross each other within it
    const w = windows.get(String(c.id)) ?? { start: c.start, end: c.start + c.duration };
    const { fadeIn, fadeOut } = quickFadePieces(c, w, crossfadedIn.has(String(c.id)), crossfadedOut.has(String(c.id)));
    if (fadeIn) {
      const span = spanOf(fadeIn);
      regions.push({ clipId: c.id, side: 'in', start: fadeIn.start, end: fadeIn.end, authored: true, shape: c.fadeInShape ?? DEFAULT_QUICK_FADE_SHAPE, ...(span ? { span } : {}) });
    }
    if (fadeOut) {
      const span = spanOf(fadeOut);
      regions.push({ clipId: c.id, side: 'out', start: fadeOut.start, end: fadeOut.end, authored: true, shape: c.fadeOutShape ?? DEFAULT_QUICK_FADE_SHAPE, ...(span ? { span } : {}) });
    }
  }
  return regions.sort((a, b) => a.start - b.start || String(a.clipId).localeCompare(String(b.clipId)));
}

export interface CrossfadeIntersection {
  /** Timeline seconds of the curves' crossing */
  time: number;
  /** Gain (0..1) both sides carry at the crossing */
  gain: number;
}

/** The X's crossing point. The out-curve is 1 before its region and 0
 *  after (its region always ENDS at the outgoing clip's tail = the
 *  overlap end); the in-curve is 0 before its region (which always
 *  STARTS at the incoming clip's head = the overlap start) — so their
 *  difference is strictly decreasing across the overlap and crosses
 *  zero exactly once. Bisection; both curves may be authored fades
 *  with extents different from the overlap. */
export function crossfadeIntersection(
  outRegion: { start: number; end: number; shape?: FadeShape },
  inRegion: { start: number; end: number; shape?: FadeShape },
  overlapStart: number,
  overlapEnd: number,
): CrossfadeIntersection {
  const gainOut = (x: number) => {
    if (x <= outRegion.start) return 1;
    if (x >= outRegion.end) return 0;
    return fadeOutGain((x - outRegion.start) / (outRegion.end - outRegion.start), outRegion.shape ?? DEFAULT_CROSSFADE_SHAPE);
  };
  const gainIn = (x: number) => {
    if (x <= inRegion.start) return 0;
    if (x >= inRegion.end) return 1;
    return fadeInGain((x - inRegion.start) / (inRegion.end - inRegion.start), inRegion.shape ?? DEFAULT_CROSSFADE_SHAPE);
  };
  let lo = overlapStart;
  let hi = overlapEnd;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (gainOut(mid) - gainIn(mid) > 0) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return { time: t, gain: (gainOut(t) + gainIn(t)) / 2 };
}

/**
 * The point a quick fade's S-curve is bent to pass through — where its
 * handle sits. `t` is the position along the fade (0 = where the fade
 * starts, 1 = where it ends) and `g` the gain there (0..1). The centre,
 * (0.5, 0.5), is the plain S-curve.
 */
export interface FadeHandle {
  t: number;
  g: number;
}

/** A fade's shape, one of three kinds:
 *  - a NUMBER: an exponent on the equal-power base curve (1 =
 *    equal-power, 2 = S-curve, <1 = sharper end) — what a crossfade's
 *    node writes;
 *  - `'linear'`: a straight line, which no exponent can produce (cos^k
 *    always starts flat). Two linear sides make an equal-GAIN crossfade;
 *  - a `FadeHandle`: the S-curve bent through a point — what a quick
 *    fade's handle writes.
 *  The audio bake (packages/audio/crossfadeGain.ts) reads the same
 *  value. */
export type FadeShape = number | 'linear' | FadeHandle;

export function isFadeHandle(shape: FadeShape | undefined): shape is FadeHandle {
  return typeof shape === 'object' && shape !== null;
}

/**
 * How far a quick fade's handle can go (user decision 2026-09-29): a
 * box in (position along the fade, gain). Since 2026-10-06 ("can the
 * handle be dragged up higher? and lower", then "down further and up
 * further") the GAIN runs 5%..95% — it was 27.5%..72.5%, measured off
 * the reference images, and read as a short leash, then 10%..90% —
 * and the box is 30%..70% ALONG the fade (was 15%..85%, then
 * 25%..75%): at 95% gain a handle nearer the start than 30% would
 * start the curve steeper than a straight line, a hard corner, and
 * the drag has been vertical-only since 2026-10-01 (the position is
 * held at the middle; only a stored project puts it elsewhere), so
 * nothing is lost. Inside the box the curve stays an S — at the
 * corners a steep rise with a short ease at one end and a long one at
 * the other, never a hard corner (the test checks every corner).
 */
export const FADE_HANDLE_LIMITS = { tMin: 0.3, tMax: 0.7, gMin: 0.05, gMax: 0.95 } as const;

export function clampFadeHandle(h: FadeHandle): FadeHandle {
  const { tMin, tMax, gMin, gMax } = FADE_HANDLE_LIMITS;
  return {
    t: Math.max(tMin, Math.min(tMax, h.t)),
    g: Math.max(gMin, Math.min(gMax, h.g)),
  };
}

const LN_HALF = Math.log(0.5);

/**
 * The S-curve through a handle, for a fade IN, at position t (0..1).
 * Three steps, each the identity when the handle is at the centre:
 *  1. bend TIME so the handle's position lands on the S's midpoint;
 *  2. the S itself — the raised cosine, (1 − cos πw) / 2;
 *  3. bend GAIN so the midpoint's half gain becomes the handle's gain
 *     (Schlick's bias, s / ((1/g − 2)(1 − s) + 1)).
 * So the curve always runs 0 → 1, always rises, and always passes
 * through the handle. MUST MATCH `handleCurveGain` in
 * packages/audio/src/crossfadeGain.ts.
 */
export function handleCurveGain(t: number, handle: FadeHandle): number {
  const u = Math.max(0, Math.min(1, t));
  const ht = Math.max(0.01, Math.min(0.99, handle.t));
  const hg = Math.max(0.01, Math.min(0.99, handle.g));
  const w = ht < 0.5
    ? 1 - (1 - u) ** (LN_HALF / Math.log(1 - ht))
    : u ** (LN_HALF / Math.log(ht));
  const s = (1 - Math.cos(Math.PI * w)) / 2;
  return s / ((1 / hg - 2) * (1 - s) + 1);
}

export const LINEAR: FadeShape = 'linear';

/**
 * What a fade's shape IS when none is stored. There are two defaults,
 * because there are two kinds of fade, and a clip stores one shape per
 * edge for whichever kind that edge is wearing:
 *
 *  - a QUICK FADE (the clip's own fade in or out) is an S-CURVE: it
 *    leaves silence gently, moves fastest through the middle and
 *    arrives gently. Exponent 2 on the equal-power base is exactly the
 *    raised cosine, (1 − cos πt) / 2. User decision 2026-09-29; it was
 *    equal-power, which starts abruptly.
 *  - a CROSSFADE stays EQUAL-POWER (exponent 1): two unrelated sounds
 *    crossing hold their combined loudness. S-curves there would dip
 *    by 3 dB in the middle.
 *
 * So `undefined` means "this kind's default", not a fixed curve: an
 * edge with nothing stored is an S-curve while it is a quick fade and
 * equal-power while it is crossfaded.
 *
 * MUST MATCH packages/audio/src/crossfadeGain.ts, which bakes the same
 * curves into the sound (the audio package cannot import this one). A
 * sandbox test holds the two together.
 */
export const DEFAULT_QUICK_FADE_SHAPE = 2;
export const DEFAULT_CROSSFADE_SHAPE = 1;

/** Gain for the OUTGOING side at normalized position t (0..1).
 *  `shape` bends the equal-power base curve (1 = equal-power). Callers
 *  pass a RESOLVED shape — the defaults above are applied where a
 *  clip's stored value is read, not here. */
export function fadeOutGain(t: number, shape: FadeShape = 1): number {
  const u = Math.max(0, Math.min(1, t));
  if (shape === 'linear') return 1 - u;
  // A fade out is the fade in played backwards, handle and all
  if (isFadeHandle(shape)) return handleCurveGain(1 - u, { t: 1 - shape.t, g: shape.g });
  return Math.cos((u * Math.PI) / 2) ** shape;
}

/** Gain for the INCOMING side at normalized position t (0..1). */
export function fadeInGain(t: number, shape: FadeShape = 1): number {
  const u = Math.max(0, Math.min(1, t));
  if (shape === 'linear') return u;
  if (isFadeHandle(shape)) return handleCurveGain(u, shape);
  return Math.sin((u * Math.PI) / 2) ** shape;
}

/** Where a fade's handle sits, whatever kind of shape is stored: a
 *  handle shape is its own position; an exponent or a straight line
 *  puts it at the middle of the fade. The gain is always read off the
 *  curve, so the handle is on it by construction. */
export function fadeHandleOf(side: 'in' | 'out', shape: FadeShape): FadeHandle {
  const t = isFadeHandle(shape) ? Math.max(0, Math.min(1, shape.t)) : 0.5;
  return { t, g: side === 'in' ? fadeInGain(t, shape) : fadeOutGain(t, shape) };
}

/** Is this shape the quick fade's default curve? Both spellings count:
 *  the exponent and a handle at the centre draw the same S. */
export function isDefaultQuickFadeShape(shape: FadeShape | undefined): boolean {
  if (shape === undefined) return true;
  if (shape === 'linear') return false;
  if (isFadeHandle(shape)) return Math.abs(shape.t - 0.5) < 0.005 && Math.abs(shape.g - 0.5) < 0.005;
  return Math.abs(shape - DEFAULT_QUICK_FADE_SHAPE) < 0.01;
}

/** A fade region in CLIP-LOCAL seconds (0 = the clip's left edge), the
 *  form ClipBody shades the waveform with. */
export interface LocalFadeRegion {
  side: 'in' | 'out';
  start: number;
  end: number;
  shape: FadeShape;
  /** A fade piece's slice of its curve (see FadeCurveRegion.span) */
  span?: readonly [number, number];
}

/** Curve time (0..1) at a region's normalised position u, through its
 *  span when it is a piece */
function curveTimeIn(u: number, span: readonly [number, number] | undefined): number {
  return span ? span[0] + u * (span[1] - span[0]) : u;
}

/** The fade gain at clip-local time `t` — the product of every region
 *  covering t (at most one in, one out). This is what the drawn
 *  waveform is scaled by, using the same curves the audio bake
 *  applies, so the picture is the sound. */
export function fadeGainAt(t: number, regions: readonly LocalFadeRegion[] | undefined): number {
  if (!regions || regions.length === 0) return 1;
  let g = 1;
  for (let k = 0; k < regions.length; k++) {
    const r = regions[k];
    const len = r.end - r.start;
    if (len <= 0) continue;
    if (t < r.start) { if (r.side === 'in') g = 0; continue; }
    if (t > r.end) { if (r.side === 'out') g = 0; continue; }
    const u = curveTimeIn((t - r.start) / len, r.span);
    g *= r.side === 'in' ? fadeInGain(u, r.shape) : fadeOutGain(u, r.shape);
  }
  return g;
}

/** `computeFadeCurves` regions regrouped per clip and moved into that
 *  clip's local time, for shading its waveform. */
export function localFadeRegionsByClip(
  clips: readonly CrossfadeClipLike[],
  regions: readonly FadeCurveRegion[],
): Map<number | string, LocalFadeRegion[]> {
  const starts = new Map<number | string, number>();
  for (const c of clips) starts.set(c.id, c.start);
  const out = new Map<number | string, LocalFadeRegion[]>();
  for (const r of regions) {
    const s0 = starts.get(r.clipId);
    if (s0 === undefined) continue;
    const list = out.get(r.clipId) ?? [];
    list.push({ side: r.side, start: r.start - s0, end: r.end - s0, shape: r.shape, ...(r.span ? { span: r.span } : {}) });
    out.set(r.clipId, list);
  }
  return out;
}

/** SVG path (0..100 × 0..100 viewBox, y=0 is full gain) for one side
 *  of the X. Sampled polyline stretched to the region via
 *  `preserveAspectRatio="none"`. A bent shape exponent concentrates
 *  all the curvature near one end, so the sample count must be high
 *  enough that no segment reads as an angle. */
export function fadeCurvePath(side: 'out' | 'in', samples = 64, shape: FadeShape = 1, span?: readonly [number, number]): string {
  const pts: string[] = [];
  for (let k = 0; k <= samples; k++) {
    const t = k / samples;
    // A PIECE draws its slice of the curve across the whole box
    const c = curveTimeIn(t, span);
    const gain = side === 'out' ? fadeOutGain(c, shape) : fadeInGain(c, shape);
    const xPos = t * 100;
    const yPos = (1 - gain) * 100;
    pts.push(`${xPos.toFixed(2)},${yPos.toFixed(2)}`);
  }
  return `M ${pts.join(' L ')}`;
}

/** The area ABOVE a fade's curve, as a closed SVG path in the same
 *  0..100 box as `fadeCurvePath`: the part of the clip the fade takes
 *  away. It is the curve itself, closed along the top edge through the
 *  corner the curve never visits — top-left for a fade in (the curve
 *  runs bottom-left → top-right), top-right for a fade out. */
/** The area BELOW a fade's curve — what the fade leaves. The curve,
 *  closed along the bottom edge through the corner under its full-gain
 *  end: bottom-right for a fade in, bottom-left for a fade out. */
// Closed along the box's bottom (below) or top (above) edge through BOTH
// corners: a whole curve visits one of them itself, a PIECE's slice
// starts and ends part-way up, so neither corner can be assumed.
export function fadeAreaBelowPath(side: 'out' | 'in', samples = 64, shape: FadeShape = 1, span?: readonly [number, number]): string {
  return `${fadeCurvePath(side, samples, shape, span)} L 100.00,100.00 L 0.00,100.00 Z`;
}

export function fadeAreaAbovePath(side: 'out' | 'in', samples = 64, shape: FadeShape = 1, span?: readonly [number, number]): string {
  return `${fadeCurvePath(side, samples, shape, span)} L 100.00,0.00 L 0.00,0.00 Z`;
}
