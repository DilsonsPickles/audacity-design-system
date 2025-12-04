import React from 'react';
import '../assets/fonts/musescore-icon.css';
import './TransportButton.css';

export interface TransportButtonProps {
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
      className={`transport-button transport-button--${currentState} ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled}
      type="button"
    >
      <span className="transport-button__icon musescore-icon">{icon}</span>
    </button>
  );
}
