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
   * Callback fired when resize ends
   */
  onResizeEnd?: () => void;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Whether to add top margin (for first item spacing)
   */
  isFirstPanel?: boolean;
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
}) => {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCursor, setResizeCursor] = useState(false);
  const resizeStartRef = useRef<{ y: number; height: number } | null>(null);

  // Add document-level event listeners for dragging beyond component bounds
  useEffect(() => {
    if (!isResizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        const deltaY = e.clientY - resizeStartRef.current.y;
        let newHeight = resizeStartRef.current.height + deltaY;

        // Apply constraints
        newHeight = Math.max(minHeight, newHeight);
        if (maxHeight !== undefined) {
          newHeight = Math.min(maxHeight, newHeight);
        }

        setHeight(newHeight);
        onHeightChange?.(newHeight);
      }
    };

    const handleDocumentMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      onResizeEnd?.();
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
      const topPadding = isFirstPanel ? 2 : 0;
      const panelHeight = topPadding + height;

      let inResizeZone = false;

      if (resizeEdge === 'bottom' || resizeEdge === 'both') {
        const bottomResizeStart = panelHeight - resizeThreshold;
        inResizeZone = y >= bottomResizeStart && y <= panelHeight;
      }

      if (!inResizeZone && (resizeEdge === 'top' || resizeEdge === 'both')) {
        const topResizeEnd = topPadding + resizeThreshold;
        inResizeZone = y >= topPadding && y <= topResizeEnd;
      }

      setResizeCursor(inResizeZone);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const topPadding = isFirstPanel ? 2 : 0;
    const panelHeight = topPadding + height;

    let inResizeZone = false;

    if (resizeEdge === 'bottom' || resizeEdge === 'both') {
      const bottomResizeStart = panelHeight - resizeThreshold;
      inResizeZone = y >= bottomResizeStart && y <= panelHeight;
    }

    if (!inResizeZone && (resizeEdge === 'top' || resizeEdge === 'both')) {
      const topResizeEnd = topPadding + resizeThreshold;
      inResizeZone = y >= topPadding && y <= topResizeEnd;
    }

    if (inResizeZone) {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = { y: e.clientY, height };
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
        marginTop: isFirstPanel ? '2px' : '0',
        marginBottom: '2px',
        position: 'relative',
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
