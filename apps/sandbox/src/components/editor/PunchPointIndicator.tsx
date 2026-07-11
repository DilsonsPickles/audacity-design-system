import { CLIP_CONTENT_OFFSET } from '@dilsonspickles/components';

export interface PunchPointIndicatorProps {
  punchPointPosition: number;
  pixelsPerSecond: number;
  /** Line height — string ('100%') in the ruler, number (px) over the canvas. */
  height: number | string;
}

/** A 1px vertical line marking the punch-in (roll-in recording) point.
 *  Caller is responsible for the null check — this component always renders. */
export function PunchPointIndicator({ punchPointPosition, pixelsPerSecond, height }: PunchPointIndicatorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${CLIP_CONTENT_OFFSET + punchPointPosition * pixelsPerSecond}px`,
        top: 0,
        width: 1,
        height,
        backgroundColor: '#FF2672',
        zIndex: 99,
        pointerEvents: 'none',
      }}
    />
  );
}
