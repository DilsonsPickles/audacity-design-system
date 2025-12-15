/**
 * LabeledInput - Text input with label
 */

import React from 'react';
import { TextInput, TextInputProps } from '../TextInput';
import './LabeledInput.css';

export interface LabeledInputProps extends Omit<TextInputProps, 'className'> {
  /**
   * Label text
   */
  label: string;
  /**
   * Optional ID for the input (for label association)
   */
  id?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * LabeledInput component - Text input with label
 */
export function LabeledInput({
  label,
  id,
  className = '',
  ...inputProps
}: LabeledInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`labeled-input ${className}`}>
      <label htmlFor={inputId} className="labeled-input__label">
        {label}
      </label>
      <TextInput {...inputProps} className="labeled-input__input" />
    </div>
  );
}

export default LabeledInput;
