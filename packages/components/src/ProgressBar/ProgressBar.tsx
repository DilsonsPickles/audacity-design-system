/**
 * ProgressBar Component
 *
 * A horizontal progress indicator showing completion percentage
 */

import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  /**
   * Progress value as a percentage (0-100)
   */
  value?: number;
  /**
   * Width of the progress bar
   */
  width?: number | string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ProgressBar - Shows progress as a filled horizontal bar
 */
export function ProgressBar({
  value = 0,
  width = 220,
  className = '',
}: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return (
    <div
      className={`progress-bar ${className}`}
      style={{ width: widthStyle }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-bar__fill"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

export default ProgressBar;
