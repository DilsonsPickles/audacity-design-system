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
   * Tab index for keyboard navigation
   */
  tabIndex?: number;
  /**
   * Use bold font weight for label
   */
  bold?: boolean;
  /**
   * Description text shown below the label (only when bold is true)
   */
  description?: string;
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
  tabIndex,
  bold = false,
  description,
  className = '',
}) => {
  const hasDescription = bold && description;

  return (
    <div className={`labeled-radio ${hasDescription ? 'labeled-radio--with-description' : ''} ${className}`}>
      <Radio
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        name={name}
        value={value}
        tabIndex={tabIndex}
      />
      <div className="labeled-radio__content">
        <label className={`labeled-radio__label ${bold ? 'labeled-radio__label--bold' : ''}`}>
          {label}
        </label>
        {hasDescription && (
          <div className="labeled-radio__description">{description}</div>
        )}
      </div>
    </div>
  );
};

export default LabeledRadio;
