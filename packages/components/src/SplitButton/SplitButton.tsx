import React from 'react';
import { GhostButton } from '../GhostButton';
import { useTheme } from '../ThemeProvider';
import type { IconName } from '../Icon';
import './SplitButton.css';

export interface SplitButtonProps {
  /** Primary segment icon */
  icon: IconName;
  /** Optional primary segment label, shown next to the icon */
  label?: string;
  /** Primary segment accessible label */
  ariaLabel: string;
  /** Primary segment action */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Caret segment accessible label */
  menuAriaLabel: string;
  /** Caret segment click — the caller owns the menu (ContextMenu),
   *  matching the kebab pattern used elsewhere */
  onMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether the caret's menu is currently open (pressed state) */
  menuActive?: boolean;
  /** Segment size, passed through to GhostButton */
  size?: 'tiny' | 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * SplitButton — a primary action segment joined to a caret segment that
 * opens a menu of action variants (e.g. the Macros row: play = run on
 * project, caret menu = "Apply to files…"). The split holds ONLY
 * variants of the primary verb; unrelated management actions belong on
 * a separate kebab.
 */
export function SplitButton({
  icon,
  label,
  ariaLabel,
  onClick,
  menuAriaLabel,
  onMenuClick,
  menuActive = false,
  size = 'medium',
  className = '',
}: SplitButtonProps) {
  const { theme } = useTheme();
  const style = {
    '--split-button-divider': theme.border.default,
  } as React.CSSProperties;

  return (
    <div className={`split-button ${className}`} style={style} role="group" aria-label={ariaLabel}>
      <GhostButton icon={icon} label={label} size={size} ariaLabel={ariaLabel} onClick={onClick} />
      <span className="split-button__divider" aria-hidden="true" />
      <GhostButton
        icon="caret-down"
        size={size}
        ariaLabel={menuAriaLabel}
        onClick={onMenuClick}
        active={menuActive}
        className="split-button__caret"
      />
    </div>
  );
}

export default SplitButton;
