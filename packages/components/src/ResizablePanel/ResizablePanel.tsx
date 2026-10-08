import React, { useState, useRef, useEffect } from 'react';
import './ResizablePanel.css';

// A track resizes FREELY between minHeight and maxHeight (user decision
// 2026-10-08, "remove all the resizing snap point logic from the track
// headers"): no snap points, no release spring, no wheel detent. Until
// then 71 and 112 bracketed a "forbidden" band of heights (the slider
// visible but the Effects button without room), the release sprang back
// to 71, 112 or the mount height within 18px, and Cmd+wheel stepped over
// the band. The panel's content lays itself out for whatever height it
// gets. ONE exception, the same day: "some very soft snapping when the
// track header passes its default size of 114px" — a magnet DURING THE
// DRAG only: within SOFT_SNAP_PX of `snapHeight` the height sticks to
// it, outside that it follows the cursor exactly; nothing happens on
// release, and the wheel passes through.
const SOFT_SNAP_PX = 4;

/** 'wheel' is Cmd/Ctrl+wheel, 'wheel-shift' Cmd/Ctrl+Shift+wheel — the
 *  consumer scopes them (one track / every track, 2026-10-08) */
export type ResizeSource = 'drag' | 'wheel' | 'wheel-shift';

/** The wheel resize's resistance: half the raw delta, capped per event
 *  so momentum flicks ramp instead of teleporting. Tuned by feel. */
export const WHEEL_SENSITIVITY = 0.5;
export const WHEEL_MAX_STEP = 24;

/** One wheel event's contribution to a height, in px, positive = taller
 *  (wheel/swipe up): the dominant axis — Shift turns a vertical wheel
 *  horizontal on macOS — in pixels (lines and pages normalised), through
 *  the resistance and cap. Shared with the canvas's Cmd+Shift+wheel. */
