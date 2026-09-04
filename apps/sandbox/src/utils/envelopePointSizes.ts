/**
 * Envelope point size derivation
 */

import { ENVELOPE_POINT_STYLES, type EnvelopePointStyleKey } from '@audacity-ui/core';

export interface EnvelopePointSizes {
  outerRadius: number;
  innerRadius: number;
  outerRadiusHover: number;
  innerRadiusHover: number;
  lineWidth: number;
  dualRingHover: (typeof ENVELOPE_POINT_STYLES)[string]['dualRingHover'];
  solidCircle: (typeof ENVELOPE_POINT_STYLES)[string]['solidCircle'];
  hoverRingColor: string | undefined;
  hoverRingStrokeColor: string | undefined;
  showWhiteOutlineOnHover: boolean;
  showBlackOutlineOnHover: boolean;
  showBlackCenterOnHover: boolean;
  showGreenCenterFillOnHover: number | undefined;
  whiteCenterOnHover: (typeof ENVELOPE_POINT_STYLES)[string]['whiteCenterOnHover'];
  whiteCenter: (typeof ENVELOPE_POINT_STYLES)[string]['whiteCenter'];
  dualStrokeLine: boolean | undefined;
  lineColor: string | undefined;
  // Consumers (ClipBody, Clip, TrackNew in @audacity-ui/components) type
  // this prop with a trailing `[key: string]: unknown` index signature.
  [key: string]: unknown;
}

/**
 * Projects an envelope control-point style profile (keyed by
 * `controlPointStyle`) down to the size/appearance fields Canvas needs for
 * rendering. Mirrors Canvas.tsx's inline `envelopePointSizes` useMemo
 * verbatim.
 */
export function deriveEnvelopePointSizes(styleKey: EnvelopePointStyleKey): EnvelopePointSizes {
  const profile = ENVELOPE_POINT_STYLES[styleKey];
  return {
    outerRadius: profile.outerRadius,
    innerRadius: profile.innerRadius,
    outerRadiusHover: profile.outerRadiusHover,
    innerRadiusHover: profile.innerRadiusHover,
    lineWidth: profile.lineWidth,
    dualRingHover: profile.dualRingHover,
    solidCircle: profile.solidCircle,
    hoverRingColor: profile.hoverRingColor,
    hoverRingStrokeColor: profile.hoverRingStrokeColor,
    showWhiteOutlineOnHover: profile.showWhiteOutlineOnHover ?? false,
    showBlackOutlineOnHover: profile.showBlackOutlineOnHover ?? false,
    showBlackCenterOnHover: profile.showBlackCenterOnHover ?? false,
    showGreenCenterFillOnHover: profile.showGreenCenterFillOnHover,
    whiteCenterOnHover: profile.whiteCenterOnHover,
    whiteCenter: profile.whiteCenter,
    dualStrokeLine: profile.dualStrokeLine,
    lineColor: profile.lineColor,
  };
}
