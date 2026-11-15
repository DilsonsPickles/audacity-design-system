/**
 * ProgressBar Component
 *
 * A horizontal progress indicator showing completion percentage
 */

import React from 'react';
import { useTheme } from '../ThemeProvider';
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
  /**
   * The length of the work is unknown (2026-11-16, Audacity 3's "Copying
   * Project" bar): a segment slides back and forth instead of a fill, and
   * `value` is ignored. Reduced motion holds it still in the middle.
   */
  indeterminate?: boolean;
  /** Accessible name — read as the bar's label */
  ariaLabel?: string;
}

/**
 * ProgressBar - Shows progress as a filled horizontal bar
 */
export function ProgressBar({
  value = 0,
  width = 220,
  className = '',
  indeterminate = false,
  ariaLabel,
}: ProgressBarProps) {
  const { theme } = useTheme();

  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  const style = {
    '--progress-bar-bg': theme.background.control.slider.track,
    '--progress-bar-fill': theme.border.focus,
  } as React.CSSProperties;

  return (
    <div
      className={`progress-bar${indeterminate ? ' progress-bar--indeterminate' : ''} ${className}`}
      style={{ width: widthStyle, ...style }}
      role="progressbar"
      aria-label={ariaLabel}
      // An indeterminate bar has no value (ARIA: leave aria-valuenow off)
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      data-indeterminate={indeterminate || undefined}
    >
      <div
        className="progress-bar__fill"
        style={indeterminate ? undefined : { width: `${clampedValue}%` }}
      />
    </div>
  );
}

export default ProgressBar;
