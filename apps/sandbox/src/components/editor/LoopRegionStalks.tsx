import { CLIP_CONTENT_OFFSET } from '@dilsonspickles/components';
import type { ThemeTokens } from '@dilsonspickles/components';

export interface LoopRegionStalksProps {
  loopRegionStart: number;
  loopRegionEnd: number;
  loopRegionEnabled: boolean;
  pixelsPerSecond: number;
  /** Stalk height, pre-formatted with unit (e.g. '40px' or '${n}px'). */
  height: string;
  theme: ThemeTokens;
}

/** Two vertical stalks marking the loop region start/end. Caller is
 *  responsible for the visibility gating (null checks + interacting/hovering
 *  + enabled state) — this component always renders both stalks. */
export function LoopRegionStalks({
  loopRegionStart,
  loopRegionEnd,
  loopRegionEnabled,
  pixelsPerSecond,
  height,
  theme,
}: LoopRegionStalksProps) {
  const color = loopRegionEnabled
    ? theme.audio.timeline.loopRegionBorder
    : theme.audio.timeline.loopRegionBorderInactive;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: `${CLIP_CONTENT_OFFSET + loopRegionStart * pixelsPerSecond}px`,
          top: 0,
          width: '2px',
          height,
          backgroundColor: color,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${CLIP_CONTENT_OFFSET + loopRegionEnd * pixelsPerSecond}px`,
          top: 0,
          width: '2px',
          height,
          backgroundColor: color,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
    </>
  );
}
