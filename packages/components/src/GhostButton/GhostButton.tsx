import React from 'react';
import { Icon, IconName } from '../Icon';
import './GhostButton.css';

export interface GhostButtonProps {
  /**
   * Icon to display (defaults to 'menu' which uses EF13)
   */
  icon?: IconName;
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
}

export const GhostButton: React.FC<GhostButtonProps> = ({
  icon = 'menu',
  onClick,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      className={`ghost-button ${disabled ? 'ghost-button--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Icon name={icon} size={16} />
    </button>
  );
};

export default GhostButton;
