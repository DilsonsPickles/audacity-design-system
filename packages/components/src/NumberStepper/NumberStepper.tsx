/**
 * NumberStepper - Number input with up/down arrows
 */

import React, { useState } from 'react';
import './NumberStepper.css';

export interface NumberStepperProps {
  /**
   * Input value
   */
  value?: string;
  /**
   * Default value for uncontrolled component
   */
  defaultValue?: string;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Change handler
   */
  onChange?: (value: string) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Input width
   */
  width?: number | string;
  /**
   * Step amount for increment/decrement
   */
  step?: number;
  /**
   * Minimum value
   */
  min?: number;
  /**
   * Maximum value
   */
  max?: number;
}

/**
 * NumberStepper component - Number input with up/down arrows
 */
export function NumberStepper({
  value,
  defaultValue = '',
  placeholder,
  disabled = false,
  onChange,
  className = '',
  width = 86,
  step = 1,
  min,
  max,
}: NumberStepperProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleIncrement = () => {
    if (disabled) return;

    // Extract numeric value from string (e.g., "20 dB" -> 20)
    const match = currentValue.match(/-?\d+\.?\d*/);
    const numericValue = match ? parseFloat(match[0]) : 0;
    const unit = currentValue.replace(match?.[0] || '', '').trim();

    let newValue = numericValue + step;
    if (max !== undefined && newValue > max) {
      newValue = max;
    }

    const newStringValue = unit ? `${newValue} ${unit}` : newValue.toString();

    if (!isControlled) {
      setInternalValue(newStringValue);
    }
    onChange?.(newStringValue);
  };

  const handleDecrement = () => {
    if (disabled) return;

    // Extract numeric value from string
    const match = currentValue.match(/-?\d+\.?\d*/);
    const numericValue = match ? parseFloat(match[0]) : 0;
    const unit = currentValue.replace(match?.[0] || '', '').trim();

    let newValue = numericValue - step;
    if (min !== undefined && newValue < min) {
      newValue = min;
    }

    const newStringValue = unit ? `${newValue} ${unit}` : newValue.toString();

    if (!isControlled) {
      setInternalValue(newStringValue);
    }
    onChange?.(newStringValue);
  };

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return (
    <div
      className={`number-stepper ${disabled ? 'number-stepper--disabled' : ''} ${className}`}
      style={{ width: widthStyle }}
    >
      <input
        type="text"
        value={currentValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="number-stepper__input"
      />
      <div className="number-stepper__arrows">
        <button
          type="button"
          className="number-stepper__arrow number-stepper__arrow--up"
          onClick={handleIncrement}
          disabled={disabled}
          tabIndex={-1}
        >
          <span className="number-stepper__icon musescore-icon">{'\uEF10'}</span>
        </button>
        <button
          type="button"
          className="number-stepper__arrow number-stepper__arrow--down"
          onClick={handleDecrement}
          disabled={disabled}
          tabIndex={-1}
        >
          <span className="number-stepper__icon musescore-icon">{'\uEF12'}</span>
        </button>
      </div>
    </div>
  );
}

export default NumberStepper;
