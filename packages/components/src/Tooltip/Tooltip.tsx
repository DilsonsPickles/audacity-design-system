import React from 'react';
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
  if (!visible) return null;

  return (
    <div
      className="tooltip"
      style={{
        left: `${x}px`,
        top: `${y + offset}px`,
      }}
    >
      {content}
    </div>
  );
};

export default Tooltip;
