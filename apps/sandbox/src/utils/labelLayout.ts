/**
 * Label layout utilities
 * Handles row calculation to prevent label overlaps.
 *
 * All geometry derives from ONE scale source — the label font size — via
 * `getLabelMetrics()`. At the default size (12px / 9pt) every metric equals
 * the classic hand-tuned design (14px banner, 7px ears, 4px padding…);
 * larger sizes scale the whole system proportionally so labels stay
 * balanced up to 48pt text. Renderer and hit-testing must use the SAME
 * metrics object or clicks land beside the pixels.
 */

export interface Label {
  id: number;
  startTime: number;
  endTime?: number;
  text?: string;
}

/** The classic design's font size — the scale-1 reference point. */
export const DEFAULT_LABEL_FONT_PX = 12;

/** pt → px at CSS's fixed 96dpi (1pt = 4/3 px). The preference stores
 *  points (how type is sized everywhere else); rendering wants px. */
export function labelPtToPx(pt: number): number {
  return (pt * 4) / 3;
}

export interface LabelMetrics {
  /** Text size in CSS px. */
  fontSizePx: number;
  /** Banner (label box) height — 1.5x the font size (24px text sits in
   *  a 36px strap, per the 2026-09-15 mockup) with a 20px FLOOR so the
   *  default 12px text sits in a 20px strap, flush with the constant
   *  8x20 ears. */
  bannerHeight: number;
  /** Vertical gap between stacked label rows — scales with the text
   *  (bigger straps get proportionally more air) but snapped to
   *  MULTIPLES OF 4 (2026-09-15 direction): 4px through ~24pt, 8px at
   *  36pt, 12px at 48pt. */
  rowGap: number;
  /** bannerHeight + rowGap — the row stride for packing/stacking. */
  rowHeight: number;
  /** Horizontal text padding inside the banner — 1/3 of the text size
   *  snapped to the 4px grid (min 4): 4px at the default, stepping
   *  8/12/16/20 up the ramp. */
  padX: number;
  /** Ear width — CONSTANT 10px at every text size. */
  earWidth: number;
  /** Ear height — CONSTANT 20px (matching the default 10pt strap, where
   *  it sits exactly flush), top-aligned as a corner tab on taller
   *  straps; capped at the strap height so it never overshoots smaller
   *  ones. Ears do NOT scale with the text — only the strap does. */
  earHeight: number;
  /** Stalk (vertical guide line) width — CONSTANT 1px: chrome never
   *  scales, only the text strap does. */
  stalkWidth: number;
  /** Gap between a point label's ear and its text flag — same formula
   *  as padX (1/3 of the text size on the 4px grid), so the flag's
   *  detachment from the stalk keeps pace with the type. */
  pointFlagGap: number;
  /** Point-label width clamp. */
  minPointWidth: number;
  maxPointWidth: number;
  /** Point-label flag corner radius — CONSTANT 2px (Figma scaling study
   *  and the real build agree). */
  borderRadius: number;
  /** Canvas font string used to measure text — MUST match the rendered
   *  font (Inter 500) or measured widths lie. */
  font: string;
}

