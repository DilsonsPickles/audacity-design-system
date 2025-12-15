/**
 * LabeledCheckbox Component
 *
 * A checkbox with an associated label
 */

import React from 'react';
import { Checkbox } from '../Checkbox';
import './LabeledCheckbox.css';

export interface LabeledCheckboxProps {
  /**
   * Label text for the checkbox
   */
  label: string;
  /**
   * Whether the checkbox is checked
   */
  checked?: boolean;
  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;
  /**
   * Callback when checkbox state changes
   */
  onChange?: (checked: boolean) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * LabeledCheckbox - A checkbox with label
 */
export function LabeledCheckbox({
  label,
  checked = false,
  disabled = false,
  onChange,
  className = '',
}: LabeledCheckboxProps) {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div
      className={`labeled-checkbox ${className}`}
      onClick={handleClick}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
      />
      <span className="labeled-checkbox__label">
        {label}
      </span>
    </div>
  );
}

export default LabeledCheckbox;
