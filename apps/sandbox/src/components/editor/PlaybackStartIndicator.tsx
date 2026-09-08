import { CLIP_CONTENT_OFFSET } from '@audacity-ui/components';

export interface PlaybackStartIndicatorProps {
  /** Timeline position (seconds) playback started from */
  playbackStartTime: number;
  pixelsPerSecond: number;
  /** Line height — number (px) over the canvas. */
  height: number | string;
}

/** A vertical marker at the position playback started from: 1px white and
 *  1px black side by side, so it reads against any clip/canvas background.
 *  Shown while the playback-start marker is set (during playback); pressing
 *  Space again returns the playhead here. Caller owns the null check —
 *  this component always renders. Sibling of PunchPointIndicator. */
export function PlaybackStartIndicator({ playbackStartTime, pixelsPerSecond, height }: PlaybackStartIndicatorProps) {
  return (
    <div
      data-testid="playback-start-indicator"
      style={{
        position: 'absolute',
        left: `${CLIP_CONTENT_OFFSET + playbackStartTime * pixelsPerSecond}px`,
        top: 0,
        width: 2,
        height,
        background: 'linear-gradient(to right, #ffffff 50%, #000000 50%)',
        zIndex: 98, // just under the live playhead / punch indicator
        pointerEvents: 'none',
      }}
    />
  );
}
