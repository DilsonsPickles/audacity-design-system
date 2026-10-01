/**
 * The dev Inspector's arithmetic (user request 2026-10-01: "a dev
 * inspector view that shows pixel sizes, gaps and dimensions"): given
 * the box under the pointer, the clip it belongs to and the other
 * controls of that clip, what to label. Pure, in whatever coordinates
 * the caller measures in (the overlay uses viewport px).
 */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Neighbour {
  box: Box;
  label: string;
}

export type GapSide = 'left' | 'right' | 'above' | 'below';

/** A measured gap from the target to the nearest neighbour on one
 *  side: `px` wide, drawn as a line from `from` to `to` along the axis
 *  of the gap, placed at `at` on the other axis. */
export interface Gap {
  side: GapSide;
  px: number;
  to: string;
  from: number;
  toCoord: number;
  at: number;
}

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);

/** The nearest neighbour on each side — left/right among those that
 *  overlap the target vertically, above/below among those that overlap
 *  it horizontally. Touching boxes report a 0 gap; overlapping ones
 *  are not "beside" and are skipped. */
export function nearestGaps(target: Box, neighbours: readonly Neighbour[]): Gap[] {
  const best = new Map<GapSide, Gap>();
  const offer = (gap: Gap) => {
    const cur = best.get(gap.side);
    if (!cur || gap.px < cur.px) best.set(gap.side, gap);
  };
  for (const n of neighbours) {
    const b = n.box;
    const v = overlap(target.top, target.bottom, b.top, b.bottom);
    const h = overlap(target.left, target.right, b.left, b.right);
    if (v > 0) {
      const at = (Math.max(target.top, b.top) + Math.min(target.bottom, b.bottom)) / 2;
      if (b.left >= target.right) offer({ side: 'right', px: b.left - target.right, to: n.label, from: target.right, toCoord: b.left, at });
      else if (b.right <= target.left) offer({ side: 'left', px: target.left - b.right, to: n.label, from: b.right, toCoord: target.left, at });
    }
    if (h > 0) {
      const at = (Math.max(target.left, b.left) + Math.min(target.right, b.right)) / 2;
      if (b.top >= target.bottom) offer({ side: 'below', px: b.top - target.bottom, to: n.label, from: target.bottom, toCoord: b.top, at });
      else if (b.bottom <= target.top) offer({ side: 'above', px: target.top - b.bottom, to: n.label, from: b.bottom, toCoord: target.top, at });
    }
  }
  return (['left', 'right', 'above', 'below'] as const).flatMap((s) => (best.has(s) ? [best.get(s)!] : []));
}

/** Where the target sits relative to its clip: its left and right
 *  edges measured from the clip's (negative = outside the clip), its
 *  top from the clip's top. */
export function clipOffsets(target: Box, clip: Box): { left: number; right: number; top: number } {
  return { left: target.left - clip.left, right: clip.right - target.right, top: target.top - clip.top };
}

/** A box's size, to the half pixel */
export function sizeOf(box: Box): { width: number; height: number } {
  return { width: round(box.right - box.left), height: round(box.bottom - box.top) };
}

export const round = (n: number) => Math.round(n * 2) / 2;

/** A readable name for a control element, from its attributes */
export function describeControl(attrs: {
  className?: string;
  fadeHandle?: string | null;
  fadeClip?: string | null;
  quickfadeNode?: string | null;
  crossfadeNode?: string | null;
  edgeTrim?: string | null;
  edgeMode?: string | null;
  buriedHandle?: string | null;
  clipId?: string | null;
  fadeGuideline?: string | null;
}): string {
  const c = attrs.className ?? '';
  if (attrs.buriedHandle) return `Buried ${attrs.buriedHandle.replace('-', ' handle (')})`;
  if (c.includes('clip-display__handle--trim-')) return `Trim handle (${c.includes('trim-left') ? 'left' : 'right'})`;
  if (c.includes('clip-display__handle--stretch-')) return `Stretch handle (${c.includes('stretch-left') ? 'left' : 'right'})`;
  if (attrs.fadeHandle) return `Fade ${attrs.fadeHandle} length handle`;
  if (attrs.quickfadeNode) return `Fade ${attrs.quickfadeNode} shape handle`;
  if (attrs.crossfadeNode) return 'Crossfade node';
  if (attrs.edgeTrim) return `Edge zone (${attrs.edgeTrim}${attrs.edgeMode === 'stretch' ? ', stretch' : ''})`;
  if (attrs.fadeGuideline) return `Fade guideline (${attrs.fadeGuideline})`;
  if (attrs.clipId) return `Clip ${attrs.clipId}`;
  return 'Element';
}
