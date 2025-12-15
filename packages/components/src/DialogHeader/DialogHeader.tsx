/**
 * DialogHeader - Dialog header component with optional logo
 */

import React from 'react';
import { Icon } from '../Icon';
import './DialogHeader.css';

export interface DialogHeaderProps {
  /**
   * Header title text
   */
  title: string;
  /**
   * Optional logo URL
   */
  logo?: string;
  /**
   * Optional close button callback
   */
  onClose?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * DialogHeader component - Header for dialogs with optional logo and close button
 */
export function DialogHeader({
  title,
  logo,
  onClose,
  className = '',
}: DialogHeaderProps) {
  return (
    <div className={`dialog-header ${className}`}>
      <div className="dialog-header__content">
        {logo && (
          <img
            src={logo}
            alt=""
            className="dialog-header__logo"
          />
        )}
        <div className="dialog-header__title">
          {title}
        </div>
      </div>
      {onClose && (
        <button
          className="dialog-header__close-button"
          onClick={onClose}
          aria-label="Close dialog"
          type="button"
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

export default DialogHeader;
