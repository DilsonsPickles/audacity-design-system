import React from 'react';
import { Icon, IconName } from '../Icon';
import { useTheme } from '../ThemeProvider';
import './GhostButton.css';

export interface GhostButtonProps {
  /**
   * Icon to display (defaults to 'menu' which uses EF13)
   */
  icon?: IconName;
  /**
   * Button size
   * - tiny: 16px × 16px, 14px icon (table headers)
   * - small: 20px × 20px, 16px icon (default, icon-only)
   * - compact: 24px × 24px, 16px icon (pairs with `Button size="small"` —
   *   e.g. the solid kebab beside a 24px primary button)
   * - medium: 28px × 28px, 16px icon (toolbar-aligned icon-only buttons)
   * - large: 48px × 48px, 32px icon (carousel buttons)
   */
  size?: 'tiny' | 'small' | 'compact' | 'medium' | 'large';
  /**
   * Visual variant (Figma "27 - Macro manager" 6844:63068 kebab rule):
   * - ghost (default): transparent at rest, background on hover — for an
   *   icon button standing alone in a row/table
   * - solid: filled with the secondary-button surface at rest — for an
   *   icon button PAIRED with a solid/primary action button, so the pair
   *   reads as one control group
   */
  variant?: 'ghost' | 'solid';
  /**
   * Optional label text to display next to the icon
   */
  label?: string;
  /**
   * Click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in active state (e.g., menu is open)
   */
  active?: boolean;
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
  /**
   * Keyboard event handler
   */
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const GhostButton: React.FC<GhostButtonProps> = ({
  icon = 'menu',
  size = 'small',
  variant = 'ghost',
  label,
  onClick,
  disabled = false,
  active = false,
  className = '',
  ariaLabel,
  tabIndex,
  onKeyDown,
}) => {
  const { theme } = useTheme();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const iconSize = size === 'large' ? 32 : size === 'tiny' ? 14 : 16;

  // The solid variant swaps in the secondary-button surface tokens — the
  // CSS reads the same custom properties either way
  const bg = variant === 'solid'
    ? theme.background.control.button.secondary
    : theme.background.control.button.ghost;

  const style = {
    '--ghost-bg-idle': bg.idle,
    '--ghost-bg-hover': bg.hover,
    '--ghost-bg-active': bg.active,
    '--ghost-bg-disabled': bg.disabled,
    '--ghost-icon-color': theme.foreground.icon.primary,
    '--ghost-label-color': theme.foreground.text.primary,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      className={`ghost-button ghost-button--${size} ghost-button--variant-${variant} ${label ? 'ghost-button--with-label' : ''} ${disabled ? 'ghost-button--disabled' : ''} ${active ? 'ghost-button--active' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      style={style}
    >
      <Icon name={icon} size={iconSize} />
      {label && <span className="ghost-button__label">{label}</span>}
    </button>
  );
};

export default GhostButton;
