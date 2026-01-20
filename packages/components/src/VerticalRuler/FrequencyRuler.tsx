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

  // Collision detection: hide labels that would overlap
  // Assume each label needs about 14px of vertical space (12px font + 2px padding)
  const MIN_LABEL_SPACING = 14;

  // Sort by Y position (bottom to top) - prioritize lower frequencies
  majorTicks.sort((a, b) => b.y - a.y);

  // Check each pair of adjacent labels, starting from lowest frequency
  for (let i = 0; i < majorTicks.length - 1; i++) {
    if (!majorTicks[i].showLabel) continue; // Skip if already hidden

    for (let j = i + 1; j < majorTicks.length; j++) {
      if (!majorTicks[j].showLabel) continue;

      const distance = Math.abs(majorTicks[j].y - majorTicks[i].y);
      if (distance < MIN_LABEL_SPACING) {
        // Hide the higher frequency label (lower priority)
        majorTicks[j].showLabel = false;
      } else {
        // Labels are far enough apart, stop checking
        break;
      }
    }
  }

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
