import React from 'react';
import { useTheme } from '../ThemeProvider';
import './VerticalRuler.css';

export interface VerticalRulerProps {
  /**
   * Height of the ruler in pixels
   */
  height: number;
  /**
   * Minimum value on the scale
   * @default -1.0
   */
  min?: number;
  /**
   * Maximum value on the scale
   * @default 1.0
   */
  max?: number;
  /**
   * Number of major divisions (labeled ticks)
   * @default 5
   */
  majorDivisions?: number;
  /**
   * Number of minor divisions between each major division
   * @default 4
   */
  minorDivisions?: number;
  /**
   * Position of tick marks and labels
   * @default 'right'
   */
  position?: 'left' | 'right';
  /**
   * Width of the ruler in pixels
   * @default 32
   */
  width?: number;
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Optional header height (shown as semi-transparent overlay at top)
   */
  headerHeight?: number;
}

/**
 * VerticalRuler component for displaying linear amplitude scale
 *
 * Displays a vertical ruler with major and minor tick marks and labels.
 * Used for showing amplitude values from -1.0 to 1.0 (or custom range).
 */
export const VerticalRuler: React.FC<VerticalRulerProps> = ({
  height,
  min = -1.0,
  max = 1.0,
  majorDivisions = 5,
  minorDivisions = 4,
  position = 'right',
  width = 32,
  className = '',
  headerHeight,
}) => {
  const { theme } = useTheme();

  // Calculate tick positions
  const range = max - min;
  const totalTicks = majorDivisions + (majorDivisions - 1) * minorDivisions;
  const tickSpacing = height / totalTicks;

  const ticks: Array<{
    y: number;
    value: number;
    isMajor: boolean;
    isCenter: boolean;
    isFirst: boolean;
    isLast: boolean;
  }> = [];

  // Generate ticks
  // totalTicks is the number of intervals, so we need totalTicks + 1 tick positions
  // But we actually want exactly majorDivisions major ticks, which spans totalTicks intervals
  for (let i = 0; i <= totalTicks; i++) {
    const isMajor = i % (minorDivisions + 1) === 0;
    const majorIndex = Math.floor(i / (minorDivisions + 1));

    // Skip any ticks that would go beyond the last major division
    if (majorIndex >= majorDivisions) continue;

    // For the last major tick, position it 2px above the bottom to avoid focus outline
    const isLastMajor = majorIndex === majorDivisions - 1 && isMajor;
    const isFirstMajor = majorIndex === 0 && isMajor;
    const value = max - (majorIndex * range) / (majorDivisions - 1);
    const y = isLastMajor ? height - 2 : i * tickSpacing;
    const isCenter = Math.abs(value) < 0.01; // Center line at 0.0

    ticks.push({ y, value, isMajor, isCenter, isFirst: isFirstMajor, isLast: isLastMajor });
  }

  const style = {
    '--ruler-width': `${width}px`,
    '--ruler-height': `${height}px`,
    '--ruler-tick-primary': theme.stroke.ruler.primary,
    '--ruler-tick-secondary': theme.stroke.ruler.secondary,
    '--ruler-text-primary': theme.foreground.text.contrastPrimary,
    '--ruler-text-secondary': theme.foreground.text.contrastSecondary,
    '--ruler-grid-measure': theme.stroke.grid.measure,
    '--ruler-bg': theme.background.panel.ruler,
  } as React.CSSProperties;

  return (
    <div
      className={`vertical-ruler vertical-ruler--${position} ${className}`}
      style={style}
    >
      <div className="vertical-ruler__ticks">
        {ticks.map((tick, index) => (
          <div
            key={index}
            className={`vertical-ruler__tick ${
              tick.isMajor ? 'vertical-ruler__tick--major' : 'vertical-ruler__tick--minor'
            } ${tick.isCenter ? 'vertical-ruler__tick--center' : ''} ${
              tick.isFirst ? 'vertical-ruler__tick--first' : ''
            } ${tick.isLast ? 'vertical-ruler__tick--last' : ''}`}
            style={{ top: `${tick.y}px` }}
          >
            {/* Horizontal grid line (only for center line at 0.0) */}
            {tick.isCenter && tick.isMajor && (
              <div className="vertical-ruler__grid-line" />
            )}

            {/* Tick mark */}
            <div className="vertical-ruler__tick-mark" />

            {/* Label (only for major ticks) */}
            {tick.isMajor && (
              <div className="vertical-ruler__label">
                {tick.value.toFixed(1)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Optional header overlay */}
      {(headerHeight ?? 0) > 0 && (
        <div
          className="vertical-ruler__header"
          style={{ height: `${headerHeight}px` }}
        />
      )}
    </div>
  );
};

export default VerticalRuler;
