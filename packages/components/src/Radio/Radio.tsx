import React from 'react';
import './Radio.css';

export interface RadioProps {
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

export const Radio: React.FC<RadioProps> = ({
  checked = false,
  onChange,
  disabled = false,
  name,
  value,
  className = '',
}) => {
  const handleChange = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  return (
    <div
      className={`radio ${checked ? 'radio--checked' : ''} ${disabled ? 'radio--disabled' : ''} ${className}`}
      onClick={handleChange}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        name={name}
        value={value}
        onChange={() => {}} // Controlled by outer div
        className="radio__input"
      />
      <div className="radio__indicator">
        {checked && <div className="radio__pip" />}
      </div>
    </div>
  );
};

export default Radio;
