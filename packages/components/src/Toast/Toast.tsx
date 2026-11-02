/**
 * Toast Component
 *
 * THE FIGMA TOAST (01 - Audacity Component library, 14451:104384;
 * 2026-11-02, "the key is two heights, 64 and 128... look at the
 * different variants too"): a 400px card, 8px corners, the Elevation 03
 * shadow, in three bands —
 *
 *   HEADER (32): the type's icon, the title in semibold, and a close ×
 *     (the small ghost icon button) on every toast.
 *   BODY: one line of description on a COMPACT toast (64 in all), or on a
 *     TALL toast (128 in all) a 56px band holding up to two lines of
 *     description, or the progress bar over "… remaining" / "50%".
 *   FOOTER (tall only, 40): two equal buttons — the toast's action(s),
 *     then Dismiss.
 *
 * A toast is TALL when it has actions or shows progress, COMPACT
 * otherwise; a compact toast that dismisses itself wears a 6px TIMER
 * STRIP across its foot, edge to edge. A TALL TOAST NEVER DISMISSES
 * ITSELF — the design draws no timer on one, and buttons that vanish
 * before they can be reached are a trap; Dismiss and × close it (a
 * progress toast is closed by its host when the work ends).
 *
 * THE HEIGHTS ARE TARGETS FOR THE COPY, NOT A CLIP (the same day: "how do
 * they ever see the truncated text"): text is never cut off — a toast
 * vanishes on its own, so hidden text could never be read; a description
 * that runs past its lines logs a warning naming the toast, and the toast
 * grows rather than hiding it.
 *
 * THE SET, ON THE 8PX GRID (the same day, "we can't have that 48px one…
 * we don't need to be ruthless on size now that they're showing from the
 * top right… a nice set that obey our 8px grid"): every line of text —
 * description or a wrapped title — is 16px, so a toast grows in 16s from
 * its base:
 *
 *   COMPACT, persistent or timed: 64 (one line), 80 (two — the most the
 *     copy is written for, ≈ 60 characters a line). A title-only toast
 *     keeps its line's room: 64 is the floor, never 48.
 *   TALL (buttons): 128 (up to two lines), 136 (three, the most).
 *   PROGRESS: 128.
 *
 * THE COUNTDOWN PAUSES while the pointer is over the toast or the
 * keyboard focus is in it, so there is always time to read it and reach
 * its buttons (WCAG 2.2.1, Timing Adjustable). The toast owns its timer
 * and calls `onDismiss` when it runs out.
 */

import React from 'react';
import { useTheme } from '../ThemeProvider';
import { ProgressBar } from '../ProgressBar';
import { GhostButton } from '../GhostButton';
import { Button } from '../Button';
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
  /** Optional action buttons — a toast with any is TALL (128), with Dismiss beside them */
  actions?: ToastAction[];
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Callback when toast is dismissed — the ×, Dismiss, or the timer running out */
  onDismiss?: () => void;
  /** Show the header's close × (default true) */
  showCloseButton?: boolean;
  /** Progress value (0-100) for upload/process toasts */
  progress?: number;
  /** Show the progress bar — a TALL toast */
  showProgress?: boolean;
  /** The progress row's left text (e.g. "7 seconds remaining") */
  timeRemaining?: string;
  /** A ROW of the notification centre's one card: no card of its own (no
   *  shadow, corners or width) — the panel draws those (2026-11-02) */
  embedded?: boolean;
  /** Announce it to screen readers (default true) — an archived row was
   *  announced when it arrived */
  announce?: boolean;
}

/** The MusescoreIcon glyph for each type (the Figma frames: \uEF31 the
 *  check, \uF450 the cloud sync). Warning, error and info are the font's
 *  outline triangle, crossed circle and circled i, the check's weight —
 *  they were \uE801–\uE803 until 2026-11-02, code points the font does not
 *  have, so those toasts drew no icon at all */
const ICONS = {
  success: '\uEF31',
  error: '\uF3D0',
  warning: '\uF3CE',
  info: '\uF3CF',
  upload: '\uEF25',
  syncing: '\uF450',
};

