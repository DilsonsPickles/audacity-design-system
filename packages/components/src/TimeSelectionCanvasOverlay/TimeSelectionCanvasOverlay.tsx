/**
 * TimeSelectionCanvasOverlay
 *
 * Visual overlay that displays the time selection range over canvas/tracks.
 * Renders as a semi-transparent box over the selected time range and tracks.
 */

import React from 'react';
import { TimeSelection } from '@audacity-ui/core';
import './TimeSelectionCanvasOverlay.css';

export interface TimeSelectionCanvasOverlayProps {
  /**
   * Time selection to display (null = no selection)
   */
  timeSelection: TimeSelection | null;
  /**
   * Pixels per second - zoom level
   */
  pixelsPerSecond: number;
  /**
   * Left padding before timeline starts (in pixels)
   */
  leftPadding: number;
  /**
   * Y position where overlay should start (top of first selected track)
   */
  top: number;
  /**
   * Height of the overlay (spans selected tracks)
   */
  height: number;
  /**
   * Background color of the selection overlay
   * @default 'rgba(128, 204, 192, 0.4)'
   */
  backgroundColor?: string;
  /**
   * Border color of the selection
   * @default '#80ccc0'
   */
  borderColor?: string;
  /**
   * Additional CSS class names
   */
  className?: string;
}

export const TimeSelectionCanvasOverlay: React.FC<TimeSelectionCanvasOverlayProps> = ({
  timeSelection,
  pixelsPerSecond,
  leftPadding,
  top,
  height,
  backgroundColor = 'rgba(128, 204, 192, 0.4)',
  borderColor = '#80ccc0',
  className = '',
}) => {
  if (!timeSelection) {
    return null;
  }

  const { startTime, endTime } = timeSelection;

  // Convert times to pixel positions
  const startX = startTime * pixelsPerSecond + leftPadding;
  const endX = endTime * pixelsPerSecond + leftPadding;
  const width = endX - startX;

  return (
    <div
      className={`time-selection-canvas-overlay ${className}`}
      style={{
        position: 'absolute',
        left: `${startX}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor,
        borderLeft: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 5, // Above tracks but below UI controls
        mixBlendMode: 'soft-light', // Soft-light blend mode for subtle contrast
      }}
    />
  );
};

export default TimeSelectionCanvasOverlay;
