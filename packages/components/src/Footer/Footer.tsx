/**
 * Footer - Generic footer component with action buttons
 */

import React from 'react';
import { Button } from '../Button';
import './Footer.css';

export interface FooterProps {
  /**
   * Primary button text
   */
  primaryText?: string;
  /**
   * Secondary button text (cancel/close)
   */
  secondaryText?: string;
  /**
   * Tertiary button text (left-aligned, optional)
   */
  tertiaryText?: string;
  /**
   * Primary button click handler
   */
  onPrimaryClick?: () => void;
  /**
   * Secondary button click handler
   */
  onSecondaryClick?: () => void;
  /**
   * Tertiary button click handler
   */
  onTertiaryClick?: () => void;
  /**
   * Whether primary button is disabled
   */
  primaryDisabled?: boolean;
  /**
   * Whether secondary button is disabled
   */
  secondaryDisabled?: boolean;
  /**
   * Whether tertiary button is disabled
   */
  tertiaryDisabled?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Footer component - Generic footer with action buttons
 * Can be used in dialogs, modals, windows, and other contexts
 */
export function Footer({
  primaryText = 'Done',
  secondaryText = 'Cancel',
  tertiaryText,
  onPrimaryClick,
  onSecondaryClick,
  onTertiaryClick,
  primaryDisabled = false,
  secondaryDisabled = false,
  tertiaryDisabled = false,
  className = '',
}: FooterProps) {
  return (
    <div className={`footer ${className}`}>
      {tertiaryText && (
        <div className="footer__left-group">
          <Button
            variant="secondary"
            size="default"
            onClick={onTertiaryClick}
            disabled={tertiaryDisabled}
          >
            {tertiaryText}
          </Button>
        </div>
      )}
      <div className="footer__button-group">
        <Button
          variant="secondary"
          size="default"
          onClick={onSecondaryClick}
          disabled={secondaryDisabled}
        >
          {secondaryText}
        </Button>
        <Button
          variant="primary"
          size="default"
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
        >
          {primaryText}
        </Button>
      </div>
    </div>
  );
}

// Deprecated: Use Footer instead
export const DialogFooter = Footer;
export type DialogFooterProps = FooterProps;

export default Footer;
