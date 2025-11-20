import React from 'react';
import './Slider.css';

export interface SliderProps {
  /**
   * Current value (0-100)
   */
  value?: number;
  /**
   * Minimum value
   */
  min?: number;
  /**
   * Maximum value
   */
  max?: number;
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
   * Aria label
   */
  ariaLabel?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value = 50,
  min = 0,
  max = 100,
  onChange,
  className = '',
  disabled = false,
  ariaLabel = 'Slider',
}) => {
  // Clamp value to valid range
  const clampedValue = Math.max(min, Math.min(max, value));

  // Calculate percentage for positioning (0-100)
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  // Handle size in pixels (must match CSS)
  const handleSize = 16;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange?.(newValue);
  };

  return (
    <div className={`slider ${disabled ? 'slider--disabled' : ''} ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={clampedValue}
        onChange={handleChange}
        disabled={disabled}
        className="slider__input"
        aria-label={ariaLabel}
      />
      <div className="slider__track">
        <div
          className="slider__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div
        className="slider__handle"
        style={{
          left: `calc(${percentage}% - ${(percentage / 100) * handleSize}px)`
        }}
      />
    </div>
  );
};

export default Slider;
