/**
 * Toast Component
 *
 * Displays notification messages to the user in the bottom-right corner.
 * Supports different types: success, error, warning, info
 */

import React from 'react';
import { ProgressBar } from '../ProgressBar';
import './Toast.css';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Type of toast message */
  type?: 'success' | 'error' | 'warning' | 'info' | 'syncing';
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
  /** Progress value (0-100) for upload/process toasts */
  progress?: number;
  /** Show progress bar instead of countdown timer */
  showProgress?: boolean;
  /** Time remaining text (e.g., "7 seconds remaining") */
  timeRemaining?: string;
}

const ICONS = {
  success: '\uEF31', // checkmark icon from MusescoreIcon
  error: '\uE801',   // error icon
  warning: '\uE802', // warning icon
  info: '\uE803',    // info icon
  upload: '\uEF25',  // upload icon
  syncing: '\uF450', // cloud-sync icon
};

export function Toast({
  id,
  type = 'info',
  title,
  description,
  actions,
  duration = 0,
  onDismiss,
  showCloseButton = true,
  progress: externalProgress,
  showProgress = false,
  timeRemaining,
}: ToastProps) {
  const [timerProgress, setTimerProgress] = React.useState(100);

  React.useEffect(() => {
    if (duration === 0 || showProgress) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setTimerProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, showProgress]);

  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="polite">
      <div className="toast__body">
        {/* Icon */}
        <div className="toast__icon">
          {type === 'syncing' ? ICONS.syncing : showProgress ? ICONS.upload : ICONS[type]}
        </div>

        {/* Content */}
        <div className="toast__content">
          {showProgress ? (
            /* Progress toast layout */
            <>
              <div className="toast__title">{title}</div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%'
              }}>
                <ProgressBar value={externalProgress || 0} width="100%" />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: '16px',
                  color: 'var(--text-txt-secondary, rgba(20, 21, 26, 0.75))'
                }}>
                  <span>{timeRemaining || ''}</span>
                  <span>{externalProgress}%</span>
                </div>
              </div>
            </>
          ) : (
            /* Regular toast layout */
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Timer progress bar (for non-progress toasts) */}
      {!showProgress && duration > 0 && (
        <div className="toast__progress-bar">
          <div
            className="toast__progress-fill"
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default Toast;
