import React, { useRef, useEffect, useState } from 'react';
import { TrackNew, useAudioSelection, SpectralSelectionOverlay, CLIP_CONTENT_OFFSET, useAccessibilityProfile, useTabOrder, useTheme, scrollIntoViewIfNeeded, announce, formatTimeForA11y } from '@dilsonspickles/components';
import type { SpectrogramScale } from '@dilsonspickles/components';
import { ENVELOPE_POINT_STYLES, type EnvelopePointStyleKey, type SnapGrid, type MidiClip } from '@audacity-ui/core';
import { useTracksState, useTracksDispatch, type Clip } from '../contexts/TracksContext';
import { useSpectralSelection } from '../contexts/SpectralSelectionContext';
import { useEditingBehaviorPrefs, useAppearancePrefs } from '@dilsonspickles/components';
import { useClipDragging } from '../hooks/useClipDragging';
import { useClipTrimming } from '../hooks/useClipTrimming';
import { useClipStretching } from '../hooks/useClipStretching';
import { useLabelDragging } from '../hooks/useLabelDragging';
import { useClipMouseDown } from '../hooks/useClipMouseDown';
import { useContainerClick } from '../hooks/useContainerClick';
import { useMarqueeSelection } from '../hooks/useMarqueeSelection';
import { useSplitTool } from '../hooks/useSplitTool';
import { resolveOverlap, type ClipPlacement } from '../utils/resolveOverlap';
import { pendingClipMoveResolution } from '../utils/pendingClipMoveResolution';
import { resolveTimeSelectionScope } from '../utils/timeSelectionScope';
import { playheadAfterSelectionFinalize } from '../utils/playheadAfterFinalize';
import { LabelRenderer } from './LabelRenderer';
import { GridOverlay } from './GridOverlay';
import { calculateTrackYOffset } from '../utils/trackLayout';
import { resolveTrackIndexFromY } from '../utils/canvasGeometry';
import { computeCanvasHeights } from '../utils/canvasLayout';
import { resolveSnapGuideline } from '../utils/snapGuideline';
import { TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT, CLIP_HEADER_HEIGHT } from '../constants/canvas';
import type { SnapOptions } from '../utils/snapToGrid';
import './Canvas.css';

// Cursor served from the sandbox `public/` so the URL is stable regardless
// of bundler asset hashing or package-export resolution quirks.
const splitCursorUrl = '/Split.png';

