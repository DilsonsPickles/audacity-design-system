import React from 'react';
import { useTheme } from '../ThemeProvider';
import './VerticalRuler.css';

export interface FrequencyRulerProps {
  /**
   * Height of the ruler in pixels
   */
  height: number;
  /**
   * Minimum frequency in Hz
   * @default 10
   */
  minFreq?: number;
  /**
   * Maximum frequency in Hz
   * @default 22050 (Nyquist for 44.1kHz)
   */
  maxFreq?: number;
  /**
   * Position of tick marks and labels
   * @default 'right'
   */
  position?: 'left' | 'right';
  /**
   * Width of the ruler in pixels
   * @default 80
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
 * FrequencyRuler component for displaying Mel frequency scale
 *
 * Displays a vertical ruler with frequency labels for spectrograms.
 * Uses Mel scale for perceptually uniform frequency perception.
 * Frequencies shown: 100Hz, 200Hz, 500Hz, 1kHz, 2kHz, 5kHz, 10kHz, 20kHz
 */
export const FrequencyRuler: React.FC<FrequencyRulerProps> = ({
  height,
  minFreq = 10,
  maxFreq = 22050,
  position = 'right',
  width = 80,
  className = '',
  headerHeight,
}) => {
  const { theme } = useTheme();

  // Common audio frequencies for labeling (major ticks)
  // Starting from bottom (high freq) to top (low freq)
  const majorFrequencies = [
    { freq: 20000, label: '20k' },
    { freq: 10000, label: '10k' },
    { freq: 5000, label: '5k' },
    { freq: 2000, label: '2k' },
    { freq: 1000, label: '1k' },
    { freq: 500, label: '500' },
    { freq: 200, label: '200' },
    { freq: 100, label: '100' },
  ];

  // Minor tick frequencies (unlabeled, for reference)
  const minorFrequencies = [
    15000, 7000, 4000, 3000, 1500, 700, 400, 300, 150,
    // Below 100 Hz
    80, 60, 40, 20,
  ];

  // Convert frequency to Mel scale
  const hzToMel = (hz: number): number => {
    return 2595 * Math.log10(1 + hz / 700);
  };

  // Calculate Y position for each frequency using Mel scale
  const freqToY = (freq: number): number => {
    if (freq <= minFreq) return height;
    if (freq >= maxFreq) return 0;

    // Mel scale: converts Hz to perceptually uniform Mel units
    const melMin = hzToMel(minFreq);
    const melMax = hzToMel(maxFreq);
    const melFreq = hzToMel(freq);

    return height * (1 - (melFreq - melMin) / (melMax - melMin));
  };

  // Create major ticks (with labels)
  let majorTicks = majorFrequencies
    .filter(f => f.freq >= minFreq && f.freq <= maxFreq)
    .map(f => ({
      y: freqToY(f.freq),
      label: f.label,
      freq: f.freq,
      isMajor: true,
      showLabel: true, // Will be updated by collision detection
    }));

  // Responsive label collision detection
  // Adaptively choose which labels to show based on available height
  const MIN_LABEL_SPACING = 14; // pixels needed per label
  const availableSpace = height;
  const maxVisibleLabels = Math.max(2, Math.floor(availableSpace / MIN_LABEL_SPACING));

  // Priority-based label selection: prioritize logarithmically spaced frequencies
  // Priority order (highest to lowest): 1k, 10k, 100, 5k, 500, 2k, 200, 20k
  const labelPriorities: Record<number, number> = {
    1000: 1,   // 1kHz - reference frequency
    10000: 2,  // 10kHz - high frequency reference
    100: 3,    // 100Hz - low frequency reference
    5000: 4,   // 5kHz - mid-high
    500: 5,    // 500Hz - mid-low
    2000: 6,   // 2kHz - mid
    200: 7,    // 200Hz - low
    20000: 8,  // 20kHz - very high
  };

  // Sort ticks by priority (lower number = higher priority)
  majorTicks.sort((a, b) => {
    const priorityA = labelPriorities[a.freq] ?? 999;
    const priorityB = labelPriorities[b.freq] ?? 999;
    return priorityA - priorityB;
  });

  // Greedily select labels that don't collide, starting with highest priority
  const selectedLabels: typeof majorTicks = [];

  for (const tick of majorTicks) {
    // Check if this label would collide with any already-selected label
    const wouldCollide = selectedLabels.some(selected =>
      Math.abs(tick.y - selected.y) < MIN_LABEL_SPACING
    );

    if (!wouldCollide && selectedLabels.length < maxVisibleLabels) {
      selectedLabels.push(tick);
      tick.showLabel = true;
    } else {
      tick.showLabel = false;
    }
  }

  // Sort back by Y position for rendering (top to bottom)
  majorTicks.sort((a, b) => a.y - b.y);

  // Create minor ticks (without labels)
  const minorTicks = minorFrequencies
    .filter(f => f >= minFreq && f <= maxFreq)
    .map(f => ({
      y: freqToY(f),
      label: '',
      freq: f,
      isMajor: false,
      showLabel: false,
    }));

  // Combine and sort by frequency (high to low)
  const allTicks = [...majorTicks, ...minorTicks].sort((a, b) => b.freq - a.freq);

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
        {allTicks.map((tick, index) => (
          <div
            key={tick.freq}
            className={`vertical-ruler__tick ${
              tick.isMajor ? 'vertical-ruler__tick--major' : 'vertical-ruler__tick--minor'
            }`}
            style={{ top: `${tick.y}px` }}
          >
            {/* Tick mark */}
            <div className="vertical-ruler__tick-mark" />

            {/* Label (only for major ticks that aren't hidden by collision detection) */}
            {tick.isMajor && tick.showLabel && (
              <div className="vertical-ruler__label">
                {tick.label}
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

export default FrequencyRuler;
