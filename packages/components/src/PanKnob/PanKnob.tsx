import React from 'react';
import './PanKnob.css';

export interface PanKnobProps {
  /**
   * Pan value: -100 (full left) to 100 (full right)
   */
  value?: number;
  /**
   * Change handler
   */
  onChange?: (value: number) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;
  /**
   * Unique ID for the knob
   */
  id?: string;
}

export const PanKnob: React.FC<PanKnobProps> = ({
  value = 0,
  onChange,
  className = '',
  disabled = false,
  tabIndex = 0,
  id,
}) => {
  // Clamp value to -100 to 100
  const clampedValue = Math.max(-100, Math.min(100, value));

  // Calculate rotation angle for knob
  // -100 = -135deg (left), 0 = 0deg (center), 100 = 135deg (right)
  const knobRotation = (clampedValue / 100) * 135;

  // Calculate value sweep
  // Gauge starts at 225deg and sweeps 270deg
  // The knob at center (value=0) points to 12 o'clock
  // Testing: 45deg was 1-2 o'clock, so trying 0deg for 12 o'clock position
  const valueSweepDegrees = Math.abs(clampedValue / 100) * 135; // 0 to 135 degrees
  const isLeftPan = clampedValue < 0;

  // Trying 0deg for 12 o'clock
  const sweepStartDeg = isLeftPan ? 0 - valueSweepDegrees : 0;
  const sweepColor = isLeftPan ? '#84b5ff' : '#677ce4';

  return (
    <div className={`pan-knob ${className}`}>
      {/* Background gauge */}
      <div className="pan-knob__gauge" />

      {/* Value sweep (shows pan amount in accent color) */}
      {clampedValue !== 0 && (
        <div
          className="pan-knob__value-sweep"
          style={{
            background: `conic-gradient(
              from ${sweepStartDeg}deg,
              ${sweepColor} 0deg,
              ${sweepColor} ${valueSweepDegrees}deg,
              transparent ${valueSweepDegrees}deg
            )`
          }}
        />
      )}

      {/* Knob group (rotates as one) */}
      <div
        className="pan-knob__knob-group"
        style={{ transform: `rotate(${knobRotation}deg)` }}
      >
        <div className="pan-knob__dial-border" />
        <div className="pan-knob__dial">
          <div className="pan-knob__indicator" />
        </div>
      </div>
    </div>
  );
};

export default PanKnob;
