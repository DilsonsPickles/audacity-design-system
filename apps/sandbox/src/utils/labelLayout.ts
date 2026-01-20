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

  labels.forEach((label, labelIndex) => {
    const labelX = clipContentOffset + label.startTime * pixelsPerSecond;
    const labelWidth = label.endTime !== undefined
      ? (label.endTime - label.startTime) * pixelsPerSecond
      : LABEL_LAYOUT_CONSTANTS.DEFAULT_POINT_LABEL_WIDTH;

    let row = 0;
    let foundRow = false;

    while (!foundRow) {
      let canFitInRow = true;

      // Check all previously placed labels
      for (let i = 0; i < labelIndex; i++) {
        const prevRow = labelRows.get(labels[i].id);
        if (prevRow === row) {
          const prevLabel = labels[i];
          const prevX = clipContentOffset + prevLabel.startTime * pixelsPerSecond;
          const prevWidth = prevLabel.endTime !== undefined
            ? (prevLabel.endTime - prevLabel.startTime) * pixelsPerSecond
            : LABEL_LAYOUT_CONSTANTS.DEFAULT_POINT_LABEL_WIDTH;

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
  const width = label.endTime !== undefined
    ? (label.endTime - label.startTime) * pixelsPerSecond
    : LABEL_LAYOUT_CONSTANTS.DEFAULT_POINT_LABEL_WIDTH;

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
