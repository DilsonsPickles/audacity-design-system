/**
 * ToastContainer Component
 *
 * Container that positions and manages multiple toast notifications.
 * Positioned 80px from bottom and 80px from right edge.
 */

import React, { useEffect, useState } from 'react';
import { Toast, ToastProps } from './Toast';
import './ToastContainer.css';

export interface ToastContainerProps {
  /** Maximum number of toasts to display at once */
  maxToasts?: number;
  /** Position of the container */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** For a TOP position: the stack's top edge in px from the viewport's
   *  top (default 16) — a host pins it under its toolbar */
  top?: number;
}

interface ManagedToast extends ToastProps {
  id: string;
  exiting?: boolean;
}

let toastId = 0;
const listeners: Set<(toasts: ManagedToast[]) => void> = new Set();
let toasts: ManagedToast[] = [];

function emitChange() {
  listeners.forEach((listener) => listener([...toasts]));
}

export const toast = {
  success(title: string, description?: string, actions?: ToastProps['actions'], duration = 5000) {
    return this.show({ type: 'success', title, description, actions, duration });
  },

  error(title: string, description?: string, actions?: ToastProps['actions'], duration = 0) {
    return this.show({ type: 'error', title, description, actions, duration });
  },

  warning(title: string, description?: string, actions?: ToastProps['actions'], duration = 5000) {
    return this.show({ type: 'warning', title, description, actions, duration });
  },

  info(title: string, description?: string, actions?: ToastProps['actions'], duration = 5000) {
    return this.show({ type: 'info', title, description, actions, duration });
  },

  show(props: Omit<ToastProps, 'id' | 'onDismiss'> & { duration?: number }) {
    const id = `toast-${++toastId}`;
    const newToast: ManagedToast = {
      ...props,
      id,
      onDismiss: () => this.dismiss(id),
    };

    toasts = [...toasts, newToast];
    emitChange();

    // The toast runs its own countdown (paused while hovered or focused)
    // and calls onDismiss when it runs out — Toast.tsx
    return id;
  },

  dismiss(id: string) {
    if (!toasts.some((t) => t.id === id && !t.exiting)) return;
    // Mark as exiting for animation
    toasts = toasts.map((t) =>
      t.id === id ? { ...t, exiting: true } : t
    );
    emitChange();

    // Remove after animation completes
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      emitChange();
    }, 200); // Match animation duration
  },

  dismissAll() {
    toasts = [];
    emitChange();
  },

  progress(title: string, description?: string, initialProgress = 0) {
    const id = this.show({
      type: 'info',
      title,
      description,
      showProgress: true,
      progress: initialProgress,
      duration: 0, // Don't auto-dismiss
    });
    return id;
  },

  syncing(title: string = 'Syncing to audio.com...', initialProgress = 0) {
    const id = this.show({
      type: 'syncing',
      title,
      showProgress: true,
      progress: initialProgress,
      duration: 0, // Don't auto-dismiss
    });
    return id;
  },

  updateProgress(id: string, progress: number, timeRemaining?: string) {
    toasts = toasts.map((t) =>
      t.id === id ? { ...t, progress, timeRemaining } : t
    );
    emitChange();
  },
};

export function ToastContainer({
  maxToasts = 5,
  position = 'bottom-right',
  top,
}: ToastContainerProps) {
  const [currentToasts, setCurrentToasts] = useState<ManagedToast[]>([]);

  useEffect(() => {
    listeners.add(setCurrentToasts);
    return () => {
      listeners.delete(setCurrentToasts);
    };
  }, []);

  // Limit number of visible toasts
  const visibleToasts = currentToasts.slice(-maxToasts);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    // PINNED AT THE TOP, NEWEST AT THE BOTTOM (2026-11-02, "the goal of
    // the change was to make the 'X' button position a bit more consistent
    // so it's easy to delete them all"): the × sits in each toast's header,
    // so with the stack's TOP edge fixed, closing the top toast slides the
    // next one up into the same place — the × lands under the pointer
    // again, whatever the toasts' heights — and a toast arriving mid-clear
    // joins at the bottom, never under the pointer unread.
    <div
      className={`toast-container toast-container--${position}`}
      style={top !== undefined && position.startsWith('top') ? { top } : undefined}
    >
      {visibleToasts.map((toastProps) => (
        <div
          key={toastProps.id}
          className={toastProps.exiting ? 'toast-wrapper toast-wrapper--exiting' : 'toast-wrapper'}
        >
          <Toast {...toastProps} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
