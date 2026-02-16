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
};

export type EnvelopePointStyleKey = keyof typeof ENVELOPE_POINT_STYLES;
