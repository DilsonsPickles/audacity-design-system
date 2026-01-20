import React from 'react';
import type { Label } from '../contexts/TracksContext';
import { calculateLabelRows, LABEL_LAYOUT_CONSTANTS } from '../utils/labelLayout';

const { LABEL_ROW_HEIGHT, LABEL_ROW_GAP } = LABEL_LAYOUT_CONSTANTS;

interface LabelRendererProps {
  labels: Label[];
  trackIndex: number;
  trackHeight: number;
  pixelsPerSecond: number;
  clipContentOffset: number;
  selectedLabelIds: string[];
  hoveredEar: string | null;
  hoveredBanner: string | null;
  tracks: any[];
  selectedTrackIndices: number[];
  setHoveredEar: (id: string | null) => void;
  setHoveredBanner: (id: string | null) => void;
  dispatch: (action: any) => void;
}

export const LabelRenderer: React.FC<LabelRendererProps> = ({
  labels,
  trackIndex,
  trackHeight,
  pixelsPerSecond,
  clipContentOffset,
  selectedLabelIds,
  hoveredEar,
  hoveredBanner,
  tracks,
  selectedTrackIndices,
  setHoveredEar,
  setHoveredBanner,
  dispatch,
}) => {
  const LABEL_HEIGHT = 14;
  const LABEL_GAP = 2;
  const FLAG_WIDTH = 50;

  // Calculate label rows using utility function
  const labelRows = calculateLabelRows(labels, pixelsPerSecond, clipContentOffset);

  return (
    <>
      {labels.map((label) => {
        const x = clipContentOffset + label.startTime * pixelsPerSecond;
        const width = (label.endTime! - label.startTime) * pixelsPerSecond;
        const labelKeyId = `${trackIndex}-${label.id}`;
        const isSelected = selectedLabelIds.includes(labelKeyId);
        const row = labelRows.get(label.id) ?? 0;
        const topOffset = row * (LABEL_HEIGHT + LABEL_GAP);
        const stalkHeight = trackHeight - topOffset;
        const isPointLabel = label.startTime === label.endTime;

        const leftEarId = `${labelKeyId}-left`;
        const rightEarId = `${labelKeyId}-right`;
        const bothEarsId = `both-${labelKeyId}`;
        const isLeftEarHovered = hoveredEar === leftEarId || hoveredEar === bothEarsId;
        const isRightEarHovered = hoveredEar === rightEarId || hoveredEar === bothEarsId;
        const isBannerHovered = hoveredBanner === labelKeyId;

        // Mouse handlers for left ear/stalk
        const handleLeftMouseDown = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          dispatch({
            type: 'SET_SELECTED_LABELS',
            payload: e.shiftKey ? [...selectedLabelIds, labelKeyId] : [labelKeyId],
          });

          const handleMouseMove = (moveE: MouseEvent) => {
            const containerRect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect();
            if (!containerRect) return;

            const localX = moveE.clientX - containerRect.left;
            const newTime = Math.max(0, (localX - clipContentOffset) / pixelsPerSecond);

            if (isPointLabel) {
              // For point labels, move the entire point
              dispatch({
                type: 'UPDATE_LABEL',
                payload: {
                  trackIndex,
                  labelId: label.id,
                  label: { startTime: newTime, endTime: newTime },
                },
              });
            } else {
              // For region labels, resize from left edge (allow inverse resizing)
              const newStart = Math.min(newTime, label.endTime!);
              const newEnd = Math.max(newTime, label.endTime!);

              dispatch({
                type: 'UPDATE_LABEL',
                payload: {
                  trackIndex,
                  labelId: label.id,
                  label: { startTime: newStart, endTime: newEnd },
                },
              });
            }
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        };

        // Mouse handlers for right ear/stalk
        const handleRightMouseDown = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          dispatch({
            type: 'SET_SELECTED_LABELS',
            payload: e.shiftKey ? [...selectedLabelIds, labelKeyId] : [labelKeyId],
          });

          const handleMouseMove = (moveE: MouseEvent) => {
            const containerRect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect();
            if (!containerRect) return;

            const localX = moveE.clientX - containerRect.left;
            const newEndTime = Math.max(0, (localX - clipContentOffset) / pixelsPerSecond);

            // Allow inverse resizing
            const newStart = Math.min(label.startTime, newEndTime);
            const newEnd = Math.max(label.startTime, newEndTime);

            dispatch({
              type: 'UPDATE_LABEL',
              payload: {
                trackIndex,
                labelId: label.id,
                label: { startTime: newStart, endTime: newEnd },
              },
            });
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        };

        // Mouse handlers for banner (label box)
        const handleBannerMouseDown = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          const wasAlreadySelected = selectedLabelIds.includes(labelKeyId);

          dispatch({
            type: 'SET_SELECTED_LABELS',
            payload: e.shiftKey ? [...selectedLabelIds, labelKeyId] : [labelKeyId],
          });

          const startX = e.clientX;
          const startY = e.clientY;
          const startLeft = x;
          let hasMoved = false;

          const handleMouseMove = (moveE: MouseEvent) => {
            const deltaX = moveE.clientX - startX;
            const deltaY = moveE.clientY - startY;

            // Check if we've moved more than 3px (drag threshold)
            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
              hasMoved = true;
            }

            if (!hasMoved) return;

            const newX = startLeft + deltaX;
            const newTime = Math.max(0, (newX - clipContentOffset) / pixelsPerSecond);

            if (isPointLabel) {
              // For point labels, move the point (keep startTime === endTime)
              dispatch({
                type: 'UPDATE_LABEL',
                payload: {
                  trackIndex,
                  labelId: label.id,
                  label: {
                    startTime: newTime,
                    endTime: newTime,
                  },
                },
              });
            } else {
              // For region labels, maintain the duration
              const duration = label.endTime! - label.startTime;
              dispatch({
                type: 'UPDATE_LABEL',
                payload: {
                  trackIndex,
                  labelId: label.id,
                  label: {
                    startTime: newTime,
                    endTime: newTime + duration,
                  },
                },
              });
            }
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Handle click (no drag) for region labels only - use setTimeout to avoid conflicts
            if (!hasMoved && !isPointLabel && wasAlreadySelected) {
              // Check if all tracks are currently selected
              const allTrackIndices = tracks.map((_, idx) => idx);
              const allTracksSelected = allTrackIndices.every(idx => selectedTrackIndices.includes(idx));

              // Use setTimeout to ensure this happens after other event handlers
              setTimeout(() => {
                if (allTracksSelected) {
                  // Already expanded: collapse back to single track
                  dispatch({ type: 'SET_SELECTED_TRACKS', payload: [trackIndex] });
                  // Clear time selection
                  dispatch({ type: 'SET_TIME_SELECTION', payload: null });
                } else {
                  // Not expanded: expand to all tracks with time selection
                  dispatch({
                    type: 'SET_TIME_SELECTION',
                    payload: {
                      startTime: label.startTime,
                      endTime: label.endTime!,
                    },
                  });
                  dispatch({
                    type: 'SET_SELECTED_TRACKS',
                    payload: allTrackIndices,
                  });
                }
              }, 0);
            }
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        };

        return (
          <React.Fragment key={label.id}>
            {/* Left ear (resize handle) */}
            <svg
              width="7"
              height="14"
              viewBox="0 0 7 14"
              style={{
                position: 'absolute',
                left: `${x - 7}px`,
                top: `${topOffset}px`,
                cursor: isPointLabel ? 'move' : 'ew-resize',
                pointerEvents: 'auto',
                zIndex: 3,
              }}
              onMouseEnter={() => {
                if (isPointLabel) {
                  setHoveredEar(bothEarsId); // Hover both ears for point labels
                } else {
                  setHoveredEar(leftEarId);
                }
              }}
              onMouseLeave={() => setHoveredEar(null)}
              onMouseDown={handleLeftMouseDown}
            >
              <path
                d="M0.723608 1.44722L7 14V0H1.61827C0.874886 0 0.391157 0.782314 0.723608 1.44722Z"
                fill={isLeftEarHovered ? '#0066CC' : (isSelected ? '#3399FF' : '#7EB1FF')}
              />
            </svg>

            {/* Left stalk (or single stalk for point labels) */}
            <div
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${topOffset}px`,
                width: '1px',
                height: `${stalkHeight}px`,
                backgroundColor: isLeftEarHovered ? '#0066CC' : (isSelected ? '#3399FF' : '#7EB1FF'),
                pointerEvents: 'auto',
                cursor: isPointLabel ? 'move' : 'ew-resize',
              }}
              onMouseEnter={() => {
                if (isPointLabel) {
                  setHoveredEar(bothEarsId); // Hover both ears for point labels
                } else {
                  setHoveredEar(leftEarId);
                }
              }}
              onMouseLeave={() => setHoveredEar(null)}
              onMouseDown={handleLeftMouseDown}
            />

            {/* Right stalk (only for region labels) */}
            {!isPointLabel && (
              <div
                style={{
                  position: 'absolute',
                  left: `${x + width}px`,
                  top: `${topOffset}px`,
                  width: '1px',
                  height: `${stalkHeight}px`,
                  backgroundColor: isRightEarHovered ? '#0066CC' : (isSelected ? '#3399FF' : '#7EB1FF'),
                  pointerEvents: 'auto',
                  cursor: 'ew-resize',
                }}
                onMouseEnter={() => setHoveredEar(rightEarId)}
                onMouseLeave={() => setHoveredEar(null)}
                onMouseDown={handleRightMouseDown}
              />
            )}

            {/* Right ear (resize handle) */}
            <svg
              width="7"
              height="14"
              viewBox="0 0 7 14"
              style={{
                position: 'absolute',
                left: `${x + width}px`,
                top: `${topOffset}px`,
                cursor: 'ew-resize',
                pointerEvents: 'auto',
                zIndex: 3,
              }}
              onMouseEnter={() => setHoveredEar(rightEarId)}
              onMouseLeave={() => setHoveredEar(null)}
              onMouseDown={handleRightMouseDown}
            >
              <path
                d="M6.27639 1.44722L0 14V0H5.38173C6.12511 0 6.60884 0.782314 6.27639 1.44722Z"
                fill={isRightEarHovered ? '#0066CC' : (isSelected ? '#3399FF' : '#7EB1FF')}
              />
            </svg>

            {/* Label rectangle */}
            <div
              style={{
                position: 'absolute',
                left: isPointLabel ? `${x + 10}px` : `${x}px`, // Offset flag to the right for point labels (7px ear + 3px gap)
                top: `${topOffset}px`,
                width: isPointLabel ? `${FLAG_WIDTH}px` : `${width}px`,
                height: '14px',
                backgroundColor: isBannerHovered ? '#0066CC' : (isSelected ? '#3399FF' : '#7EB1FF'),
                pointerEvents: 'auto',
                borderRadius: isPointLabel ? '2px' : '0',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                cursor: 'move',
              }}
              onMouseEnter={() => setHoveredBanner(labelKeyId)}
              onMouseLeave={() => setHoveredBanner(null)}
              onMouseDown={handleBannerMouseDown}
            >
              {/* Label text */}
              <div
                style={{
                  flex: 1,
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  fontSize: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  color: 'rgba(0, 0, 0, 0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  pointerEvents: 'none',
                }}
              >
                {label.text}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};
