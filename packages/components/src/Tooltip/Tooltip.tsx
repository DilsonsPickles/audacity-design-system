import React from 'react';
import { useTheme } from '../ThemeProvider';
import './Tooltip.css';

export interface TooltipProps {
  /** Tooltip text content */
  content: string;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Whether tooltip is visible */
  visible?: boolean;
  /** Offset from cursor/target (default: 8px) */
  offset?: number;
}

/**
 * Tooltip - A floating tooltip component
 *
 * Displays contextual information near a target position.
 * Typically shown on hover or when additional context is needed.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  x,
  y,
  visible = true,
  offset = 8,
}) => {
  const { theme } = useTheme();

  const style = {
    '--tooltip-bg': theme.foreground.text.primary,
    '--tooltip-text': theme.background.surface.elevated,
    '--tooltip-shadow': '0 2px 8px rgba(0, 0, 0, 0.3)',
  } as React.CSSProperties;

  if (!visible) return null;

  return (
    <div
      className="tooltip"
      style={{
        left: `${x}px`,
        top: `${y + offset}px`,
        ...style,
      }}
    >
      {content}
    </div>
  );
};

export default Tooltip;
