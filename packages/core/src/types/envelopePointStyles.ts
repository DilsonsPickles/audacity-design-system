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
  /** White/black center configuration on hover */
  whiteCenterOnHover?: {
    /** Inner white circle radius */
    innerRadius: number;
    /** Outer white circle radius */
    outerRadius: number;
    /** Black circle radius (between white and green) */
    blackRadius: number;
  };
  /** White/black center configuration (always visible, not just on hover) */
  whiteCenter?: {
    /** Inner white circle radius */
    innerRadius: number;
    /** Outer white circle radius */
    outerRadius: number;
    /** Black circle radius (between white and green) */
    blackRadius: number;
  };
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
    /** Use dual-ring cursor follower (white inner + black outer, no fill) */
    useDualRingCursorFollower?: boolean;
    /** Break the envelope line at cursor follower position */
    breakLineAtCursor?: boolean;
    /** White center configuration on hover */
    whiteCenterOnHover?: {
      /** Inner white circle radius */
      innerRadius: number;
      /** Outer white circle radius */
      outerRadius: number;
      /** Black circle radius (between white and green) */
      blackRadius: number;
    };
  };
}

export const ENVELOPE_POINT_STYLES: Record<string, EnvelopePointStyle> = {
  default: {
    name: 'Default',
    outerRadius: 5,
    innerRadius: 3,
    outerRadiusHover: 6,
    innerRadiusHover: 4,  // 2px ring on hover (same thickness)
    lineWidth: 2,
    showGreenCenterFillOnHover: 3,  // 6px diameter (3px radius) solid green center
  },
  newProfile: {
    name: 'New Profile',
    outerRadius: 5,
    innerRadius: 3,
    outerRadiusHover: 6,
    innerRadiusHover: 4,
    lineWidth: 2,
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
    lineWidth: 2,
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
  solidGreenVariation: {
    name: 'Solid Green Variation',
    outerRadius: 5,
    innerRadius: 3,
    outerRadiusHover: 6,
    innerRadiusHover: 4,
    lineWidth: 2,
    solidCircle: {
      fillColor: '#b8ff00',  // Yellow-green fill (same as envelope line)
      strokeColor: '#000000',  // Black outline
      strokeWidth: 1.5,
      outerStrokeColor: '#ffffff',  // White outer stroke
      outerStrokeWidth: 1,
      radius: 4,  // 8px diameter normal
      radiusHover: 5,  // 10px diameter hover
      cursorFollowerRadius: 6,  // Larger to match placed point size
      useDualRingCursorFollower: true,  // Use white/black ring cursor (no fill)
      breakLineAtCursor: false,  // Don't break line - let it show through transparent center
    },
  },
  glowingGreen: {
    name: 'Glowing Green',
    outerRadius: 3.5,  // Idle: 7px outer diameter
    innerRadius: 2,    // Idle: 4px inner diameter
    outerRadiusHover: 4.5,  // Hover: 9px outer diameter
    innerRadiusHover: 3,    // Hover: 6px inner diameter (becomes inner edge of green ring)
    lineWidth: 1.5,
    whiteCenterOnHover: {
      innerRadius: 1,       // 2px diameter transparent center
      outerRadius: 2,       // 4px diameter (white ring outer edge)
      blackRadius: 3,       // 6px diameter (black ring outer edge, matches innerRadiusHover)
    },
  },
  glowingGreenLarge: {
    name: 'Glowing Green Large',
    outerRadius: 4.5,  // Always: 9px outer diameter
    innerRadius: 3,    // Always: 6px inner diameter
    outerRadiusHover: 4.5,  // No change on hover
    innerRadiusHover: 3,    // No change on hover
    lineWidth: 1.5,
    whiteCenter: {
      innerRadius: 1,       // 2px diameter transparent center
      outerRadius: 2,       // 4px diameter (white ring outer edge)
      blackRadius: 3,       // 6px diameter (black ring outer edge)
    },
  },
};

export type EnvelopePointStyleKey = keyof typeof ENVELOPE_POINT_STYLES;