export function wheelHeightStep(e: { deltaX: number; deltaY: number; deltaMode: number }): number {
  const dominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  const raw = dominant * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
  return -Math.max(-WHEEL_MAX_STEP, Math.min(WHEEL_MAX_STEP, raw * WHEEL_SENSITIVITY));
}

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
  /** How a height change was made: the drag on the panel's edge, or the
   *  Cmd/Ctrl+wheel over it. The consumer scopes them differently (a
   *  track's wheel resize applies to EVERY track, 2026-10-08). */
  onHeightChange?: (height: number, source: ResizeSource) => void;
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
   * track"; with Shift too it reports 'wheel-shift', which the track
   * host applies to every track. Uses the same height plumbing as drag.
   */
  wheelResize?: boolean;
  /** Right-click on the panel (the row's context menu) */
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** The height a DRAG softly sticks to within SOFT_SNAP_PX (the track's
   *  default, 114); null for none */
  snapHeight?: number | null;
  /** Painted BEHIND the content, as a sibling of it: decoration that
   *  belongs to the row but must not be part of the resizable content
   *  (a track group's level boxes — TrackControlSidePanel). */
  underlay?: React.ReactNode;
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
  onContextMenu,
  snapHeight = 114,
  underlay,
}) => {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCursor, setResizeCursor] = useState(false);
  const resizeStartRef = useRef<{ y: number; height: number; edge: 'top' | 'bottom' } | null>(null);
  // Mirror of `height` for handlers that need the latest value without
  // re-subscribing. Updated synchronously inside the drag and wheel
  // handlers (event-handler writes to refs are safe), so the mouseup
  // listener never picks up a stale value.
  const latestHeightRef = useRef(height);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // ONE ref-mirror of the live props for every long-lived handler here
  // — the wheel listener and the drag listeners.
  // See CLAUDE.md: document-level listeners bind once and read changing
  // props through a ref, never through effect deps.
  //
  // The drag effect used to list onHeightChange/onResizeEnd directly.
  // TrackControlSidePanel passes those as inline arrows, so every
  // mousemove (-> onHeightChange -> parent re-render -> new identities)
  // tore down and re-bound the document listeners. A mouseup landing in
  // that window was dropped, `isResizing` stayed true, and the track
  // kept following the cursor after the button was released.
  const liveDepsRef = useRef({ minHeight, maxHeight, onHeightChange, onResizeEnd, snapHeight });
  useEffect(() => {
    liveDepsRef.current = { minHeight, maxHeight, onHeightChange, onResizeEnd, snapHeight };
  }, [minHeight, maxHeight, onHeightChange, onResizeEnd, snapHeight]);

  // Sub-pixel remainder between wheel events, so gentle trackpad deltas
  // (well under 1px after the resistance factor) accumulate instead of
  // being rounded away. Dropped whenever a clamp fires.
  const wheelAccRef = useRef(0);

  useEffect(() => {
    if (!wheelResize) return;
    const el = rootRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Cmd/Ctrl+wheel; Shift with it is the "every track" form (the
      // host's business — reported as the source). Alt is allowed
      // through for the host's Alt rule.
      if (!e.metaKey && !e.ctrlKey) return;
      if (resizeStartRef.current) return; // an active drag owns the height
      e.preventDefault();
      const { minHeight: min, maxHeight: max, onHeightChange: emit } = liveDepsRef.current;
      const current = latestHeightRef.current;
      const acc = wheelAccRef.current + wheelHeightStep(e);
      const whole = Math.round(acc);
      wheelAccRef.current = acc - whole;
      if (whole === 0) return;
      let next = current + whole;
      next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      const rounded = Math.round(next);
      if (rounded !== current + whole) wheelAccRef.current = 0; // clamped
      if (rounded === current) return;
      latestHeightRef.current = rounded;
      setHeight(rounded);
      emit?.(rounded, e.shiftKey ? 'wheel-shift' : 'wheel');
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [wheelResize]);

  // Adopt EXTERNAL height changes (e.g. the Fit-to-height menu command
  // dispatching new track heights) — but never mid-gesture: internal state
  // stays authoritative while a drag is running, and self-initiated
  // changes echo back as an equal initialHeight (no-op).
  useEffect(() => {
    if (isResizing) return;
    const target = Math.round(initialHeight);
    if (target !== latestHeightRef.current) {
      latestHeightRef.current = target;
      wheelAccRef.current = 0;
      setHeight(target);
    }
  }, [initialHeight, isResizing]);

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

        // Apply constraints (live values, read through the mirror)
        const { minHeight: min, maxHeight: max, snapHeight: snap } = liveDepsRef.current;
        newHeight = Math.max(min, newHeight);
        if (max !== undefined) {
          newHeight = Math.min(max, newHeight);
        }
        // The soft magnet at the default height (see the module top):
        // passing it, the track sticks for SOFT_SNAP_PX either side
        if (snap != null && Math.abs(newHeight - snap) <= SOFT_SNAP_PX) {
          newHeight = snap;
        }

        // Otherwise the track follows the cursor freely, and stays
        // where it is let go (no snap points — see the module top)
        latestHeightRef.current = newHeight;
        setHeight(newHeight);
        liveDepsRef.current.onHeightChange?.(newHeight, 'drag');
      }
    };

    const handleDocumentMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      liveDepsRef.current.onResizeEnd?.(latestHeightRef.current);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
    // ONLY isResizing: the listeners bind when a gesture starts and
    // unbind when it ends. Everything they need that changes mid-drag
    // is read from liveDepsRef, so a re-render can never swap the
    // listener that is waiting for mouseup.
  }, [isResizing]);

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
      onContextMenu={onContextMenu}
      style={{
        position: 'relative',
        height: `${height}px`,
        ...externalStyle,
      }}
    >
      {underlay}
      <div
        className={`resizable-panel__content ${resizeCursor ? 'resizable-panel__content--resize-cursor' : ''}`}
        style={{
          height: `${height}px`,
          cursor: resizeCursor ? 'ns-resize' : 'default',
          position: 'relative',
        }}
        onMouseMove={handleMouseMove}
        // CAPTURE phase: this element wraps the track panel, so in the
        // bubble phase the panel's own mousedown — which starts a
        // drag-REORDER — ran first, and a press on the resize edge both
        // resized the track and dragged it up and down. handleMouseDown
        // already stopped propagation, but as an ancestor it was
        // stopping it too late. Capturing lets the resize claim the
        // press before any descendant sees it.
        onMouseDownCapture={handleMouseDown}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
};

export default ResizablePanel;