export function getLabelMetrics(fontSizePx: number = DEFAULT_LABEL_FONT_PX): LabelMetrics {
  const s = fontSizePx / DEFAULT_LABEL_FONT_PX;
  const bannerHeight = Math.max(20, Math.round(fontSizePx * 1.5));
  const rowGap = Math.max(4, Math.round((2 * s) / 4) * 4);
  // 1/3 of the text size on the 4px grid — shared by padX and the
  // point-flag gap.
  const textThirdOnGrid = Math.max(4, Math.round(fontSizePx / 3 / 4) * 4);
  return {
    fontSizePx,
    bannerHeight,
    rowGap,
    rowHeight: bannerHeight + rowGap,
    padX: textThirdOnGrid,
    earWidth: 10,
    earHeight: Math.min(20, bannerHeight),
    stalkWidth: 1,
    pointFlagGap: textThirdOnGrid,
    minPointWidth: Math.round(50 * s),
    maxPointWidth: Math.round(400 * s),
    borderRadius: 2,
    font: `500 ${fontSizePx}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  };
}

const CLASSIC_METRICS = getLabelMetrics();

export interface LabelLayoutConstants {
  EAR_HEIGHT: number;
  LABEL_BOX_GAP: number;
  LABEL_ROW_HEIGHT: number;
  LABEL_ROW_GAP: number;
  DEFAULT_POINT_LABEL_WIDTH: number;
  DEFAULT_REGION_LABEL_WIDTH: number;
}

export const LABEL_LAYOUT_CONSTANTS: LabelLayoutConstants = {
  EAR_HEIGHT: 14,
  LABEL_BOX_GAP: 2,
  LABEL_ROW_HEIGHT: 16, // EAR_HEIGHT + LABEL_BOX_GAP
  LABEL_ROW_GAP: 0,
  DEFAULT_POINT_LABEL_WIDTH: 60,
  DEFAULT_REGION_LABEL_WIDTH: 225,
};

// Canvas for measuring text (created once, reused)
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

/**
 * Calculate the width needed for a point label's text (text + padding),
 * clamped to the metrics' min/max.
 */
export function calculatePointLabelWidth(
  text: string | undefined,
  metrics: LabelMetrics = CLASSIC_METRICS,
): number {
  if (!text || text.trim() === '') {
    return metrics.minPointWidth;
  }

  // Create canvas context for measuring text if not already created
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }

  if (!measureContext) {
    return metrics.minPointWidth;
  }

  measureContext.font = metrics.font;

  // Text plus the banner's own horizontal padding, so what we measure is
  // what the flag actually needs to show the text un-truncated.
  const textWidth = Math.ceil(measureContext.measureText(text).width) + metrics.padX * 2;

  return Math.max(metrics.minPointWidth, Math.min(textWidth, metrics.maxPointWidth));
}

/**
 * Calculate which row each label should appear in to avoid overlaps
 * Uses a greedy algorithm to pack labels into rows
 */
export function calculateLabelRows(
  labels: Label[],
  pixelsPerSecond: number,
  clipContentOffset: number,
  metrics: LabelMetrics = CLASSIC_METRICS,
): Map<number, number> {
  const labelRows = new Map<number, number>();

  // Sort labels by start time (left-most first)
  const sortedLabels = [...labels].sort((a, b) => a.startTime - b.startTime);

  sortedLabels.forEach((label, labelIndex) => {
    const labelX = clipContentOffset + label.startTime * pixelsPerSecond;
    // Point labels: startTime === endTime, use dynamic width based on text content
    const isPointLabel = label.startTime === label.endTime;
    const labelWidth = isPointLabel
      ? calculatePointLabelWidth(label.text, metrics)
      : (label.endTime! - label.startTime) * pixelsPerSecond;

    let row = 0;
    let foundRow = false;

    while (!foundRow) {
      let canFitInRow = true;

      // Check all previously placed labels
      for (let i = 0; i < labelIndex; i++) {
        const prevRow = labelRows.get(sortedLabels[i].id);
        if (prevRow === row) {
          const prevLabel = sortedLabels[i];
          const prevX = clipContentOffset + prevLabel.startTime * pixelsPerSecond;
          const isPrevPointLabel = prevLabel.startTime === prevLabel.endTime;
          const prevWidth = isPrevPointLabel
            ? calculatePointLabelWidth(prevLabel.text, metrics)
            : (prevLabel.endTime! - prevLabel.startTime) * pixelsPerSecond;

          // Check for overlap
          const overlap = !(labelX >= prevX + prevWidth || labelX + labelWidth <= prevX);
          if (overlap) {
            canFitInRow = false;
            break;
          }
        }
      }

      if (canFitInRow) {
        foundRow = true;
      } else {
        row++;
      }
    }

    labelRows.set(label.id, row);
  });

  return labelRows;
}

/**
 * Calculate the Y offset for a label based on its row
 */
export function getLabelYOffset(row: number, metrics: LabelMetrics = CLASSIC_METRICS): number {
  return row * metrics.rowHeight;
}

/**
 * Calculate label dimensions
 */
export function getLabelDimensions(
  label: Label,
  pixelsPerSecond: number,
  metrics: LabelMetrics = CLASSIC_METRICS,
) {
  const isPointLabel = label.startTime === label.endTime;
  const width = isPointLabel
    ? calculatePointLabelWidth(label.text, metrics)
    : (label.endTime! - label.startTime) * pixelsPerSecond;

  return {
    width,
    height: metrics.bannerHeight,
  };
}

/**
 * Check if a point (x, y) is within a label's bounds
 */
export function isPointInLabel(
  x: number,
  y: number,
  label: Label,
  row: number,
  pixelsPerSecond: number,
  clipContentOffset: number,
  trackY: number,
  metrics: LabelMetrics = CLASSIC_METRICS,
): boolean {
  const labelX = clipContentOffset + label.startTime * pixelsPerSecond;
  const { width, height } = getLabelDimensions(label, pixelsPerSecond, metrics);
  const labelY = trackY + getLabelYOffset(row, metrics);

  return (
    x >= labelX &&
    x <= labelX + width &&
    y >= labelY &&
    y <= labelY + height
  );
}
