/**
 * Envelope interaction logic extracted from clip-envelope demo
 * Handles envelope point and segment detection and drag initialization
 */

import { dbToYNonLinear, yToDbNonLinear, distanceToLineSegment } from './envelopeUtils';
import type { EnvelopeDragState, EnvelopeSegmentDragState } from '../contexts/TracksContext';

interface EnvelopePoint {
  time: number;
  db: number;
}

interface Clip {
  id: number;
  name: string;
  start: number;
  duration: number;
  envelopePoints: EnvelopePoint[];
}

interface Track {
  id: number;
  name: string;
  clips: Clip[];
  height?: number;
}

interface EnvelopeInteractionResult {
  type: 'point-drag' | 'segment-drag' | 'add-point' | 'remove-point' | 'none';
  dragState?: EnvelopeDragState | EnvelopeSegmentDragState;
  newPoint?: { trackIndex: number; clipId: number; point: EnvelopePoint };
  removePoint?: { trackIndex: number; clipId: number; pointIndex: number };
}

const CLIP_HEADER_HEIGHT = 20;
const CLICK_THRESHOLD = 15;

/**
 * Handle envelope click interaction
 * Returns information about what envelope action should be taken
 */
export function handleEnvelopeClick(
  x: number,
  y: number,
  tracks: Track[],
  envelopeMode: boolean,
  envelopeAltMode: boolean,
  pixelsPerSecond: number,
  clipContentOffset: number,
  trackGap: number,
  initialGap: number
): EnvelopeInteractionResult {
  let currentY = initialGap;

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    const trackHeight = track.height || 114;

    if (y < currentY || y > currentY + trackHeight) {
      currentY += trackHeight + trackGap;
      continue;
    }

    for (const clip of track.clips) {
      const clipX = clipContentOffset + clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;
      const clipY = currentY + CLIP_HEADER_HEIGHT;
      const clipHeight = trackHeight - CLIP_HEADER_HEIGHT;

      if (x >= clipX && x <= clipX + clipWidth) {
        // Check for existing point
        for (let i = 0; i < clip.envelopePoints.length; i++) {
          const point = clip.envelopePoints[i];
          const px = clipX + (point.time / clip.duration) * clipWidth;
          const py = dbToYNonLinear(point.db, clipY, clipHeight);

          const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (distance <= CLICK_THRESHOLD) {
            return {
              type: 'point-drag',
              dragState: {
                clip,
                pointIndex: i,
                trackIndex,
                clipX,
                clipWidth,
                clipY,
                clipHeight,
                startX: x,
                startY: y,
                deletedPoints: [],
                originalTime: point.time,
                hiddenPointIndices: [],
                hasMoved: false,
              } as EnvelopeDragState,
            };
          }
        }

        // Calculate distance to envelope line
        const segments = buildEnvelopeSegments(clip, clipX, clipWidth, clipY, clipHeight);
        let minDistance = Infinity;
        let closestSegmentIndex = -1;

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const dist = distanceToLineSegment(x, y, segment.x1, segment.y1, segment.x2, segment.y2);
          if (dist < minDistance) {
            minDistance = dist;
            closestSegmentIndex = i;
          }
        }

        // Alt mode: click-drag moves segment, click adds point
        if (envelopeAltMode && minDistance <= 16) {
          // If no points exist, create a point immediately
          if (clip.envelopePoints.length === 0) {
            const relativeTime = ((x - clipX) / clipWidth) * clip.duration;
            const db = yToDbNonLinear(y, clipY, clipHeight);
            return {
              type: 'add-point',
              newPoint: {
                trackIndex,
                clipId: clip.id,
                point: { time: relativeTime, db },
              },
            };
          }

          // Setup segment drag (will determine drag vs click on mouse move)
          const { segmentStartIndex, segmentEndIndex } = findSegmentIndices(clip, closestSegmentIndex);

          if (segmentStartIndex !== -1) {
            return {
              type: 'segment-drag',
              dragState: {
                clip,
                segmentStartIndex,
                segmentEndIndex,
                trackIndex,
                clipX,
                clipWidth,
                clipY,
                clipHeight,
                startY: y,
                startDb1: clip.envelopePoints[segmentStartIndex].db,
                startDb2: segmentStartIndex !== segmentEndIndex
                  ? clip.envelopePoints[segmentEndIndex].db
                  : clip.envelopePoints[segmentStartIndex].db,
                isAltMode: true,
                clickX: x,
                clickY: y,
                hasMoved: false,
              } as EnvelopeSegmentDragState,
            };
          }
        } else if (envelopeMode && minDistance <= 16 && minDistance > 4 && clip.envelopePoints.length > 0) {
          // Regular mode: drag segments in 4-16px range
          const { segmentStartIndex, segmentEndIndex } = findSegmentIndices(clip, closestSegmentIndex);

          if (segmentStartIndex !== -1) {
            return {
              type: 'segment-drag',
              dragState: {
                clip,
                segmentStartIndex,
                segmentEndIndex,
                trackIndex,
                clipX,
                clipWidth,
                clipY,
                clipHeight,
                startY: y,
                startDb1: clip.envelopePoints[segmentStartIndex].db,
                startDb2: segmentStartIndex !== segmentEndIndex
                  ? clip.envelopePoints[segmentEndIndex].db
                  : clip.envelopePoints[segmentStartIndex].db,
              } as EnvelopeSegmentDragState,
            };
          }
        } else if (envelopeMode && minDistance <= 16) {
          // Regular mode: Add new point in 0-4px range (or 0-16px if no points)
          const relativeTime = ((x - clipX) / clipWidth) * clip.duration;
          const db = yToDbNonLinear(y, clipY, clipHeight);
          return {
            type: 'add-point',
            newPoint: {
              trackIndex,
              clipId: clip.id,
              point: { time: relativeTime, db },
            },
          };
        }
      }
    }

    currentY += trackHeight + trackGap;
  }

  return { type: 'none' };
}

