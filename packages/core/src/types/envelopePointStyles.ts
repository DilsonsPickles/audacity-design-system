/**
 * Envelope point style profiles
 * Different visual styles for envelope control points
 */

export interface EnvelopePointStyle {
  /** Profile name */
  name: string;
  /** Point outer radius in normal state (px) */
  outerRadius: number;
  /** Point inner radius in normal state (px) */
  innerRadius: number;
  /** Point outer radius in hover state (px) */
  outerRadiusHover: number;
  /** Point inner radius in hover state (px) */
  innerRadiusHover: number;
  /** Automation line thickness (px) */
  lineWidth: number;
  /** Dual ring configuration for hover state */
  dualRingHover?: {
    /** Inner ring (white): outer radius */
    innerRingOuter: number;
    /** Inner ring (white): inner radius */
    innerRingInner: number;
    /** Inner ring color */
    innerRingColor: string;
    /** Outer ring (black): outer radius */
    outerRingOuter: number;
    /** Outer ring (black): inner radius */
    outerRingInner: number;
    /** Outer ring color */
    outerRingColor: string;
  };
  /** Custom ring color on hover (hex color, e.g. '#ffffff' for white) */
  hoverRingColor?: string;
  /** Ring stroke color on hover (hex color, e.g. '#000000' for black) */
  hoverRingStrokeColor?: string;
  /** Show white outline on hover */
  showWhiteOutlineOnHover?: boolean;
  /** Show black outline on hover (outside white outline if both present) */
  showBlackOutlineOnHover?: boolean;
  /** Show black center dot on hover */
  showBlackCenterOnHover?: boolean;
  /** Show green center fill on hover (radius in px) */
  showGreenCenterFillOnHover?: number;
  /** Solid circle configuration (no donut hole) */
  solidCircle?: {
    /** Fill color for the solid circle */
    fillColor: string;
    /** Stroke color for the outline */
    strokeColor: string;
    /** Stroke width in pixels */
    strokeWidth: number;
    /** Outer stroke color (optional, rendered outside the main stroke) */
    outerStrokeColor?: string;
    /** Outer stroke width in pixels (optional) */
    outerStrokeWidth?: number;
    /** Radius for normal state */
    radius: number;
    /** Radius for hover state */
    radiusHover: number;
    /** Cursor follower radius (optional, defaults to 3) */
    cursorFollowerRadius?: number;
  };
}

export const ENVELOPE_POINT_STYLES: Record<string, EnvelopePointStyle> = {
  default: {
    name: 'Default',
    outerRadius: 5,
    innerRadius: 3,
    outerRadiusHover: 6,
    innerRadiusHover: 4,  // 2px ring on hover (same thickness)
    lineWidth: 1.5,
    showGreenCenterFillOnHover: 3,  // 6px diameter (3px radius) solid green center
  },
  newProfile: {
    name: 'New Profile',
    outerRadius: 5,
    innerRadius: 3,
    outerRadiusHover: 6,
    innerRadiusHover: 4,
    lineWidth: 1.5,
    dualRingHover: {
      innerRingOuter: 5,  // White ring: 4-5px
      innerRingInner: 4,
      innerRingColor: '#ffffff',
      outerRingOuter: 6,  // Black ring: 5-6px
      outerRingInner: 5,
      outerRingColor: '#000000',
    },
    showGreenCenterFillOnHover: 3,  // 6px diameter (3px radius) green center dot
  },
  solidGreen: {
    name: 'Solid Green',
    outerRadius: 5,
    innerRadius: 3,
    outerRadiusHover: 6,
    innerRadiusHover: 4,
    lineWidth: 1.5,
    solidCircle: {
      fillColor: '#b8ff00',  // Yellow-green fill (same as envelope line)
      strokeColor: '#000000',  // Black outline
      strokeWidth: 1.5,
      outerStrokeColor: '#ffffff',  // White outer stroke
      outerStrokeWidth: 1,
      radius: 4,  // 8px diameter normal
      radiusHover: 5,  // 10px diameter hover
      cursorFollowerRadius: 4,  // Larger cursor follower (8px diameter)
    },
  },
};

export type EnvelopePointStyleKey = keyof typeof ENVELOPE_POINT_STYLES;
