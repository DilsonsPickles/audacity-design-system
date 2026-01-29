/**
 * Label layout utilities
 * Handles row calculation to prevent label overlaps
 */

export interface Label {
  id: number;
  startTime: number;
  endTime?: number;
  text?: string;
}

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

// Point label width constraints for dynamic text sizing
export const POINT_LABEL_MIN_WIDTH = 50;
export const POINT_LABEL_MAX_WIDTH = 400;

// Canvas for measuring text (created once, reused)
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

/**
 * Calculate the width needed for a point label's text
 * Returns a width between POINT_LABEL_MIN_WIDTH and POINT_LABEL_MAX_WIDTH
 */
export function calculatePointLabelWidth(text: string | undefined): number {
  if (!text || text.trim() === '') {
    return POINT_LABEL_MIN_WIDTH;
  }

  // Create canvas context for measuring text if not already created
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }

  if (!measureContext) {
    return POINT_LABEL_MIN_WIDTH;
  }

  // Set font to match label rendering (12px system font)
  measureContext.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const metrics = measureContext.measureText(text);
  // No padding - use exact text width
  const textWidth = Math.ceil(metrics.width);

  // Clamp between min and max
  return Math.max(POINT_LABEL_MIN_WIDTH, Math.min(textWidth, POINT_LABEL_MAX_WIDTH));
}

/**
 * Calculate which row each label should appear in to avoid overlaps
 * Uses a greedy algorithm to pack labels into rows
 */
export function calculateLabelRows(
  labels: Label[],
  pixelsPerSecond: number,
  clipContentOffset: number
): Map<number, number> {
  const labelRows = new Map<number, number>();

  // Sort labels by start time (left-most first)
  const sortedLabels = [...labels].sort((a, b) => a.startTime - b.startTime);

  sortedLabels.forEach((label, labelIndex) => {
    const labelX = clipContentOffset + label.startTime * pixelsPerSecond;
    // Point labels: startTime === endTime, use dynamic width based on text content
    const isPointLabel = label.startTime === label.endTime;
    const labelWidth = isPointLabel
      ? calculatePointLabelWidth(label.text)
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
            ? calculatePointLabelWidth(prevLabel.text)
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
export function getLabelYOffset(row: number): number {
  return row * (LABEL_LAYOUT_CONSTANTS.LABEL_ROW_HEIGHT + LABEL_LAYOUT_CONSTANTS.LABEL_ROW_GAP);
}

/**
 * Calculate label dimensions
 */
export function getLabelDimensions(label: Label, pixelsPerSecond: number) {
  const isPointLabel = label.startTime === label.endTime;
  const width = isPointLabel
    ? calculatePointLabelWidth(label.text)
    : (label.endTime! - label.startTime) * pixelsPerSecond;

  return {
    width,
    height: LABEL_LAYOUT_CONSTANTS.EAR_HEIGHT,
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
  trackY: number
): boolean {
  const labelX = clipContentOffset + label.startTime * pixelsPerSecond;
  const { width, height } = getLabelDimensions(label, pixelsPerSecond);
  const labelY = trackY + getLabelYOffset(row);

  return (
    x >= labelX &&
    x <= labelX + width &&
    y >= labelY &&
    y <= labelY + height
  );
}