/**
 * Build envelope line segments for distance calculations
 */
function buildEnvelopeSegments(
  clip: Clip,
  clipX: number,
  clipWidth: number,
  clipY: number,
  clipHeight: number
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  if (clip.envelopePoints.length === 0) {
    // Default 0dB line
    const y0 = dbToYNonLinear(0, clipY, clipHeight);
    segments.push({ x1: clipX, y1: y0, x2: clipX + clipWidth, y2: y0 });
  } else {
    const points = clip.envelopePoints;

    // Segment from clip start to first point
    const startY = points[0].time === 0
      ? dbToYNonLinear(points[0].db, clipY, clipHeight)
      : dbToYNonLinear(0, clipY, clipHeight);
    const firstPointX = clipX + (points[0].time / clip.duration) * clipWidth;
    const firstPointY = dbToYNonLinear(points[0].db, clipY, clipHeight);

    if (points[0].time > 0) {
      segments.push({ x1: clipX, y1: startY, x2: firstPointX, y2: firstPointY });
    }

    // Segments between points
    for (let i = 0; i < points.length - 1; i++) {
      const p1x = clipX + (points[i].time / clip.duration) * clipWidth;
      const p1y = dbToYNonLinear(points[i].db, clipY, clipHeight);
      const p2x = clipX + (points[i + 1].time / clip.duration) * clipWidth;
      const p2y = dbToYNonLinear(points[i + 1].db, clipY, clipHeight);
      segments.push({ x1: p1x, y1: p1y, x2: p2x, y2: p2y });
    }

    // Segment from last point to clip end
    const lastPoint = points[points.length - 1];
    if (lastPoint.time < clip.duration) {
      const lastPointX = clipX + (lastPoint.time / clip.duration) * clipWidth;
      const lastPointY = dbToYNonLinear(lastPoint.db, clipY, clipHeight);
      segments.push({ x1: lastPointX, y1: lastPointY, x2: clipX + clipWidth, y2: lastPointY });
    }
  }

  return segments;
}

/**
 * Find segment start and end point indices
 */
function findSegmentIndices(
  clip: Clip,
  closestSegmentIndex: number
): { segmentStartIndex: number; segmentEndIndex: number } {
  if (clip.envelopePoints.length === 1) {
    return { segmentStartIndex: 0, segmentEndIndex: 0 };
  }

  if (closestSegmentIndex === 0 && clip.envelopePoints[0].time > 0) {
    return { segmentStartIndex: 0, segmentEndIndex: 0 };
  }

  const hasStartSegment = clip.envelopePoints[0].time > 0;
  const adjustedIndex = hasStartSegment ? closestSegmentIndex - 1 : closestSegmentIndex;

  if (adjustedIndex >= 0 && adjustedIndex < clip.envelopePoints.length - 1) {
    return { segmentStartIndex: adjustedIndex, segmentEndIndex: adjustedIndex + 1 };
  } else if (adjustedIndex === clip.envelopePoints.length - 1) {
    return {
      segmentStartIndex: clip.envelopePoints.length - 1,
      segmentEndIndex: clip.envelopePoints.length - 1
    };
  }

  return { segmentStartIndex: -1, segmentEndIndex: -1 };
}
