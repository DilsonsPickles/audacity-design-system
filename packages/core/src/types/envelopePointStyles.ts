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
  /** Show white outline on hover */
  showWhiteOutlineOnHover?: boolean;
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
    showBlackCenterOnHover: true,
    showWhiteOutlineOnHover: true,  // 1px white stroke around outer ring on hover
  },
};

export type EnvelopePointStyleKey = keyof typeof ENVELOPE_POINT_STYLES;
