import React, { useRef, useState, useEffect } from 'react';
import './CustomScrollbar.css';

interface CustomScrollbarProps {
  /** Ref to the scrollable content container */
  contentRef: React.RefObject<HTMLDivElement>;
  /** Width of the scrollbar */
  width?: number;
  /** Height of the scrollbar */
  height?: number;
  /** Orientation */
  orientation: 'horizontal' | 'vertical';
  /** Additional class name */
  className?: string;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  contentRef,
  width = 14,
  height = 14,
  orientation,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbSize, setThumbSize] = useState(0);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragStartRef = useRef({ mousePos: 0, scrollPos: 0 });

  const isHorizontal = orientation === 'horizontal';

  // Calculate thumb size and position based on content scroll state
  const updateThumb = () => {
    if (!contentRef.current) return;

    const content = contentRef.current;

    // Update container size
    setContainerSize({
      width: content.clientWidth,
      height: content.clientHeight,
    });

    if (isHorizontal) {
      const contentWidth = content.scrollWidth;
      const viewportWidth = content.clientWidth;
      const scrollLeft = content.scrollLeft;

      if (contentWidth <= viewportWidth) {
        setThumbSize(0); // Hide scrollbar if content fits
        return;
      }

      const trackWidth = trackRef.current?.clientWidth || 0;
      const ratio = viewportWidth / contentWidth;
      const newThumbSize = Math.max(30, trackWidth * ratio); // Min 30px thumb
      const maxScroll = contentWidth - viewportWidth;
      const scrollRatio = scrollLeft / maxScroll;
      const maxThumbPos = trackWidth - newThumbSize;
      const newThumbPos = scrollRatio * maxThumbPos;

      setThumbSize(newThumbSize);
      setThumbPosition(newThumbPos);
    } else {
      const contentHeight = content.scrollHeight;
      const viewportHeight = content.clientHeight;
      const scrollTop = content.scrollTop;

      if (contentHeight <= viewportHeight) {
        setThumbSize(0); // Hide scrollbar if content fits
        return;
      }

      const trackHeight = trackRef.current?.clientHeight || 0;
      const ratio = viewportHeight / contentHeight;
      const newThumbSize = Math.max(30, trackHeight * ratio); // Min 30px thumb
      const maxScroll = contentHeight - viewportHeight;
      const scrollRatio = scrollTop / maxScroll;
      const maxThumbPos = trackHeight - newThumbSize;
      const newThumbPos = scrollRatio * maxThumbPos;

      setThumbSize(newThumbSize);
      setThumbPosition(newThumbPos);
    }
  };

  // Listen to content scroll events
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const handleScroll = () => {
      updateThumb();
    };

    content.addEventListener('scroll', handleScroll);
    updateThumb(); // Initial calculation

    // Recalculate on window resize
    const handleResize = () => updateThumb();
    window.addEventListener('resize', handleResize);

    return () => {
      content.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [contentRef, isDragging]);

  // Handle thumb dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const content = contentRef.current;
    if (!content) return;

    dragStartRef.current = {
      mousePos: isHorizontal ? e.clientX : e.clientY,
      scrollPos: isHorizontal ? content.scrollLeft : content.scrollTop,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const content = contentRef.current;
      const track = trackRef.current;
      if (!content || !track) return;

      const currentMousePos = isHorizontal ? e.clientX : e.clientY;
      const mouseDelta = currentMousePos - dragStartRef.current.mousePos;

      if (isHorizontal) {
        const trackWidth = track.clientWidth;
        const contentWidth = content.scrollWidth;
        const viewportWidth = content.clientWidth;
        const maxScroll = contentWidth - viewportWidth;
        const maxThumbPos = trackWidth - thumbSize;
        const scrollDelta = (mouseDelta / maxThumbPos) * maxScroll;
        content.scrollLeft = dragStartRef.current.scrollPos + scrollDelta;
      } else {
        const trackHeight = track.clientHeight;
        const contentHeight = content.scrollHeight;
        const viewportHeight = content.clientHeight;
        const maxScroll = contentHeight - viewportHeight;
        const maxThumbPos = trackHeight - thumbSize;
        const scrollDelta = (mouseDelta / maxThumbPos) * maxScroll;
        content.scrollTop = dragStartRef.current.scrollPos + scrollDelta;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, thumbSize, isHorizontal]);

  // Handle track click (jump to position)
  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return; // Only handle clicks on track, not thumb

    const content = contentRef.current;
    const track = trackRef.current;
    if (!content || !track) return;

    const trackRect = track.getBoundingClientRect();
    const clickPos = isHorizontal
      ? e.clientX - trackRect.left
      : e.clientY - trackRect.top;

    if (isHorizontal) {
      const trackWidth = track.clientWidth;
      const contentWidth = content.scrollWidth;
      const viewportWidth = content.clientWidth;
      const maxScroll = contentWidth - viewportWidth;
      const scrollRatio = clickPos / trackWidth;
      content.scrollLeft = scrollRatio * maxScroll;
    } else {
      const trackHeight = track.clientHeight;
      const contentHeight = content.scrollHeight;
      const viewportHeight = content.clientHeight;
      const maxScroll = contentHeight - viewportHeight;
      const scrollRatio = clickPos / trackHeight;
      content.scrollTop = scrollRatio * maxScroll;
    }
  };

  if (thumbSize === 0) return null; // Hide scrollbar if not needed

  return (
    <div
      ref={trackRef}
      className={`custom-scrollbar custom-scrollbar--${orientation} ${className}`}
      style={{
        width: isHorizontal ? `${containerSize.width - width}px` : `${width}px`,
        height: isHorizontal ? `${height}px` : `${containerSize.height - height}px`,
      }}
      onClick={handleTrackClick}
    >
      <div
        ref={thumbRef}
        className={`custom-scrollbar__thumb ${isDragging ? 'custom-scrollbar__thumb--dragging' : ''}`}
        style={{
          width: isHorizontal ? `${thumbSize}px` : '8px',
          height: isHorizontal ? '8px' : `${thumbSize}px`,
          transform: isHorizontal
            ? `translate(${thumbPosition}px, ${(height - 8) / 2}px)`
            : `translate(${(width - 8) / 2}px, ${thumbPosition}px)`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};
