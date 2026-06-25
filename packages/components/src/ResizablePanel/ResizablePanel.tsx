import React, { useState, useRef, useEffect } from 'react';
import './ResizablePanel.css';

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
}) => {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCursor, setResizeCursor] = useState(false);
  const resizeStartRef = useRef<{ y: number; height: number; edge: 'top' | 'bottom' } | null>(null);
  // Mirror of `height` for handlers that need the latest value without
  // re-subscribing (the mouseup listener captures `height` once when it
  // installs, so without this ref it would commit the wrong value).
  const latestHeightRef = useRef(height);
  latestHeightRef.current = height;
  // Tracks a running release-spring animation so a new resize gesture
  // cancels it cleanly.
  const snapAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (snapAnimationRef.current !== null) {
        cancelAnimationFrame(snapAnimationRef.current);
      }
    };
  }, []);

  /** Spring the height from `from` to `target` with a small overshoot
   *  bounce. Calls onHeightChange on each frame and onResizeEnd once
   *  the spring settles. */
  const springToTarget = (from: number, target: number) => {
    const SPRING_DURATION_MS = 280;
    const distance = target - from;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / SPRING_DURATION_MS, 1);
      // Damped sinusoid — 1 - e^(-5t) · cos(10t).
      // At t=0 → 0 (start); first overshoot ~21% around t≈0.31;
      // decays to ~1 by t=1 with a tiny residual wobble.
      const eased = t >= 1 ? 1 : 1 - Math.exp(-5 * t) * Math.cos(10 * t);
      const current = from + distance * eased;
      setHeight(current);
      onHeightChange?.(current);
      if (t < 1) {
        snapAnimationRef.current = requestAnimationFrame(tick);
      } else {
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
        setHeight(newHeight);
        onHeightChange?.(newHeight);
      }
    };

    const handleDocumentMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      const released = latestHeightRef.current;

      // Pick the closest snap target inside the catch window. Targets:
      //  • 71  — slider just starts to fit
      //  • 102 — effect button just starts to fit on audio tracks
      //  • initialHeight — the track's default ("home") height
      const SNAP_CATCH_WINDOW = 14;
      const snapTargets = [71, 102, initialHeight];
      let nearest: number | null = null;
      let nearestDist = SNAP_CATCH_WINDOW;
      for (const target of snapTargets) {
        const dist = Math.abs(released - target);
        if (dist < nearestDist) {
          nearest = target;
          nearestDist = dist;
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
