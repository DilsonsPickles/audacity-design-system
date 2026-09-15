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
import { colors } from '@audacity-ui/tokens';
import type { Label, TracksAction } from '../../contexts/TracksContext';
import type { LabelMetrics } from '../../utils/labelLayout';
import { markLabelDragEnd } from './labelDragTracker';

// Labels render in the label TRACK's palette color (Track color menu).
// Chrome (ears + stalks) uses the saturated end of the scale; the text
// strap sits lighter (2026-09-15 mockup) so the type carries the label
// and the chrome reads as accents. Blue is the classic default hue.
type TrackColorName = keyof typeof colors;
function labelPalette(trackColor: string | undefined) {
  const name: TrackColorName = trackColor && trackColor in colors ? (trackColor as TrackColorName) : 'blue';
  const scale = colors[name] as Record<number, string>;
  return {
    chromeIdle: scale[500],
    chromeSelected: scale[700],
    chromeHover: scale[800],
    bannerIdle: scale[400],
    bannerHover: scale[500],
    bannerSelected: scale[600],
  };
}
const TEXT_COLOR = 'rgba(0, 0, 0, 0.82)';
const PLACEHOLDER_COLOR = 'rgba(0, 20, 60, 0.45)';

export interface LabelItemProps {
  label: Label;
  /** The label track's palette color name (see labelPalette). */
  trackColor?: string;
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

/** The original hand-tuned flag paths, drawn in their native 7x14 space —
 *  the svg scales them to the metrics' constant ear size. Ears are
 *  CONSTANT-size corner tabs top-aligned with the banner — only the text
 *  strap scales. */
const CLASSIC_EAR_PATHS = {
  left: 'M0.723608 1.44722L7 14V0H1.61827C0.874886 0 0.391157 0.782314 0.723608 1.44722Z',
  right: 'M6.27639 1.44722L0 14V0H5.38173C6.12511 0 6.60884 0.782314 6.27639 1.44722Z',
} as const;

export const LabelItem: React.FC<LabelItemProps> = ({
  label,
  trackColor,
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
  const palette = labelPalette(trackColor);
  const isPointLabel = label.startTime === label.endTime;
  const labelKeyId = `${trackIndex}-${label.id}`;
  // Every element hovers INDEPENDENTLY — an ear hover never lights the
  // stalk beside it, and vice versa (2026-09-15 direction).
  const leftEarId = `${labelKeyId}-left`;
  const rightEarId = `${labelKeyId}-right`;
  const leftStalkId = `${labelKeyId}-lstalk`;
  const rightStalkId = `${labelKeyId}-rstalk`;
  const isLeftEarHovered = hoveredEar === leftEarId;
  const isRightEarHovered = hoveredEar === rightEarId;
  const isLeftStalkHovered = hoveredEar === leftStalkId;
  const isRightStalkHovered = hoveredEar === rightStalkId;
  const isBannerHovered = hoveredBanner === labelKeyId;

  const [draft, setDraft] = useState(label.text ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  // Pending expand-to-all-tracks toggle (see handleBannerMouseDown): held
  // for the double-click window so renaming a selected label doesn't also
  // yank the track selection around.
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (expandTimerRef.current !== null) clearTimeout(expandTimerRef.current);
  }, []);
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

  const beginDrag = (e: React.MouseEvent, onMove: (t: number) => void) => {
    e.preventDefault();
    e.stopPropagation();
    selectSelf(e);
    const containerRect = (e.target as HTMLElement).closest('.canvas-container')?.getBoundingClientRect();
    const handleMouseMove = (moveE: MouseEvent) => {
      if (!containerRect) return;
      onMove(timeFromClientX(moveE.clientX, containerRect));
    };
    const handleMouseUp = () => {
      markLabelDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Ears ALWAYS stretch their edge, anchored on the opposite edge as it
  // was at drag start; dragging past the anchor inverts (swap). This is
  // the real build's model (Au3LabelsInteraction::stretchLabelLeft/Right +
  // SelectedRegion::ensureOrdering) — and it's also how a POINT label
  // becomes a region: pull either ear and an edge stretches away from the
  // anchored point. Moving a point is the stalk's (and banner's) job.
  //
  // A sticky detent at zero width makes the REVERSE gesture practical:
  // within a few pixels of the anchor the label snaps to a point
  // (start === end) — otherwise collapsing a region back into a point
  // needs a pixel-perfect release on exact equality. Pull through the
  // detent and inversion resumes.
  const COLLAPSE_SNAP_PX = 6;

  const stretchTimes = (t: number, anchor: number) => {
    if (Math.abs(t - anchor) * pixelsPerSecond < COLLAPSE_SNAP_PX) {
      return { startTime: anchor, endTime: anchor };
    }
    return { startTime: Math.min(t, anchor), endTime: Math.max(t, anchor) };
  };

  const handleStretchLeft = (e: React.MouseEvent) => {
    const anchor = label.endTime!;
    beginDrag(e, (t) => {
      dispatch({
        type: 'UPDATE_LABEL',
        payload: { trackIndex, labelId: label.id, label: stretchTimes(t, anchor) },
      });
    });
  };

  const handleStretchRight = (e: React.MouseEvent) => {
    const anchor = label.startTime;
    beginDrag(e, (t) => {
      dispatch({
        type: 'UPDATE_LABEL',
        payload: { trackIndex, labelId: label.id, label: stretchTimes(t, anchor) },
      });
    });
  };

  const handleMovePoint = (e: React.MouseEvent) => {
    beginDrag(e, (t) => {
      dispatch({
        type: 'UPDATE_LABEL',
        payload: { trackIndex, labelId: label.id, label: { startTime: t, endTime: t } },
      });
    });
  };

  // ---- Banner drag / click / expand --------------------------------------

  const handleBannerMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return; // the input owns the mouse while editing
    e.preventDefault();
    e.stopPropagation();
    // The second press of a double-click: no fresh drag, no second
    // expand-toggle candidate — onDoubleClick owns the gesture.
    if (e.detail >= 2) return;

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
      markLabelDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Click (no drag) on an already-selected REGION banner toggles the
      // expand-to-all-tracks time selection (see docs/label-interactions.md).
      // Deferred past the double-click window (250ms) so a double-click —
      // which OPENS THE EDITOR and parks the playhead — cancels it: a
      // rename must not also yank the track selection around.
      if (!hasMoved && !isPointLabel && wasAlreadySelected) {
        const allTrackIndices = Array.from({ length: trackCount }, (_, idx) => idx);
        const allTracksSelected = allTrackIndices.every((idx) => selectedTrackIndices.includes(idx));
        expandTimerRef.current = setTimeout(() => {
          expandTimerRef.current = null;
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
        }, 250);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ---- Pieces -------------------------------------------------------------

  const earColor = (hovered: boolean) => (hovered ? palette.chromeHover : isSelected ? palette.chromeSelected : palette.chromeIdle);

  const ear = (side: 'left' | 'right', left: number, hovered: boolean, onMouseDown: (e: React.MouseEvent) => void, hoverId: string) => (
    <svg
      data-label-ear={`${labelKeyId}-${side}`}
      width={m.earWidth}
      height={m.earHeight}
      viewBox="0 0 7 14"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${topOffset}px`,
        cursor: 'ew-resize',
        pointerEvents: 'auto',
        zIndex: 3,
      }}
      onMouseEnter={() => setHoveredEar(hoverId)}
      onMouseLeave={() => setHoveredEar(null)}
      onMouseDown={onMouseDown}
    >
      <path d={CLASSIC_EAR_PATHS[side]} fill={earColor(hovered)} />
    </svg>
  );

  // The visible stalk is 1px — the interactive element is a transparent
  // 9px-wide hit zone with the line centered in it. Banner and ears still
  // win where they overlap (later DOM order / higher z), so the pad only
  // widens the target over bare canvas.
  const STALK_HIT_PAD = 4;
  const stalk = (left: number, hovered: boolean, onMouseDown: (e: React.MouseEvent) => void, hoverId: string, movesPoint: boolean) => (
    <div
      data-label-stalk={labelKeyId}
      style={{
        position: 'absolute',
        left: `${left - STALK_HIT_PAD}px`,
        top: `${topOffset}px`,
        width: `${m.stalkWidth + STALK_HIT_PAD * 2}px`,
        height: `${stalkHeight}px`,
        backgroundColor: 'transparent',
        pointerEvents: 'auto',
        cursor: movesPoint ? 'move' : 'ew-resize',
      }}
      onMouseEnter={() => setHoveredEar(hoverId)}
      onMouseLeave={() => setHoveredEar(null)}
      onMouseDown={onMouseDown}
    >
      <div
        style={{
          position: 'absolute',
          left: `${STALK_HIT_PAD}px`,
          top: 0,
          width: `${m.stalkWidth}px`,
          height: '100%',
          backgroundColor: earColor(hovered),
          pointerEvents: 'none',
        }}
      />
    </div>
  );

  const isEmpty = !label.text || label.text.trim() === '';
  const bannerLeft = isPointLabel ? x + m.earWidth + m.pointFlagGap : x;

  const textStyle: React.CSSProperties = {
    paddingLeft: `${m.padX}px`,
    paddingRight: `${m.padX}px`,
    fontSize: `${m.fontSizePx}px`,
    // Display sizes read better slightly tightened.
    letterSpacing: m.fontSizePx >= 24 ? '-0.015em' : undefined,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  // Scripts with extreme stacks (Thai tone marks, Khmer coeng subscripts)
  // paint ink well past the Latin line box — verified clipped at 48pt
  // (Thai +3px top, Khmer +16px bottom) when the ellipsis element's
  // overflow:hidden hugged the strap. So the DISPLAY text lives in a line
  // box ~2.2em tall centered on the strap: ellipsis still clips
  // horizontally at the strap edges, while vertical ink overflows the
  // strap freely (as text editors render these scripts).
  const inkAllowance = Math.round(m.fontSizePx * 2.2);
  const displayTextStyle: React.CSSProperties = {
    ...textStyle,
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    height: `${inkAllowance}px`,
    lineHeight: `${inkAllowance}px`,
    pointerEvents: 'none',
  };

  return (
    <React.Fragment>
      {ear('left', x - m.earWidth, isLeftEarHovered, handleStretchLeft, leftEarId)}
      {stalk(x, isLeftStalkHovered, isPointLabel ? handleMovePoint : handleStretchLeft, leftStalkId, isPointLabel)}
      {/* Point labels get a mirrored ear pair at the stalk (pulling either
          ear stretches the point into a region — build behavior); region
          labels get a stalk + ear at their far edge. */}
      {isPointLabel
        ? ear('right', x + m.stalkWidth, isRightEarHovered, handleStretchRight, rightEarId)
        : (
          <>
            {stalk(x + width, isRightStalkHovered, handleStretchRight, rightStalkId, false)}
            {ear('right', x + width + m.stalkWidth, isRightEarHovered, handleStretchRight, rightEarId)}
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
          backgroundColor: isBannerHovered && !isEditing ? palette.bannerHover : isSelected ? palette.bannerSelected : palette.bannerIdle,
          pointerEvents: 'auto',
          borderRadius: isPointLabel ? `${m.borderRadius}px` : '0',
          display: 'flex',
          alignItems: 'center',
          // No overflow:hidden here — the display-text element does its
          // own horizontal clipping; vertical glyph ink may breathe.
          cursor: isEditing ? 'text' : 'move',
        }}
        onMouseEnter={() => setHoveredBanner(labelKeyId)}
        onMouseLeave={() => setHoveredBanner(null)}
        onMouseDown={handleBannerMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (expandTimerRef.current !== null) {
            clearTimeout(expandTimerRef.current);
            expandTimerRef.current = null;
          }
          if (!isEditing) {
            // Editing parks the playhead on the label's start (same
            // contract as clip-body double-click), so Space auditions
            // the labelled passage right after naming it.
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: label.startTime });
            onStartEditing(labelKeyId);
          }
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
              // Same tall box as the display text, so stacked-script ink
              // isn't clipped WHILE TYPING either (native inputs clip at
              // their own border box — so make that box tall and center
              // it on the strap; the background stays the strap's).
              ...textStyle,
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              height: `${inkAllowance}px`,
              color: TEXT_COLOR,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: `0 ${m.padX}px`,
            }}
          />
        ) : (
          <div style={{ ...displayTextStyle, color: isEmpty ? PLACEHOLDER_COLOR : TEXT_COLOR, fontStyle: isEmpty ? 'italic' : undefined }}>
            {isEmpty ? 'Label' : label.text}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default LabelItem;
