import React from 'react';
import { useTheme } from '../ThemeProvider';
import './Tab.css';

export interface TabProps {
  /** The tab's name — its text, or its accessible name when `iconOnly` */
  label: string;
  /** A leading icon (2026-11-11, the Figma-style document tabs) */
  icon?: React.ReactNode;
  /** Draw the icon alone; the label becomes the accessible name */
  iconOnly?: boolean;
  /** 'document': Figma's file tabs — full height, a divider after each,
   *  the active tab a lighter surface with no underline */
  variant?: 'default' | 'document';
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
  icon,
  iconOnly = false,
  variant = 'default',
  isActive = false,
  onClick,
  className = '',
  tabIndex,
  onKeyDown,
  onFocus,
  onBlur,
}, ref) => {
  const { theme } = useTheme();

  const style = {
    '--tab-text': theme.foreground.text.primary,
    '--tab-bg-active': theme.background.tab.selected,
    '--tab-border-active': theme.background.tab.selectedBorder,
    '--tab-text-inactive': theme.foreground.text.secondary,
    '--tab-divider': theme.border.divider,
    '--tab-hover': theme.background.surface.hover,
  } as React.CSSProperties;

  return (
    <button
      ref={ref}
      className={`tab ${isActive ? 'tab--active' : ''}${variant === 'document' ? ' tab--document' : ''}${iconOnly ? ' tab--icon-only' : ''} ${className}`}
      aria-label={iconOnly ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      type="button"
      style={style}
    >
      {icon && <span className="tab__icon" aria-hidden="true">{icon}</span>}
      {!iconOnly && <span className="tab__label">{label}</span>}
    </button>
  );
});

Tab.displayName = 'Tab';
