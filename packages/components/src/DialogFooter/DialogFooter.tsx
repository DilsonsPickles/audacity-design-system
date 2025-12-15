/**
 * DialogFooter - Dialog footer component with action buttons
 */

import React from 'react';
import { Button } from '../Button';
import './DialogFooter.css';

export interface DialogFooterProps {
  /**
   * Primary button text
   */
  primaryText?: string;
  /**
   * Secondary button text (cancel/close)
   */
  secondaryText?: string;
  /**
   * Primary button click handler
   */
  onPrimaryClick?: () => void;
  /**
   * Secondary button click handler
   */
  onSecondaryClick?: () => void;
  /**
   * Whether primary button is disabled
   */
  primaryDisabled?: boolean;
  /**
   * Whether secondary button is disabled
   */
  secondaryDisabled?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * DialogFooter component - Footer with Cancel and Done/OK buttons
 */
export function DialogFooter({
  primaryText = 'Done',
  secondaryText = 'Cancel',
  onPrimaryClick,
  onSecondaryClick,
  primaryDisabled = false,
  secondaryDisabled = false,
  className = '',
}: DialogFooterProps) {
  return (
    <div className={`dialog-footer ${className}`}>
      <div className="dialog-footer__button-group">
        <Button
          variant="secondary"
          size="small"
          onClick={onSecondaryClick}
          disabled={secondaryDisabled}
        >
          {secondaryText}
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
        >
          {primaryText}
        </Button>
      </div>
    </div>
  );
}

export default DialogFooter;