export interface CanvasProps {
  /**
   * Width of the canvas in pixels
   */
  width?: number;
  /**
   * Pixels per second - zoom level
   * @default 100
   */
  pixelsPerSecond?: number;
  /**
   * Background color of the canvas
   * @default theme.background.surface.default
   */
  backgroundColor?: string;
  /**
   * Left padding in pixels (for alignment with ruler)
   * @default 0
   */
  leftPadding?: number;
  /**
   * Callback when clip menu button is clicked
   */
  onClipMenuClick?: (clipId: number, trackIndex: number, x: number, y: number, openedViaKeyboard?: boolean) => void;
  /**
   * Callback when time selection context menu is requested
   */
  onTimeSelectionMenuClick?: (x: number, y: number, trackIndex?: number) => void;
  /**
   * Callback when track keyboard focus changes
   */
  onTrackFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  /**
   * Callback when the track container itself gains/loses keyboard focus
   */
  onTrackContainerFocusChange?: (trackIndex: number, hasFocus: boolean) => void;
  /**
   * Callback when canvas height changes
   */
  onHeightChange?: (height: number) => void;
  /**
   * Whether to show RMS waveform overlay
   * @default true
   */
  showRmsInWaveform?: boolean;
  /**
   * Control point style for envelope points
   * @default 'default'
   */
  controlPointStyle?: EnvelopePointStyleKey;
  /**
   * Viewport height for calculating buffer space below last track
   * @default 0
   */
  viewportHeight?: number;
  /**
   * Extra vertical space rendered below the last track. Used to let
   * the user scroll content into the upper part of the viewport.
   * The beat / measure gridlines and measure bands extend through
   * this space so the canvas looks continuous, not cut-off.
   * @default 0
   */
  bottomBuffer?: number;
  /**
   * ID of the clip currently being recorded (shows recording state)
   */
  recordingClipId?: number | null;
  /**
   * Selection anchor for Shift+Click/Arrow range selection
   */
  selectionAnchor?: number | null;
  /**
   * Setter for selection anchor
   */
  setSelectionAnchor?: (anchor: number | null) => void;
  /**
   * Beats per minute for beat/measure grid lines
   * @default 120
   */
  bpm?: number;
  /**
   * Beats per measure for grid lines
   * @default 4
   */
  beatsPerMeasure?: number;
  /**
   * Time format — controls whether grid lines use beats/measures or minutes/seconds
   * @default 'beats-measures'
   */
  timeFormat?: 'minutes-seconds' | 'beats-measures';
  /**
   * Snap grid subdivision for beats-measures mode (independent from piano roll)
   * @default { subdivision: 1 }
   */
  snap?: SnapGrid;
  /**
   * Whether snapping to grid divisions is enabled
   * @default false
   */
  snapEnabled?: boolean;
  /**
   * Frequency scale for spectrogram rendering and ruler
   * @default 'mel'
   */
  spectrogramScale?: SpectrogramScale;
  /**
   * Callback when Tab is pressed on the track container to enter panel controls
   */
  onEnterTrackPanel?: (trackIndex: number) => void;
  /**
   * Callback when Shift+Tab is pressed on the track container to go to the previous track
   */
  onShiftTabFromTrack?: (trackIndex: number) => void;
  /**
   * Callback when Enter is pressed on the track container
   */
  onContainerEnter?: (trackIndex: number, modifiers: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;
  /**
   * Callback when Tab is pressed on the last clip of a track (to navigate to ruler)
   */
  onTabFromLastClip?: (trackIndex: number) => void;
  /**
   * Callback when a MIDI clip is double-clicked
   */
  onMidiClipDoubleClick?: (trackIndex: number, clipIndex: number) => void;
  /**
   * ID of the MIDI clip currently being hovered (for cross-component highlight with piano roll)
   */
  hoveredMidiClipId?: number | null;
  /**
   * Called when mouse enters/leaves a MIDI clip
   */
  onHoverMidiClip?: (clipId: number | null) => void;
}

/**
 * Canvas component for rendering audio tracks and clips
 * - Displays tracks with their clips using Track components
 * - Handles track and clip selection
 * - Supports scrolling and zooming
 */
export function Canvas({
  width = 5000,
  pixelsPerSecond = 100,
  backgroundColor,
  leftPadding = 0,
  onHeightChange,
  onClipMenuClick,
  onTimeSelectionMenuClick,
  onTrackFocusChange,
  onTrackContainerFocusChange,
  showRmsInWaveform = true,
  controlPointStyle = 'default',
  viewportHeight = 0,
  bottomBuffer = 0,
  recordingClipId = null,
  selectionAnchor = null,
  setSelectionAnchor,
  bpm = 120,
  beatsPerMeasure = 4,
  timeFormat = 'beats-measures',
  snap = { subdivision: 1 },
  snapEnabled = false,
  spectrogramScale = 'mel',
  onEnterTrackPanel,
  onShiftTabFromTrack,
  onContainerEnter,
  onTabFromLastClip,
  onMidiClipDoubleClick,
  hoveredMidiClipId,
  onHoverMidiClip,
}: CanvasProps) {
  const { theme } = useTheme();
  const { trackSelectionMode } = useEditingBehaviorPrefs();
  const { clipStyle } = useAppearancePrefs();
  const { tracks, selectedTrackIndices, selectedLabelIds, timeSelection, spectrogramMode, envelopeMode, focusedTrackIndex, splitMode, playheadPosition } = useTracksState();
  const { spectralSelection, setSpectralSelection } = useSpectralSelection();
  const dispatch = useTracksDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouseButtonRef = useRef<number>(0);
  const { activeProfile } = useAccessibilityProfile();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';
  const trackBase = useTabOrder('tracks');

  // Use theme token as default if not provided
  const bgColor = backgroundColor ?? theme.background.canvas.default;

  // Get envelope control point sizes from the selected profile
  const envelopePointSizes = React.useMemo(() => {
    const profile = ENVELOPE_POINT_STYLES[controlPointStyle];
    return {
      outerRadius: profile.outerRadius,
      innerRadius: profile.innerRadius,
      outerRadiusHover: profile.outerRadiusHover,
      innerRadiusHover: profile.innerRadiusHover,
      lineWidth: profile.lineWidth,
      dualRingHover: profile.dualRingHover,
      solidCircle: profile.solidCircle,
      hoverRingColor: profile.hoverRingColor,
      hoverRingStrokeColor: profile.hoverRingStrokeColor,
      showWhiteOutlineOnHover: profile.showWhiteOutlineOnHover ?? false,
      showBlackOutlineOnHover: profile.showBlackOutlineOnHover ?? false,
      showBlackCenterOnHover: profile.showBlackCenterOnHover ?? false,
      showGreenCenterFillOnHover: profile.showGreenCenterFillOnHover,
      whiteCenterOnHover: profile.whiteCenterOnHover,
      whiteCenter: profile.whiteCenter,
      dualStrokeLine: profile.dualStrokeLine,
      lineColor: profile.lineColor,
    };
  }, [controlPointStyle]);


  // Track hovered ear for hover effects
  const [hoveredEar, setHoveredEar] = useState<string | null>(null);

  // Track hovered label banner for hover effects
  const [hoveredBanner, setHoveredBanner] = useState<string | null>(null);

  // RAF batching for spectral selection updates (performance optimization)
  const spectralSelectionRAFRef = useRef<number | null>(null);
  const pendingSpectralSelectionRef = useRef<typeof spectralSelection>(null);

  // Track if we just selected a clip on mouse down to prevent immediate deselection on click
  const justSelectedOnMouseDownRef = useRef(false);

  // Parallel state flag that mirrors the module-scoped
  // pendingClipMoveResolution ref, so React can lift the moving
  // clip's z-index while the Cmd hold is in progress. State
  // triggers re-render; a ref alone can't.
  const [isCmdArrowMoving, setIsCmdArrowMoving] = useState(false);

  // Snap options for grid snapping
  const snapOptions: SnapOptions | undefined = snapEnabled ? {
    timeFormat,
    bpm,
    beatsPerMeasure,
    snap,
    pixelsPerSecond,
  } : undefined;

  const [isDraggingClips, setIsDraggingClips] = useState(false);

  // Clip dragging - extracted to custom hook
  const {
    clipDragStateRef,
    didDragRef,
    snapGuidelineTime: dragSnapGuidelineTime,
    snapGuidelineKind: dragSnapGuidelineKind,
  } = useClipDragging({
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
    topGap: TOP_GAP,
    trackGap: TRACK_GAP,
    defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
    onDragStatusChange: (isDragging) => {
      setIsDraggingClips(isDragging);
      // Exit split mode the moment a clip drag starts. Split's job is to
      // cut; once you're moving a clip the tool should be done.
      if (isDragging && splitMode) {
        dispatch({ type: 'SET_SPLIT_MODE', payload: false });
      }
    },
    // Dropping a clip into the empty space below all tracks appends a
    // fresh track and lands the clip on it. We mirror the source
    // track's type / view / channel mode so an audio clip lands on a
    // matching audio row, a MIDI clip on a MIDI row, and so on.
    buildTrackForDrop: (indexAmongNew, sourceTrackIndex) => {
      const source = tracks[sourceTrackIndex];
      const sourceIsMidi = source?.type === 'midi'
        || (source?.midiClips?.length ?? 0) > 0;
      const type = sourceIsMidi ? 'midi' : 'audio';
      const prefix = sourceIsMidi ? 'MIDI' : 'Track';
      const namePattern = new RegExp(`^${prefix} (\\d+)$`);
      const usedNumbers = tracks
        .map((t) => {
          const m = namePattern.exec(t.name ?? '');
          return m ? parseInt(m[1], 10) : NaN;
        })
        .filter((n: number) => !isNaN(n));
      // + indexAmongNew so a multi-clip drop that needs several new
      // tracks in the same dispatch batch gets distinct numbers.
      const nextNameNumber = (usedNumbers.length === 0 ? 0 : Math.max(...usedNumbers)) + 1 + indexAmongNew;
      const nextId = Math.max(...tracks.map((t) => t.id), 0) + 1 + indexAmongNew;

      return {
        id: nextId,
        name: `${prefix} ${nextNameNumber}`,
        type,
        height: source?.height ?? 114,
        // Inherit the source's view so a spectrogram clip lands on a
        // spectrogram-configured row and looks right immediately.
        ...(source?.viewMode ? { viewMode: source.viewMode } : {}),
        ...(source?.channelSplitRatio !== undefined ? { channelSplitRatio: source.channelSplitRatio } : {}),
        clips: [],
        ...(type === 'midi' ? { midiClips: [] } : {}),
      };
    },
    snapEnabled,
    snapOptions,
  });

  const draggingClipIds = React.useMemo(() => {
    if (!isDraggingClips) return new Set<number>();
    const dragState = clipDragStateRef.current;
    if (!dragState) return new Set<number>();
    if (dragState.selectedClipsInitialPositions && dragState.selectedClipsInitialPositions.length > 1) {
      return new Set<number>(dragState.selectedClipsInitialPositions.map(p => p.clipId));
    }
    return new Set<number>([dragState.clip.id]);
  }, [isDraggingClips, clipDragStateRef]);

  // Every selected clip while Cmd/Ctrl is held during a Cmd+Arrow
  // clip nudge. Used to lift z-index only — the ghost 50% opacity
  // that mouse-drag applies is intentionally omitted so keyboard
  // moves render the clip solidly on top of anything it passes over.
  const raisedClipIds = React.useMemo(() => {
    if (!isCmdArrowMoving) return new Set<number>();
    const ids = new Set<number>();
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.selected) ids.add(c.id);
      });
      (t.midiClips || []).forEach((c) => {
        if (c.selected) ids.add(c.id);
      });
    });
    return ids;
  }, [isCmdArrowMoving, tracks]);

  // Clip trimming - extracted to custom hook
  const {
    clipTrimStateRef,
    wasJustTrimming,
    snapGuidelineTime: trimSnapGuidelineTime,
    snapGuidelineKind: trimSnapGuidelineKind,
  } = useClipTrimming({
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
    snapEnabled,
    snapOptions,
  });

  // Clip time-stretching - visual only (mirrors trimming).
  const {
    clipStretchStateRef,
    startClipStretch,
    wasJustStretching,
    snapGuidelineTime: stretchSnapGuidelineTime,
    snapGuidelineKind: stretchSnapGuidelineKind,
  } = useClipStretching({
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
    snapEnabled,
    snapOptions,
  });

  // Whichever drag is active reports its snap target; we render at
  // most one guideline. Cyan for grid snap, yellow for alignment snap.
  const { time: snapGuidelineTime, kind: snapGuidelineKind } = resolveSnapGuideline(
    { time: dragSnapGuidelineTime, kind: dragSnapGuidelineKind },
    { time: trimSnapGuidelineTime, kind: trimSnapGuidelineKind },
    { time: stretchSnapGuidelineTime, kind: stretchSnapGuidelineKind }
  );
  const snapGuidelineColor = snapGuidelineKind === 'grid' ? '#22D3EE' : '#FFD60A';
  const snapGuidelineShadow = snapGuidelineKind === 'grid'
    ? '0 0 4px rgba(34, 211, 238, 0.6)'
    : '0 0 4px rgba(255, 214, 10, 0.6)';

  // Right-drag marquee: draws a rectangle over the canvas and selects
  // every clip it touches on mouseup. Sits alongside the other
  // selection hooks so the container's other mouse handlers stay
  // unchanged.
  const marquee = useMarqueeSelection({
    containerRef,
    tracks,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
    topGap: TOP_GAP,
    trackGap: TRACK_GAP,
    defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
    onSelectionCommit: (picks, modifiers) => {
      // Shift-right-drag adds to the current selection; plain
      // right-drag replaces it. Empty marquee (dragged over blank
      // canvas) clears the clip selection unless Shift is held.
      if (picks.length === 0) {
        if (!modifiers.shiftKey) {
          dispatch({ type: 'DESELECT_ALL_CLIPS' });
        }
        return;
      }
      if (modifiers.shiftKey) {
        // Union with the current selection. SELECT_CLIPS is
        // exclusive so we have to hand it the combined list.
        const combined = new Map<string, { trackIndex: number; clipId: number }>();
        for (const p of picks) combined.set(`${p.trackIndex}:${p.clipId}`, p);
        tracks.forEach((t, tIndex) => {
          t.clips.forEach((c) => {
            if (c.selected) combined.set(`${tIndex}:${c.id}`, { trackIndex: tIndex, clipId: c.id });
          });
          (t.midiClips || []).forEach((c) => {
            if (c.selected) combined.set(`${tIndex}:${c.id}`, { trackIndex: tIndex, clipId: c.id });
          });
        });
        dispatch({ type: 'SELECT_CLIPS', payload: [...combined.values()] });
      } else {
        dispatch({ type: 'SELECT_CLIPS', payload: picks });
      }
    },
  });

  // Label dragging - extracted to custom hook (handles mouseup internally)
  useLabelDragging({
    containerRef,
    pixelsPerSecond,
    clipContentOffset: CLIP_CONTENT_OFFSET,
    snapEnabled,
    snapOptions,
  });

  // Calculate total height based on all tracks + 2px gaps (top + between tracks)
  // Height of the canvas-container element, including the empty
  // bottom buffer so gridlines extend through the scroll-buffer
  // area below the last track. minHeight still pins to the viewport
  // when there are very few tracks.
  const { totalHeight, containerHeight } = computeCanvasHeights(tracks, {
    topGap: TOP_GAP,
    trackGap: TRACK_GAP,
    defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
    bottomBuffer,
  });

  // --- Split tool (state + effects + handlers extracted to useSplitTool) ---
  // splitTool is wired into the container event handlers below.
  // The hook owns splitHover state, lastMouseRef, the Shift key sync effect,
  // and the on-enable hover-compute effect.

  // Notify parent when height changes
  useEffect(() => {
    onHeightChange?.(totalHeight);
  }, [totalHeight, onHeightChange]);

  // Cmd/Ctrl release → apply the deferred overlap resolution from any
  // Cmd+Arrow clip moves. We build the intent from the *current* clip
  // positions (post-nudge) so only the final resting places are
  // reconciled with underlying clips — nothing in between gets eaten.
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Meta' && e.key !== 'Control') return;
      if (!pendingClipMoveResolution.current) return;
      pendingClipMoveResolution.current = false;
      setIsCmdArrowMoving(false);

      const intent: ClipPlacement[] = [];
      const movingIds = new Set<number>();
      tracks.forEach((t, tIndex) => {
        t.clips.forEach((c) => {
          if (c.selected) {
            intent.push({
              clipId: c.id,
              trackIndex: tIndex,
              start: c.start,
              duration: c.duration,
            });
            movingIds.add(c.id);
          }
        });
      });
      if (intent.length === 0) return;

      const resolution = resolveOverlap(tracks, intent, movingIds);
      if (resolution.mutations.length > 0) {
        dispatch({
          type: 'APPLY_CLIP_PLACEMENT',
          payload: { placements: [], mutations: resolution.mutations },
        });
      }
    };
    document.addEventListener('keyup', onKeyUp);
    return () => document.removeEventListener('keyup', onKeyUp);
  }, [tracks, dispatch]);

  // Check if any track has spectrogram or split view enabled
  const hasSpectralView = spectrogramMode || tracks.some(track =>
    track.viewMode === 'spectrogram' || track.viewMode === 'split'
  );

  // Setup audio selection (composite hook for time, track, clip, and spectral selection)
  const selection = useAudioSelection(
    {
      containerRef,
      currentTimeSelection: timeSelection,
      currentSelectedTracks: selectedTrackIndices,
      currentSpectralSelection: spectralSelection,
      spectrogramMode: hasSpectralView,
      clipHeaderHeight: 20,
      pixelsPerSecond,
      leftPadding,  // Use leftPadding for alignment with playhead
      tracks: tracks,
      defaultTrackHeight: DEFAULT_TRACK_HEIGHT,
      trackGap: TRACK_GAP,
      initialGap: TOP_GAP,
    },
    {
      onTimeSelectionChange: (sel) => {
        dispatch({ type: 'SET_TIME_SELECTION', payload: sel });
        // Deselect all clips when making a time selection
        if (sel) {
          dispatch({ type: 'DESELECT_ALL_CLIPS' });
        }
      },
      onTimeSelectionFinalized: (sel) => {
        if (sel) {
          // Don't yank a playhead the user parked inside the range.
          const nextPlayhead = playheadAfterSelectionFinalize(playheadPosition, sel);
          if (nextPlayhead !== null) {
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: nextPlayhead });
          }
          // Park DOM focus on the focused track's .track container so
          // subsequent Tab / Shift+Tab presses hit that track's own
          // routing (ruler → next track, panel, etc.) instead of
          // starting from wherever the pointer left focus — commonly
          // body, which sends Tab off to unrelated toolbar controls.
          requestAnimationFrame(() => {
            const active = document.activeElement as HTMLElement | null;
            const alreadyInTracks = active
              && active.closest('.track-wrapper, .track-control-panel, [data-track-ruler-index]');
            if (alreadyInTracks) return;
            if (focusedTrackIndex === null || focusedTrackIndex === undefined) return;
            const trackEl = document.querySelector<HTMLElement>(
              `.track-wrapper[data-track-index="${focusedTrackIndex}"] .track`,
            );
            trackEl?.focus({ preventScroll: true });
          });
        }
      },
      // Time-selection drags no longer touch `selectedTrackIndices`.
      // The drag's vertical scope is carried on the timeSelection
      // object itself (`tracks`), so operations and rendering can act
      // on the rows the drag crossed while leaving the track
      // selection alone. Track selection stays an explicit gesture.
      onSelectedTracksChange: () => {},
      onFocusedTrackChange: (trackIndex) => {
        // Don't clear focus when clicking empty space - maintain current focus
        if (trackIndex !== null) {
          dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex });
          onTrackFocusChange?.(trackIndex, true); // Update keyboard focus state in App.tsx
          // Track selection intentionally left untouched. Canvas
          // gestures move focus only; explicit gestures (side panel
          // click, Shift+Click, Cmd+click) are what change the track
          // selection set.
        }
        // If trackIndex is null (clicked empty space), do nothing - keep current focus
      },
      onSpectralSelectionChange: (sel) => {
        // Batch updates using requestAnimationFrame to reduce re-renders during drag
        pendingSpectralSelectionRef.current = sel;

        if (spectralSelectionRAFRef.current === null) {
          spectralSelectionRAFRef.current = requestAnimationFrame(() => {
            setSpectralSelection(pendingSpectralSelectionRef.current);
            spectralSelectionRAFRef.current = null;
          });
        }
      },
      onSpectralSelectionFinalized: (sel) => {
        // Cancel any pending RAF and immediately flush the final state
        if (spectralSelectionRAFRef.current !== null) {
          cancelAnimationFrame(spectralSelectionRAFRef.current);
          spectralSelectionRAFRef.current = null;
        }
        setSpectralSelection(pendingSpectralSelectionRef.current ?? sel);
        pendingSpectralSelectionRef.current = null;

        if (sel) {
          // Same rule as time-selection finalize: an overlapped
          // playhead stays put.
          const nextPlayhead = playheadAfterSelectionFinalize(playheadPosition, sel);
          if (nextPlayhead !== null) {
            dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: nextPlayhead });
          }
        }
      },
      // Track selection is now decoupled from click gestures — a track
      // click only moves focus. Any future wiring of useAudioSelection's
      // getTrackProps().onTrackClick will inherit that model.
      onTrackSelect: (trackIndex) => dispatch({ type: 'SET_FOCUSED_TRACK', payload: trackIndex }),
      onClipSelect: (trackIndex, clipId) => dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: clipId as number } }),
    }
  );

  const containerProps = selection.containerProps;

  // Container click handler - extracted to custom hook
  const handleContainerClick = useContainerClick({
    containerRef,
    tracks,
    containerPropsOnClick: containerProps.onClick,
    selectionWasJustDragging: selection.selection.wasJustDragging,
    pixelsPerSecond,
    dispatch,
    onTrackFocusChange,
    TOP_GAP,
    TRACK_GAP,
    DEFAULT_TRACK_HEIGHT,
    selectedTrackIndices,
    selectionAnchor,
    setSelectionAnchor,
  });

  // Clip and label mouse down handler - extracted to custom hook
  const handleClipMouseDown = useClipMouseDown({
    containerRef,
    tracks,
    selectedLabelIds,
    spectralSelection,
    hasSpectralView,
    selectionIsPositionOnSpectralClip: selection.selection.isPositionOnSpectralClip,
    containerPropsOnMouseDown: containerProps.onMouseDown,
    clipDragStateRef,
    didDragRef,
    justSelectedOnMouseDownRef,
    pixelsPerSecond,
    dispatch,
    setSpectralSelection,
    timeSelection,
    selectedTrackIndices,
    TOP_GAP,
    TRACK_GAP,
    DEFAULT_TRACK_HEIGHT,
    CLIP_HEADER_HEIGHT,
    onDragStart: () => {
      setIsDraggingClips(true);
      // Exit split mode the moment a header drag begins — once you're
      // moving a clip the scissor tool's job is over.
      if (splitMode) dispatch({ type: 'SET_SPLIT_MODE', payload: false });
    },
  });

  const splitTool = useSplitTool({
    tracks,
    pixelsPerSecond,
    leftPadding,
    splitMode,
    dispatch,
    handleClipMouseDown,
  });
  const { splitHover } = splitTool;

  return (
    <div className={`canvas-container${splitMode && splitHover ? ' canvas-container--split-mode' : ''}`} style={{ backgroundColor: bgColor, height: `${containerHeight}px`, minHeight: `${viewportHeight}px`, overflow: 'clip', overflowClipMargin: '2px', cursor: splitMode && splitHover ? `url(${splitCursorUrl}) 14 10, crosshair` : 'text' } as React.CSSProperties}>
      {/* Snap guideline — a 1px yellow vertical line at the snap target
          of an in-progress trim or stretch. Spans the full canvas
          height so the user can see which grid line each edge is
          locking to. */}
      {snapGuidelineTime !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${CLIP_CONTENT_OFFSET + snapGuidelineTime * pixelsPerSecond}px`,
            width: '1px',
            backgroundColor: snapGuidelineColor,
            boxShadow: snapGuidelineShadow,
            pointerEvents: 'none',
            zIndex: 11,
          }}
        />
      )}

      {/* Split-tool preview line. Bare hover shows it spanning just the
          hovered track; Shift held extends it across all tracks. */}
      {splitMode && splitHover && (
        (() => {
          const fullSpan = splitHover.shiftKey;
          // Shift extends the line to the full canvas height (top:0 →
          // bottom:0) so it visibly reaches past the last track into the
          // empty area below. Without Shift the line is constrained to
          // the hovered track's body.
          const positional: React.CSSProperties = fullSpan
            ? { top: 0, bottom: 0 }
            : {
                top: `${calculateTrackYOffset(splitHover.trackIndex, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT)}px`,
                height: `${tracks[splitHover.trackIndex].height || DEFAULT_TRACK_HEIGHT}px`,
              };
          return (
            <div
              style={{
                position: 'absolute',
                left: `${splitHover.x}px`,
                ...positional,
                width: '1px',
                background: theme.border.focus,
                pointerEvents: 'none',
                zIndex: 100,
              }}
            />
          );
        })()
      )}
      {/* Beat/measure grid — rendered behind tracks. Spans the full
          canvas-container so gridlines also fill the empty scroll-
          buffer space below the last track. */}
      <GridOverlay
        bpm={bpm}
        beatsPerMeasure={beatsPerMeasure}
        timeFormat={timeFormat}
        pixelsPerSecond={pixelsPerSecond}
        width={width}
        containerHeight={containerHeight}
        viewportHeight={viewportHeight}
      />
      <div
        ref={containerRef}
        onMouseDownCapture={(e) => {
          // Right-drag marquee selection runs at capture so it beats
          // the browser's context-menu dispatch and any bubble-phase
          // handlers that would otherwise register a plain right-click.
          if (e.button === 2) {
            marquee.onMouseDownCapture(e);
            // Fall through — marquee only activates once the pointer
            // moves past the threshold; a bare right-click still
            // reaches the existing contextmenu handler below.
          }

          // Split mode runs in the capture phase so it beats clip-level
          // mousedown handlers (drag start, selection) that would otherwise
          // initiate a drag and clear our just-dispatched selection on
          // mouseup. Outside split mode, this capture handler does nothing
          // and the regular bubble-phase onMouseDown runs.
          if (splitTool.handlers.onMouseDownCapture(e)) return;
        }}
        onMouseDown={(e) => {
          lastMouseButtonRef.current = e.button;

          // Shift+Click on the canvas background extends the current
          // playhead into a time range selection (handled on click,
          // not mousedown, so the underlying time-selection hook
          // doesn't start a drag we then have to clean up). We still
          // preventDefault on mousedown to keep selection-text drag
          // from kicking off, and we remember to skip the click that
          // would normally reposition the playhead.
          if (
            !splitMode
            && e.button === 0
            && e.shiftKey
            && !e.metaKey
            && !e.ctrlKey
            && !e.altKey
            && !(e.target as HTMLElement).closest('[data-clip-id]')
          ) {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const ti = resolveTrackIndexFromY(y, tracks);
            if (ti !== null) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }

          // --- Split tool intercept (legacy bubble path; kept as a no-op
          //     fallback — the capture handler above takes care of it). ---
          if (splitTool.handlers.onMouseDown(e)) return;
          handleClipMouseDown(e);
        }}
        onMouseMove={(e) => {
          splitTool.handlers.onMouseMove(e);
          containerProps.onMouseMove?.(e);
        }}
        onMouseLeave={(e) => {
          splitTool.handlers.onMouseLeave(e);
          // Let useAudioSelection reset the time-selection cursor so a
          // hover-triggered `ew-resize` doesn't stick when the pointer
          // leaves the canvas.
          containerProps.onMouseLeave?.(e);
        }}
        onClickCapture={(e) => {
          // Split mode: swallow the click at capture so neither child
          // clip-level click handlers nor the container's blank-area
          // click handler can clear the selection that mousedown just
          // dispatched.
          splitTool.handlers.onClickCapture(e);
        }}
        onClick={(e) => {
          if (splitMode) return;

          // Body-click clip deselection: clicking the body of any
          // clip that isn't currently selected drops the existing
          // clip selection. Clicking the body of an already-
          // selected clip (or anywhere outside a clip) doesn't
          // touch the selection here — header clicks own the
          // additive / range / toggle paths via ClipHeader's
          // onClick (which stopPropagation, so we never see them).
          if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const bodyClipEl = (e.target as HTMLElement).closest('[data-clip-id]') as HTMLElement | null;
            if (bodyClipEl) {
              const cid = Number(bodyClipEl.getAttribute('data-clip-id'));
              const ti = Number(bodyClipEl.getAttribute('data-track-index'));
              const t = tracks[ti];
              const clip = t?.clips.find((c) => c.id === cid)
                || (t?.midiClips || []).find((c) => c.id === cid);
              if (clip && !clip.selected) {
                dispatch({ type: 'DESELECT_ALL_CLIPS' });
              }
            }
          }

          // Shift+Click → build a time range from the existing playhead
          // to the click point, spanning the focused track to the
          // clicked track. Runs here (not on mousedown) so it sits
          // after the time-selection hook's mouseup logic and our work
          // doesn't get wiped out.
          if (
            e.shiftKey
            && !e.metaKey
            && !e.ctrlKey
            && !e.altKey
            && !(e.target as HTMLElement).closest('[data-clip-id]')
          ) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ti = resolveTrackIndexFromY(y, tracks);
            if (ti !== null) {
              const time = Math.max(0, (x - leftPadding) / pixelsPerSecond);
              const anchorTime = playheadPosition;
              const startTime = Math.min(anchorTime, time);
              const endTime = Math.max(anchorTime, time);
              const anchorTrack = focusedTrackIndex ?? ti;
              const trackStart = Math.min(anchorTrack, ti);
              const trackEnd = Math.max(anchorTrack, ti);
              const selectedTracks: number[] = [];
              for (let i = trackStart; i <= trackEnd; i++) selectedTracks.push(i);
              dispatch({
                type: 'SET_TIME_SELECTION',
                payload: {
                  startTime,
                  endTime,
                  // Shift+Click range select has an explicit vertical
                  // extent — stamp it as the selection's scope.
                  tracks: selectedTracks,
                },
              });
              dispatch({
                type: 'SET_SELECTED_TRACKS',
                payload: selectedTracks,
              });
              dispatch({ type: 'SET_FOCUSED_TRACK', payload: ti });
              return;
            }
          }

          // Cmd/Ctrl+click on a track's bare canvas toggles that track
          // in/out of the active time selection's scope.
          if (
            (e.metaKey || e.ctrlKey)
            && !e.shiftKey
            && !e.altKey
            && timeSelection
            && !(e.target as HTMLElement).closest('[data-clip-id]')
          ) {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const ti = resolveTrackIndexFromY(y, tracks);
            if (ti !== null) {
              const currentScope = timeSelection.tracks ?? tracks.map((_, i) => i);
              const newScope = currentScope.includes(ti)
                ? currentScope.filter((i) => i !== ti)
                : [...currentScope, ti].sort((a, b) => a - b);
              if (newScope.length > 0) {
                dispatch({
                  type: 'SET_TIME_SELECTION',
                  payload: { ...timeSelection, tracks: newScope },
                });
              }
            }
            return;
          }

          // (Single-clip lockout removed — clicking inside any clip
          // body now falls through to handleContainerClick so the
          // playhead moves, matching the multi-clip case.)
          handleContainerClick(e);
        }}
        onContextMenu={(e) => {
          // Always prevent default browser context menu
          e.preventDefault();

          // A right-drag that just committed a marquee selection
          // shouldn't also pop the context menu.
          if (marquee.wasMarqueeing()) {
            lastMouseButtonRef.current = 0;
            return;
          }

          // Only show OUR context menu if:
          // 1. The last mouse button pressed was right-click (button 2)
          // 2. There's an existing time selection
          // 3. We're not currently dragging or creating a selection
          if (lastMouseButtonRef.current === 2 && timeSelection && !selection.selection.isDragging && !selection.selection.isCreating) {
            // Determine which track was right-clicked
            const containerRect = e.currentTarget.getBoundingClientRect();
            const relativeY = e.clientY - containerRect.top;
            let clickedTrackIndex: number | undefined;
            for (let i = 0; i < tracks.length; i++) {
              const yOff = calculateTrackYOffset(i, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT);
              const tH = tracks[i].height || DEFAULT_TRACK_HEIGHT;
              if (relativeY >= yOff && relativeY < yOff + tH) {
                clickedTrackIndex = i;
                break;
              }
            }
            onTimeSelectionMenuClick?.(e.clientX, e.clientY, clickedTrackIndex);
          }

          // Reset the button ref after handling
          lastMouseButtonRef.current = 0;
        }}
        onDoubleClick={(e) => {
          if (!onMidiClipDoubleClick) return;
          // Walk up from the click target to find a clip element with data-clip-id
          let el = e.target as HTMLElement | null;
          while (el && el !== e.currentTarget) {
            const clipId = el.getAttribute('data-clip-id');
            const tIdx = el.getAttribute('data-track-index');
            if (clipId && tIdx !== null) {
              const trackIdx = Number(tIdx);
              const track = tracks[trackIdx];
              if (track?.type === 'midi' && track.midiClips) {
                const clipIndex = track.midiClips.findIndex((mc) => String(mc.id) === clipId);
                if (clipIndex >= 0) {
                  onMidiClipDoubleClick(trackIdx, clipIndex);
                }
              }
              return;
            }
            el = el.parentElement;
          }
        }}
        onDragStart={(e: React.DragEvent) => e.preventDefault()}
        // Extend the inner (event-attached) container all the way to
        // the bottom of the visible canvas — including the scroll
        // buffer below the last track and the viewport minHeight.
        // Otherwise mousedown in the empty area below the tracks hits
        // the outer .canvas-container instead of this div, so
        // useAudioSelection never sees the event and the "drag from
        // below to select every track" flow can't start.
        style={{ ...containerProps.style, height: `${Math.max(containerHeight, viewportHeight)}px`, userSelect: 'none', cursor: 'text' } as React.CSSProperties}
      >
        {(() => {
          // Solo overrides per-track mute visuals: when any track is
          // soloed, every non-soloed track reads as effectively muted
          // (matches the audio behaviour). Computed once per render.
          const anySoloed = tracks.some((t) => t.soloed);
          return tracks.map((track, trackIndex) => {
          const trackHeight = track.height || DEFAULT_TRACK_HEIGHT;
          const isSelected = selectedTrackIndices.includes(trackIndex);
          const isFocused = focusedTrackIndex === trackIndex;
          const effectivelyMuted =
            track.muted === true
            || (anySoloed && track.soloed !== true);

          // Calculate y position for this track
          const yOffset = calculateTrackYOffset(trackIndex, tracks, TOP_GAP, TRACK_GAP, DEFAULT_TRACK_HEIGHT);

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
                  if (selection.selection.wasJustDragging() || wasJustTrimming() || wasJustStretching()) {
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
                clips={track.type === 'midi'
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
                    }))}
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
                onTrackNavigateVertical={(direction, shiftKey, decouple) => {
                  const targetIndex = trackIndex + direction;
                  if (targetIndex < 0 || targetIndex >= tracks.length) return;
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: targetIndex });

                  if (shiftKey) {
                    // Shift+Arrow: extend/contract a track selection.
                    // Model 3: if the focused track is NOT part of the
                    // current selection, treat this as the start of a
                    // fresh range — anchor on the focused track,
                    // ignore the stale selection. Otherwise keep
                    // extending from the existing anchor.
                    const focusInSelection = selectedTrackIndices.includes(trackIndex);
                    const anchor = focusInSelection
                      ? (selectionAnchor ?? trackIndex)
                      : trackIndex;
                    if (!focusInSelection || selectionAnchor === null) {
                      setSelectionAnchor?.(trackIndex);
                    }
                    const start = Math.min(anchor, targetIndex);
                    const end = Math.max(anchor, targetIndex);
                    const newSelection: number[] = [];
                    for (let i = start; i <= end; i++) newSelection.push(i);
                    dispatch({ type: 'SET_SELECTED_TRACKS', payload: newSelection });
                  } else if (trackSelectionMode === 'follows-focus' && !decouple) {
                    // Plain arrow in follows-focus mode: selection moves
                    // with focus. Cmd held = "decouple": focus moves
                    // alone so the user can peek around without
                    // disturbing the current selection.
                    dispatch({ type: 'SELECT_TRACK', payload: targetIndex });
                    setSelectionAnchor?.(targetIndex);
                  }

                  setTimeout(() => {
                    const target = document.querySelector(
                      `.track-wrapper[data-track-index="${targetIndex}"] .track`
                    ) as HTMLElement | null;
                    if (target) {
                      // Mark this focus as arrow-navigated so the receiving
                      // TrackNew shows the blue outline (mouse-style) rather
                      // than the black/white "container-focused" Tab-style.
                      target.setAttribute('data-focus-from-nav', '1');
                      target.focus();
                      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }, 0);
                }}
                onTrackReorder={(direction, wasContainerFocused) => {
                  // Focus disambiguates the gesture:
                  //   • Focus on the track CONTAINER (Tab-nav lands
                  //     the wrapper) → user is pointing at the track,
                  //     Cmd+Arrow reorders the track even if a clip
                  //     inside it is still selected.
                  //   • Focus on a CLIP (arrow-nav / Tab-into-clip) →
                  //     Cmd+Arrow moves the clip, per the usual
                  //     clip-move / time-selection promotion paths.
                  // Container-focused users can Tab back into the
                  // clip if they want the clip-level gesture.
                  if (wasContainerFocused) {
                    // Skip the clip-move / time-selection promotion
                    // branches — fall straight through to track
                    // reorder below.
                  }

                  const focusedTrack = tracks[trackIndex];
                  const focusedHasSelectedClip = !wasContainerFocused && (
                    focusedTrack?.clips.some((c) => c.selected)
                    || focusedTrack?.midiClips?.some((c) => c.selected)
                    || false
                  );

                  // If a time selection covers a clip on the focused
                  // track (mirrors the horizontal Cmd+Arrow path),
                  // promote overlapping clips on the scoped tracks
                  // to selected + clear the time selection, then
                  // continue into the clip-move branch.
                  let promotedFromTimeSelection = false;
                  if (!wasContainerFocused && !focusedHasSelectedClip && timeSelection) {
                    const { startTime, endTime } = timeSelection;
                    const EPS = 0.0001;
                    const focusedOverlaps = (focusedTrack?.clips || []).some((c) =>
                      c.start < endTime - EPS && c.start + c.duration > startTime + EPS,
                    );
                    if (focusedOverlaps) {
                      const scopedTrackIndices = resolveTimeSelectionScope(
                        timeSelection,
                        selectedTrackIndices,
                        [trackIndex],
                      );
                      const overlapping: Array<{ trackIndex: number; clipId: number }> = [];
                      for (const ti of scopedTrackIndices) {
                        const t = tracks[ti];
                        if (!t) continue;
                        for (const c of t.clips) {
                          if (c.start < endTime - EPS && c.start + c.duration > startTime + EPS) {
                            overlapping.push({ trackIndex: ti, clipId: c.id });
                          }
                        }
                      }
                      if (overlapping.length > 0) {
                        dispatch({
                          type: 'SELECT_CLIPS',
                          payload: overlapping,
                        });
                        dispatch({ type: 'SET_TIME_SELECTION', payload: null });
                        promotedFromTimeSelection = true;
                      }
                    }
                  }

                  if (focusedHasSelectedClip || promotedFromTimeSelection) {
                    dispatch({
                      type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
                      payload: { direction: direction as 1 | -1 },
                    });
                    // Follow the moved clips with the focused-track
                    // indicator so the UI stays aligned with where
                    // the user just moved themselves. Anchor on the
                    // CURRENT focused track from state (not the
                    // trackIndex closure) so consecutive Cmd+Arrow
                    // presses accumulate correctly — otherwise DOM
                    // focus stays parked on the original track and
                    // the state pointer keeps snapping back next to
                    // it instead of trailing the clips downward.
                    const anchor = focusedTrackIndex ?? trackIndex;
                    const newTrackIndex = anchor + direction;
                    if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
                      dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
                      // Also move DOM focus to the new track so the
                      // next Cmd+Arrow press fires from the right
                      // TrackNew instance.
                      setTimeout(() => {
                        const target = document.querySelector<HTMLElement>(
                          `.track-wrapper[data-track-index="${newTrackIndex}"] .track`,
                        );
                        if (target && document.activeElement !== target) {
                          target.focus({ preventScroll: true });
                        }
                      }, 0);
                    }
                    // Defer overlap resolution until Cmd/Ctrl release
                    // — matches the horizontal clip-nudge flow.
                    pendingClipMoveResolution.current = true;
                    setIsCmdArrowMoving(true);
                    return;
                  }

                  // If the focused track is part of a multi-track
                  // selection, move every selected track in lockstep
                  // — the user expects the group to travel together.
                  // Otherwise just shift the focused track.
                  const focusedInSelection = selectedTrackIndices.includes(trackIndex);
                  const tracksToMove = focusedInSelection && selectedTrackIndices.length > 1
                    ? [...selectedTrackIndices].sort((a, b) => a - b)
                    : [trackIndex];

                  // Bounds check the whole group — if any member would
                  // fall off the top / bottom, abort the entire reorder
                  // so relative spacing is preserved.
                  const minIdx = tracksToMove[0];
                  const maxIdx = tracksToMove[tracksToMove.length - 1];
                  if (minIdx + direction < 0 || maxIdx + direction >= tracks.length) return;

                  const targetIndex = trackIndex + direction;
                  // Only carry the container-focused indicator over to
                  // the target position when it was actually set — i.e.
                  // the user had Tab-focused the track. Otherwise the
                  // pre-emptive update would flip the side panel into
                  // the keyboard (black/white) mode for a track that
                  // was in mouse (blue) mode, mismatching the wrapper.
                  if (wasContainerFocused) {
                    onTrackContainerFocusChange?.(targetIndex, true);
                  }

                  // Dispatch MOVE_TRACK per selected track. Order matters:
                  // when moving UP, process ascending so each slot is
                  // freed before the next member shifts into it; when
                  // moving DOWN, process descending for the same reason.
                  const order = direction === -1
                    ? tracksToMove
                    : [...tracksToMove].reverse();
                  for (const from of order) {
                    dispatch({
                      type: 'MOVE_TRACK',
                      payload: { fromIndex: from, toIndex: from + direction },
                    });
                  }

                  // Each MOVE_TRACK sets focusedTrackIndex to its own
                  // toIndex, so after the batch the focused-track
                  // pointer is on whichever member was moved last
                  // rather than on the originally focused track. Re-
                  // pin it explicitly to the focused track's new row.
                  dispatch({ type: 'SET_FOCUSED_TRACK', payload: targetIndex });

                  // Sync track selection with the reorder:
                  //  - Focus was inside a multi-track selection →
                  //    remap each index by +direction so the same
                  //    group stays selected at their new rows.
                  //  - Focus was outside → collapse track selection
                  //    to the moved row.
                  // Clip selection is intentionally left alone in
                  // both cases: clips move with their track, and the
                  // clip / track selection axes are decoupled — the
                  // user can Tab back into a still-selected clip.
                  if (focusedInSelection && selectedTrackIndices.length > 1) {
                    dispatch({
                      type: 'SET_SELECTED_TRACKS',
                      payload: tracksToMove.map((i) => i + direction),
                    });
                  } else {
                    dispatch({ type: 'SET_SELECTED_TRACKS', payload: [targetIndex] });
                    setSelectionAnchor?.(targetIndex);
                  }

                  setTimeout(() => {
                    const target = document.querySelector(
                      `.track-wrapper[data-track-index="${targetIndex}"] .track`
                    ) as HTMLElement;
                    target?.focus();
                    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 0);
                }}

                timeSelection={timeSelection && (timeSelection.renderOnCanvas !== false) ? timeSelection : null}
                isTimeSelectionDragging={selection.selection.isDragging}
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
                  setIsCmdArrowMoving(true);

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
                  dispatch({
                    type: 'MOVE_SELECTED_CLIPS_TO_TRACK',
                    payload: { direction: direction as 1 | -1 },
                  });
                  // Defer overlap resolution to Cmd/Ctrl release — see
                  // onClipMove above for the same rationale.
                  pendingClipMoveResolution.current = true;
                  setIsCmdArrowMoving(true);
                  // Follow the focused clip with the track-focus state.
                  // The MOVE_SELECTED_CLIPS_TO_TRACK reducer remaps the
                  // selected-tracks set but leaves focusedTrackIndex
                  // where it was — without this, the focused-track
                  // indicator stays on the source row even though the
                  // user just moved themselves off it.
                  const newTrackIndex = trackIndex + direction;
                  if (newTrackIndex >= 0 && newTrackIndex < tracks.length) {
                    dispatch({ type: 'SET_FOCUSED_TRACK', payload: newTrackIndex });
                  }
                  // Focus the clip on the new track and scroll into view
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
                  const trackCount = tracks.length;
                  for (let i = 1; i <= trackCount; i++) {
                    const candidateIndex = ((trackIndex + direction * i) % trackCount + trackCount) % trackCount;
                    const candidateTrackData = tracks[candidateIndex];
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
                  const focusedClip = tracks[trackIndex]?.clips.find((c) => c.id === clipId)
                    || (tracks[trackIndex]?.midiClips || []).find((c) => c.id === clipId);
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
                  const targets: Array<{ trackIndex: number; clip: Clip | MidiClip }> = [];
                  tracks.forEach((t, tIndex) => {
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

                  // Track each moving clip's final position so we can
                  // build an overlap-resolution intent after the trims
                  // are dispatched. This mirrors the mouse-trim path:
                  // once the trim moves an edge into a neighbor, the
                  // neighbor gets non-destructively eaten (trim / split
                  // / delete) the same way it does on drop.
                  const trimIntent: ClipPlacement[] = [];
                  const movingIds = new Set<number>();

                  for (const { trackIndex: ti, clip } of uniqueTargets) {
                    const stretch = (clip as any).stretchFactor ?? 1; // justified: stretchFactor not on Clip/MidiClip type
                    const currentTrimStart = (clip as Clip).trimStart || 0;
                    const currentDuration = clip.duration;
                    const currentStart = clip.start;
                    const fullDuration =
                      (clip as Clip).fullDuration || (currentTrimStart + currentDuration / stretch);
                    const currentMaxDuration = (fullDuration - currentTrimStart) * stretch;
                    const isAtMaxDuration = Math.abs(currentDuration - currentMaxDuration) < 0.001;

                    let newTrimStart = currentTrimStart;
                    let newDuration = currentDuration;
                    let newStart = currentStart;
                    // Cap the delta up front to what's actually
                    // available on the affected side. This prevents
                    // the classic "overshoot" bug where newTrimStart
                    // clamps to 0 but newDuration still reflects the
                    // uncapped delta, leaving the clip showing empty
                    // source at the edge.
                    let effectiveDelta = deltaSeconds;

                    if (edge === 'left') {
                      if (deltaSeconds < 0) {
                        // Extending left — can't reveal more than the
                        // source already hides on that side.
                        const availableCanvas = currentTrimStart * stretch;
                        effectiveDelta = Math.max(deltaSeconds, -availableCanvas);
                        if (availableCanvas <= 0.0005) continue;
                      } else {
                        // Shrinking left — can't cross the right edge.
                        const maxShrink = Math.max(0, currentDuration - 0.1);
                        effectiveDelta = Math.min(deltaSeconds, maxShrink);
                      }
                      newTrimStart = currentTrimStart + effectiveDelta / stretch;
                      newDuration = Math.max(0.1, currentDuration - effectiveDelta);
                      newStart = currentStart + effectiveDelta;
                    } else {
                      if (deltaSeconds < 0) {
                        // Extending right — cap to available tail.
                        const availableCanvas = (fullDuration - currentTrimStart) * stretch - currentDuration;
                        effectiveDelta = Math.max(deltaSeconds, -availableCanvas);
                        if (availableCanvas <= 0.0005 || isAtMaxDuration) continue;
                      } else {
                        // Shrinking right — can't cross the left edge.
                        const maxShrink = Math.max(0, currentDuration - 0.1);
                        effectiveDelta = Math.min(deltaSeconds, maxShrink);
                      }
                      newDuration = Math.max(0.1, currentDuration - effectiveDelta);
                    }

                    newTrimStart = Math.max(0, newTrimStart);
                    // Skip the dispatch when nothing actually changed
                    // (e.g. a delta so small it round-tripped to zero).
                    if (
                      Math.abs(newTrimStart - currentTrimStart) < 0.0005
                      && Math.abs(newDuration - currentDuration) < 0.0005
                      && Math.abs(newStart - currentStart) < 0.0005
                    ) {
                      continue;
                    }
                    dispatch({
                      type: 'TRIM_CLIP',
                      payload: {
                        trackIndex: ti,
                        clipId: clip.id as number,
                        newTrimStart,
                        newDuration,
                        newStart: edge === 'left' ? newStart : undefined,
                      },
                    });

                    // Record the final position for the overlap pass.
                    trimIntent.push({
                      clipId: clip.id as number,
                      trackIndex: ti,
                      start: edge === 'left' ? newStart : currentStart,
                      duration: newDuration,
                    });
                    movingIds.add(clip.id as number);
                  }

                  // Second pass: eat any neighboring clips the trim
                  // pushed into. resolveOverlap uses the current
                  // tracks (with untouched underlying positions) and
                  // the moving clips' new positions from trimIntent.
                  if (trimIntent.length > 0) {
                    const resolution = resolveOverlap(tracks, trimIntent, movingIds);
                    if (resolution.mutations.length > 0) {
                      dispatch({
                        type: 'APPLY_CLIP_PLACEMENT',
                        payload: { placements: [], mutations: resolution.mutations },
                      });
                    }
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
                    const finalDuration = Math.max(
                      0.1,
                      focused.clip.duration - deltaSeconds,
                    );
                    announce(`Clip is now ${formatTimeForA11y(finalDuration)} long`);
                  }
                }}
                onClipStretch={(clipId, edge, deltaSeconds) => {
                  // Keyboard time-stretch (Alt+Arrow). Sign convention
                  // matches onClipTrim: positive delta shrinks the clip
                  // from `edge`, negative grows it.
                  // Applied to every selected clip; if the originating
                  // clip isn't currently selected we still stretch it.
                  const targets: Array<{ trackIndex: number; clip: Clip | MidiClip }> = [];
                  tracks.forEach((t, tIndex) => {
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

                  for (const { trackIndex: ti, clip } of uniqueTargets) {
                    const currentDuration = clip.duration;
                    const currentStart = clip.start;
                    const currentStretch = (clip as any).stretchFactor ?? 1; // justified: stretchFactor not on Clip/MidiClip type
                    const newDuration = Math.max(0.1, currentDuration - deltaSeconds);
                    const ratio = newDuration / currentDuration;
                    const newStretchFactor = Math.max(
                      0.1,
                      Math.min(10, currentStretch * ratio),
                    );
                    if (newStretchFactor === currentStretch) continue;
                    dispatch({
                      type: 'STRETCH_CLIP',
                      payload: {
                        trackIndex: ti,
                        clipId: clip.id as number,
                        newDuration,
                        newStretchFactor,
                        newStart: edge === 'left' ? currentStart + deltaSeconds : undefined,
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
                    const finalDuration = Math.max(
                      0.1,
                      focused.clip.duration - deltaSeconds,
                    );
                    announce(`Clip stretched to ${formatTimeForA11y(finalDuration)}`);
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
                    tracks.forEach((t, tIndex) => {
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
                  tracks.forEach((t, tIndex) => {
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

              {/* Render labels for label tracks */}
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
                      trackIndex={trackIndex}
                      trackHeight={track.height || 114}
                      pixelsPerSecond={pixelsPerSecond}
                      clipContentOffset={CLIP_CONTENT_OFFSET}
                      selectedLabelIds={selectedLabelIds}
                      hoveredEar={hoveredEar}
                      hoveredBanner={hoveredBanner}
                      tracks={tracks}
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
        })()}

        {/* Right-drag marquee rectangle. Rendered above tracks but
            below any UI chrome. Skipped when null so the DOM stays
            clean for normal interactions. */}
        {marquee.marqueeRect && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: `${marquee.marqueeRect.left}px`,
              top: `${marquee.marqueeRect.top}px`,
              width: `${marquee.marqueeRect.width}px`,
              height: `${marquee.marqueeRect.height}px`,
              border: `1px solid ${theme.border.focus}`,
              background: 'rgba(132, 181, 255, 0.12)',
              pointerEvents: 'none',
              zIndex: 200,
            }}
          />
        )}

        {/* Spectral Selection Overlay */}
        <SpectralSelectionOverlay
          spectralSelection={spectralSelection}
          pixelsPerSecond={pixelsPerSecond}
          trackHeights={tracks.map(t => t.height || DEFAULT_TRACK_HEIGHT)}
          trackGap={TRACK_GAP}
          initialGap={TOP_GAP}
          clipHeaderHeight={20}
          tracks={tracks}
          isDragging={selection.selection.isDragging}
          isCreating={selection.selection.isCreating}
        />
      </div>

    </div>
  );
}
