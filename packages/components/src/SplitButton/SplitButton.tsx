import React from 'react';
import { Button } from '../Button';
import { Icon } from '../Icon';
import './SplitButton.css';

export interface SplitButtonProps {
  /** Primary segment text (the verb, e.g. "Run") */
  label: string;
  /** Accessible name for the primary segment (defaults to the label) */
  ariaLabel?: string;
  /** Primary segment action (event optional, matching Button's onClick) */
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible name for the caret segment */
  menuAriaLabel: string;
  /** Caret segment click — the caller owns the menu (ContextMenu),
   *  matching the kebab pattern elsewhere. Event optional per Button. */
  onMenuClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  /** Both segments share the Button variant */
  variant?: 'primary' | 'secondary';
  size?: 'default' | 'small';
  disabled?: boolean;
  className?: string;
}

/**
 * SplitButton — two joined filled Button segments: the primary verb and
 * a caret opening a menu of that verb's variants (e.g. Run | ▾ with
 * "Apply to files…"). The split holds ONLY variants of the primary
 * action; unrelated management actions belong on a separate kebab.
 */
export function SplitButton({
  label,
  ariaLabel,
  onClick,
  menuAriaLabel,
  onMenuClick,
  variant = 'secondary',
  size = 'default',
  disabled = false,
  className = '',
}: SplitButtonProps) {
  return (
    <div className={`split-button ${className}`} role="group" aria-label={ariaLabel ?? label}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onClick}
        className="split-button__primary"
        ariaLabel={ariaLabel}
      >
        {label}
      </Button>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onMenuClick}
        className="split-button__caret"
        ariaLabel={menuAriaLabel}
      >
        <Icon name="caret-down" size={12} />
      </Button>
    </div>
  );
}

export default SplitButton;
