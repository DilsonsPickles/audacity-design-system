import React from 'react';
import { Radio } from '../Radio';
import './LabeledRadio.css';

export interface LabeledRadioProps {
  /**
   * Label text
   */
  label: string;
  /**
   * Whether the radio is selected
   */
  checked?: boolean;
  /**
   * Change handler
   */
  onChange?: (checked: boolean) => void;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Name attribute for grouping radios
   */
  name?: string;
  /**
   * Value attribute
   */
  value?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LabeledRadio: React.FC<LabeledRadioProps> = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  name,
  value,
  className = '',
}) => {
  return (
    <div className={`labeled-radio ${className}`}>
      <Radio
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        name={name}
        value={value}
      />
      <label className="labeled-radio__label">{label}</label>
    </div>
  );
};

export default LabeledRadio;
