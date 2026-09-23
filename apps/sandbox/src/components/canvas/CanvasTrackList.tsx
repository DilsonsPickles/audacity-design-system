import React from 'react';
import { TrackNew, CLIP_CONTENT_OFFSET, scrollIntoViewIfNeeded, announce, useCollapseTransition, type SpectrogramScale } from '@audacity-ui/components';
import { GROUP_COLLAPSE_MS, GROUP_COLLAPSE_EASING } from '@audacity-ui/core';
import { useTracksDispatch, type Clip, type Track, type TimeSelection } from '../../contexts/TracksContext';
import type { EnvelopePointSizes } from '../../utils/envelopePointSizes';
import type { ClipTrimState } from '../../hooks/useClipTrimming';
import type { ClipStretchState } from '../../hooks/useClipStretching';
import {
  computeKeyboardTrimBatch,
  computeKeyboardTrimAnnouncement,
  computeKeyboardStretch,
  computeKeyboardStretchAnnouncement,
  type KeyboardTrimTarget,
} from '../../utils/clipKeyboardEdit';
import { pendingClipMoveResolution } from '../../utils/pendingClipMoveResolution';
import { provisionalKeyboardTrackIds } from '../../utils/provisionalKeyboardTrackIds';
import { calculateTrackYOffset } from '../../utils/trackLayout';
import {
  FOLDER_ROW_HEIGHT,
  GROUP_END_PAD,
  effectiveTrackHeight,
  effectiveTrackMuted,
  effectiveTrackSoloed,
  folderChildIndices,
  isHiddenByCollapse,
} from '../../utils/trackFolders';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT } from '../../constants/canvas';
import { LabelRenderer } from '../LabelRenderer';

/** Live reorder-drag preview, mirrored from the track control panel
 *  so both columns show the same result (folders v1). */
export interface TrackDragPreview {
  /** Track indices in their PREVIEWED order */
  order: number[];
  /** The dragged rows — drawn ghosted in their landing spot */
  ghostIndices: number[];
  /** Whether the landing puts the block inside a folder */
  indented: boolean;
}

