import React from 'react';
import { Icon, IconName } from '../Icon';
import { useTheme } from '../ThemeProvider';
import './TransportButton.css';

export interface TransportButtonProps {
  /**
   * Icon name from MusescoreIcon font
   */
  icon: IconName;
  /**
   * Button state
   */
  state?: 'idle' | 'hover' | 'pressed' | 'disabled';
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
 * TransportButton component matching Figma design specifications
 * - Size: 32x32px
 * - Border radius: 3px
 * - States: idle, hover, pressed, disabled
 * - Uses MusescoreIcon font for icons
 */
export function TransportButton({
  icon,
  state = 'idle',
  onClick,
  disabled = false,
  className = '',
}: TransportButtonProps) {
  const { theme } = useTheme();
  const [internalState, setInternalState] = React.useState<'idle' | 'hover' | 'pressed'>('idle');

  const currentState = disabled ? 'disabled' : state !== 'idle' ? state : internalState;

  const style = {
    '--transport-btn-idle': theme.background.control.button.secondary.idle,
    '--transport-btn-hover': theme.background.control.button.secondary.hover,
    '--transport-btn-pressed': theme.background.control.button.secondary.active,
    '--transport-icon-color': theme.foreground.icon.primary,
    '--transport-focus-color': theme.border.focus,
  } as React.CSSProperties;

  const handleMouseEnter = () => {
    if (!disabled && state === 'idle') {
      setInternalState('hover');
    }
  };

  const handleMouseLeave = () => {
    if (!disabled && state === 'idle') {
      setInternalState('idle');
    }
  };

  const handleMouseDown = () => {
    if (!disabled && state === 'idle') {
      setInternalState('pressed');
    }
  };

  const handleMouseUp = () => {
    if (!disabled && state === 'idle') {
      setInternalState('hover');
    }
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`transport-button transport-button--${currentState} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled}
      type="button"
      style={style}
    >
      <Icon name={icon} size={14} className="transport-button__icon" />
    </button>
  );
}
