// apps/sandbox/src/utils/snapToClipEdges.ts

export interface SnapInput {
  proposedStart: number;
  duration: number;
  targetEdges: number[];   // time positions of edges of non-selected clips on the destination track
  pixelsPerSecond: number;
  thresholdPx: number;     // typically 6
}

export interface SnapResult {
  snappedStart: number;
  snappedEdge: string | null; // 'left-to-X' or 'right-to-X' for debug; null if no snap
}

/**
 * Pure helper: if the moving clip's left or right edge is within `thresholdPx`
 * of any target edge on the destination track, snap the moving clip so that
 * edge meets the target exactly. If multiple edges are in range, the closest wins.
 */
export function snapToClipEdges(input: SnapInput): SnapResult {
  const { proposedStart, duration, targetEdges, pixelsPerSecond, thresholdPx } = input;
  const thresholdTime = thresholdPx / pixelsPerSecond;

  const leftEdge = proposedStart;
  const rightEdge = proposedStart + duration;

  let bestSnap: { newStart: number; edgeLabel: string; distance: number } | null = null;

  for (const target of targetEdges) {
    const leftDistance = Math.abs(leftEdge - target);
    if (leftDistance <= thresholdTime && (bestSnap === null || leftDistance < bestSnap.distance)) {
      bestSnap = { newStart: target, edgeLabel: `left-to-${target}`, distance: leftDistance };
    }

    const rightDistance = Math.abs(rightEdge - target);
    if (rightDistance <= thresholdTime && (bestSnap === null || rightDistance < bestSnap.distance)) {
      bestSnap = { newStart: target - duration, edgeLabel: `right-to-${target}`, distance: rightDistance };
    }
  }

  if (bestSnap === null) {
    return { snappedStart: proposedStart, snappedEdge: null };
  }
  return { snappedStart: bestSnap.newStart, snappedEdge: bestSnap.edgeLabel };
}