export interface CanvasTrackListProps {
  /** Live reorder-drag preview (see TrackDragPreview) */
  dragPreview?: TrackDragPreview | null;
  tracks: Track[];
  selectedTrackIndices: number[];
  focusedTrackIndex: number | null;
  selectedLabelIds: string[];
  width: number;
  pixelsPerSecond: number;
  envelopeMode: boolean;
  isFlatNavigation: boolean;
  trackBase: number;
  timeSelection: TimeSelection | null;
  isTimeSelectionDragging: boolean;
  clipStyle: 'classic' | 'colourful';
  recordingClipId: number | null;
  showRmsInWaveform: boolean;
  /** View > Show quick fade handles — gates the fade drag controls
   *  (handles + shape dots); the curves themselves always render */
  showQuickFadeHandles: boolean;
  draggingClipIds: Set<number>;
  raisedClipIds: Set<number>;
  /** Live right-drag marquee preview, trackIndex -> covered clip ids.
   *  Null when no marquee is in flight; when set, it drives the clips'
   *  SELECTED LOOK so the user sees the pending selection before
   *  releasing. A track absent from the map previews as "nothing
   *  selected here". */
  marqueePreview: ReadonlyMap<number, ReadonlySet<number>> | null;
  hoveredMidiClipId?: number | null;
  onHoverMidiClip?: (clipId: number | null) => void;
  onTrackFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  onTrackContainerFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  onEnterTrackPanel?: (trackIndex: number) => void;
  onShiftTabFromTrack?: (trackIndex: number) => void;
  onContainerEnter?: (trackIndex: number, modifiers: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;
  onTabFromLastClip?: (trackIndex: number) => void;
  /** Canvas prop, forwarded straight through to the per-clip menu-click wrapper below. */
  onClipMenuClick?: (clipId: number, trackIndex: number, x: number, y: number, openedViaKeyboard?: boolean) => void;
  envelopePointSizes: EnvelopePointSizes;
  spectrogramScale: SpectrogramScale;
  hoveredEar: string | null;
  hoveredBanner: string | null;
  setHoveredEar: (id: string | null) => void;
  setHoveredBanner: (id: string | null) => void;
  selectionAnchor: number | null;
  setSelectionAnchor?: (anchor: number | null) => void;
  /** Guards read by the empty-background click handler below — all three
   *  hooks report "the mouseup that just fired was actually a drag/trim/
   *  stretch, not a click", so this handler can bail rather than
   *  deselecting the clip the user just edited. */
  wasJustDragging: () => boolean;
  wasJustTrimming: () => boolean;
  wasJustStretching: () => boolean;
  /** Track-level keyboard nav/reorder — from useTrackKeyboardHandlers (Task 5.7). */
  onTrackNavigateVertical: (trackIndex: number, direction: 1 | -1, shiftKey?: boolean, decouple?: boolean) => void;
  onTrackReorder: (trackIndex: number, direction: 1 | -1, wasContainerFocused: boolean) => void;
  /**
   * Cross-hook ref contracts, threaded in verbatim from Canvas so the
   * clip callbacks below (moved here character-for-character from
   * Canvas.tsx's old per-track render loop) keep mutating exactly the
   * refs the sibling drag/trim/stretch hooks read: onClipClick resets
   * didDragRef/justSelectedOnMouseDownRef, onClipTrimEdge seeds
   * clipTrimStateRef.current, onClipStretchEdge calls startClipStretch.
   */
  didDragRef: React.MutableRefObject<boolean>;
  justSelectedOnMouseDownRef: React.MutableRefObject<boolean>;
  clipTrimStateRef: React.MutableRefObject<ClipTrimState | null>;
  clipStretchStateRef: React.MutableRefObject<ClipStretchState | null>;
  startClipStretch: (stretchState: ClipStretchState) => void;
  beginCmdMove: () => void;
  /** Factory that builds a new track template for keyboard drop-below.
   *  Signature matches useClipDragging's buildTrackForDrop. */
  buildTrackForDrop?: (indexAmongNew: number, sourceTrackIndex: number) => Track;
}

/**
 * Renders the per-track tree: one memoized `CanvasTrack` per track, each an
 * absolutely-positioned wrapper `<div>` containing a `TrackNew` plus (for
 * label tracks) a `LabelRenderer` overlay. The clip/track callback bodies
 * live inside `CanvasTrack` and close over its `track`/`trackIndex` props —
 * verbatim moves of Canvas.tsx's original per-track render loop. DOM
 * structure (element order, z-index/overflow contracts) is unchanged.
 *
 * PERF CONTRACT: `CanvasTrack` is React.memo'd, two ways:
 * - Playhead ticks (SET_PLAYHEAD_POSITION keeps `state.tracks` and every
 *   prop identity-stable) skip reconciling every track/clip at 60 fps.
 * - Track EDITS re-render only the affected row: the whole `tracks` array
 *   is deliberately NOT a CanvasTrack prop — handlers read it through
 *   `tracksRef` at event time, and the render-time derivations that
 *   depend on other tracks (yOffset, trackCount, anySoloed) are computed
 *   in the parent and passed as cheap value props.
 * Anything added to CanvasTrackListProps must stay reference-stable across
 * playhead ticks (useCallback/useMemo/refs at the source), and anything a
 * row RENDERS from must be a value prop (never tracksRef) or the row won't
 * repaint when it changes.
 */
/** Shared empty set so tracks the marquee isn't touching keep a
 *  stable prop identity and stay memo-skipped for the whole drag. */
const NO_MARQUEE_CLIPS: ReadonlySet<number> = new Set<number>();

export function CanvasTrackList(props: CanvasTrackListProps) {
  // marqueePreview is pulled OUT of the spread: each row gets only its
  // own slice, so sweeping the rectangle re-renders the rows whose
  // membership changed rather than the whole canvas.
  const { tracks, marqueePreview, ...rest } = props;

  // Ref-mirror (see CLAUDE.md): CanvasTrack's HANDLERS need the full tracks
  // array (cross-track keyboard move/trim/stretch scans), but taking it as
  // a memo prop would re-render EVERY row on ANY track edit. Handlers read
  // the live array through this ref at event time instead; render-time
  // derivations that genuinely depend on other tracks (yOffset, count,
  // anySoloed) are computed here and passed as cheap value props.
  const tracksRef = React.useRef(tracks);
  tracksRef.current = tracks;

  // Solo overrides per-track mute visuals: when any track is soloed,
  // every non-soloed track reads as effectively muted (matches the audio
  // behaviour). Computed once per render. Folder solo counts through
  // its children (cascade), never through the folder row itself.
  const anySoloed = tracks.some((t, i) => t.type !== 'folder' && effectiveTrackSoloed(tracks, i));

  // Collapse/expand tween — the same hook the panel column runs, fed the
  // same flags, so both columns start and end on the same commit.
  const collapse = useCollapseTransition(
    tracks.map((_t, i) => isHiddenByCollapse(tracks, i)),
    tracks.map((t) => t.id),
  );
  const TWEEN = `${GROUP_COLLAPSE_MS}ms ${GROUP_COLLAPSE_EASING}`;
  // Where a group's members sit when the group is closed: just under
  // its header. Hiding rows tween to it; revealing rows grow from it.
  const collapsedTopOf = (folderId: number | undefined): number => {
    const fi = tracks.findIndex((t) => t.type === 'folder' && t.id === folderId);
    return fi < 0 ? 0 : calculateTrackYOffset(fi, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT) + FOLDER_ROW_HEIGHT + TRACK_GAP;
  };
  const collapseStyle = (index: number): React.CSSProperties => {
    if (collapse.hiding.has(index)) {
      return { height: 0, overflow: 'hidden', transition: `top ${TWEEN}, height ${TWEEN}` };
    }
    if (collapse.revealing.has(index)) {
      return {
        overflow: 'hidden',
        animation: `canvas-row-expand ${TWEEN}`,
        ['--row-from-top' as string]: `${collapsedTopOf(tracks[index]?.folderId)}px`,
      } as React.CSSProperties;
    }
    // Everything else slides to its new place while a group is moving.
    return collapse.animating ? { transition: `top ${TWEEN}` } : {};
  };

  // While a reorder drag is live, stack the rows in previewed order so
  // the canvas shows the landing exactly as the panel column does.
  const previewOrder = props.dragPreview?.order;
  const previewYOffsets = React.useMemo(() => {
    if (!previewOrder) return null;
    const map = new Map<number, number>();
    let y = TOP_GAP;
    for (const ti of previewOrder) {
      const h = effectiveTrackHeight(tracks, ti, DEFAULT_TRACK_HEIGHT);
      if (h === 0) continue;
      map.set(ti, y);
      y += h + TRACK_GAP;
    }
    return map;
  }, [previewOrder, tracks]);

  return (
    <>
      {tracks.map((track, trackIndex) => {
        // Folders v1: children of a collapsed folder render nowhere
        // (still fully functional); the folder itself is a slim row.
        // Hidden rows render nowhere — except mid-tween, when a row
        // that just hid stays mounted so it can shrink away.
        if (isHiddenByCollapse(tracks, trackIndex) && !collapse.hiding.has(trackIndex)) return null;
        // A reorder drag lays the canvas out in the PREVIEWED order,
        // with the dragged rows ghosted in their landing spot — the
        // same thing the track control panel shows.
        const preview = props.dragPreview;
        const yOffset = previewYOffsets
          ? previewYOffsets.get(trackIndex) ?? 0
          : calculateTrackYOffset(trackIndex, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT);
        const ghosted = preview?.ghostIndices.includes(trackIndex) ?? false;
        if (track.type === 'folder') {
          const childIndices = folderChildIndices(tracks, trackIndex);
          const childCount = childIndices.length;
          // The band is the whole family's FIELD, as the panel's is: from
          // the header down to the floor under the last member. The lanes
          // are opaque and sit on top, so the group colour shows through
          // the gaps between them and in the floor — the canvas twin of
          // the cards sitting on the strip. Collapsed (or while a reorder
          // drag previews positions the model doesn't hold), it is the
          // header strip alone. Always mounted, so a collapse/expand
          // tweens its height along with the rows.
          const lastChild = childIndices.length > 0 ? childIndices[childIndices.length - 1] : -1;
          const familyHeight = !track.collapsed && lastChild >= 0 && !previewYOffsets
            ? calculateTrackYOffset(lastChild, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT)
              + effectiveTrackHeight(tracks, lastChild, DEFAULT_TRACK_HEIGHT)
              + GROUP_END_PAD
              - yOffset
            : FOLDER_ROW_HEIGHT;
          return (
            <div
              key={track.id}
              data-track-index={trackIndex}
              data-folder-row
              style={{
                position: 'absolute',
                top: yOffset,
                left: 0,
                right: 0,
                height: familyHeight,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '0 12px',
                // The group header is ONE band running the full width
                // of the editor: the panel draws the same strip at the
                // same height, so the two columns read as a single row
                // across the seam. Darker than the lanes it caps —
                // it is chrome, not content.
                // No edges, expanded or collapsed: the tone change is
                // the divider. Outlined, the band read as a boxed
                // control sitting in the canvas rather than a strip of
                // it (user decision 2026-09-23).
                background: 'rgba(0, 0, 0, 0.28)',
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                pointerEvents: 'none',
                opacity: ghosted ? 0.55 : undefined,
                ...collapseStyle(trackIndex),
                // The field's height moves with the family, on the same
                // clock as the rows.
                ...(collapse.animating ? { transition: `top ${TWEEN}, height ${TWEEN}` } : null),
              }}
            >
              {/* Sticky so the group's name stays readable however far
                  the canvas is scrolled — the band runs the whole
                  timeline, and a label pinned to its far-left start
                  scrolls out of sight exactly when a long project most
                  needs to say which group a lane belongs to. Shown
                  collapsed as well as expanded: a collapsed group used
                  to swap the name for squashed outlines of its
                  children's clips, which said less than the name. */}
              <span
                data-folder-label
                style={{
                  position: 'sticky',
                  // 12 = the band's own left padding, so the label
                  // holds the SAME inset when pinned as it has at
                  // scroll 0 and never visibly jumps.
                  left: 12,
                  // The header strip's height: the label lives in the
                  // top of the field, not centred in the whole family.
                  height: FOLDER_ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontWeight: 600 }}>{track.name}</span>
                <span style={{ opacity: 0.6 }}>
                  {childCount} track{childCount === 1 ? '' : 's'}
                </span>
              </span>
            </div>
          );
        }
        return (
          <CanvasTrack
            key={track.id}
            {...rest}
            track={track}
            trackIndex={trackIndex}
            anySoloed={anySoloed}
            tracksRef={tracksRef}
            yOffset={yOffset}
            ghosted={ghosted}
            trackCount={tracks.length}
            collapseStyle={collapseStyle(trackIndex)}
            marqueePreviewClipIds={
              marqueePreview ? marqueePreview.get(trackIndex) ?? NO_MARQUEE_CLIPS : null
            }
          />
        );
      })}
    </>
  );
}

interface CanvasTrackProps extends Omit<CanvasTrackListProps, 'tracks' | 'marqueePreview'> {
  track: Track;
  trackIndex: number;
  /** This row's slice of the marquee preview (see marqueePreview on
   *  the list props). Null when no marquee is in flight. */
  marqueePreviewClipIds: ReadonlySet<number> | null;
  anySoloed: boolean;
  /** Live tracks array for event-time reads only — never render from it
   *  (a memo-skipped row would hold no stale data, but renders must come
   *  from the value props above so rows repaint when they change). */
  tracksRef: React.MutableRefObject<Track[]>;
  yOffset: number;
  /** Drawn translucent while this row is the one being dragged (it
   *  already sits in its previewed landing spot) */
  ghosted?: boolean;
  trackCount: number;
  /** This row's part in a running collapse/expand tween — see the
   *  parent's collapseStyle. Empty object when nothing is moving. */
  collapseStyle: React.CSSProperties;
}

const CanvasTrack = React.memo(function CanvasTrack({
  ghosted,
  collapseStyle,
  selectedTrackIndices,
  focusedTrackIndex,
  selectedLabelIds,
  width,
  pixelsPerSecond,
  envelopeMode,
  isFlatNavigation,
  trackBase,
  timeSelection,
  isTimeSelectionDragging,
  clipStyle,
  recordingClipId,
  showRmsInWaveform,
  showQuickFadeHandles,
  draggingClipIds,
  raisedClipIds,
  marqueePreviewClipIds,
  hoveredMidiClipId,
  onHoverMidiClip,
  onTrackFocusChange,
  onTrackContainerFocusChange,
  onEnterTrackPanel,
  onShiftTabFromTrack,
  onContainerEnter,
  onTabFromLastClip,
  onClipMenuClick,
  envelopePointSizes,
  spectrogramScale,
  hoveredEar,
  hoveredBanner,
  setHoveredEar,
  setHoveredBanner,
  selectionAnchor,
  setSelectionAnchor,
  wasJustDragging,
  wasJustTrimming,
  wasJustStretching,
  onTrackNavigateVertical,
  onTrackReorder,
  didDragRef,
  justSelectedOnMouseDownRef,
  clipTrimStateRef,
  clipStretchStateRef,
  startClipStretch,
  beginCmdMove,
  buildTrackForDrop,
  track,
  trackIndex,
  anySoloed,
  tracksRef,
  yOffset,
  trackCount,
}: CanvasTrackProps) {
  const dispatch = useTracksDispatch();

  // Memoized so playhead ticks (which keep track/clips identity) hand
  // TrackNew the same clips array — its React.memo depends on it. The
  // RMS-stripping map used to run inline on every render, minting fresh
  // clip objects 60x/sec during playback.
  const trackClips = React.useMemo(() => (
    track.type === 'midi'
      ? (track.midiClips || []).map((mc) => ({
          id: mc.id, name: mc.name, start: mc.start,
          duration: mc.duration, trimStart: mc.trimStart ?? 0,
          envelopePoints: [],
          selected: mc.selected, color: mc.color || track.color,
          midiNotes: mc.notes,
        }))
      : showRmsInWaveform ? track.clips : track.clips.map((clip) => ({
          ...clip,
          waveformRms: undefined,
          waveformLeftRms: undefined,
          waveformRightRms: undefined,
        }))
  ), [track.type, track.midiClips, track.clips, track.color, showRmsInWaveform]);

  const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;
  const isSelected = selectedTrackIndices.includes(trackIndex);
  const isFocused = focusedTrackIndex === trackIndex;
  const effectivelyMuted =
    effectiveTrackMuted(tracksRef.current, trackIndex)
    || (anySoloed && !effectiveTrackSoloed(tracksRef.current, trackIndex));

  return (
    <div
      key={track.id}
      style={{
        position: 'absolute',
        top: `${yOffset}px`,
        left: 0,
        width: `${width}px`,
        height: `${trackHeight}px`,
        overflow: 'visible', // Allow focus outline to show
        // Ghosted while this row is the one being dragged — it already
        // sits in its previewed landing spot
        opacity: ghosted ? 0.55 : undefined,
        // Last, so a tween can override height/overflow for its duration
        ...collapseStyle,
      }}
      onClick={(e) => {
        // Only handle clicks on empty space (not on clips or labels)
        // Check if click was on TrackNew background or wrapper
        const target = e.target as HTMLElement;
        const isTrackBackground = target.classList?.contains('track') || e.target === e.currentTarget;

        if (isTrackBackground) {
          // Handle Shift+Click for range selection FIRST (before drag check)
          // This allows Shift+Click to work even after setting playhead
          if (e.shiftKey) {
            // Deselect all clips
            dispatch({ type: 'DESELECT_ALL_CLIPS' });

            // Use the first selected track as anchor if no anchor is set
            const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : trackIndex);
            if (selectionAnchor === null && setSelectionAnchor) {
              setSelectionAnchor(anchor);
            }

            // Calculate range selection from anchor to clicked track
            const start = Math.min(anchor, trackIndex);
            const end = Math.max(anchor, trackIndex);
            const newSelection: number[] = [];
            for (let i = start; i <= end; i++) {
              newSelection.push(i);
            }
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });

            // Set this track as focused
            dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
            // Clear label selections
            dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
            return; // Done with Shift+Click handling
          }

          // Don't handle regular clicks if we just finished dragging (creating time selection),
          // trimming, or stretching — all three synthesise a click on the track LCA at
          // mouseup, and dispatching DESELECT_ALL_CLIPS here would clear the just-edited clip.
          if (wasJustDragging() || wasJustTrimming() || wasJustStretching()) {
            return;
          }

          // Regular click on empty track background:
          //  - Clear clip selection (canvas clicks outside a
          //    clip drop clip focus).
          //  - Move focus to the clicked track (blue outline
          //    follows the click).
          //  - Clear label selection.
          //  - Track selection itself is NOT touched — it's
          //    an explicit gesture (side panel, Shift+Click,
          //    Cmd+click).
          dispatch({ type: 'DESELECT_ALL_CLIPS' });
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
          dispatch({ type: 'SET_SELECTED_LABELS', payload: [] });
        }
      }}
    >
      <TrackNew
        clips={trackClips}
        height={trackHeight}
        trackIndex={trackIndex}
        spectrogramMode={track.viewMode === 'spectrogram'}
        splitView={track.viewMode === 'split'}
        envelopeMode={envelopeMode}
        isSelected={isSelected}
        isFocused={isFocused}
        isMuted={effectivelyMuted}
        isLabelTrack={track.type === 'label'}
        isMidiTrack={track.type === 'midi'}
        pixelsPerSecond={pixelsPerSecond}
        width={width}
        tabIndex={isFlatNavigation ? 0 : (trackBase + 2 + trackIndex * 4)}
        trackTabIndex={isFlatNavigation ? 0 : (trackBase + trackIndex * 4)}
        trackName={track.name}
        onTrackNavigateVertical={(direction, shiftKey, decouple) =>
          onTrackNavigateVertical(trackIndex, direction, shiftKey, decouple)
        }
        onTrackReorder={(direction, wasContainerFocused) =>
          onTrackReorder(trackIndex, direction, wasContainerFocused)
        }

