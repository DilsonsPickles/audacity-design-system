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
   * Whether the dialog can be maximized
   */
  maximizable?: boolean;
  /**
   * Whether the dialog is currently maximized
   */
  isMaximized?: boolean;
  /**
   * Maximize button callback
   */
  onMaximize?: () => void;
  /**
   * Mouse down handler for dragging
   */
  onMouseDown?: (e: React.MouseEvent) => void;
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
  maximizable = false,
  isMaximized = false,
  onMaximize,
  onMouseDown,
  className = '',
}: DialogHeaderProps) {
  return (
    <div className={`dialog-header ${className}`} onMouseDown={onMouseDown}>
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
      <div className="dialog-header__buttons">
        {maximizable && onMaximize && (
          <button
            className="dialog-header__maximize-button"
            onClick={onMaximize}
            aria-label={isMaximized ? "Restore" : "Maximize"}
            type="button"
          >
            <span className="dialog-header__maximize-icon">
              {isMaximized ? '❐' : '□'}
            </span>
          </button>
        )}
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
    </div>
  );
}

export default DialogHeader;
