import React, { ReactNode } from 'react';
import './SidePanel.css';

export interface SidePanelProps {
  /**
   * Panel position
   */
  position?: 'left' | 'right';

  /**
   * Panel width in pixels
   */
  width?: number;

  /**
   * Whether the panel is resizable
   */
  resizable?: boolean;

  /**
   * Minimum width when resizing (px)
   */
  minWidth?: number;

  /**
   * Maximum width when resizing (px)
   */
  maxWidth?: number;

  /**
   * Panel content
   */
  children: ReactNode;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * Inline styles (for CSS custom properties)
   */
  style?: React.CSSProperties;

  /**
   * Called continuously while the panel is dragged (live width)
   */
  onResize?: (width: number) => void;

  /**
   * Called once when a resize drag ends (the committed width) — the
   * place to persist, so dragging doesn't thrash storage per pixel.
   */
  onResizeEnd?: (width: number) => void;

  /**
   * Double-clicking the resize handle restores this width (the app's
   * resize-edge convention). Omit to disable the reset.
   */
  defaultWidth?: number;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  position = 'left',
  width = 200,
  resizable = true,
  minWidth = 150,
  maxWidth = 400,
  children,
  className = '',
  style,
  onResize,
  onResizeEnd,
  defaultWidth,
}) => {
  const [currentWidth, setCurrentWidth] = React.useState(width);
  const [isResizing, setIsResizing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const latestWidthRef = React.useRef(currentWidth);

  // Adopt an externally-changed width (e.g. a persisted value loading,
  // or a reset) while we're not mid-drag, so the panel stays controlled.
  React.useEffect(() => {
    if (!isResizing) setCurrentWidth(width);
  }, [width, isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsResizing(true);
  };

  // Double-click the handle → back to the default width (the app's
  // resize-edge reset convention).
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!resizable || defaultWidth === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(false);
    latestWidthRef.current = defaultWidth;
    setCurrentWidth(defaultWidth);
    onResize?.(defaultWidth);
    onResizeEnd?.(defaultWidth);
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      let newWidth: number;

      if (position === 'left') {
        newWidth = e.clientX - rect.left;
      } else {
        newWidth = rect.right - e.clientX;
      }

      // Clamp width between min and max
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      latestWidthRef.current = newWidth;
      setCurrentWidth(newWidth);
      onResize?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResizeEnd?.(latestWidthRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position, minWidth, maxWidth, onResize, onResizeEnd]);

  return (
    <div
      ref={panelRef}
      className={`side-panel side-panel--${position} ${isResizing ? 'side-panel--resizing' : ''} ${className}`}
      style={{ width: currentWidth, ...style }}
    >
      <div className="side-panel__content">
        {children}
      </div>

      {resizable && (
        <div
          className={`side-panel__resize-handle side-panel__resize-handle--${position}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          title={defaultWidth !== undefined ? 'Drag to resize · double-click to reset' : undefined}
        />
      )}
    </div>
  );
};

export default SidePanel;
