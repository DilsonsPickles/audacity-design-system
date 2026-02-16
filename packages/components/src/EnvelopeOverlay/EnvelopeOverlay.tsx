import React from 'react';
import { dbToYNonLinear } from '../utils/envelope';
import type { EnvelopePointData } from '../utils/envelope';
import './EnvelopeOverlay.css';

export interface EnvelopeOverlayProps {
  /** Envelope points */
  points: EnvelopePointData[];
  /** Clip duration in seconds */
  duration: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Y offset for split view mode */
  yOffset?: number;
  /** Line color */
  lineColor?: string;
  /** Point outer color */
  pointColor?: string;
  /** Point center color */
  pointCenterColor?: string;
  /** Indices of hidden points (during drag) */
  hiddenPointIndices?: number[];
  /** Indices of hovered points (can be multiple during segment drag) */
  hoveredPointIndices?: number[];
  /** Cursor position on envelope (for cursor follower dot) */
  cursorPosition?: { time: number; db: number } | null;
  /** Point sizes */
  pointSizes?: {
    outerRadius: number;
    innerRadius: number;
    outerRadiusHover: number;
    innerRadiusHover: number;
    showWhiteOutlineOnHover?: boolean;
    showBlackCenterOnHover?: boolean;
    showGreenCenterFillOnHover?: number;
  };
}

/**
 * EnvelopeOverlay - SVG-based envelope rendering
 *
 * Renders the envelope curve and control points as SVG for crisp,
 * resolution-independent rendering at all zoom levels.
 */
