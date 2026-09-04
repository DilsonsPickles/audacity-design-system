import { CLIP_CONTENT_OFFSET } from '@audacity-ui/components';

export interface SnapGuidelineProps {
  /** Time (seconds) the guideline is drawn at. Caller is responsible
   *  for the null check — this component always renders. */
  snapGuidelineTime: number;
  pixelsPerSecond: number;
  color: string;
  shadow: string;
}

/** A 1px vertical line at the snap target of an in-progress trim or
 *  stretch. Spans the full canvas height so the user can see which
 *  grid line each edge is locking to. */
export function SnapGuideline({ snapGuidelineTime, pixelsPerSecond, color, shadow }: SnapGuidelineProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${CLIP_CONTENT_OFFSET + snapGuidelineTime * pixelsPerSecond}px`,
        width: '1px',
        backgroundColor: color,
        boxShadow: shadow,
        pointerEvents: 'none',
        zIndex: 11,
      }}
    />
  );
}
