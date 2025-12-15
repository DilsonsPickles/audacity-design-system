/**
 * Dialog - Modal dialog component
 * Based on Figma design: node-id=6326-22726
 */

import React, { useEffect, useRef } from 'react';
import { DialogHeader } from '../DialogHeader';
import './Dialog.css';

export interface DialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Dialog title shown in the header
   */
  title: string;
  /**
   * Dialog content
   */
  children: React.ReactNode;
  /**
   * Footer content (typically buttons)
   */
  footer?: React.ReactNode;
  /**
   * Optional header content (appears below title)
   */
  headerContent?: React.ReactNode;
  /**
   * Optional logo URL for header
   */
  logo?: string;
  /**
   * Callback when dialog should close
   */
  onClose?: () => void;
  /**
   * Callback when clicking outside the dialog
   * @default calls onClose
   */
  onClickOutside?: () => void;
  /**
   * Whether clicking outside closes the dialog
   * @default true
   */
  closeOnClickOutside?: boolean;
  /**
   * Whether pressing Escape closes the dialog
   * @default true
   */
  closeOnEscape?: boolean;
  /**
   * Optional className for the dialog
   */
  className?: string;
  /**
   * Optional width for the dialog
   */
  width?: number | string;
}

/**
 * Dialog component - Modal dialog with overlay
 */
export function Dialog({
  isOpen,
  title,
  children,
  footer,
  headerContent,
  logo,
  onClose,
  onClickOutside,
  closeOnClickOutside = true,
  closeOnEscape = true,
  className = '',
  width = 400,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnClickOutside) {
      if (onClickOutside) {
        onClickOutside();
      } else if (onClose) {
        onClose();
      }
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        className={`dialog ${className}`}
        style={{ width: widthStyle }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <DialogHeader
          title={title}
          logo={logo}
          onClose={onClose}
        />

        {/* Optional header content */}
        {headerContent && (
          <div className="dialog__header-content">
            {headerContent}
          </div>
        )}

        {/* Body */}
        <div className="dialog__body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="dialog__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dialog;
