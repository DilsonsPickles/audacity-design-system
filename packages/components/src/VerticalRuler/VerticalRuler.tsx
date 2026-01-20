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

  // Adaptive minor tick density based on available space
  // If ticks would be < 2px apart, reduce from 4 minor ticks to 1 (just the halfway point)
  const MIN_TICK_SPACING = 2; // pixels
  const effectiveMinorDivisions = minorDivisions;

  // Calculate initial spacing with full minor ticks
  let adjustedMinorDivisions = effectiveMinorDivisions;
  let lastMajorTickIndex = (majorDivisions - 1) * (adjustedMinorDivisions + 1);
  let tickSpacing = height / lastMajorTickIndex;

  // If spacing is too tight, reduce to just 1 minor tick (halfway point)
  if (tickSpacing < MIN_TICK_SPACING && adjustedMinorDivisions > 1) {
    adjustedMinorDivisions = 1; // Just one tick in the middle
    lastMajorTickIndex = (majorDivisions - 1) * (adjustedMinorDivisions + 1);
    tickSpacing = height / lastMajorTickIndex;
  }

  const ticks: Array<{
    y: number;
    value: number;
    isMajor: boolean;
    isCenter: boolean;
    isFirst: boolean;
    isLast: boolean;
    showLabel: boolean;
  }> = [];

  // Generate ticks
  // We want exactly majorDivisions major ticks with minor ticks in between
  for (let i = 0; i <= lastMajorTickIndex; i++) {
    const isMajor = i % (adjustedMinorDivisions + 1) === 0;
    const majorIndex = Math.floor(i / (adjustedMinorDivisions + 1));

    const isLastMajor = majorIndex === majorDivisions - 1 && isMajor;
    const isFirstMajor = majorIndex === 0 && isMajor;
    const value = max - (majorIndex * range) / (majorDivisions - 1);
    const y = i * tickSpacing; // All ticks use uniform spacing now
    const isCenter = Math.abs(value) < 0.01; // Center line at 0.0

    ticks.push({ y, value, isMajor, isCenter, isFirst: isFirstMajor, isLast: isLastMajor, showLabel: false });
  }

  // Responsive label collision detection
  // Adaptively choose which labels to show based on available height
  const MIN_LABEL_SPACING = 14; // pixels needed per label
  const availableSpace = height;
  const maxVisibleLabels = Math.max(1, Math.floor(availableSpace / MIN_LABEL_SPACING));

  // Priority-based label selection: prioritize important amplitude values
  // Priority order (highest to lowest): 0.0 (center), ±1.0 (extremes), ±0.5
  const majorTicks = ticks.filter(t => t.isMajor);

  // Assign priorities
  const labelPriorities = majorTicks.map((tick, index) => ({
    tick,
    index,
    priority: tick.isCenter ? 1 : // 0.0 - most important
              (tick.isFirst || tick.isLast) ? 2 : // ±1.0 - extremes
              3 // everything else (±0.5, etc.)
  }));

  // Sort by priority (lower number = higher priority)
  labelPriorities.sort((a, b) => a.priority - b.priority);

  // Greedily select labels that don't collide, starting with highest priority
  const selectedLabels: typeof labelPriorities = [];

  for (const item of labelPriorities) {
    // Check if this label would collide with any already-selected label
    const wouldCollide = selectedLabels.some(selected =>
      Math.abs(item.tick.y - selected.tick.y) < MIN_LABEL_SPACING
    );

    if (!wouldCollide && selectedLabels.length < maxVisibleLabels) {
      selectedLabels.push(item);
      item.tick.showLabel = true;
    }
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

            {/* Label (only for major ticks with showLabel=true) */}
            {tick.isMajor && tick.showLabel && (
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
