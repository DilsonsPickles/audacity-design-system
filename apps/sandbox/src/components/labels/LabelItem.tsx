// One label on a label track: ears (resize/move flags), stalks (vertical
// guides), the text banner, and the inline editor. Rewritten 2026-09-15
// (labels-rewrite) — geometry comes entirely from LabelMetrics so the whole
// assembly scales cleanly from 9pt to 48pt text:
//
//   region:   [left ear][stalk] ——— banner strap ——— [stalk][right ear]
//   point:    [left ear][stalk][right ear] [gap] [text chip]
//
// The ears keep the classic 7:14 silhouette at every size (viewBox-scaled
// SVG, aspect preserved by construction — earWidth IS bannerHeight/2).
// Point labels get a mirrored ear pair at the stalk (the old renderer
// stranded the right ear a flag-width away in empty space).
//
// Interactions preserved from the old renderer: ear/stalk drag resizes a
// region (with inversion) or moves a point; banner drag moves the whole
// label (3px threshold); click selects (Shift adds); clicking an
// already-selected region banner toggles expand-to-all-tracks. New:
// double-click the banner to edit the text inline — Enter/blur commits,
// Escape reverts. Drag handlers attach document listeners on mousedown and
// remove them on mouseup (self-cleaning pattern — exempt from ref-mirror).

import React, { useEffect, useRef, useState } from 'react';
import type { Label, TracksAction } from '../../contexts/TracksContext';
import type { LabelMetrics } from '../../utils/labelLayout';

// Classic label palette (shared with the old renderer).
const COLOR_IDLE = '#7EB1FF';
const COLOR_SELECTED = '#3399FF';
const COLOR_HOVER = '#0066CC';
const TEXT_COLOR = 'rgba(0, 0, 0, 0.82)';
const PLACEHOLDER_COLOR = 'rgba(0, 20, 60, 0.45)';

export interface LabelItemProps {
  label: Label;
  trackIndex: number;
  /** Banner x in canvas px (label start). */
  x: number;
  /** Banner width in px (region span, or measured point-flag width). */
  width: number;
  topOffset: number;
  stalkHeight: number;
  metrics: LabelMetrics;
  clipContentOffset: number;
  pixelsPerSecond: number;
  trackCount: number;
  selectedTrackIndices: number[];
  selectedLabelIds: string[];
  isSelected: boolean;
  hoveredEar: string | null;
  hoveredBanner: string | null;
  isEditing: boolean;
  setHoveredEar: (id: string | null) => void;
  setHoveredBanner: (id: string | null) => void;
  onStartEditing: (labelKeyId: string) => void;
  onStopEditing: () => void;
  dispatch: React.Dispatch<TracksAction>;
}

/** The classic flag silhouette, parameterised: a triangle hanging off the
 *  stalk, its vertical edge flush with the stalk, sweeping to the stalk's
 *  foot. `side` mirrors it. Drawn in a size-matched viewBox so strokes and
 *  corners stay crisp — never stretched. */
function earPath(w: number, h: number, side: 'left' | 'right'): string {
  // Left ear (right edge at x=w): rounded top-left tip, slant to (w, h).
  const tip = Math.max(1, w * 0.23);
  if (side === 'left') {
    return `M ${w} 0 L ${w} ${h} L ${tip * 0.45} ${h * 0.103} Q 0 ${h * 0.056} ${tip} 0 Z`;
  }
  return `M 0 0 L 0 ${h} L ${w - tip * 0.45} ${h * 0.103} Q ${w} ${h * 0.056} ${w - tip} 0 Z`;
}

