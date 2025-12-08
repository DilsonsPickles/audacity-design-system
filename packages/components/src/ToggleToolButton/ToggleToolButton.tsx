import React from 'react';
import { Icon, IconName } from '../Icon';
import './ToggleToolButton.css';

export interface ToggleToolButtonProps {
  /**
   * Icon name from MusescoreIcon font
   */
  icon: IconName;
  /**
   * Whether the button is toggled on
   */
  isActive?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * ToggleToolButton component matching Figma design specifications
 * - Size: 28x28px
 * - Border radius: 2px
 * - States: off (idle, hover), on (active, active-hover), disabled
 * - Uses MusescoreIcon font for icons
 * - Toggle behavior: stays pressed when active
 */
export function ToggleToolButton({
  icon,
  isActive = false,
  onClick,
  disabled = false,
  className = '',
}: ToggleToolButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  // Determine CSS class based on state
  let stateClass = 'toggle-tool-button--off';
  if (disabled) {
    stateClass = 'toggle-tool-button--disabled';
  } else if (isActive) {
    stateClass = isHovered ? 'toggle-tool-button--on-hover' : 'toggle-tool-button--on';
  } else {
    stateClass = isHovered ? 'toggle-tool-button--off-hover' : 'toggle-tool-button--off';
  }

  const iconColor = isActive ? '#ffffff' : '#14151a';

  return (
    <button
      className={`toggle-tool-button ${stateClass} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      type="button"
      aria-pressed={isActive}
    >
      <Icon name={icon} size={16} color={iconColor} />
    </button>
  );
}

export default ToggleToolButton;