/** Lines of description each height holds — the copy is written to fit */
const COMPACT_LINES = 2;
const TALL_LINES = 3;
const LINE_HEIGHT_PX = 16;

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
  embedded = false,
  announce = true,
}: ToastProps) {
  const { theme } = useTheme();
  const tall = showProgress || (actions?.length ?? 0) > 0;
  const timed = !tall && duration > 0;
  const countdown = timed ? duration : 0;

  // The countdown: elapsed time accrues only while nothing holds the toast
  // (the pointer over it, or the focus in it)
  const [elapsed, setElapsed] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const paused = hovered || focusWithin;
  const onDismissRef = React.useRef(onDismiss);
  React.useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  React.useEffect(() => {
    if (countdown <= 0 || paused) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const step = now - last;
      last = now;
      let done = false;
      setElapsed((prev) => {
        const next = Math.min(countdown, prev + step);
        done = next >= countdown;
        return next;
      });
      if (done) { onDismissRef.current?.(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [countdown, paused]);
  const timerPercent = countdown > 0 ? (elapsed / countdown) * 100 : 0;

  // Copy that runs past its lines: say so, naming the toast — the toast
  // grows to show it, never clips it
  const descriptionRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    const lines = Math.round(el.scrollHeight / LINE_HEIGHT_PX);
    const allowed = tall ? TALL_LINES : COMPACT_LINES;
    if (lines > allowed) {
      console.warn(`Toast "${title}": the description runs to ${lines} lines; a ${tall ? 'tall' : 'compact'} toast is written for up to ${allowed}. Shorten the copy.`);
    }
  }, [description, tall, title]);

  const style = {
    '--toast-bg': theme.background.surface.default,
    '--toast-shadow': '0px 10px 30px 0px rgba(20, 21, 26, 0.3)',
    '--toast-icon-color': theme.foreground.text.primary,
    '--toast-title-color': theme.foreground.text.primary,
    '--toast-description-color': theme.foreground.text.secondary,
    '--toast-timer-track': theme.background.surface.elevated,
    '--toast-timer-fill': theme.accent.primary,
  } as React.CSSProperties;

  const variant = tall ? (showProgress ? 'progress' : 'message') : timed ? 'compact-timed' : 'compact';
  const icon = type === 'syncing' ? ICONS.syncing : showProgress ? ICONS.upload : ICONS[type];

  return (
    <div
      className={`toast toast--${type}${embedded ? ' toast--embedded' : ''}`}
      data-toast-id={id}
      data-toast-variant={variant}
      data-paused={paused && countdown > 0 ? 'true' : undefined}
      role={announce ? (type === 'error' ? 'alert' : 'status') : undefined}
      aria-live={announce ? (type === 'error' ? 'assertive' : 'polite') : undefined}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
      }}
    >
      <div className="toast__header">
        <div className="toast__heading">
          <span className="toast__icon" aria-hidden="true">{icon}</span>
          <span className="toast__title">{title}</span>
        </div>
        {showCloseButton && (
          <GhostButton
            icon="close"
            size="small"
            ariaLabel="Dismiss notification"
            className="toast__close"
            onClick={() => onDismiss?.()}
          />
        )}
      </div>

      {showProgress ? (
        <div className="toast__body toast__body--progress">
          <ProgressBar value={externalProgress || 0} width="100%" />
          <div className="toast__progress-row">
            <span>{timeRemaining || ''}</span>
            <span>{Math.round(externalProgress || 0)}%</span>
          </div>
        </div>
      ) : (
        <div className={`toast__body toast__body--${variant}`}>
          {description && (
            <div ref={descriptionRef} className="toast__description">{description}</div>
          )}
        </div>
      )}

      {tall && (
        <div className="toast__footer">
          {actions?.map((action, index) => (
            <Button key={index} variant="secondary" className="toast__button" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
          <Button variant="secondary" className="toast__button" onClick={() => onDismiss?.()}>
            Dismiss
          </Button>
        </div>
      )}

      {timed && (
        <div className="toast__timer" aria-hidden="true">
          <div className="toast__timer-fill" style={{ width: `${timerPercent}%` }} />
        </div>
      )}
    </div>
  );
}

export default Toast;
