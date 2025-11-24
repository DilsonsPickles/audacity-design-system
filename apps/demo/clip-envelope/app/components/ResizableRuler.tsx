'use client';

import { useState, useRef, useEffect } from 'react';
import Ruler from './Ruler';

interface ResizableRulerProps {
  isFocused: boolean;
  height: number;
  onClick: () => void;
  onHeightChange: (newHeight: number) => void;
}

export default function ResizableRuler({
  isFocused,
  height,
  onClick,
  onHeightChange,
}: ResizableRulerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCursor, setResizeCursor] = useState(false);
  const resizeStartRef = useRef<{ y: number; height: number } | null>(null);

  // Add document-level event listeners for dragging beyond component bounds
  useEffect(() => {
    if (!isResizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        const deltaY = e.clientY - resizeStartRef.current.y;
        const newHeight = Math.max(44, resizeStartRef.current.height + deltaY);
        onHeightChange(newHeight);
      }
    };

    const handleDocumentMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isResizing, onHeightChange]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing) {
      // Check if hovering over the gap
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      // Gap is at the bottom 2px (after the 2px top margin + track height)
      const inGap = y >= 2 + height && y < 2 + height + 2;
      setResizeCursor(inGap);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    // Check if clicking in the bottom gap
    const inGap = y >= 2 + height && y < 2 + height + 2;

    if (inGap) {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = { y: e.clientY, height };
    }
  };

  const handleMouseLeave = () => {
    if (!isResizing) {
      setResizeCursor(false);
    }
  };

  return (
    <div
      style={{ cursor: resizeCursor ? 'ns-resize' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
    >
      <Ruler
        isFocused={isFocused}
        height={height}
        onClick={onClick}
      />
    </div>
  );
}
