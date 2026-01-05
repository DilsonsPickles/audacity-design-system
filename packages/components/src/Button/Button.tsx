import React from 'react';
import '../assets/fonts/musescore-icon.css';
import './Button.css';

export interface ButtonProps {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary';
  /**
   * Button size
   */
  size?: 'default' | 'small';
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
  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${disabled ? 'button--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      tabIndex={tabIndex}
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
