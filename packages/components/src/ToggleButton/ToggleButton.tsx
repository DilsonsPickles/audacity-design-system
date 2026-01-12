import React from 'react';
import { useTheme } from '../ThemeProvider';
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
  const { theme } = useTheme();

  const style = {
    '--toggle-btn-bg': theme.background.control.button.secondary.idle,
    '--toggle-btn-bg-hover': theme.background.control.button.secondary.hover,
    '--toggle-btn-bg-active': theme.background.control.button.secondary.active,
    '--toggle-btn-text': theme.foreground.text.primary,
    '--toggle-btn-focus': theme.border.focus,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      className={`toggle-button ${active ? 'toggle-button--active' : ''} ${disabled ? 'toggle-button--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      aria-pressed={active}
      style={style}
    >
      {children}
    </button>
  );
};

export default ToggleButton;