export const EnvelopeOverlay: React.FC<EnvelopeOverlayProps> = ({
  points,
  duration,
  width,
  height,
  yOffset = 0,
  lineColor = '#ffffff',
  pointColor = '#ffffff',
  pointCenterColor = '#000000',
  hiddenPointIndices = [],
  hoveredPointIndices = [],
  cursorPosition = null,
  pointSizes = {
    outerRadius: 5,    // 10px diameter (AU4 style)
    innerRadius: 3,    // Creates 2px visual stroke/ring
    outerRadiusHover: 6,
    innerRadiusHover: 4,
  },
}) => {
  // Filter out hidden points
  const visiblePoints = points.filter((_, index) => !hiddenPointIndices.includes(index));

  // Calculate 0dB Y position
  const zeroDB_Y = dbToYNonLinear(0, 0, height);

  // Helper function to calculate point on circle edge
  const getCircleEdgePoint = (centerX: number, centerY: number, targetX: number, targetY: number, radius: number) => {
    const dx = targetX - centerX;
    const dy = targetY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { x: centerX, y: centerY };

    // Calculate point on circle edge in direction of target
    const ratio = radius / distance;
    return {
      x: centerX + dx * ratio,
      y: centerY + dy * ratio,
    };
  };

  // Generate SVG path for envelope line
  const generatePath = (): string => {
    if (visiblePoints.length === 0) {
      // No points - draw horizontal line at 0dB
      return `M 0,${zeroDB_Y} L ${width},${zeroDB_Y}`;
    }

    const pathSegments: string[] = [];
    const radius = pointSizes.outerRadius;

    // First segment: from start to first point (stop at circle edge)
    const firstY = dbToYNonLinear(visiblePoints[0].db, 0, height);
    const firstX = (visiblePoints[0].time / duration) * width;
    const firstEdge = getCircleEdgePoint(firstX, firstY, 0, firstY, radius);
    pathSegments.push(`M 0,${firstY}`);
    pathSegments.push(`L ${firstEdge.x},${firstEdge.y}`);

    // Segments between points (skip the circle interiors)
    for (let i = 0; i < visiblePoints.length - 1; i++) {
      const x1 = (visiblePoints[i].time / duration) * width;
      const y1 = dbToYNonLinear(visiblePoints[i].db, 0, height);
      const x2 = (visiblePoints[i + 1].time / duration) * width;
      const y2 = dbToYNonLinear(visiblePoints[i + 1].db, 0, height);

      // Start from edge of first circle pointing towards second
      const startEdge = getCircleEdgePoint(x1, y1, x2, y2, radius);
      // End at edge of second circle pointing from first
      const endEdge = getCircleEdgePoint(x2, y2, x1, y1, radius);

      pathSegments.push(`M ${startEdge.x},${startEdge.y}`);
      pathSegments.push(`L ${endEdge.x},${endEdge.y}`);
    }

    // Last segment: from last point to end (start at circle edge)
    const lastPoint = visiblePoints[visiblePoints.length - 1];
    if (lastPoint.time < duration) {
      const lastX = (lastPoint.time / duration) * width;
      const lastY = dbToYNonLinear(lastPoint.db, 0, height);
      const lastEdge = getCircleEdgePoint(lastX, lastY, width, lastY, radius);
      pathSegments.push(`M ${lastEdge.x},${lastEdge.y}`);
      pathSegments.push(`L ${width},${lastY}`);
    }

    return pathSegments.join(' ');
  };

  // Check if we have only boundary points (don't render control points)
  const hasBoundaryPoints = visiblePoints.length === 2 &&
                            visiblePoints[0].time === 0 &&
                            Math.abs(visiblePoints[1].time - duration) < 0.001;

  const showControlPoints = visiblePoints.length > 0 && !hasBoundaryPoints;

  return (
    <svg
      className="envelope-overlay"
      style={{
        position: 'absolute',
        top: yOffset,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 2, // Above canvas (z-index: 2) but below interaction layer (z-index: 3)
      }}
    >
      {/* Envelope line */}
      <path
        d={generatePath()}
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* Control points */}
      {showControlPoints && visiblePoints.map((point, index) => {
        const px = (point.time / duration) * width;
        const py = dbToYNonLinear(point.db, 0, height);
        const isHovered = hoveredPointIndices.includes(index);
        // Use hover sizes if hovered, otherwise normal sizes
        const outerRadius = isHovered ? pointSizes.outerRadiusHover : pointSizes.outerRadius;
        const innerRadius = isHovered ? pointSizes.innerRadiusHover : pointSizes.innerRadius;
        const maskId = `point-mask-${index}`;
        const ringThickness = 1;

        return (
          <g key={index} className={`envelope-point ${isHovered ? 'envelope-point--hovered' : ''}`}>
            {pointCenterColor === 'transparent' ? (
              <>
                {isHovered && (pointSizes.showWhiteOutlineOnHover || pointSizes.showBlackCenterOnHover || pointSizes.showGreenCenterFillOnHover) ? (
                  <>
                    {/* Hovered with special effects */}
                    <defs>
                      <mask id={maskId}>
                        <circle cx={px} cy={py} r={outerRadius} fill="white" />
                        <circle cx={px} cy={py} r={innerRadius} fill="black" />
                      </mask>
                    </defs>
                    <circle
                      cx={px}
                      cy={py}
                      r={outerRadius}
                      fill={pointColor}
                      mask={`url(#${maskId})`}
                    />
                    {/* 1px white outline with 1px gap from green ring */}
                    {pointSizes.showWhiteOutlineOnHover && (
                      <circle
                        cx={px}
                        cy={py}
                        r={outerRadius + 1.5}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    )}
                    {/* Black center dot (2px radius) */}
                    {pointSizes.showBlackCenterOnHover && (
                      <circle
                        cx={px}
                        cy={py}
                        r={2}
                        fill="#000000"
                      />
                    )}
                    {/* Green center fill (optional) */}
                    {pointSizes.showGreenCenterFillOnHover && (
                      <circle
                        cx={px}
                        cy={py}
                        r={pointSizes.showGreenCenterFillOnHover}
                        fill={pointColor}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {/* Normal: thin green ring with transparent center */}
                    <defs>
                      <mask id={maskId}>
                        <circle cx={px} cy={py} r={outerRadius} fill="white" />
                        <circle cx={px} cy={py} r={innerRadius} fill="black" />
                      </mask>
                    </defs>
                    <circle
                      cx={px}
                      cy={py}
                      r={outerRadius}
                      fill={pointColor}
                      mask={`url(#${maskId})`}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {/* Outer circle */}
                <circle
                  cx={px}
                  cy={py}
                  r={outerRadius}
                  fill={pointColor}
                />
                {/* Inner circle */}
                <circle
                  cx={px}
                  cy={py}
                  r={innerRadius}
                  fill={pointCenterColor}
                />
              </>
            )}
          </g>
        );
      })}

      {/* Cursor follower dot (hidden when hovering over a point) */}
      {cursorPosition && hoveredPointIndices.length === 0 && (
        <circle
          cx={(cursorPosition.time / duration) * width}
          cy={dbToYNonLinear(cursorPosition.db, 0, height)}
          r={3}
          fill={pointColor}
          className="cursor-follower"
        />
      )}
    </svg>
  );
};
