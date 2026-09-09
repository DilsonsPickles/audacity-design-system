import React from 'react';
import { PanelHeader, type PanelHeaderTab } from '../PanelHeader';
import { useTheme } from '../ThemeProvider';
import './FloatingPanel.css';

export interface FloatingPanelProps {
  /** Tabs shown in the panel header (typically one) */
  tabs: PanelHeaderTab[];
  /** ID of the currently active tab */
  activeTabId: string;
  /** Called when a tab is clicked */
  onTabChange?: (tabId: string) => void;
  /** Called when the active tab's ellipsis menu button is clicked */
  onMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Called when the close button is clicked */
  onClose?: () => void;
  /** Initial top-left position; defaults to viewport-centered */
  initialPosition?: { x: number; y: number };
  /** Initial panel width in pixels */
  width?: number;
  /** Initial panel height in pixels */
  height?: number;
  /** Whether the panel is resizable from its edges/corners. @default true */
  resizable?: boolean;
  /** Minimum size when resizing (px) */
  minWidth?: number;
  minHeight?: number;
  /** Maximum size when resizing (px) */
  maxWidth?: number;
  maxHeight?: number;
  /** Additional CSS class */
  className?: string;
  /** Content of the active tab */
  children: React.ReactNode;
}

// Keep at least this much of the panel reachable when dragged off-screen.
const DRAG_MARGIN = 80;

type ResizeEdge = 'e' | 'w' | 's' | 'se' | 'sw';

/**
 * FloatingPanel — a free-floating, non-modal panel host. Pairs the same
 * PanelHeader used by DockPanel (tabs, ellipsis menu, close) with a
 * fixed-position, header-draggable window, so a panel like Macros can
 * float over the editor or dock to a side with identical chrome.
 * Sits above docks but below dialogs and context menus (which are 10000).
 */
export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onMenuClick,
  onClose,
  initialPosition,
  width: initialWidth = 280,
  height: initialHeight = 420,
  resizable = true,
  minWidth = 220,
  minHeight = 240,
  maxWidth = 640,
  maxHeight = 800,
  className = '',
  children,
}) => {
  const { theme } = useTheme();

  const [size, setSize] = React.useState({ width: initialWidth, height: initialHeight });
  const [position, setPosition] = React.useState(() => initialPosition ?? {
    x: Math.max(16, Math.round((window.innerWidth - initialWidth) / 2)),
    y: Math.max(16, Math.round((window.innerHeight - initialHeight) / 2)),
  });
  const { width, height } = size;

  // Window drag by the header. Self-cleaning attach-on-mousedown handlers
  // (no ref-mirror needed): the origin position is captured per drag and
  // only this drag mutates it.
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Header buttons (menu, close) keep their click behavior
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = position;
    const onMouseMove = (ev: MouseEvent) => {
      setPosition({
        x: Math.min(
          window.innerWidth - DRAG_MARGIN,
          Math.max(DRAG_MARGIN - width, origin.x + ev.clientX - startX),
        ),
        y: Math.min(
          window.innerHeight - DRAG_MARGIN / 2,
          Math.max(0, origin.y + ev.clientY - startY),
        ),
      });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Edge/corner resize — same self-cleaning listener pattern as the move
  // drag. West handles compensate x so the right edge stays put.
  const handleResizeMouseDown = (edge: ResizeEdge) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...position, ...size };
    const clampW = (w: number) => Math.min(maxWidth, Math.max(minWidth, w));
    const clampH = (h: number) => Math.min(maxHeight, Math.max(minHeight, h));
    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const next = { x: origin.x, width: origin.width, height: origin.height };
      if (edge === 'e' || edge === 'se') next.width = clampW(origin.width + dx);
      if (edge === 'w' || edge === 'sw') {
        next.width = clampW(origin.width - dx);
        next.x = origin.x + (origin.width - next.width);
      }
      if (edge === 's' || edge === 'se' || edge === 'sw') next.height = clampH(origin.height + dy);
      setSize({ width: next.width, height: next.height });
      if (next.x !== origin.x) setPosition((prev) => ({ ...prev, x: next.x }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const style = {
    left: position.x,
    top: position.y,
    width,
    height,
    '--floating-bg': theme.background.surface.default,
    '--floating-border': theme.border.default,
  } as React.CSSProperties;

  return (
    <div
      className={`floating-panel ${className}`}
      style={style}
      role="dialog"
      aria-modal="false"
      aria-label={tabs.find((t) => t.id === activeTabId)?.label}
    >
      <div className="floating-panel__header" onMouseDown={handleHeaderMouseDown}>
        <PanelHeader
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onMenuClick={onMenuClick}
          onClose={onClose}
        />
      </div>
      <div className="floating-panel__content">
        {children}
      </div>
      {resizable && (
        <>
          <div className="floating-panel__resize floating-panel__resize--e" onMouseDown={handleResizeMouseDown('e')} />
          <div className="floating-panel__resize floating-panel__resize--w" onMouseDown={handleResizeMouseDown('w')} />
          <div className="floating-panel__resize floating-panel__resize--s" onMouseDown={handleResizeMouseDown('s')} />
          <div className="floating-panel__resize floating-panel__resize--se" onMouseDown={handleResizeMouseDown('se')} />
          <div className="floating-panel__resize floating-panel__resize--sw" onMouseDown={handleResizeMouseDown('sw')} />
        </>
      )}
    </div>
  );
};

export default FloatingPanel;
