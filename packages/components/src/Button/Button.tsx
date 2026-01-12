import React from 'react';
import '../assets/fonts/musescore-icon.css';
import './Button.css';
import { useTheme } from '../ThemeProvider';

export interface ButtonProps {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary';
  /**
   * Button size
   * - small: 24px height, 12px font
   * - default: 28px height, 12px font
   * - large: 40px height, 14px font (promotional/CTA buttons)
   */
  size?: 'small' | 'default' | 'large';
  /**
   * Button text
   */
  children: React.ReactNode;
  /**
   * Optional icon (React node or string)
   */
  icon?: React.ReactNode;
  /**
   * Show icon
   */
  showIcon?: boolean;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Button type
   */
  type?: 'button' | 'submit' | 'reset';
  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'default',
  children,
  icon,
  showIcon = true,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  tabIndex,
}) => {
  const { theme } = useTheme();

  // Get colors from theme based on variant
  const buttonColors = variant === 'primary'
    ? theme.background.control.button.primary
    : theme.background.control.button.secondary;

  const style = {
    '--button-bg-idle': buttonColors.idle,
    '--button-bg-hover': buttonColors.hover,
    '--button-bg-active': buttonColors.active,
    '--button-bg-disabled': buttonColors.disabled,
    '--button-text-color': theme.foreground.text.primary,
    '--button-focus-color': theme.border.focus,
  } as React.CSSProperties;

  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${disabled ? 'button--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      tabIndex={tabIndex}
      style={style}
    >
      {showIcon && icon && (
        <span className="button__icon musescore-icon">
          {icon}
        </span>
      )}
      <span className="button__text">{children}</span>
    </button>
  );
};

export default Button;
