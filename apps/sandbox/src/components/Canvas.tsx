import React, { useRef, useEffect, useState } from 'react';
import { useAudioSelection, SpectralSelectionOverlay, CLIP_CONTENT_OFFSET, useAccessibilityProfile, useTabOrder, useTheme } from '@audacity-ui/components';
import type { SpectrogramScale } from '@audacity-ui/components';
import { type EnvelopePointStyleKey, type SnapGrid } from '@audacity-ui/core';
import { useTracksState, useTracksDispatch, type Track } from '../contexts/TracksContext';
import { useSpectralSelection } from '../contexts/SpectralSelectionContext';
import { useEditingBehaviorPrefs, useAppearancePrefs } from '@audacity-ui/components';
import { useClipDragging } from '../hooks/useClipDragging';
import { useClipTrimming } from '../hooks/useClipTrimming';
import { useClipStretching } from '../hooks/useClipStretching';
import { useLabelDragging } from '../hooks/useLabelDragging';
import { useClipMouseDown } from '../hooks/useClipMouseDown';
import { useContainerClick } from '../hooks/useContainerClick';
import { useMarqueeSelection } from '../hooks/useMarqueeSelection';
import { useSplitTool } from '../hooks/useSplitTool';
import { useCmdArrowMove } from '../hooks/useCmdArrowMove';
import { useTrackKeyboardHandlers } from '../hooks/useTrackKeyboardHandlers';
import { useCanvasPointerHandlers } from '../hooks/useCanvasPointerHandlers';
import { playheadAfterSelectionFinalize } from '../utils/playheadAfterFinalize';
import { CanvasTrackList } from './canvas/CanvasTrackList';
import { GridOverlay } from './GridOverlay';
import { SnapGuideline } from './canvas/SnapGuideline';
import { SplitPreviewLine } from './canvas/SplitPreviewLine';
import { MarqueeRect } from './canvas/MarqueeRect';
import { computeCanvasHeights } from '../utils/canvasLayout';
import { resolveSnapGuideline } from '../utils/snapGuideline';
import { deriveEnvelopePointSizes } from '../utils/envelopePointSizes';
import { useDragHighlightIds } from '../hooks/useDragHighlightIds';
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
  const envelopePointSizes = React.useMemo(
    () => deriveEnvelopePointSizes(controlPointStyle),
    [controlPointStyle]
  );


  // Track hovered ear for hover effects
  const [hoveredEar, setHoveredEar] = useState<string | null>(null);

  // Track hovered label banner for hover effects
  const [hoveredBanner, setHoveredBanner] = useState<string | null>(null);

  // RAF batching for spectral selection updates (performance optimization)
  const spectralSelectionRAFRef = useRef<number | null>(null);
  const pendingSpectralSelectionRef = useRef<typeof spectralSelection>(null);

  // Track if we just selected a clip on mouse down to prevent immediate deselection on click
  const justSelectedOnMouseDownRef = useRef(false);

  // Cmd/Ctrl-release overlap resolution for Cmd+Arrow clip moves — see
  // useCmdArrowMove for the ref-mirror + keyup listener details.
  // isCmdArrowMoving mirrors the module-scoped pendingClipMoveResolution
  // ref so React can lift the moving clip's z-index while the Cmd hold
  // is in progress; beginCmdMove flips it on at the call sites below.
  const { isCmdArrowMoving, beginCmdMove } = useCmdArrowMove({ tracks });

  // Factory that builds a new track template when a clip is dropped below
  // all tracks (mouse drag) or when Cmd+Down overflows the last track
  // (keyboard path). Extracted so both useClipDragging and
  // useTrackKeyboardHandlers can reference the same function.
  const buildTrackForDrop = (indexAmongNew: number, sourceTrackIndex: number): Track => {
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
  };

  // Track-level keyboard navigation (Arrow/Shift+Arrow) and reorder
  // (Cmd+Arrow) handlers — extracted so the per-track render loop below
  // just wires each TrackNew's trackIndex through a thin arrow.
  const { onTrackNavigateVertical, onTrackReorder } = useTrackKeyboardHandlers({
    tracks,
    selectedTrackIndices,
    focusedTrackIndex,
    timeSelection,
    selectionAnchor,
    setSelectionAnchor,
    trackSelectionMode,
    onTrackContainerFocusChange,
    beginCmdMove,
    buildTrackForDrop,
  });

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
    buildTrackForDrop,
    snapEnabled,
    snapOptions,
  });

  // draggingClipIds (mouse-drag ghosting) + raisedClipIds (Cmd+Arrow
  // keyboard nudge z-index lift) — extracted to a hook. See
  // useDragHighlightIds for the note on the ref-in-memo pattern
  // (clipDragStateRef.current is read inside draggingClipIds but is
  // intentionally not a memo dependency).
  const { draggingClipIds, raisedClipIds } = useDragHighlightIds({
    isDraggingClips,
    clipDragStateRef,
    isCmdArrowMoving,
    tracks,
  });

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

  // Container mouse/drag handler bundle — extracted to a custom hook.
  // Owns lastMouseButtonRef (nothing outside these nine handlers reads
  // or writes it) and closes over the pieces the handlers need from
  // render scope. See useCanvasPointerHandlers.ts for the cross-handler
  // ordering hazards these bodies rely on.
  const pointerHandlers = useCanvasPointerHandlers({
    lastMouseButtonRef,
    splitTool,
    splitMode,
    marquee,
    containerProps,
    selection: selection.selection,
    handleClipMouseDown,
    handleContainerClick,
    onTimeSelectionMenuClick,
    onMidiClipDoubleClick,
    tracks,
    pixelsPerSecond,
    leftPadding,
    playheadPosition,
    focusedTrackIndex,
    timeSelection,
  });

  return (
    <div className={`canvas-container${splitMode && splitHover ? ' canvas-container--split-mode' : ''}`} style={{ backgroundColor: bgColor, height: `${containerHeight}px`, minHeight: `${viewportHeight}px`, overflow: 'clip', overflowClipMargin: '2px', cursor: splitMode && splitHover ? `url(${splitCursorUrl}) 14 10, crosshair` : 'text' } as React.CSSProperties}>
      {/* Snap guideline — a 1px yellow vertical line at the snap target
          of an in-progress trim or stretch. Spans the full canvas
          height so the user can see which grid line each edge is
          locking to. */}
      {snapGuidelineTime !== null && (
        <SnapGuideline
          snapGuidelineTime={snapGuidelineTime}
          pixelsPerSecond={pixelsPerSecond}
          color={snapGuidelineColor}
          shadow={snapGuidelineShadow}
        />
      )}

      {/* Split-tool preview line. Bare hover shows it spanning just the
          hovered track; Shift held extends it across all tracks. */}
      {splitMode && splitHover && (
        <SplitPreviewLine splitHover={splitHover} tracks={tracks} focusColor={theme.border.focus} />
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
        {...pointerHandlers}
        // Extend the inner (event-attached) container all the way to
        // the bottom of the visible canvas — including the scroll
        // buffer below the last track and the viewport minHeight.
        // Otherwise mousedown in the empty area below the tracks hits
        // the outer .canvas-container instead of this div, so
        // useAudioSelection never sees the event and the "drag from
        // below to select every track" flow can't start.
        style={{ ...containerProps.style, height: `${Math.max(containerHeight, viewportHeight)}px`, userSelect: 'none', cursor: 'text' } as React.CSSProperties}
      >
        <CanvasTrackList
          tracks={tracks}
          selectedTrackIndices={selectedTrackIndices}
          focusedTrackIndex={focusedTrackIndex}
          selectedLabelIds={selectedLabelIds}
          width={width}
          pixelsPerSecond={pixelsPerSecond}
          envelopeMode={envelopeMode}
          isFlatNavigation={isFlatNavigation}
          trackBase={trackBase}
          timeSelection={timeSelection}
          isTimeSelectionDragging={selection.selection.isDragging}
          clipStyle={clipStyle}
          recordingClipId={recordingClipId}
          showRmsInWaveform={showRmsInWaveform}
          draggingClipIds={draggingClipIds}
          raisedClipIds={raisedClipIds}
          hoveredMidiClipId={hoveredMidiClipId}
          onHoverMidiClip={onHoverMidiClip}
          onTrackFocusChange={onTrackFocusChange}
          onTrackContainerFocusChange={onTrackContainerFocusChange}
          onEnterTrackPanel={onEnterTrackPanel}
          onShiftTabFromTrack={onShiftTabFromTrack}
          onContainerEnter={onContainerEnter}
          onTabFromLastClip={onTabFromLastClip}
          envelopePointSizes={envelopePointSizes}
          spectrogramScale={spectrogramScale}
          hoveredEar={hoveredEar}
          hoveredBanner={hoveredBanner}
          setHoveredEar={setHoveredEar}
          setHoveredBanner={setHoveredBanner}
          selectionAnchor={selectionAnchor}
          setSelectionAnchor={setSelectionAnchor}
          wasJustDragging={selection.selection.wasJustDragging}
          wasJustTrimming={wasJustTrimming}
          wasJustStretching={wasJustStretching}
          onTrackNavigateVertical={onTrackNavigateVertical}
          onTrackReorder={onTrackReorder}
          onClipMenuClick={onClipMenuClick}
          didDragRef={didDragRef}
          justSelectedOnMouseDownRef={justSelectedOnMouseDownRef}
          clipTrimStateRef={clipTrimStateRef}
          clipStretchStateRef={clipStretchStateRef}
          startClipStretch={startClipStretch}
          beginCmdMove={beginCmdMove}
          buildTrackForDrop={buildTrackForDrop}
        />

        {/* Right-drag marquee rectangle. Rendered above tracks but
            below any UI chrome. Skipped when null so the DOM stays
            clean for normal interactions. */}
        {marquee.marqueeRect && (
          <MarqueeRect marqueeRect={marquee.marqueeRect} focusColor={theme.border.focus} />
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
