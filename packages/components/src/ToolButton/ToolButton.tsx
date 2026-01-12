import React from 'react';
import { Icon, IconName } from '../Icon';
import { useTheme } from '../ThemeProvider';
import './ToolButton.css';

export interface ToolButtonProps {
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
 * ToolButton component matching Figma design specifications
 * - Size: 28x28px
 * - Border radius: 2px
 * - States: idle, hover, pressed, disabled
 * - Uses MusescoreIcon font for icons
 */
export function ToolButton({
  icon,
  state = 'idle',
  onClick,
  disabled = false,
  className = '',
}: ToolButtonProps) {
  const { theme } = useTheme();
  const [internalState, setInternalState] = React.useState<'idle' | 'hover' | 'pressed'>('idle');

  const currentState = disabled ? 'disabled' : state !== 'idle' ? state : internalState;

  const style = {
    '--tool-btn-idle': theme.background.control.button.secondary.idle,
    '--tool-btn-hover': theme.background.control.button.secondary.hover,
    '--tool-btn-pressed': theme.background.control.button.secondary.active,
    '--tool-icon-color': theme.foreground.icon.primary,
    '--tool-focus-color': theme.border.focus,
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
      className={`tool-button tool-button--${currentState} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled}
      type="button"
      style={style}
    >
      <Icon name={icon} size={16} className="tool-button__icon" />
    </button>
  );
}
