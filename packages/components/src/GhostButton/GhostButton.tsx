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
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in active state (e.g., menu is open)
   */
  active?: boolean;
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
  active = false,
  className = '',
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      className={`ghost-button ${disabled ? 'ghost-button--disabled' : ''} ${active ? 'ghost-button--active' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Icon name={icon} size={16} />
    </button>
  );
};

export default GhostButton;
