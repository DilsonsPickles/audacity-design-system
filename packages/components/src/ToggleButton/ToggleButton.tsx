import React from 'react';
import './ToggleButton.css';

export interface ToggleButtonProps {
  /**
   * Whether the button is in active/pressed state
   */
  active?: boolean;
  /**
   * Button content (typically a single character like 'M' or 'S')
   */
  children: React.ReactNode;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string;
  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  active = false,
  children,
  onClick,
  disabled = false,
  className = '',
  ariaLabel,
  tabIndex,
}) => {
  return (
    <button
      type="button"
      className={`toggle-button ${active ? 'toggle-button--active' : ''} ${disabled ? 'toggle-button--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      aria-pressed={active}
    >
      {children}
    </button>
  );
};

export default ToggleButton;
