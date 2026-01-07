import React from 'react';
import './Tab.css';

export interface TabProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  /**
   * Tab index for keyboard navigation
   * Set to 0 for first item in tab group, -1 for others
   */
  tabIndex?: number;
  /**
   * Callback for keyboard navigation (arrow keys)
   */
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /**
   * Focus event handler
   */
  onFocus?: (e: React.FocusEvent) => void;
  /**
   * Blur event handler
   */
  onBlur?: (e: React.FocusEvent) => void;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(({
  label,
  isActive = false,
  onClick,
  className = '',
  tabIndex,
  onKeyDown,
  onFocus,
  onBlur,
}, ref) => {
  return (
    <button
      ref={ref}
      className={`tab ${isActive ? 'tab--active' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      type="button"
    >
      <span className="tab__label">{label}</span>
    </button>
  );
});

Tab.displayName = 'Tab';
