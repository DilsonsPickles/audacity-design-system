import React, { useEffect, useRef } from 'react';
import './PlayheadCursor.css';

export interface PlayheadCursorProps {
  /**
   * Playhead position in seconds
   */
  position: number;
  /**
   * Pixels per second (zoom level)
   */
  pixelsPerSecond: number;
  /**
   * Left padding in pixels
   */
  leftPadding: number;
  /**
   * Height of the stalk (full canvas height)
   */
  height: number;
  /**
   * Whether to show the playhead icon at the top (for timeline ruler)
   * @default false
   */
  showTopIcon?: boolean;
  /**
   * Top offset for the icon (if showTopIcon is true)
   * @default 0
   */
  iconTopOffset?: number;
}

/**
 * PlayheadCursor - Shows current playback position
 *
 * Renders a vertical line with:
 * - 1px white center line
 * - 2px black strokes on either side
 * - Optional playhead icon at top (for timeline ruler)
 */
export function PlayheadCursor({
  position,
  pixelsPerSecond,
  leftPadding,
  height,
  showTopIcon = false,
  iconTopOffset = 0,
}: PlayheadCursorProps) {
  const x = leftPadding + position * pixelsPerSecond;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showTopIcon && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const radius = 1;

        // Draw black stroke first (larger) - house shape pointing down with rounded corners
        ctx.beginPath();
        ctx.moveTo(8.5, 16);    // Bottom point (peak pointing down)
        ctx.lineTo(0.5, 11);    // Left roof edge
        ctx.arcTo(0.5, 0, 1.5, 0, radius); // Top left corner
        ctx.lineTo(15.5, 0);    // Top
        ctx.arcTo(16.5, 0, 16.5, 1, radius); // Top right corner
        ctx.lineTo(16.5, 11);   // Right wall
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Draw white fill on top (slightly smaller for stroke effect)
        ctx.beginPath();
        ctx.moveTo(8.5, 15);    // Bottom point (peak pointing down)
        ctx.lineTo(1.5, 10.5);  // Left roof edge
        ctx.arcTo(1.5, 1, 2.5, 1, radius); // Top left corner
        ctx.lineTo(14.5, 1);    // Top
        ctx.arcTo(15.5, 1, 15.5, 2, radius); // Top right corner
        ctx.lineTo(15.5, 10.5); // Right wall
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
  }, [showTopIcon]);

  return (
    <div
      className="playhead-cursor"
      style={{
        left: `${x}px`,
        height: `${height}px`,
      }}
    >
      {/* Black stroke (left side - 2px) */}
      <div
        className="playhead-cursor__stroke-left"
        style={{ left: '-2px' }}
      />

      {/* Black stroke (right side - 2px) */}
      <div
        className="playhead-cursor__stroke-right"
        style={{ left: '1px' }}
      />

      {/* White center line (1px) */}
      <div className="playhead-cursor__line" />

      {/* Playhead head at top (for timeline ruler) */}
      {showTopIcon && (
        <canvas
          ref={canvasRef}
          width={17}
          height={17}
          style={{
            position: 'absolute',
            top: `${iconTopOffset}px`,
            left: '50%',
            transform: 'translateX(calc(-50% + 0.5px))',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      )}
    </div>
  );
}
