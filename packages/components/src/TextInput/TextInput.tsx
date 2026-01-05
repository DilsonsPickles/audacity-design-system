/**
 * TextInput - Text input field component
 * Based on Figma design: node-id=3084-118526
 */

import React, { useState, useRef, useEffect } from 'react';
import './TextInput.css';

export interface TextInputProps {
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
   * Whether the input has an error
   */
  error?: boolean;
  /**
   * Change handler
   */
  onChange?: (value: string) => void;
  /**
   * Focus handler
   */
  onFocus?: () => void;
  /**
   * Blur handler
   */
  onBlur?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Input width
   */
  width?: number | string;
  /**
   * Input type
   */
  type?: 'text' | 'password' | 'email' | 'number';
  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;
}

/**
 * TextInput component - Standard text input field
 */
export function TextInput({
  value,
  defaultValue,
  placeholder,
  disabled = false,
  error = false,
  onChange,
  onFocus,
  onBlur,
  className = '',
  width,
  type = 'text',
  tabIndex,
}: TextInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  // Determine state class
  let stateClass = 'text-input--idle';
  if (disabled) {
    stateClass = 'text-input--disabled';
  } else if (isFocused) {
    stateClass = 'text-input--active';
  } else if (isHovered) {
    stateClass = 'text-input--hover';
  }

  // Determine type class
  const hasValue = currentValue.length > 0;
  const typeClass = error
    ? hasValue
      ? 'text-input--completed-error'
      : 'text-input--empty-error'
    : hasValue
    ? 'text-input--completed'
    : 'text-input--empty';

  const widthStyle = width ? (typeof width === 'number' ? `${width}px` : width) : undefined;

  return (
    <div
      className={`text-input ${stateClass} ${typeClass} ${className}`}
      style={widthStyle ? { width: widthStyle } : undefined}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        ref={inputRef}
        type={type}
        value={currentValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="text-input__field"
        tabIndex={tabIndex}
      />
    </div>
  );
}

export default TextInput;
