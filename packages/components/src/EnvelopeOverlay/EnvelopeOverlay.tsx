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
  /** Index of hovered point */
  hoveredPointIndex?: number | null;
  /** Point sizes */
  pointSizes?: {
    outerRadius: number;
    innerRadius: number;
    outerRadiusHover: number;
    innerRadiusHover: number;
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
  hoveredPointIndex = null,
  pointSizes = {
    outerRadius: 4,
    innerRadius: 2,
    outerRadiusHover: 5,
    innerRadiusHover: 3,
  },
}) => {
  // Filter out hidden points
  const visiblePoints = points.filter((_, index) => !hiddenPointIndices.includes(index));

  // Calculate 0dB Y position
  const zeroDB_Y = dbToYNonLinear(0, 0, height);

  // Generate SVG path for envelope line
  const generatePath = (): string => {
    if (visiblePoints.length === 0) {
      // No points - draw horizontal line at 0dB
      return `M 0,${zeroDB_Y} L ${width},${zeroDB_Y}`;
    }

    const pathSegments: string[] = [];

    // First segment: from start to first point
    const firstY = dbToYNonLinear(visiblePoints[0].db, 0, height);
    const firstX = (visiblePoints[0].time / duration) * width;
    pathSegments.push(`M 0,${firstY}`);
    pathSegments.push(`L ${firstX},${firstY}`);

    // Segments between points
    for (let i = 0; i < visiblePoints.length - 1; i++) {
      const x1 = (visiblePoints[i].time / duration) * width;
      const y1 = dbToYNonLinear(visiblePoints[i].db, 0, height);
      const x2 = (visiblePoints[i + 1].time / duration) * width;
      const y2 = dbToYNonLinear(visiblePoints[i + 1].db, 0, height);
      pathSegments.push(`M ${x1},${y1}`);
      pathSegments.push(`L ${x2},${y2}`);
    }

    // Last segment: from last point to end
    const lastPoint = visiblePoints[visiblePoints.length - 1];
    if (lastPoint.time < duration) {
      const lastX = (lastPoint.time / duration) * width;
      const lastY = dbToYNonLinear(lastPoint.db, 0, height);
      pathSegments.push(`M ${lastX},${lastY}`);
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
        strokeWidth={1.5}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* Control points */}
      {showControlPoints && visiblePoints.map((point, index) => {
        const px = (point.time / duration) * width;
        const py = dbToYNonLinear(point.db, 0, height);
        const isHovered = hoveredPointIndex === index;
        const outerRadius = isHovered ? pointSizes.outerRadiusHover : pointSizes.outerRadius;
        const innerRadius = isHovered ? pointSizes.innerRadiusHover : pointSizes.innerRadius;

        return (
          <g key={index} className={`envelope-point ${isHovered ? 'envelope-point--hovered' : ''}`}>
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
          </g>
        );
      })}
    </svg>
  );
};