        timeSelection={timeSelection && (timeSelection.renderOnCanvas !== false) ? timeSelection : null}
        isTimeSelectionDragging={isTimeSelectionDragging}
        clipStyle={clipStyle}
        color={track.color}
        recordingClipId={recordingClipId}
        onFocusChange={(hasFocus) => onTrackFocusChange?.(trackIndex, hasFocus)}
        onContainerFocusChange={(hasFocus) => onTrackContainerFocusChange?.(trackIndex, hasFocus)}
        onEnterPanel={() => onEnterTrackPanel?.(trackIndex)}
        onShiftTabOut={() => onShiftTabFromTrack?.(trackIndex)}
        onContainerEnter={(modifiers) => onContainerEnter?.(trackIndex, modifiers)}
        onTabFromLastClip={() => onTabFromLastClip?.(trackIndex)}
        hoveredClipId={track.type === 'midi' ? hoveredMidiClipId : undefined}
        onHoverClip={track.type === 'midi' ? onHoverMidiClip : undefined}
        draggingClipIds={draggingClipIds}
        raisedClipIds={raisedClipIds}
        marqueePreviewClipIds={marqueePreviewClipIds}
        onClipMove={(clipId, deltaSeconds) => {
          const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
          if (!clip) return;
          // Ensure the focused clip is selected so it moves with the group
          if (!clip.selected) {
            dispatch({
              type: 'SELECT_CLIP',
              payload: { trackIndex, clipId: clipId as number },
            });
          }
          dispatch({
            type: 'MOVE_SELECTED_CLIPS',
            payload: { deltaSeconds },
          });
          // Defer overlap resolution to when the user releases
          // Cmd/Ctrl — otherwise a Cmd+Arrow nudge across
          // several clips would leave a trail of eaten
          // neighbors between the start and end position.
          pendingClipMoveResolution.current = true;
          beginCmdMove();

          // Scroll focused clip into view
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const clipEl = document.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement;
              if (clipEl) scrollIntoViewIfNeeded(clipEl);
            });
          });
        }}
        onClipMoveToTrack={(clipId, direction) => {
          const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
          if (!clip) return;
          // Ensure the focused clip is selected so it moves with the group
          if (!clip.selected) {
            dispatch({
              type: 'SELECT_CLIP',
              payload: { trackIndex, clipId: clipId as number },
            });
          }
          // Detect whether the move would push the bottommost selected clip
          // past the last track. If so, and we have the factory, dispatch the
          // combined create-and-move action for single-step undo.
          const maxSelectedTrackIndex = tracksRef.current.reduce((max, t, ti) => {
            const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
            return hasSelected ? Math.max(max, ti) : max;
          }, -1);
          const minSelectedTrackIndex = tracksRef.current.reduce((min, t, ti) => {
            const hasSelected = t.clips.some(c => c.selected) || (t.midiClips || []).some(c => c.selected);
            return hasSelected ? Math.min(min, ti) : min;
          }, Infinity);
          const wouldOverflow = direction === 1 && maxSelectedTrackIndex + 1 >= tracksRef.current.length;
          // Top clip already at track 0 — nothing to do, keep focus where it is.
          if (direction === -1 && minSelectedTrackIndex === 0) return;

          if (wouldOverflow && buildTrackForDrop) {
            const template = buildTrackForDrop(0, trackIndex);
            dispatch({
              type: 'MOVE_SELECTED_CLIPS_TO_NEW_TRACK',
              payload: { newTrack: template },
            });
            provisionalKeyboardTrackIds.current.add(template.id);
          } else {
            dispatch({
              type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
              payload: { direction: direction as 1 | -1 },
            });
          }
          // Follow the initiating clip: it moves from trackIndex to
          // trackIndex+direction. For overflow the new track isn't in
          // `tracks` yet, so skip the upper-bound guard in that case.
          const newTrackIndex = trackIndex + direction;
          if (newTrackIndex >= 0 && (wouldOverflow || newTrackIndex < tracksRef.current.length)) {
            dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
          }
          // Defer overlap resolution to Cmd/Ctrl release — see
          // onClipMove above for the same rationale.
          pendingClipMoveResolution.current = true;
          beginCmdMove();
          // Always follow the initiating clip to its new DOM position.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const movedClip = document.querySelector(`[data-clip-id="${clipId}"]`) as HTMLElement;
              if (movedClip) {
                movedClip.focus({ preventScroll: true });
                scrollIntoViewIfNeeded(movedClip);
              }
            });
          });
        }}
        onClipNavigateVertical={(clipId, direction) => {
          // Find the source clip's start time
          const sourceClip = track.clips.find(c => c.id === clipId);
          const sourceStart = sourceClip?.start ?? 0;

          // Search tracks in the given direction, wrapping around
          const trackCount = tracksRef.current.length;
          for (let i = 1; i <= trackCount; i++) {
            const candidateIndex = ((trackIndex + direction * i) % trackCount + trackCount) % trackCount;
            const candidateTrackData = tracksRef.current[candidateIndex];
            if (candidateTrackData.clips.length === 0) continue;

            // Find the clip closest in start time
            let closestClip = candidateTrackData.clips[0];
            let closestDist = Math.abs(closestClip.start - sourceStart);
            for (const c of candidateTrackData.clips) {
              const dist = Math.abs(c.start - sourceStart);
              if (dist < closestDist) {
                closestClip = c;
                closestDist = dist;
              }
            }

            // Focus the closest clip element
            const candidateTrack = document.querySelector(`[data-track-index="${candidateIndex}"]`);
            if (candidateTrack) {
              const clipEl = candidateTrack.querySelector(`[data-clip-id="${closestClip.id}"]`) as HTMLElement;
              if (clipEl) {
                setTimeout(() => {
                  clipEl.focus({ preventScroll: true });
                  // onFocus handler on the clip handles scroll-into-view
                }, 0);
                return;
              }
            }
          }
          // No track with clips found — don't move focus
        }}
        onClipTrim={(clipId, edge, deltaSeconds) => {
          // Pressing [ or ] on a focused clip always makes
          // it the selected clip — even when the trim
          // itself hits a source boundary and the reducer
          // no-ops. Selection is the "you're operating on
          // this" signal, independent of whether the edge
          // actually moved.
          const focusedClip = tracksRef.current[trackIndex]?.clips.find((c) => c.id === clipId)
            || (tracksRef.current[trackIndex]?.midiClips || []).find((c) => c.id === clipId);
          if (focusedClip && !focusedClip.selected) {
            dispatch({
              type: 'SELECT_CLIP',
              payload: { trackIndex, clipId: clipId as number },
            });
          }

          // Collect every selected clip (audio + MIDI). If the
          // shortcut was triggered on a not-yet-selected clip we
          // still trim that one. The same canvas-time delta is
          // applied to each clip independently, with per-clip
          // bounds checks against its own source duration.
          const targets: KeyboardTrimTarget[] = [];
          tracksRef.current.forEach((t, tIndex) => {
            t.clips.forEach((c) => {
              if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                targets.push({ trackIndex: tIndex, clip: c });
              }
            });
            (t.midiClips || []).forEach((c) => {
              if (c.selected) {
                targets.push({ trackIndex: tIndex, clip: c });
              }
            });
          });

          // Dedupe (the dispatched clip may already be in selection).
          const seen = new Set<string>();
          const uniqueTargets = targets.filter(({ trackIndex: ti, clip }) => {
            const key = `${ti}-${clip.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Per-clip trim math is pure — computed in clipKeyboardEdit.ts
          // and unit-tested there. Overlap is legal (2026-09-21): a trim
          // that extends across a neighbour overlaps it, same as the
          // mouse-trim path — no neighbour is eaten.
          const { updates } = computeKeyboardTrimBatch(uniqueTargets, edge, deltaSeconds);

          for (const update of updates) {
            dispatch({
              type: 'TRIM_CLIP',
              payload: {
                trackIndex: update.trackIndex,
                clipId: update.clipId,
                newTrimStart: update.newTrimStart,
                newDuration: update.newDuration,
                newStart: update.newStart,
              },
            });
          }

          // Screen-reader announcement of the resulting duration.
          // The focused clip's aria-label updates with the new
          // duration on re-render but VoiceOver doesn't re-read
          // the focused element's label automatically — push it
          // through the live region so each keyboard trim is
          // audible. Use the originating clip's new duration.
          const focused = uniqueTargets.find(
            (t) => t.trackIndex === trackIndex && t.clip.id === clipId,
          ) ?? uniqueTargets[0];
          if (focused) {
            announce(computeKeyboardTrimAnnouncement(focused.clip, deltaSeconds));
          }
        }}
        onClipStretch={(clipId, edge, deltaSeconds) => {
          // Keyboard time-stretch (Alt+Arrow). Sign convention
          // matches onClipTrim: positive delta shrinks the clip
          // from `edge`, negative grows it.
          // Applied to every selected clip; if the originating
          // clip isn't currently selected we still stretch it.
          const targets: KeyboardTrimTarget[] = [];
          tracksRef.current.forEach((t, tIndex) => {
            t.clips.forEach((c) => {
              if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                targets.push({ trackIndex: tIndex, clip: c });
              }
            });
            (t.midiClips || []).forEach((c) => {
              if (c.selected) {
                targets.push({ trackIndex: tIndex, clip: c });
              }
            });
          });
          const seen = new Set<string>();
          const uniqueTargets = targets.filter(({ trackIndex: ti, clip }) => {
            const key = `${ti}-${clip.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Time-stretch is audio-only — stretchFactor never
          // applies to MidiClip (the STRETCH_CLIP reducer only
          // touches track.clips). MidiClip targets are skipped.
          for (const { trackIndex: ti, clip } of uniqueTargets) {
            if ('notes' in clip) continue; // MidiClip — stretch doesn't apply
            const result = computeKeyboardStretch({ clip, edge, deltaSeconds });
            if (!result) continue;
            dispatch({
              type: 'STRETCH_CLIP',
              payload: {
                trackIndex: ti,
                clipId: clip.id,
                newDuration: result.newDuration,
                newStretchFactor: result.newStretchFactor,
                newStart: result.newStart,
              },
            });
          }
          // Announce the resulting duration of the originating
          // clip — VoiceOver won't re-read the focused element's
          // label on its own after the stretch reducer runs.
          const focused = uniqueTargets.find(
            (t) => t.trackIndex === trackIndex && t.clip.id === clipId,
          ) ?? uniqueTargets[0];
          if (focused) {
            announce(computeKeyboardStretchAnnouncement(focused.clip, deltaSeconds));
          }
        }}
        onEnvelopePointsChange={(clipId, points) => {
          dispatch({
            type: 'UPDATE_CLIP_ENVELOPE_POINTS',
            payload: { trackIndex, clipId: clipId as number, envelopePoints: points },
          });
        }}
        onClipMenuClick={(clipId, x, y, openedViaKeyboard) => {
          onClipMenuClick?.(clipId as number, trackIndex, x, y, openedViaKeyboard);
        }}
        onClipRename={(clipId, newName) => {
          dispatch({
            type: 'UPDATE_CLIP',
            payload: {
              trackIndex,
              clipId: clipId as number,
              updates: { name: newName },
            },
          });
        }}
        onClipClick={(clipId, shiftKey, metaKey) => {
          // Don't change selection if we just finished dragging
          if (didDragRef.current) {
            didDragRef.current = false; // Reset immediately after blocking one click
            return;
          }

          // Don't deselect if we just selected this clip on mouse down
          if (justSelectedOnMouseDownRef.current) {
            justSelectedOnMouseDownRef.current = false; // Reset immediately after blocking one click
            return;
          }

          if (shiftKey) {
            // Shift+click: range selection (select all clips between last selected and this one)
            dispatch({
              type: 'SELECT_CLIP_RANGE',
              payload: { trackIndex, clipId: clipId as number },
            });
          } else if (metaKey) {
            // Cmd/Ctrl+click: toggle selection (add/remove from multi-selection)
            dispatch({
              type: 'TOGGLE_CLIP_SELECTION',
              payload: { trackIndex, clipId: clipId as number },
            });
            // Move track focus outline to this track
            dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
          } else {
            // Regular click/Enter: if the clip is already
            // selected, leave the selection alone — a click on
            // an already-selected clip's header shouldn't drop
            // the selection. Only fire SELECT_CLIP when the
            // clip is currently unselected.
            const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
            const isSelected = clip?.selected || false;
            if (!isSelected) {
              dispatch({
                type: 'SELECT_CLIP',
                payload: { trackIndex, clipId: clipId as number },
              });
            }
          }
        }}
        onClipTrimEdge={(clipId, edge) => {
          // Find the clip being trimmed
          const clip = track.clips.find(c => c.id === clipId) || (track.midiClips || []).find(c => c.id === clipId);
          if (!clip) return;

          // Initialize trim state on first call
          if (!clipTrimStateRef.current) {
            // Select the clip if it's not already selected
            if (!clip.selected) {
              dispatch({
                type: 'SELECT_CLIP',
                payload: { trackIndex, clipId: clipId as number },
              });
            }

            // Store initial state for all selected clips (including the one we just selected)
            const allClipsInitialState = new Map<string, { trimStart: number; duration: number; start: number; fullDuration: number; isMidi?: boolean; stretchFactor?: number }>();
            tracksRef.current.forEach((t, tIndex) => {
              const isMidiTrack = t.type === 'midi';
              const allTrackClips = [...t.clips, ...(t.midiClips || [])];
              allTrackClips.forEach(c => {
                // Include this clip even if it wasn't selected before (we just selected it)
                if (c.selected || (tIndex === trackIndex && c.id === clipId)) {
                  const isMidi = isMidiTrack || (t.midiClips || []).some((mc) => mc.id === c.id);
                  const trimStart = (c as Clip).trimStart || 0;
                  const stretchFactor = (c as any).stretchFactor ?? 1; // justified: stretchFactor not on Clip/MidiClip type
                  // fullDuration is the source-audio length. If we don't
                  // have it stored yet, recover it from the visible duration
                  // by dividing by stretchFactor (canvas → source seconds).
                  const fullDuration = (c as Clip).fullDuration || (trimStart + c.duration / stretchFactor);
                  const key = `${tIndex}-${c.id}`;
                  allClipsInitialState.set(key, {
                    trimStart,
                    duration: c.duration,
                    start: c.start,
                    fullDuration,
                    isMidi,
                    stretchFactor,
                  });
                }
              });
            });

            clipTrimStateRef.current = {
              trackIndex,
              clipId: clipId as number,
              edge,
              initialTrimStart: (clip as Clip).trimStart || 0,
              initialDuration: clip.duration,
              initialClipStart: clip.start,
              allClipsInitialState,
            };
          }

          // The actual trimming happens in the mousemove handler
        }}
        onClipFadeShapeChange={showQuickFadeHandles ? (clipId, side, shape) => {
          dispatch({
            type: 'SET_CLIP_FADE_SHAPE',
            payload: { trackIndex, clipId: clipId as number, side, shape },
          });
        } : undefined}
        onCrossfadeShapeChange={(outgoingClipId, incomingClipId, outShape, inShape) => {
          dispatch({
            type: 'SET_CROSSFADE_SHAPE',
            payload: {
              trackIndex,
              outgoingClipId: outgoingClipId as number,
              incomingClipId: incomingClipId as number,
              outShape,
              inShape,
            },
          });
        }}
        onCrossfadeRoll={(outgoingClipId, incomingClipId, deltaSeconds) => {
          dispatch({
            type: 'ROLL_CROSSFADE',
            payload: {
              trackIndex,
              outgoingClipId: outgoingClipId as number,
              incomingClipId: incomingClipId as number,
              deltaSeconds,
            },
          });
        }}
        onClipFadeChange={showQuickFadeHandles ? (clipId, side, seconds) => {
          dispatch({
            type: 'SET_CLIP_FADE',
            payload: { trackIndex, clipId: clipId as number, side, seconds },
          });
        } : undefined}
        onClipStretchEdge={(clipId, edge) => {
          // Only initialize once per drag — Clip.tsx calls back on every
          // mousemove. Subsequent mousemoves are handled inside the
          // stretch hook against the snapshot we capture here.
          if (clipStretchStateRef.current) return;
          const clip = track.clips.find(c => c.id === clipId);
          if (!clip) return;
          if (!clip.selected) {
            dispatch({
              type: 'SELECT_CLIP',
              payload: { trackIndex, clipId: clipId as number },
            });
          }
          // Snapshot initial state for every selected clip
          // (audio + MIDI) so the stretch hook can apply the
          // dragged clip's ratio across all of them. Include
          // the dragged clip even if it wasn't selected before —
          // we just selected it above.
          const allClipsInitialState: Array<{
            trackIndex: number;
            clipId: number;
            isMidi: boolean;
            initialDuration: number;
            initialStart: number;
            initialStretchFactor: number;
          }> = [];
          tracksRef.current.forEach((t, tIndex) => {
            t.clips.forEach((c) => {
              if (
                c.selected
                || (tIndex === trackIndex && c.id === clipId)
              ) {
                allClipsInitialState.push({
                  trackIndex: tIndex,
                  clipId: c.id as number,
                  isMidi: false,
                  initialDuration: c.duration,
                  initialStart: c.start,
                  initialStretchFactor: (c as any).stretchFactor ?? 1, // justified: stretchFactor not on Clip type
                });
              }
            });
            (t.midiClips || []).forEach((c) => {
              if (c.selected) {
                allClipsInitialState.push({
                  trackIndex: tIndex,
                  clipId: c.id,
                  isMidi: true,
                  initialDuration: c.duration,
                  initialStart: c.start,
                  initialStretchFactor: (c as any).stretchFactor ?? 1, // justified: stretchFactor not on MidiClip type
                });
              }
            });
          });
          startClipStretch({
            trackIndex,
            clipId: clipId as number,
            edge,
            initialDuration: clip.duration,
            initialStart: clip.start,
            initialStretchFactor: (clip as any).stretchFactor ?? 1, // justified: stretchFactor not on Clip type
            allClipsInitialState,
          });
        }}
        envelopePointSizes={envelopePointSizes}
        spectrogramScale={track.spectrogramScale ?? spectrogramScale}
        channelSplitRatio={track.channelSplitRatio}
        onChannelSplitRatioChange={(ratio) => {
          dispatch({
            type: 'UPDATE_CHANNEL_SPLIT_RATIO',
            payload: { index: trackIndex, ratio },
          });
        }}
        onTrackClick={(e) => {
          // Plain click: move focus only. Track selection is
          // now sticky — a canvas click doesn't collapse the
          // selection to the clicked row. Shift+Click still
          // extends a range from the anchor (explicit
          // gesture).
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });

          if (e.shiftKey) {
            const anchor = selectionAnchor ?? (selectedTrackIndices.length > 0 ? selectedTrackIndices[0] : trackIndex);
            if (selectionAnchor === null) {
              setSelectionAnchor(anchor);
            }
            const start = Math.min(anchor, trackIndex);
            const end = Math.max(anchor, trackIndex);
            const newSelection: number[] = [];
            for (let i = start; i <= end; i++) {
              newSelection.push(i);
            }
            dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
          }
        }}
      />

      {/* Render labels for label tracksRef.current */}
      {track.labels && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none', // Allow clicks to pass through to children
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <LabelRenderer
              labels={track.labels}
              trackColor={track.color}
              trackIndex={trackIndex}
              trackHeight={track.height || 114}
              pixelsPerSecond={pixelsPerSecond}
              clipContentOffset={CLIP_CONTENT_OFFSET}
              selectedLabelIds={selectedLabelIds}
              hoveredEar={hoveredEar}
              hoveredBanner={hoveredBanner}
              trackCount={trackCount}
              selectedTrackIndices={selectedTrackIndices}
              setHoveredEar={setHoveredEar}
              setHoveredBanner={setHoveredBanner}
              dispatch={dispatch}
            />
          </div>
        </div>
      )}
    </div>
  );
});
