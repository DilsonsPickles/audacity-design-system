import React, { useState, useRef, useEffect } from 'react';
import './ResizablePanel.css';

// 71 (slider just fits) and 112 (effect button has breathing room) bracket
// a forbidden range — there's no valid layout between them, because the
// slider would be visible without the effect button having any space.
// Enforced by the mouseup snap (bounce back) and the wheel resize (detent).
const FORBIDDEN_LOW = 71;
const FORBIDDEN_HIGH = 112;

export interface ResizablePanelProps {
  /**
   * Content to be rendered inside the resizable panel
   */
  children: React.ReactNode;
  /**
   * Initial height of the panel in pixels
   */
  initialHeight?: number;
  /**
   * Minimum height the panel can be resized to
   */
  minHeight?: number;
  /**
   * Maximum height the panel can be resized to
   */
  maxHeight?: number;
  /**
   * Which edge(s) can be used to resize
   */
  resizeEdge?: 'top' | 'bottom' | 'both';
  /**
   * Size of the resize zone in pixels (distance from edge)
   */
  resizeThreshold?: number;
  /**
   * Callback fired when height changes during resize
   */
  onHeightChange?: (height: number) => void;
  /**
   * Callback fired when resize starts
   */
  onResizeStart?: () => void;
  /**
   * Callback fired when resize ends. Receives the final committed
   * height so consumers can dispatch the global state update once per
   * gesture instead of on every mousemove.
   */
  onResizeEnd?: (finalHeight: number) => void;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Whether to add top margin (for first item spacing)
   */
  isFirstPanel?: boolean;
  /**
   * Additional inline styles for the container
   */
  style?: React.CSSProperties;
  /**
   * Cmd/Ctrl + scroll wheel over the panel resizes it (scroll/swipe up =
   * taller) — the same modifier as canvas zoom, so it reads as "zoom the
   * track". Uses the same height plumbing as drag resize.
   */
  wheelResize?: boolean;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  initialHeight = 114,
  minHeight = 44,
  maxHeight,
  resizeEdge = 'bottom',
  resizeThreshold = 8,
  onHeightChange,
  onResizeStart,
  onResizeEnd,
  className = '',
  isFirstPanel = false,
  style: externalStyle,
  wheelResize = false,
}) => {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCursor, setResizeCursor] = useState(false);
  const resizeStartRef = useRef<{ y: number; height: number; edge: 'top' | 'bottom' } | null>(null);
  // Mirror of `height` for handlers that need the latest value without
  // re-subscribing. Updated synchronously inside the drag and spring
  // handlers (event-handler writes to refs are safe), so the mouseup
  // listener never picks up a stale value when it evaluates snaps.
  const latestHeightRef = useRef(height);
  // Frozen "home" height — captured on first mount. The parent passes
  // a live track height as `initialHeight` (because the panel is
  // re-rendered as state.tracks[i].height changes), but for the snap
  // target we want the original default, otherwise the home snap is
  // always equal to the released value and the spring never fires.
  const homeHeightRef = useRef(initialHeight);
  // Tracks a running release-spring animation so a new resize gesture
  // cancels it cleanly.
  const snapAnimationRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Cmd/Ctrl+wheel resize — attached natively with { passive: false }
  // because React's root-delegated onWheel is passive, so preventDefault()
  // there is ignored and the surrounding list would scroll while resizing.
  // Bound once; live prop values are read through a ref-mirror.
  const wheelDepsRef = useRef({ minHeight, maxHeight, onHeightChange });
  useEffect(() => {
    wheelDepsRef.current = { minHeight, maxHeight, onHeightChange };
  }, [minHeight, maxHeight, onHeightChange]);

  // Sub-pixel remainder between wheel events, so gentle trackpad deltas
  // (well under 1px after the resistance factor) accumulate instead of
  // being rounded away. Dropped whenever a clamp or the detent fires.
  const wheelAccRef = useRef(0);

  useEffect(() => {
    if (!wheelResize) return;
    const el = rootRef.current;
    if (!el) return;

    // Resistance: half the raw wheel delta, capped per event so momentum
    // flicks ramp instead of teleporting. Tuned by feel.
    const WHEEL_SENSITIVITY = 0.5;
    const WHEEL_MAX_STEP = 24;

    const handleWheel = (e: WheelEvent) => {
      if ((!e.metaKey && !e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (resizeStartRef.current) return; // an active drag owns the height
      e.preventDefault();
      if (snapAnimationRef.current !== null) {
        cancelAnimationFrame(snapAnimationRef.current);
        snapAnimationRef.current = null;
      }
      const { minHeight: min, maxHeight: max, onHeightChange: emit } = wheelDepsRef.current;
      const current = latestHeightRef.current;
      // deltaMode 1/2 are line/page deltas (non-pixel mice) — normalize.
      const raw = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const step = Math.max(-WHEEL_MAX_STEP, Math.min(WHEEL_MAX_STEP, raw * WHEEL_SENSITIVITY));
      const acc = wheelAccRef.current - step; // wheel/swipe up = taller
      const whole = Math.round(acc);
      wheelAccRef.current = acc - whole;
      if (whole === 0) return;
      let next = current + whole;
      // Step over the forbidden layout band in the direction of travel —
      // a detent, so every intermediate height is a valid layout.
      if (next > FORBIDDEN_LOW && next < FORBIDDEN_HIGH) {
        next = whole > 0 ? FORBIDDEN_HIGH : FORBIDDEN_LOW;
      }
      next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      const rounded = Math.round(next);
      if (rounded !== current + whole) wheelAccRef.current = 0; // clamped/detented
      if (rounded === current) return;
      latestHeightRef.current = rounded;
      setHeight(rounded);
      emit?.(rounded);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [wheelResize]);

  // Adopt EXTERNAL height changes (e.g. the Fit-to-height menu command
  // dispatching new track heights) — but never mid-gesture: internal state
  // stays authoritative while a drag or release-spring is running, and
  // self-initiated changes echo back as an equal initialHeight (no-op).
  useEffect(() => {
    if (isResizing || snapAnimationRef.current !== null) return;
    const target = Math.round(initialHeight);
    if (target !== latestHeightRef.current) {
      latestHeightRef.current = target;
      wheelAccRef.current = 0;
      setHeight(target);
    }
  }, [initialHeight, isResizing]);

  useEffect(() => {
    return () => {
      if (snapAnimationRef.current !== null) {
        cancelAnimationFrame(snapAnimationRef.current);
      }
    };
  }, []);

  /** Two-phase spring from `from` to `target`.
   *
   *  The natural overshoot of a damped sinusoid scales with the
   *  distance travelled, so a 4-pixel snap (e.g. 75 → 71) ends up
   *  with sub-pixel overshoot that's effectively invisible. Instead
   *  we drive the height in two cubic ease-out phases:
   *
   *    Phase 1 (35% of duration): from → target + sign · overshootPx
   *    Phase 2 (65% of duration): overshoot peak → target
   *
   *  `overshootPx` is clamped to [3, 8] px so every snap, large or
   *  small, gets a visible bounce without huge springs looking
   *  rubbery. Heights are quantised to whole pixels so the layout
   *  never thrashes on sub-pixel values, and consecutive frames with
   *  the same rounded value skip the React state update. */
  const springToTarget = (from: number, target: number) => {
    const SPRING_DURATION_MS = 260;
    const PHASE_1_PORTION = 0.35;
    const distance = target - from;
    const direction = Math.sign(distance) || 1;
    const overshootPx = Math.min(8, Math.max(3, Math.abs(distance) * 0.15));
    const overshootPeak = target + direction * overshootPx;
    const startTime = performance.now();
    let lastEmitted = Math.round(from);

    const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / SPRING_DURATION_MS, 1);
      let raw: number;
      if (t < PHASE_1_PORTION) {
        const p = t / PHASE_1_PORTION;
        raw = from + (overshootPeak - from) * easeOutCubic(p);
      } else if (t < 1) {
        const p = (t - PHASE_1_PORTION) / (1 - PHASE_1_PORTION);
        raw = overshootPeak + (target - overshootPeak) * easeOutCubic(p);
      } else {
        raw = target;
      }
      const rounded = Math.round(raw);

      if (t < 1) {
        if (rounded !== lastEmitted) {
          lastEmitted = rounded;
          latestHeightRef.current = rounded;
          setHeight(rounded);
          onHeightChange?.(rounded);
        }
        snapAnimationRef.current = requestAnimationFrame(tick);
      } else {
        latestHeightRef.current = target;
        setHeight(target);
        onHeightChange?.(target);
        onResizeEnd?.(target);
        snapAnimationRef.current = null;
      }
    };
    snapAnimationRef.current = requestAnimationFrame(tick);
  };

  // Add document-level event listeners for dragging beyond component bounds
  useEffect(() => {
    if (!isResizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        const deltaY = e.clientY - resizeStartRef.current.y;
        // For top-edge resize, dragging up (negative deltaY) should increase height
        let newHeight = resizeStartRef.current.edge === 'top'
          ? resizeStartRef.current.height - deltaY
          : resizeStartRef.current.height + deltaY;

        // Apply constraints
        newHeight = Math.max(minHeight, newHeight);
        if (maxHeight !== undefined) {
          newHeight = Math.min(maxHeight, newHeight);
        }

        // No snap-pull during the drag — the track follows the cursor
        // freely. Snap is deferred to mouseup and animated as a spring
        // (see handleDocumentMouseUp) for a "bounce home" feel.
        latestHeightRef.current = newHeight;
        setHeight(newHeight);
        onHeightChange?.(newHeight);
      }
    };

    const handleDocumentMouseUp = () => {
      setIsResizing(false);
      // Read the height the drag started from BEFORE clearing the ref,
      // so the anchor-bounce-back logic below can tell which side of
      // the forbidden range the user came from.
      const dragStartHeight = resizeStartRef.current?.height;
      resizeStartRef.current = null;
      const released = latestHeightRef.current;

      // FORBIDDEN_LOW/HIGH (see module top) bracket the invalid band.
      //
      // Inside the forbidden range, we bounce back to whichever side
      // the drag *started* from — not the midpoint. So a small tug
      // up from 71 settles back at 71; the user has to actually drag
      // close to 112 (i.e. out of the forbidden range) to commit to
      // the larger height.
      //
      // Outside the forbidden range, the regular closest-within-window
      // logic applies for 71, 112, and the home (initialHeight at mount).
      const SNAP_CATCH_WINDOW = 18;
      let nearest: number | null = null;

      if (released > FORBIDDEN_LOW && released < FORBIDDEN_HIGH) {
        // Anchor = whichever boundary the drag started closer to.
        // Fall back to midpoint rule if we somehow don't have a start
        // height (shouldn't happen but be safe).
        if (dragStartHeight !== undefined) {
          nearest =
            Math.abs(dragStartHeight - FORBIDDEN_LOW)
              <= Math.abs(dragStartHeight - FORBIDDEN_HIGH)
              ? FORBIDDEN_LOW
              : FORBIDDEN_HIGH;
        } else {
          nearest =
            released - FORBIDDEN_LOW <= FORBIDDEN_HIGH - released
              ? FORBIDDEN_LOW
              : FORBIDDEN_HIGH;
        }
      } else {
        let nearestDist = SNAP_CATCH_WINDOW;
        // Home is last so it wins ties against 112 — releasing right
        // next to the default height should rest at home, not at 112.
        for (const target of [FORBIDDEN_LOW, FORBIDDEN_HIGH, homeHeightRef.current]) {
          const dist = Math.abs(released - target);
          if (dist <= nearestDist) {
            nearest = target;
            nearestDist = dist;
          }
        }
      }

      if (nearest !== null && nearest !== released) {
        springToTarget(released, nearest);
      } else {
        onResizeEnd?.(released);
      }
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isResizing, minHeight, maxHeight, onHeightChange, onResizeEnd]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;

      let inResizeZone = false;

      if (resizeEdge === 'bottom' || resizeEdge === 'both') {
        const bottomResizeStart = height - resizeThreshold;
        inResizeZone = y >= bottomResizeStart && y <= height;
      }

      if (!inResizeZone && (resizeEdge === 'top' || resizeEdge === 'both')) {
        inResizeZone = y >= 0 && y <= resizeThreshold;
      }

      setResizeCursor(inResizeZone);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    let activeEdge: 'top' | 'bottom' | null = null;

    if (resizeEdge === 'bottom' || resizeEdge === 'both') {
      const bottomResizeStart = height - resizeThreshold;
      if (y >= bottomResizeStart && y <= height) {
        activeEdge = 'bottom';
      }
    }

    if (!activeEdge && (resizeEdge === 'top' || resizeEdge === 'both')) {
      if (y >= 0 && y <= resizeThreshold) {
        activeEdge = 'top';
      }
    }

    if (activeEdge) {
      e.preventDefault();
      e.stopPropagation();
      // If a release-spring is still animating from a previous drag,
      // cancel it so the new drag starts from the current value.
      if (snapAnimationRef.current !== null) {
        cancelAnimationFrame(snapAnimationRef.current);
        snapAnimationRef.current = null;
      }
      setIsResizing(true);
      resizeStartRef.current = { y: e.clientY, height, edge: activeEdge };
      onResizeStart?.();
    }
  };

  const handleMouseLeave = () => {
    if (!isResizing) {
      setResizeCursor(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`resizable-panel ${className}`}
      style={{
        position: 'relative',
        height: `${height}px`,
        ...externalStyle,
      }}
    >
      <div
        className={`resizable-panel__content ${resizeCursor ? 'resizable-panel__content--resize-cursor' : ''}`}
        style={{
          height: `${height}px`,
          cursor: resizeCursor ? 'ns-resize' : 'default',
          position: 'relative',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
};

export default ResizablePanel;
