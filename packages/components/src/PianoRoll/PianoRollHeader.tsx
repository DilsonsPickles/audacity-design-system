import React, { useState, useCallback } from 'react';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { GhostButton } from '../GhostButton/GhostButton';
import { HEADER_HEIGHT } from './constants';
import type { PianoRollHeaderProps } from './types';

const RESIZE_ZONE = 4; // px from top edge that triggers resize cursor

export const PianoRollHeader: React.FC<PianoRollHeaderProps> = ({
  onClose,
  onMenuClick,
  onResizeStart,
}) => {
  const { theme } = useTheme();
  const [inResizeZone, setInResizeZone] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!onResizeStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const localY = e.clientY - rect.top;
    setInResizeZone(localY <= RESIZE_ZONE);
  }, [onResizeStart]);

  const handleMouseLeave = useCallback(() => {
    setInResizeZone(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (inResizeZone && onResizeStart) {
      onResizeStart(e);
    }
  }, [inResizeZone, onResizeStart]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px',
        background: theme.background.surface.default,
        borderBottom: `1px solid ${theme.border.onElevated}`,
        height: HEADER_HEIGHT,
        flexShrink: 0,
        cursor: inResizeZone ? 'ns-resize' : 'default',
      }}
    >
      <span
        style={{
          color: theme.foreground.text.primary,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        Piano roll
      </span>

      <GhostButton
        icon="menu"
        size="tiny"
        onClick={onMenuClick ?? onClose}
        ariaLabel="Piano roll options"
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {onClose && (
        <GhostButton
          icon="close"
          size="tiny"
          onClick={onClose}
          ariaLabel="Close piano roll"
        />
      )}
    </div>
  );
};
