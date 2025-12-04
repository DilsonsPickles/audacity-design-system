import React from 'react';
import '../assets/fonts/musescore-icon.css';
import './ToolButton.css';

export interface ToolButtonProps {
  /**
   * Icon character from MusescoreIcon font
   */
  icon: string;
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
  const [internalState, setInternalState] = React.useState<'idle' | 'hover' | 'pressed'>('idle');

  const currentState = disabled ? 'disabled' : state !== 'idle' ? state : internalState;

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
    >
      <span className="tool-button__icon musescore-icon">{icon}</span>
    </button>
  );
}
