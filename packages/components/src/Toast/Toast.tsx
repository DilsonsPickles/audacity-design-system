/**
 * Toast Component
 *
 * Displays notification messages to the user in the bottom-right corner.
 * Supports different types: success, error, warning, info
 */

import React from 'react';
import './Toast.css';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Type of toast message */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** Toast title */
  title: string;
  /** Toast description/message */
  description?: string;
  /** Optional action buttons */
  actions?: ToastAction[];
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /** Show close button */
  showCloseButton?: boolean;
}

const ICONS = {
  success: '\uE800', // checkmark icon from MusescoreIcon
  error: '\uE801',   // error icon
  warning: '\uE802', // warning icon
  info: '\uE803',    // info icon
};

export function Toast({
  id,
  type = 'info',
  title,
  description,
  actions,
  onDismiss,
  showCloseButton = true,
}: ToastProps) {
  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="polite">
      {/* Icon */}
      <div className="toast__icon">
        {ICONS[type]}
      </div>

      {/* Content */}
      <div className="toast__content">
        {/* Title & Description */}
        <div className="toast__text">
          <div className="toast__title">{title}</div>
          {description && (
            <div className="toast__description">{description}</div>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="toast__actions">
            {showCloseButton && (
              <button
                className="toast__action-button"
                onClick={onDismiss}
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            )}
            {actions.map((action, index) => (
              <button
                key={index}
                className="toast__action-button"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Toast;
