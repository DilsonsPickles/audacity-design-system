import { useRef, useEffect } from 'react';
import { useTracksDispatch } from '../contexts/TracksContext';

export interface LabelDragInfo {
  trackIndex: number;
  labelId: number;
  initialStartTime: number;
  initialEndTime?: number;
  initialClientX: number;
  initialClientY: number;
}

export interface UseLabelDraggingOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  pixelsPerSecond: number;
  clipContentOffset: number;
  onDragStatusChange?: (isDragging: boolean) => void;
}

export interface UseLabelDraggingReturn {
  labelDragStateRef: React.MutableRefObject<Map<string, LabelDragInfo> | null>;
  startLabelDrag: (labelKeyId: string, dragInfo: LabelDragInfo) => void;
  cancelDrag: () => void;
}

/**
 * Hook for managing label dragging behavior
 * Handles mouse-based dragging of labels along the timeline
 */
export function useLabelDragging(options: UseLabelDraggingOptions): UseLabelDraggingReturn {
  const {
    containerRef,
    pixelsPerSecond,
    clipContentOffset,
    onDragStatusChange,
  } = options;

  const dispatch = useTracksDispatch();
  const labelDragStateRef = useRef<Map<string, LabelDragInfo> | null>(null);

  const startLabelDrag = (labelKeyId: string, dragInfo: LabelDragInfo) => {
    const dragMap = new Map<string, LabelDragInfo>();
    dragMap.set(labelKeyId, dragInfo);
    labelDragStateRef.current = dragMap;
    onDragStatusChange?.(true);
  };

  const cancelDrag = () => {
    labelDragStateRef.current = null;
    onDragStatusChange?.(false);
  };

  // Document-level mouse move and up for label dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !labelDragStateRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;

      // Move all labels being dragged
      labelDragStateRef.current.forEach((dragInfo, labelKeyId) => {
        const deltaX = e.clientX - dragInfo.initialClientX;
        const deltaTime = deltaX / pixelsPerSecond;

        const newStartTime = Math.max(0, dragInfo.initialStartTime + deltaTime);
        const newEndTime = dragInfo.initialEndTime !== undefined
          ? Math.max(newStartTime + 0.01, dragInfo.initialEndTime + deltaTime)
          : undefined;

        // Dispatch update for this label
        dispatch({
          type: 'UPDATE_LABEL_TIME',
          payload: {
            trackIndex: dragInfo.trackIndex,
            labelId: dragInfo.labelId,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        });
      });
    };

    const handleMouseUp = () => {
      if (labelDragStateRef.current) {
        cancelDrag();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pixelsPerSecond, clipContentOffset, dispatch, onDragStatusChange, containerRef]);

  return {
    labelDragStateRef,
    startLabelDrag,
    cancelDrag,
  };
}