export const LabelItem: React.FC<LabelItemProps> = ({
  label,
  trackIndex,
  x,
  width,
  topOffset,
  stalkHeight,
  metrics: m,
  clipContentOffset,
  pixelsPerSecond,
  trackCount,
  selectedTrackIndices,
  selectedLabelIds,
  isSelected,
  hoveredEar,
  hoveredBanner,
  isEditing,
  setHoveredEar,
  setHoveredBanner,
  onStartEditing,
  onStopEditing,
  dispatch,
}) => {
  const isPointLabel = label.startTime === label.endTime;
  const labelKeyId = `${trackIndex}-${label.id}`;
  const leftEarId = `${labelKeyId}-left`;
  const rightEarId = `${labelKeyId}-right`;
  const bothEarsId = `both-${labelKeyId}`;
  const isLeftEarHovered = hoveredEar === leftEarId || hoveredEar === bothEarsId;
  const isRightEarHovered = hoveredEar === rightEarId || hoveredEar === bothEarsId;
  const isBannerHovered = hoveredBanner === labelKeyId;

  const [draft, setDraft] = useState(label.text ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) {
      setDraft(label.text ?? '');
      // Focus after the input mounts; select-all so typing replaces.
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const commitDraft = () => {
    if ((label.text ?? '') !== draft) {
      dispatch({
        type: 'UPDATE_LABEL',
        payload: { trackIndex, labelId: label.id, label: { text: draft } },
      });
    }
    onStopEditing();
  };

  const selectSelf = (e: React.MouseEvent) => {
    dispatch({
      type: 'SET_SELECTED_LABELS',
      payload: e.shiftKey ? [...selectedLabelIds, labelKeyId] : [labelKeyId],
    });
  };

  const timeFromClientX = (clientX: number, containerRect: DOMRect) =>
    Math.max(0, (clientX - containerRect.left - clipContentOffset) / pixelsPerSecond);

  // ---- Ear/stalk drags (attach-on-mousedown, self-cleaning) --------------

  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectSelf(e);

    const containerRect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect();
    const handleMouseMove = (moveE: MouseEvent) => {
      if (!containerRect) return;
      const newTime = timeFromClientX(moveE.clientX, containerRect);
      if (isPointLabel) {
        dispatch({
          type: 'UPDATE_LABEL',
          payload: { trackIndex, labelId: label.id, label: { startTime: newTime, endTime: newTime } },
        });
      } else {
        // Resize from the left edge; dragging past the right edge inverts.
        dispatch({
          type: 'UPDATE_LABEL',
          payload: {
            trackIndex,
            labelId: label.id,
            label: {
              startTime: Math.min(newTime, label.endTime!),
              endTime: Math.max(newTime, label.endTime!),
            },
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

  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPointLabel) {
      // The mirrored right ear of a point label moves the point too.
      handleLeftMouseDown(e);
      return;
    }
    selectSelf(e);

    const containerRect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect();
    const handleMouseMove = (moveE: MouseEvent) => {
      if (!containerRect) return;
      const newTime = timeFromClientX(moveE.clientX, containerRect);
      dispatch({
        type: 'UPDATE_LABEL',
        payload: {
          trackIndex,
          labelId: label.id,
          label: {
            startTime: Math.min(label.startTime, newTime),
            endTime: Math.max(label.startTime, newTime),
          },
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

  // ---- Banner drag / click / expand --------------------------------------

  const handleBannerMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return; // the input owns the mouse while editing
    e.preventDefault();
    e.stopPropagation();

    const wasAlreadySelected = selectedLabelIds.includes(labelKeyId);
    selectSelf(e);

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = x;
    let hasMoved = false;

    const handleMouseMove = (moveE: MouseEvent) => {
      if (Math.abs(moveE.clientX - startX) > 3 || Math.abs(moveE.clientY - startY) > 3) {
        hasMoved = true;
      }
      if (!hasMoved) return;

      const newTime = Math.max(0, (startLeft + (moveE.clientX - startX) - clipContentOffset) / pixelsPerSecond);
      if (isPointLabel) {
        dispatch({
          type: 'UPDATE_LABEL',
          payload: { trackIndex, labelId: label.id, label: { startTime: newTime, endTime: newTime } },
        });
      } else {
        const duration = label.endTime! - label.startTime;
        dispatch({
          type: 'UPDATE_LABEL',
          payload: {
            trackIndex,
            labelId: label.id,
            label: { startTime: newTime, endTime: newTime + duration },
          },
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Click (no drag) on an already-selected REGION banner toggles the
      // expand-to-all-tracks time selection (see docs/label-interactions.md).
      // setTimeout so it runs after other click handlers, as before.
      if (!hasMoved && !isPointLabel && wasAlreadySelected) {
        const allTrackIndices = Array.from({ length: trackCount }, (_, idx) => idx);
        const allTracksSelected = allTrackIndices.every((idx) => selectedTrackIndices.includes(idx));
        setTimeout(() => {
          if (allTracksSelected) {
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: [trackIndex] });
            dispatch({ type: 'SET_TIME_SELECTION', payload: null });
          } else {
            dispatch({
              type: 'SET_TIME_SELECTION',
              payload: {
                startTime: label.startTime,
                endTime: label.endTime!,
                // Label expansion is an explicit all-tracks gesture — the
                // selection's scope says so, so scoped operations act on
                // every row even if the track selection changes afterwards.
                tracks: allTrackIndices,
              },
            });
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: allTrackIndices });
          }
        }, 0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ---- Pieces -------------------------------------------------------------

  const earColor = (hovered: boolean) => (hovered ? COLOR_HOVER : isSelected ? COLOR_SELECTED : COLOR_IDLE);

  const ear = (side: 'left' | 'right', left: number, hovered: boolean, onMouseDown: (e: React.MouseEvent) => void, hoverId: string) => (
    <svg
      width={m.earWidth}
      height={m.bannerHeight}
      viewBox={`0 0 ${m.earWidth} ${m.bannerHeight}`}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${topOffset}px`,
        cursor: isPointLabel ? 'move' : 'ew-resize',
        pointerEvents: 'auto',
        zIndex: 3,
      }}
      onMouseEnter={() => setHoveredEar(isPointLabel ? bothEarsId : hoverId)}
      onMouseLeave={() => setHoveredEar(null)}
      onMouseDown={onMouseDown}
    >
      <path d={earPath(m.earWidth, m.bannerHeight, side)} fill={earColor(hovered)} />
    </svg>
  );

  const stalk = (left: number, hovered: boolean, onMouseDown: (e: React.MouseEvent) => void, hoverId: string) => (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${topOffset}px`,
        width: `${m.stalkWidth}px`,
        height: `${stalkHeight}px`,
        backgroundColor: earColor(hovered),
        pointerEvents: 'auto',
        cursor: isPointLabel ? 'move' : 'ew-resize',
      }}
      onMouseEnter={() => setHoveredEar(isPointLabel ? bothEarsId : hoverId)}
      onMouseLeave={() => setHoveredEar(null)}
      onMouseDown={onMouseDown}
    />
  );

  const isEmpty = !label.text || label.text.trim() === '';
  const bannerLeft = isPointLabel ? x + m.earWidth + m.pointFlagGap : x;

  const textStyle: React.CSSProperties = {
    flex: 1,
    paddingLeft: `${m.padX}px`,
    paddingRight: `${m.padX}px`,
    fontSize: `${m.fontSizePx}px`,
    lineHeight: 1.2,
    // Display sizes read better slightly tightened.
    letterSpacing: m.fontSizePx >= 24 ? '-0.015em' : undefined,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <React.Fragment>
      {ear('left', x - m.earWidth, isLeftEarHovered, handleLeftMouseDown, leftEarId)}
      {stalk(x, isLeftEarHovered, handleLeftMouseDown, leftEarId)}
      {/* Point labels get a mirrored ear pair at the stalk; region labels
          get a stalk + ear at their far edge. */}
      {isPointLabel
        ? ear('right', x + m.stalkWidth, isRightEarHovered, handleRightMouseDown, rightEarId)
        : (
          <>
            {stalk(x + width, isRightEarHovered, handleRightMouseDown, rightEarId)}
            {ear('right', x + width + m.stalkWidth, isRightEarHovered, handleRightMouseDown, rightEarId)}
          </>
        )}

      {/* Banner (region strap / point text chip) */}
      <div
        data-label-banner={labelKeyId}
        style={{
          position: 'absolute',
          left: `${bannerLeft}px`,
          top: `${topOffset}px`,
          width: `${width}px`,
          height: `${m.bannerHeight}px`,
          backgroundColor: isBannerHovered && !isEditing ? COLOR_HOVER : isSelected ? COLOR_SELECTED : COLOR_IDLE,
          pointerEvents: 'auto',
          borderRadius: isPointLabel ? `${m.borderRadius}px` : '0',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          cursor: isEditing ? 'text' : 'move',
          boxShadow: isSelected && !isEditing ? 'inset 0 0 0 1px rgba(0, 40, 120, 0.35)' : undefined,
        }}
        onMouseEnter={() => setHoveredBanner(labelKeyId)}
        onMouseLeave={() => setHoveredBanner(null)}
        onMouseDown={handleBannerMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isEditing) onStartEditing(labelKeyId);
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            data-label-input={labelKeyId}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              e.stopPropagation(); // keep global shortcuts out of typing
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') onStopEditing();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              ...textStyle,
              color: TEXT_COLOR,
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: `0 ${m.padX}px`,
            }}
          />
        ) : (
          <div style={{ ...textStyle, color: isEmpty ? PLACEHOLDER_COLOR : TEXT_COLOR, fontStyle: isEmpty ? 'italic' : undefined, pointerEvents: 'none' }}>
            {isEmpty ? 'Label' : label.text}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default LabelItem;
