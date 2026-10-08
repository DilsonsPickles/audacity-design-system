import React from 'react';
import type { MidiNote } from '@audacity-ui/core';
import { Clip, StretchIcon, TrimLeftIcon, TrimRightIcon } from '../Clip/Clip';
import { clipHandleRows } from '../utils/clipHandleRows';
import type { SpectrogramScale } from '../ClipBody/ClipBody';
import { EnvelopeInteractionLayer } from '../EnvelopeInteractionLayer/EnvelopeInteractionLayer';
import { generateSpeechWaveform } from '../utils/waveform';
import { CrossfadeGhost } from './CrossfadeGhost';
import { computeCrossfades, computeFadeCurves, crossfadeIntersection, effectiveFades, fadeAreaAbovePath, fadeAreaBelowPath, fadeCurvePath, fadeHandleOf, clampFadeHandle, quickFadeWindows, type FadeShape, localFadeRegionsByClip, DEFAULT_CROSSFADE_SHAPE, DEFAULT_QUICK_FADE_SHAPE } from '../utils/clipCrossfades';
import { computeEdgeHitZones, EDGE_HIT_INSIDE_PX } from '../utils/clipEdgeHitZones';
import { CLIP_CONTENT_OFFSET } from '../constants';
import { useContainerTabGroup } from '../hooks/useContainerTabGroup';
import { useLeavingKeys } from '../hooks/useLeavingKeys';
import type { ClipColor } from '../types/clip';
import { useAccessibilityProfile } from '../contexts/AccessibilityProfileContext';
import { getInputMode } from '../utils/inputMode';
import { scrollIntoViewIfNeeded } from '../utils/scrollIntoViewIfNeeded';
import { useTheme } from '../ThemeProvider/ThemeProvider';
import { formatTimeForA11y } from '../utils/announce';
import './Track.css';

const EMPTY_NUMBER_ARRAY: number[] = [];

/**
 * Fade handle glyph. The 'out' side renders mirrored.
 *
 * One of the clip's handles, drawn the way the TRIM and STRETCH handles
 * are (user decision 2026-09-29): a solid BLACK body with a 1px WHITE
 * outline and the mark inside it in white — here the fade's curve, as
 * the stretch handle carries its clock. The body is 10px with rounded
 * corners: 12px over the outline, which is what the stretch disc
 * measures (a 12px BODY was tried and read too big — a square carries
 * more weight than a disc of the same width, and the outline adds to
 * it). The outline is there in every
 * state, so the handle holds its edge on any clip colour, waveform or
 * dimmed fade area behind it.
 *
 * Geometry (spec 2026-09-30, the Figma "hit zones" frame, widened the
 * same day): the HIT BOX is FADE_HANDLE_BOX — 36 × 32, the trim and
 * stretch boxes' own size — CENTRED on the body, and the svg is drawn
 * at that size with the body in its middle, so mirroring it for the
 * fade-out handle moves nothing. Near the clip's edge the box is
 * CLIPPED at FADE_HANDLE_BOX_INSET, where whatever owns the edge —
 * the selected clip's trim box, the unselected clip's edge zone, both
 * reaching 6px in — ends, and that wins the overlap: at rest that
 * leaves 30px, and the box fills out as the handle comes away from the
 * edge. The svg itself is never clipped — it takes no pointer events,
 * so its overflow adds nothing to the hit area.
 */
/** The clip handle under the pointer, as reported to a host's status
 *  bar (user decision 2026-10-01). Alt is folded in where it changes the
 *  gesture: an edge zone with Alt down is 'edge-stretch', the crossfade
 *  node 'crossfade-roll'. The words are the host's (it knows the
 *  operating system's modifier names); these are only which handle. */
export type ClipHandleHint =
  | 'trim'
  | 'stretch'
  | 'edge-trim'
  | 'edge-stretch'
  | 'fade-length'
  | 'fade-shape'
  | 'crossfade'
  | 'crossfade-roll';

const FADE_GLYPH_RADIUS = 2.5;
const FADE_HANDLE_BOX = { width: 36, height: 32 } as const;
/** The HIT BOX's reach from the body's centre, the same either side:
 *  a 30px box with the body in its MIDDLE, held whatever the fade's
 *  length — never filling out to 36 as it comes away from the edge
 *  (user decisions 2026-10-06, "can we try it not scaling up?" and
 *  "can the icon stay in the centre?", replacing 2026-09-30's
 *  fill-out). With a fade the box runs from the fade's BOUNDARY — the
 *  guideline's line — 30px in, the body's centre 15 past it; at rest
 *  it is clipped to the 6px line (what owns the edge). The glyph svg
 *  stays FADE_HANDLE_BOX wide, centred on the body, and overflows the
 *  box 3px each side harmlessly. */
const FADE_HIT_REACH = 15;
/** Under and at this clip height the fade controls (length handles,
 *  guidelines, shape dots, crossfade node) do not render — the 44px
 *  floor, where the edge handle rows take the whole clip. Not the
 *  collapse point (72): a collapsed 60px clip still has room. */
const FADE_CONTROLS_MIN_CLIP_HEIGHT = 44;
const FADE_GLYPH_BODY = {
  x: (FADE_HANDLE_BOX.width - 10) / 2,
  y: (FADE_HANDLE_BOX.height - 10) / 2,
  size: 10,
} as const;
/** Where the fade box starts, in from the clip's edge: the inside reach
 *  of what owns the edge. The selected clip's trim box reaches the same
 *  6px in as the unselected clip's edge zone (user decision 2026-09-30,
 *  it was 12 — Clip.css: 30 wide at −24), so it is one line whatever
 *  the clip's state. */
const FADE_HANDLE_BOX_INSET: number = EDGE_HIT_INSIDE_PX;
/** Where the fade handle's BODY rests, in from the clip's edge — and
 *  the same distance past a fade's boundary once there is a fade: 10px
 *  since 2026-10-07, half the 30px box less half the body, so the HIT
 *  BOX's near edge sits EXACTLY ON THE FADE'S BOUNDARY, where the
 *  dashed guideline is ("make the dashed line align with the edge of
 *  the hit area" — the box had started 6px inside the line). At rest
 *  (no fade) the box would run 0..30 and is clipped to the 6px line
 *  by the edge's owner, so it is 6..30 there with the body at 10..20.
 *  (It was 16 from 2026-10-06 — the 6px line plus half the box, the
 *  box centred and starting at the line — and the spec's 13 before
 *  that, the Figma "hit zones" frame's 12 plus the outline's pixel.) */
const FADE_HANDLE_BODY_INSET = FADE_HIT_REACH - 5;
const FadeHandleGlyph: React.FC<{ mirrored?: boolean }> = ({ mirrored }) => {
  const clipId = React.useId();
  const { x, y, size } = FADE_GLYPH_BODY;
  const xEnd = x + size;
  const yEnd = y + size;
  // The curve runs corner to corner, bowed toward the corner between
  // them; its control points sit two thirds of the way along each side
  const bowX = x + (size * 2) / 3;
  const bowY = y + (size * 2) / 3;
  return (
    <svg
      width={FADE_HANDLE_BOX.width}
      height={FADE_HANDLE_BOX.height}
      viewBox={`0 0 ${FADE_HANDLE_BOX.width} ${FADE_HANDLE_BOX.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible', ...(mirrored ? { transform: 'scaleX(-1)' } : {}) }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={size} height={size} rx={FADE_GLYPH_RADIUS} />
        </clipPath>
      </defs>
      {/* Outside the body only: the pixel from x − 1 to x */}
      <rect
        data-fade-glyph-halo
        x={x - 0.5}
        y={y - 0.5}
        width={size + 1}
        height={size + 1}
        rx={FADE_GLYPH_RADIUS + 0.5}
        fill="none"
        stroke="#FFFFFF"
      />
      <rect
        data-fade-glyph-frame
        x={x}
        y={y}
        width={size}
        height={size}
        rx={FADE_GLYPH_RADIUS}
        fill="#000000"
      />
      <path
        data-fade-glyph-curve
        d={`M${xEnd} ${y}C${bowX} ${y} ${x} ${bowY} ${x} ${yEnd}`}
        stroke="#FFFFFF"
        strokeWidth={1.5}
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
};

export interface TrackClip {
  id: string | number;
  name: string;
  start: number;
  duration: number;
  /** The clip's OWN colour, set by the user (the Clip properties panel
   *  or the clip menu, 2026-10-02); absent = the track's. Distinct from
   *  any host-side `color` mirror of the track's colour. */
  ownColor?: ClipColor;
  /** Pitch shift in semitones (the Clip properties panel's Pitch field,
   *  2026-10-02); absent = none */
  pitchSemitones?: number;
  /** Draws (and, in the host's engine, plays) BACKWARDS: the waveform
   *  arrays are mirrored for the body and the ghost; the host keeps
   *  trimStart on the mirrored source (2026-10-07) */
  reversed?: boolean;
  selected?: boolean;
  waveform?: number[];
  waveformRms?: number[];
  waveformLeft?: number[];
  waveformRight?: number[];
  waveformLeftRms?: number[];
  waveformRightRms?: number[];
  envelopePoints?: Array<{ time: number; db: number }>;
  midiNotes?: MidiNote[];
  /** Clip fade lengths in seconds (equal-power, same curves as the
   *  crossfade X). Absent/0 = no fade. */
  fadeIn?: number;
  fadeOut?: number;
  /** Curve shape exponents (default 1 = equal-power), set by dragging
   *  the crossfade intersection node. */
  fadeInShape?: FadeShape;
  fadeOutShape?: FadeShape;
  /** The crossfade's own curve shapes on this clip's edges (the
   *  intersection node's state; see utils/clipCrossfades.ts) */
  crossfadeInShape?: number | 'linear';
  crossfadeOutShape?: number | 'linear';
}

export interface TrackProps {
  /**
   * Array of clips to display on this track
   */
  clips: TrackClip[];

  /**
   * Height of the track in pixels
   * @default 114
   */
  height?: number;

  /**
   * Track index (0-based, determines color scheme)
   * - 0 = Blue
   * - 1 = Violet
   * - 2 = Magenta
   * - Cycles through colors for higher indices
   */
  trackIndex: number;

  /**
   * Whether to show spectrogram view
   * @default false
   */
  spectrogramMode?: boolean;

  /**
   * Whether to show split view (spectrogram + waveform)
   * @default false
   */
  splitView?: boolean;

  /**
   * Whether envelope mode is active
   * @default false
   */
  envelopeMode?: boolean;

  /**
   * Whether the track is selected
   */
  isSelected?: boolean;

  /**
   * Whether the track has focus
   */
  isFocused?: boolean;

  /**
   * Whether the track is muted
   */
  isMuted?: boolean;

  /**
   * Whether this is a label track (hides clip header recess)
   * @default false
   */
  isLabelTrack?: boolean;

  /**
   * Whether this is a MIDI track (shows compact note preview instead of waveform)
   * @default false
   */
  isMidiTrack?: boolean;

  /**
   * Pixels per second (zoom level)
   * @default 100
   */
  pixelsPerSecond?: number;

  /**
   * Width of the track in pixels
   */
  width: number;

  /**
   * Background color for track
   * @default 'rgba(255,255,255,0.05)'
   */
  backgroundColor?: string;

  /**
   * Callback when a clip is clicked
   */
  onClipClick?: (clipId: string | number, shiftKey?: boolean, metaKey?: boolean) => void;
  /** Callback when the user commits a clip rename inline. */
  onClipRename?: (clipId: string | number, newName: string) => void;

  /**
   * Callback when track background is clicked
   */
  onTrackClick?: (event: React.MouseEvent) => void;

  /**
   * Callback when envelope points change
   */
  onEnvelopePointsChange?: (clipId: string | number, points: Array<{ time: number; db: number }>) => void;

  /**
   * Callback when a clip header is clicked
   */
  onClipHeaderClick?: (clipId: string | number, clipStartTime: number) => void;

  /**
   * Callback when a clip menu button is clicked
   */
  onClipMenuClick?: (clipId: string | number, x: number, y: number, openedViaKeyboard?: boolean) => void;

  /**
   * Callback when a clip edge is being trimmed
   */
  onClipTrimEdge?: (clipId: string | number, edge: 'left' | 'right', clientX: number) => void;
  /** Visual time-stretch handles. Mirrors onClipTrimEdge — Canvas hooks this
   *  up to a stretch handler that updates duration + stretchFactor. */
  onClipStretchEdge?: (clipId: string | number, edge: 'left' | 'right', clientX: number) => void;

  /** Called while a fade handle is dragged — `seconds` is the new fade
   *  length for that side (0 removes the fade). */
  onClipFadeChange?: (clipId: string | number, side: 'in' | 'out', seconds: number) => void;

  /** The host's grid, as a function of PROJECT time (seconds from time
   *  zero) — present whenever there is a grid, snapping on or off. A
   *  fade handle drag snaps the fade's boundary (where the fade meets
   *  the clip's body) through it while snapping is on, and SHIFT INVERTS
   *  that — snapping on, Shift means none; snapping off, Shift means the
   *  grid — as a clip drag's Shift does (user decision 2026-10-01; it
   *  was Alt-to-bypass). The snapped boundary is still held to the
   *  fade's limits. */
  snapTime?: (time: number) => number;
  /** Whether snapping is on (the host's switch); read live with Shift. */
  snapEnabled?: boolean;

  /** The host's clip-edge ALIGNMENT for a fade boundary (user decision
   *  2026-10-01): the nearest clip edge on another track within reach of
   *  `time`, or null. Consulted when the grid is not — snapping off, or
   *  on with Shift held — exactly as a clip drag's alignment stands in
   *  for its grid; Shift with snapping on is no snap at all. */
  alignFadeBoundary?: (time: number, trackIndex: number) => number | null;
  /** Reports where a fade handle drag has snapped to (project time) and
   *  to what — the grid or a clip edge — or null when it has not / when
   *  the drag ends, for the host's snap guideline. Only fires when
   *  `snapTime` or `alignFadeBoundary` is set. */
  onFadeSnapGuideline?: (time: number | null, kind: 'grid' | 'alignment' | null) => void;
  /** The clip whose fade (length handle or shape node) is in hand
   *  ANYWHERE — on this track or another. Reported through
   *  onFadeDragChange; the host hands it back to every track so all of
   *  them hide their other clips' handles (2026-10-01). */
  fadeInHandClipId?: string | number | null;
  onFadeDragChange?: (clipId: string | number | null) => void;
  /** The project's selection is ONE clip (the host counts across
   *  tracks): that clip keeps its trim and stretch handles without the
   *  pointer. Otherwise handles follow the pointer only (2026-10-01). */
  singleSelection?: boolean;
  /** The clip handle under the pointer, for a status bar (user decision
   *  2026-10-01): which handle, with Alt folded in (an edge zone with
   *  Alt down is 'edge-stretch', the crossfade node 'crossfade-roll'),
   *  or null when the pointer is on none. Reported on change only. */
  onHandleHint?: (hint: ClipHandleHint | null) => void;
  /** Right-click on a quick fade's length handle or shape handle: the
   *  host opens the fade's menu — presets, length, remove — at (x, y)
   *  in client space (user decision 2026-10-01, the "dive deeper" door
   *  beside the direct gestures). */
  onFadeContextMenu?: (clipId: string | number, side: 'in' | 'out', x: number, y: number) => void;
  /** Right-click on the crossfade's intersection node: the host opens
   *  the crossfade's menu — its shape presets — at (x, y). */
  onCrossfadeContextMenu?: (outgoingClipId: string | number, incomingClipId: string | number, x: number, y: number) => void;

  /** Alt+drag on the crossfade's intersection node — a ROLL: both clip
   *  edges slide so the seam (the incoming clip's start) lands at
   *  `seamTime`, the overlap length staying. ABSOLUTE, so the host can
   *  clamp it and a repeated or stale request changes nothing — fired on
   *  every move of the drag. */
  onCrossfadeRoll?: (outgoingClipId: string | number, incomingClipId: string | number, seamTime: number) => void;

  /** Plain drag on the intersection node — reshapes BOTH curves (fade
   *  extents never move) so the crossing lands under the pointer. */
  onCrossfadeShapeChange?: (
    outgoingClipId: string | number,
    incomingClipId: string | number,
    outShape: number | 'linear',
    inShape: number | 'linear',
  ) => void;

  /** Vertical drag on a quick fade's midpoint node — bows that fade's
   *  curve (shape exponent; the extent stays the handle's job). */
  onClipFadeShapeChange?: (clipId: string | number, side: 'in' | 'out', shape: FadeShape) => void;

  /**
   * Tab index for keyboard navigation
   */
  tabIndex?: number;

  /**
   * Callback when keyboard focus changes
   */
  onFocusChange?: (hasFocus: boolean) => void;

  /**
   * Callback when a clip should be moved (Cmd+Arrow keys)
   */
  onClipMove?: (clipId: string | number, deltaSeconds: number) => void;

  /**
   * Callback when a clip should be trimmed (Shift+Arrow keys)
   */
  onClipTrim?: (clipId: string | number, edge: 'left' | 'right', deltaSeconds: number) => void;

  /**
   * Callback when a clip should be time-stretched via the keyboard
   * (Alt+ArrowLeft / Alt+ArrowRight). Positive `deltaSeconds` extends the
   * right edge to the right, negative shortens it. Mirrors `onClipTrim`'s
   * shape so wiring in Canvas can be parallel.
   */
  onClipStretch?: (clipId: string | number, edge: 'left' | 'right', deltaSeconds: number) => void;

  /**
   * Callback when a clip should be moved to a different track (Cmd+Arrow Up/Down)
   */
  onClipMoveToTrack?: (clipId: string | number, direction: 1 | -1) => void;

  /**
   * Callback when navigating vertically between tracks (Arrow Up/Down without modifiers)
   */
  onClipNavigateVertical?: (clipId: string | number, direction: 1 | -1) => void;

  /**
   * Time selection range (for rendering vibrant clip colors within selection)
   */
  timeSelection?: { startTime: number; endTime: number; tracks?: number[]; renderOnCanvas?: boolean } | null;

  /**
   * Whether time selection is currently being dragged
   */
  isTimeSelectionDragging?: boolean;

  /**
   * Clip style preference ('classic' or 'colourful')
   */
  clipStyle?: 'classic' | 'colourful';

  /**
   * Explicit track color — overrides the default trackIndex-based color cycle.
   * Assigned at track creation time so color persists across reorder.
   */
  color?: string;

  /**
   * ID of the clip currently being recorded (to show recording state)
   */
  recordingClipId?: string | number | null;

  /**
   * Envelope control point sizes (for MuseScore vs AU4 style)
   */
  envelopePointSizes?: {
    outerRadius: number;
    innerRadius: number;
    outerRadiusHover: number;
    innerRadiusHover: number;
    dualStrokeLine?: boolean;
    [key: string]: unknown;
  };

  /**
   * Split view ratio (0-1, where 0.5 is center)
   * Controls the position of the divider between spectrogram (top) and waveform (bottom)
   * @default 0.5
   */
  channelSplitRatio?: number;

  /**
   * Callback when split view ratio changes (user drags divider)
   */
  onChannelSplitRatioChange?: (ratio: number) => void;

  /**
   * Frequency scale for spectrogram rendering
   * @default 'mel'
   */
  spectrogramScale?: SpectrogramScale;

  /**
   * Tab index for the track container div (the .track element)
   * When set, the container becomes a tab stop before the panel and clips.
   */
  trackTabIndex?: number;

  /**
   * Human-readable name of the track, surfaced to screen readers when
   * the track container itself receives focus. Without it VoiceOver
   * falls back to reading every child clip's label, which is noisy.
   */
  trackName?: string;

  /**
   * Callback when ArrowUp/Down is pressed while the track container itself is focused.
   * Direction: 1 = down, -1 = up.
   */
  /** Vertical arrow nav between tracks.
   *  - direction: -1 (up) or 1 (down)
   *  - shiftKey: extend the range selection
   *  - decouple: hold Cmd/Ctrl — focus moves but selection is left
   *    alone (peek) in follows-focus mode. */
  onTrackNavigateVertical?: (direction: 1 | -1, shiftKey?: boolean, decouple?: boolean) => void;

  /**
   * Callback when Cmd+ArrowUp/Down is pressed on the track container to reorder the track.
   * Direction: 1 = move down, -1 = move up. The `wasContainerFocused`
   * flag tells the host whether the .track div was in the keyboard
   * (black/white) focus mode at the time of the reorder — the host
   * uses it to decide whether to carry that mode over to the new
   * track position.
   */
  onTrackReorder?: (direction: 1 | -1, wasContainerFocused: boolean) => void;

  /**
   * Callback when the track container itself gains or loses keyboard focus.
   * Fires true only when the .track div itself is focused, not child clips.
   */
  onContainerFocusChange?: (hasFocus: boolean) => void;

  /**
   * Callback when Tab is pressed on the track container to enter the panel controls.
   */
  onEnterPanel?: () => void;

  /**
   * Callback when Shift+Tab is pressed on the track container to go to the previous track.
   */
  onShiftTabOut?: () => void;

  /**
   * Callback when Enter is pressed on the track container itself.
   */
  onContainerEnter?: (modifiers: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;

  /**
   * Callback when Tab is pressed on the last clip.
   * Used to navigate to the ruler (or next track) when the ruler is in a separate DOM tree.
   */
  onTabFromLastClip?: () => void;

  /**
   * ID of the clip currently being hovered (for cross-component highlight, e.g. piano roll ↔ canvas)
   */
  hoveredClipId?: number | null;

  /**
   * Called when mouse enters/leaves a clip
   */
  onHoverClip?: (clipId: number | null) => void;

  /**
   * Set of clip ids currently being dragged. Drawn at reduced opacity and elevated z-index.
   */
  draggingClipIds?: ReadonlySet<number>;
  /**
   * Set of clip ids that should render on top of siblings without
   * the mouse-drag ghost opacity. Used by keyboard clip nudges
   * (Cmd+Arrow) so the moving clip sits solidly over anything it
   * passes over during the hold, then settles once Cmd is released.
   */
  raisedClipIds?: ReadonlySet<number>;
  /**
   * Live marquee preview. When non-null this REPLACES `clip.selected`
   * for the purpose of clip styling only: the clips inside the
   * rectangle show the selected treatment, and any currently-selected
   * clip outside it drops back to idle — so the track shows what the
   * release is about to commit. Pass null (the default) whenever no
   * marquee is in flight.
   *
   * Deliberately visual-only: selection-gated AFFORDANCES (quick-fade
   * handles, crossfade nodes) keep reading the real `clip.selected`,
   * so sweeping a marquee doesn't spray handles across the timeline.
   */
  marqueePreviewClipIds?: ReadonlySet<number> | null;

}

// Map track index to color
const TRACK_COLORS = ['blue', 'violet', 'magenta', 'teal', 'cyan', 'green', 'orange', 'red', 'yellow'] as const;
function getTrackColor(trackIndex: number, clipStyle: 'classic' | 'colourful' = 'colourful') {
  if (clipStyle === 'classic') {
    return 'classic' as const;
  }
  return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
}

/**
 * Track component - renders a single audio track with clips using Clip components
 */
const TrackNewComponent: React.FC<TrackProps> = ({
  clips,
  height = 114,
  trackIndex,
  spectrogramMode = false,
  splitView = false,
  envelopeMode = false,
  isSelected = false,
  isFocused = false,
  isMuted = false,
  isLabelTrack = false,
  isMidiTrack = false,
  pixelsPerSecond = 100,
  width,
  backgroundColor = 'rgba(255,255,255,0.05)',
  onClipClick,
  onClipRename,
  onTrackClick,
  onEnvelopePointsChange,
  onClipHeaderClick,
  onClipMenuClick,
  onClipTrimEdge,
  onClipStretchEdge,
  onClipFadeChange,
  snapTime,
  snapEnabled = false,
  alignFadeBoundary,
  onFadeSnapGuideline,
  fadeInHandClipId,
  onFadeDragChange,
  singleSelection = false,
  onHandleHint,
  onFadeContextMenu,
  onCrossfadeContextMenu,
  onCrossfadeRoll,
  onCrossfadeShapeChange,
  onClipFadeShapeChange,
  tabIndex,
  onFocusChange,
  onClipMove,
  onClipTrim,
  onClipStretch,
  onClipMoveToTrack,
  onClipNavigateVertical,
  timeSelection,
  isTimeSelectionDragging = false,
  clipStyle = 'colourful',
  color,
  recordingClipId = null,
  envelopePointSizes,
  channelSplitRatio = 0.5,
  onChannelSplitRatioChange,
  spectrogramScale,
  trackTabIndex,
  trackName,
  onTrackNavigateVertical,
  onTrackReorder,
  onContainerFocusChange,
  onEnterPanel,
  onShiftTabOut,
  onContainerEnter,
  onTabFromLastClip,
  hoveredClipId,
  onHoverClip,
  draggingClipIds,
  raisedClipIds,
  marqueePreviewClipIds = null,
}) => {
  const { theme } = useTheme();
  const trackColor = color && clipStyle !== 'classic' ? color as typeof TRACK_COLORS[number] : getTrackColor(trackIndex, clipStyle);
  // Scope for the time-selection band. When the selection carries its
  // own tracks list (populated by the creating gesture), highlight
  // only those rows — independent of the broader track selection.
  // Falls back to the legacy isSelected-driven look for scopeless
  // selections.
  const inTimeSelectionScope = timeSelection?.tracks
    ? timeSelection.tracks.includes(trackIndex)
    : isSelected;
  const [clipHiddenPoints, setClipHiddenPoints] = React.useState<Map<string | number, number[]>>(new Map());
  const [clipHoveredPoints, setClipHoveredPoints] = React.useState<Map<string | number, number[]>>(new Map());
  const [clipCursorPositions, setClipCursorPositions] = React.useState<Map<string | number, { time: number; db: number } | null>>(new Map());
  const [hasKeyboardFocus, setHasKeyboardFocus] = React.useState(false);
  const [isContainerFocused, setIsContainerFocused] = React.useState(false);
  const [isDraggingDivider, setIsDraggingDivider] = React.useState(false);
  const [dividerHover, setDividerHover] = React.useState(false);
  // Which clip (if any) should render the source-boundary shake bar,
  // and on which edge. Each trigger increments `token` so the shake
  // element remounts even when the same edge is retriggered before
  // the animation completes.
  const [shakeState, setShakeState] = React.useState<{ clipId: string | number; edge: 'left' | 'right'; token: number } | null>(null);
  const shakeTimeoutRef = React.useRef<number | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const focusFromMouseRef = React.useRef(false);
  const trackClickXRef = React.useRef<number | null>(null);
  const clipFocusFromMouseRef = React.useRef(false);
  const mouseDownPosRef = React.useRef<{ x: number; y: number } | null>(null);

  // Flat-navigation mode opts every clip into the Tab order so a
  // screen-reader or sequential keyboard user can reach each one,
  // rather than roving with arrow keys from a single Tab stop.
  const { activeProfile } = useAccessibilityProfile();
  const isFlatNavigation = activeProfile.config.tabNavigation === 'sequential';

  // Container-level roving tabindex for clip navigation (ArrowLeft/Right)
  const { onKeyDown: clipNavKeyDown, onBlur: clipNavBlur, onClickCapture: clipNavClickCapture, initTabIndices: initClipTabIndices } = useContainerTabGroup({
    containerRef: trackRef,
    groupId: `track-${trackIndex}-clips`,
    selector: '[role="button"]',
    startTabIndex: tabIndex,
  });

  // Re-init clip tab indices when clips change
  React.useEffect(() => {
    initClipTabIndices();
  }, [clips, initClipTabIndices]);

  // Handle divider drag
  React.useEffect(() => {
    if (!isDraggingDivider || !onChannelSplitRatioChange) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Calculate ratio within clip body (excluding 20px header)
      const CLIP_HEADER_HEIGHT = 20;
      const clipBodyHeight = height - CLIP_HEADER_HEIGHT;
      const yInBody = mouseY - CLIP_HEADER_HEIGHT;

      // Calculate min/max ratio based on 16px minimum height for each section
      const MIN_SECTION_HEIGHT = 16;
      const minRatio = MIN_SECTION_HEIGHT / clipBodyHeight;
      const maxRatio = 1 - (MIN_SECTION_HEIGHT / clipBodyHeight);

      // Constrain ratio to ensure both sections are at least 16px
      const newRatio = Math.max(minRatio, Math.min(maxRatio, yInBody / clipBodyHeight));

      onChannelSplitRatioChange(newRatio);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDivider, onChannelSplitRatioChange, height]);

  // Use theme tokens (semi-transparent so grid lines show through)
  const getTrackBackgroundColor = () => isSelected ? theme.background.canvas.track.selected : theme.background.canvas.track.idle;

  // Sort clips by start time so tab order follows timeline position.
  // DOM order stays chronological; PAINT order is the array position
  // (see zIndex below): clips may overlap (2026-09-21) and the array
  // index is the z-order — later = on top = wins clicks.
  const sortedClips = React.useMemo(
    () => [...clips].sort((a, b) => a.start - b.start),
    [clips],
  );
  const clipZIndex = React.useMemo(() => {
    const z = new Map<number | string, number>();
    clips.forEach((c, i) => z.set(c.id, 2 + i));
    return z;
  }, [clips]);

  // Which clip's fade handle is being dragged (keeps the handles
  // visible while the pointer is captured, even off-hover)
  const [fadeDragClipId, setFadeDragClipId] = React.useState<string | number | null>(null);
  // …and which of its two handles — that one wears the pressed look
  const [fadeDragSide, setFadeDragSide] = React.useState<'in' | 'out' | null>(null);
  // Quick-fade shape node being dragged (kept visible off-selection)
  const [shapeDrag, setShapeDrag] = React.useState<string | null>(null);
  // Crossfade node being dragged (`out-in`) — kept visible off-hover
  const [crossfadeDrag, setCrossfadeDrag] = React.useState<string | null>(null);
  // While clips are being DRAGGED no drag handle shows anywhere on the
  // track (user decision 2026-09-30) — not on the moving clips, not on
  // the ones they pass: trim, stretch, fade length, fade shape,
  // crossfade, edge zones. The drag is the only thing in hand.
  const clipDragInProgress = (draggingClipIds?.size ?? 0) > 0;
  // While a FADE is being dragged — a length handle or a shape node —
  // every OTHER clip's handles hide too (user decision 2026-10-01): a
  // selected clip elsewhere on the track was still showing its trim,
  // stretch and fade handles beside a drag that had nothing to do with
  // it. The clip in hand keeps its own controls. The same rule as the
  // clip drag, scoped to one clip; the shape drag's key is `${id}:${side}`.
  // This track's own drag is known here; a drag on ANOTHER track comes
  // back from the host as fadeInHandClipId (it was reported to it).
  const fadeDragInHand: string | null = fadeDragClipId != null
    ? String(fadeDragClipId)
    : shapeDrag ? shapeDrag.slice(0, shapeDrag.lastIndexOf(':'))
    : fadeInHandClipId != null ? String(fadeInHandClipId) : null;
  const hidesHandlesOf = (clipId: string | number) =>
    clipDragInProgress || (fadeDragInHand != null && fadeDragInHand !== String(clipId));
  // The clip under the pointer. Its fade controls show WITHOUT the clip
  // being selected (user decision 2026-09-29, widening the 2026-09-21
  // selected-only rule): fading a clip is not a reason to change the
  // selection. The controls sit at track level, above the clip, so they
  // report the hover themselves — leaving the clip FOR one of its own
  // controls must not hide it.
  const [fadeHoverClipId, setFadeHoverClipId] = React.useState<string | number | null>(null);
  // HANDLES FOLLOW THE POINTER, NOT THE SELECTION (user decision
  // 2026-10-01: six selected clips put forty icons on screen, most of
  // them 24px outside the clips in empty track). The trim and stretch
  // handles — in the clip and the buried duplicates — show on the clip
  // the pointer is over, anywhere on it or on one of its handles (the
  // wrapper's enter/leave: a handle is a descendant, so sitting on one
  // 20px outside the clip still counts), and for the length of a drag
  // from one. Selection changes nothing here; a drag on a selected
  // clip's handle still applies to every selected clip — the rule is
  // just no longer advertised by every clip's furniture. Unlike the
  // fade hover above, this one is not "well inside": the handles ARE
  // the edges.
  const [handleHoverClipId, setHandleHoverClipId] = React.useState<string | number | null>(null);
  // The clip with DOM focus: its FADE handles show without the pointer
  // (user decision 2026-10-01, "if a clip is in focus we need to show
  // fade handles") — the keyboard user's way to see them. Focus moving
  // to one of the clip's own controls is not a blur.
  const [focusedClipId, setFocusedClipId] = React.useState<string | number | null>(null);
  const [edgeDragClipId, setEdgeDragClipId] = React.useState<string | number | null>(null);
  const handleHoverProps = (clipId: string | number) => ({
    onMouseEnter: (e: React.MouseEvent) => { if (e.buttons === 0) setHandleHoverClipId(clipId); },
    onMouseMove: (e: React.MouseEvent) => {
      if (e.buttons === 0) setHandleHoverClipId((prev) => (prev === clipId ? prev : clipId));
    },
    onMouseLeave: () => setHandleHoverClipId((prev) => (prev === clipId ? null : prev)),
  });
  // The shape handle the pointer is ON (`clipId:side`) — it enlarges a
  // little. Distinct from the clip hover above, which only decides
  // whether the handle is there at all.
  const [shapeHandleHover, setShapeHandleHover] = React.useState<string | null>(null);
  // Is Option/Alt held? Over an edge trim zone it turns the press into
  // a STRETCH (user decision 2026-09-30), and the zone's cursor says so
  // ahead of the press; over the crossfade node it turns the press into
  // a ROLL (2026-10-01), and the node's arrows turn sideways. Read from
  // the keyboard, cleared on blur — a modifier can be down when the
  // window loses focus.
  const [altHeld, setAltHeld] = React.useState(false);
  React.useEffect(() => {
    if (!onClipStretchEdge && !onCrossfadeRoll) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(e.type === 'keydown'); };
    const onBlur = () => setAltHeld(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, [onClipStretchEdge, onCrossfadeRoll]);
  // The handle under the pointer, for the host's status bar: each control
  // reports itself on enter and nothing on leave; Alt is folded in here
  // (so the hint changes while the pointer rests on an edge zone or the
  // crossfade node), and the host hears only CHANGES — never a null on
  // mount, which would wipe another track's hint.
  const [hintHover, setHintHover] = React.useState<'trim' | 'stretch' | 'edge' | 'fade-length' | 'fade-shape' | 'crossfade' | null>(null);
  const resolvedHint: ClipHandleHint | null = hintHover === 'edge'
    ? (altHeld && onClipStretchEdge ? 'edge-stretch' : 'edge-trim')
    : hintHover === 'crossfade'
      ? (altHeld && onCrossfadeRoll ? 'crossfade-roll' : 'crossfade')
      : hintHover;
  const lastHintRef = React.useRef<ClipHandleHint | null>(null);
  React.useEffect(() => {
    if (resolvedHint === lastHintRef.current) return;
    lastHintRef.current = resolvedHint;
    onHandleHint?.(resolvedHint);
  }, [resolvedHint, onHandleHint]);
  // A drag that ends with the pointer off its handle gets no mouseleave
  // (the pointer was captured): clear the hint unless it is still there
  const settleHint = (el: HTMLElement, ev: PointerEvent) => {
    if (typeof document.elementFromPoint !== 'function') return;
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!under || !el.contains(under)) setHintHover(null);
  };
  // Prefix for the per-curve SVG clip ids (unique across tracks)
  const fadeClipIdBase = React.useId();
  // …and "over the clip" means WELL inside it (user decision
  // 2026-09-29): at least as far in from either side as the edge trim
  // zone reaches. On the edge itself the pointer is there to trim (or,
  // lower down, to start a selection) — fade handles appearing beside it
  // would only compete. An element that has not been laid out (zero
  // width — nothing to measure against) counts as inside.
  const isWellInsideClip = (rect: DOMRect | undefined, clientX: number) =>
    !rect || rect.width <= 0
    || (clientX >= rect.left + EDGE_HIT_INSIDE_PX && clientX <= rect.right - EDGE_HIT_INSIDE_PX);
  // The clip's own surface: hover follows the pointer's position in it
  const clipSurfaceHoverProps = (clipId: string | number) => {
    const clear = () => setFadeHoverClipId((prev) => (prev === clipId ? null : prev));
    const track = (e: React.MouseEvent) => {
      // A press already under way is not a hover (see fadeHoverProps)
      if (e.buttons !== 0) return;
      if (isWellInsideClip(e.currentTarget.getBoundingClientRect(), e.clientX)) {
        setFadeHoverClipId((prev) => (prev === clipId ? prev : clipId));
      } else {
        clear();
      }
    };
    return { onMouseEnter: track, onMouseMove: track, onMouseLeave: clear };
  };
  // The fade controls themselves, which all sit well inside the clip
  const fadeHoverProps = (clipId: string | number) => ({
    // A press already under way (a selection or clip drag passing over)
    // is not a hover — controls popping up mid-gesture would only flicker
    onMouseEnter: (e: React.MouseEvent) => { if (e.buttons === 0) setFadeHoverClipId(clipId); },
    // Enter alone is not enough: a drag that ENDS over the clip (a
    // selection, a clip move) entered it mid-press, which did not
    // count, and no second enter follows. The first free move inside
    // the clip picks the hover up. (Same value = no re-render.)
    onMouseMove: (e: React.MouseEvent) => {
      if (e.buttons === 0) setFadeHoverClipId((prev) => (prev === clipId ? prev : clipId));
    },
    onMouseLeave: () => setFadeHoverClipId((prev) => (prev === clipId ? null : prev)),
  });
  // A fade drag holds the pointer (capture), so the browser sends no
  // enter/leave while it runs and the hover can be stale when it ends:
  // the control may have been entered mid-press, or the pointer let go
  // far from the clip. Settle it from where the pointer actually is.
  const settleFadeHover = (clipId: string | number, ev: PointerEvent, el: HTMLElement) => {
    const r = el.ownerDocument.querySelector(`[data-clip-id="${clipId}"]`)?.getBoundingClientRect();
    const inside = !!r && isWellInsideClip(r, ev.clientX) && ev.clientY >= r.top && ev.clientY <= r.bottom;
    setFadeHoverClipId((prev) => (inside ? clipId : prev === clipId ? null : prev));
  };

  // Fade curves are DERIVED per clip edge (utils/clipCrossfades.ts):
  // an authored fadeIn/fadeOut owns its edge; an edge overlap supplies
  // the default equal-power ramp only for unauthored sides ("inherit",
  // 2026-09-21). Drawn at TRACK level, above every stacked clip, so an
  // inherited fade stays visible even where its clip is buried under
  // the incoming one.
  const fadeCurves = React.useMemo(() => computeFadeCurves(clips), [clips]);
  // The same regions, per clip and in clip-local time, for shading the
  // waveform under the curve — so the drawn audio follows the fade.
  const fadeRegionsByClip = React.useMemo(() => localFadeRegionsByClip(clips, fadeCurves), [clips, fadeCurves]);
  // Free windows (crossfades consume the edges) — quick-fade controls
  // clamp to them so a quick fade can never overlap a crossfade
  const fadeWindows = React.useMemo(() => quickFadeWindows(clips), [clips]);

  // The X's crossing point per crossfade — the roll-edit grab node.
  // Each side's curve extent honours an authored fade (inherit rule).
  const crossfadeNodes = React.useMemo(() => {
    return computeCrossfades(clips).map((r) => {
      const outClip = clips.find((c) => c.id === r.outgoingClipId);
      const inClip = clips.find((c) => c.id === r.incomingClipId);
      if (!outClip || !inClip) return null;
      // The crossfade CONSUMES authored extents (2026-09-21): both
      // ramps always span the overlap. Its shapes are its OWN
      // (crossfade*Shape, 2026-10-01) — a fresh overlap is symmetric
      // equal-power whatever quick fades the clips had, and those come
      // back untouched when the clips separate
      const shapedOut = { start: r.start, end: r.end, shape: outClip.crossfadeOutShape ?? DEFAULT_CROSSFADE_SHAPE };
      const shapedIn = { start: r.start, end: r.end, shape: inClip.crossfadeInShape ?? DEFAULT_CROSSFADE_SHAPE };
      const point = crossfadeIntersection(shapedOut, shapedIn, r.start, r.end);
      return {
        outgoingClipId: r.outgoingClipId,
        incomingClipId: r.incomingClipId,
        point,
        outRegion: shapedOut,
        inRegion: shapedIn,
        overlapStart: r.start,
        overlapEnd: r.end,
      };
    }).filter((n): n is NonNullable<typeof n> => n !== null);
  }, [clips]);
  // Edges owned by a crossfade — their quick-fade handles hide; the
  // intersection node does the work there (2026-09-21 decision)
  const crossfadedEdges = React.useMemo(() => {
    const set = new Set<string>();
    for (const n of crossfadeNodes) {
      set.add(`${n.outgoingClipId}:out`);
      set.add(`${n.incomingClipId}:in`);
    }
    return set;
  }, [crossfadeNodes]);

  // The fade controls' hover props, with the status-bar hint folded in
  const withHint = (props: ReturnType<typeof fadeHoverProps>, hint: 'fade-length' | 'crossfade') => ({
    ...props,
    onMouseEnter: (e: React.MouseEvent) => { props.onMouseEnter(e); setHintHover(hint); },
    onMouseLeave: () => { props.onMouseLeave(); setHintHover((prev) => (prev === hint ? null : prev)); },
  });

  const renderCrossfadeNodes = () => {
    // A crossfade node belongs to two clips; while a fade is in hand on
    // one clip the pair it sits between is not that clip's business
    // (xNodeActive is empty then; a leaving node still fades out)
    if ((!onCrossfadeShapeChange && !onCrossfadeRoll) || crossfadeNodes.length === 0) return null;
    // A clip at the FLOOR shows its edge handles only (2026-10-07, below)
    if (height <= FADE_CONTROLS_MIN_CLIP_HEIGHT) return null;
    const CLIP_HEADER_H = 20;
    const bodyTop = CLIP_HEADER_H + 1;
    const bodyHeight = Math.max(0, height - bodyTop - 1);
    const NODE_R = 5;
    return crossfadeNodes.map((n) => {
      // Shown under the SAME rules as the quick-fade shape handle (user
      // decision 2026-09-30): only while the pointer is well inside one
      // of the two clips it belongs to (or on the node itself), or
      // while it is being dragged. Selection alone does not show it.
      const nodeKey = `${n.outgoingClipId}-${n.incomingClipId}`;
      const active = xNodeActive.includes(nodeKey);
      const leaving = !active && leavingXNodes.has(nodeKey);
      if (!active && !leaving) return null;
      const x = CLIP_CONTENT_OFFSET + n.point.time * pixelsPerSecond;
      const y = bodyTop + (1 - n.point.gain) * bodyHeight;
      return (
        <div
          key={`crossfade-node-${nodeKey}`}
          data-crossfade-node={nodeKey}
          data-leaving={leaving ? 'true' : undefined}
          role="slider"
          aria-label="Crossfade centre"
          aria-valuenow={n.point.time}
          // Reaching the node from either clip keeps it up: the pointer
          // "leaves" the clip for the node, which sits over the overlap
          {...withHint(fadeHoverProps(n.incomingClipId), 'crossfade')}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            // A Cmd/Ctrl press is the click below, never a drag
            if (e.metaKey || e.ctrlKey) return;
            const nodeEl = e.currentTarget as HTMLElement;
            try { nodeEl.setPointerCapture(e.pointerId); } catch { /* jsdom / older engines */ }
            setFadeHoverClipId(n.incomingClipId); // a press on it proves the pointer is here
            setCrossfadeDrag(nodeKey);
            // The node's gestures (user decisions 2026-10-01; the morning's
            // plain-horizontal roll made the roll and the shape reachable
            // from one press, which "felt weird"):
            //  - plain drag = DEPTH, vertical only: both curves bend so the
            //    crossing's gain lands under the pointer, its TIME held —
            //    equal-power and shallower or deeper. Sideways travel is
            //    ignored. Closed form: shape = ln(gain) / ln(baseCurve(t)).
            //  - ALT+drag = ROLL, horizontal only, a content edit: both
            //    clip edges slide, the seam moves, the overlap's length
            //    holds (the host clamps to hidden material). The request
            //    is ABSOLUTE — the seam at the press plus the pointer's
            //    travel — so a repeated or stale request is idempotent:
            //    incremental deltas both drifted against the clamp and
            //    stuttered (two moves between commits asked twice).
            // The asymmetric bend (crossing following the pointer in both
            // axes) has no gesture now and is gone.
            const rollMode = e.altKey;
            const startClientX = e.clientX;
            const startClientY = e.clientY;
            const startPoint = n.point;
            const seamAtPress = n.overlapStart;
            const onMove = (ev: PointerEvent) => {
              if (rollMode) {
                onCrossfadeRoll?.(n.outgoingClipId, n.incomingClipId, seamAtPress + (ev.clientX - startClientX) / pixelsPerSecond);
                return;
              }
              if (!onCrossfadeShapeChange) return;
              const time = startPoint.time;
              const gain = startPoint.gain - (ev.clientY - startClientY) / Math.max(1, bodyHeight);
              // The pointer must stay strictly inside BOTH curve regions
              // (and the gain away from 0/1) for the solve to exist
              const xLo = Math.max(n.outRegion.start, n.inRegion.start);
              const xHi = Math.min(n.outRegion.end, n.inRegion.end);
              const span = xHi - xLo;
              if (span <= 0) return;
              const x = Math.max(xLo + span * 0.02, Math.min(xHi - span * 0.02, time));
              const tOut = (x - n.outRegion.start) / (n.outRegion.end - n.outRegion.start);
              const tIn = (x - n.inRegion.start) / (n.inRegion.end - n.inRegion.start);
              const baseOut = Math.cos((tOut * Math.PI) / 2);
              const baseIn = Math.sin((tIn * Math.PI) / 2);
              // The exponents are held to [SHAPE_MIN, SHAPE_MAX]. Clamping
              // each SIDE on its own would, off-centre, bite one side
              // before the other and walk the crossing sideways while
              // the time is meant to be held — so the GAIN is clamped
              // instead, to the range both sides can reach (shape = ln g
              // / ln base ⇔ g = base^shape), and neither exponent is
              // ever clamped alone.
              const SHAPE_MIN = 0.15;
              const SHAPE_MAX = 6;
              const gLo = Math.max(0.05, Math.pow(baseOut, SHAPE_MAX), Math.pow(baseIn, SHAPE_MAX));
              const gHi = Math.min(0.95, Math.pow(baseOut, SHAPE_MIN), Math.pow(baseIn, SHAPE_MIN));
              const g = gLo > gHi ? gLo : Math.max(gLo, Math.min(gHi, gain));
              const outShape = Math.log(g) / Math.log(baseOut);
              const inShape = Math.log(g) / Math.log(baseIn);
              if (Number.isFinite(outShape) && Number.isFinite(inShape)) {
                onCrossfadeShapeChange(n.outgoingClipId, n.incomingClipId, outShape, inShape);
              }
            };
            const onUp = (ev: PointerEvent) => {
              nodeEl.removeEventListener('pointermove', onMove);
              nodeEl.removeEventListener('pointerup', onUp);
              setCrossfadeDrag(null);
              settleFadeHover(n.incomingClipId, ev, nodeEl);
              settleHint(nodeEl, ev);
            };
            nodeEl.addEventListener('pointermove', onMove);
            nodeEl.addEventListener('pointerup', onUp);
          }}
          // The same two clicks as the quick fade's shape handle (user
          // decision 2026-10-01, replacing the 2026-09-24 double-click
          // that toggled linear):
          //  - Cmd/Ctrl+CLICK TOGGLES LINEAR — straight lines both sides,
          //    the equal-gain law — or back to equal-power from linear;
          //  - DOUBLE-CLICK RESETS to equal-power, whatever it is now.
          // Only pointermove rewrites the shape, so the clicks are inert
          // to the drag; a right-click opens the crossfade's menu.
          onClick={(e) => {
            e.stopPropagation();
            if (!onCrossfadeShapeChange || !(e.metaKey || e.ctrlKey)) return;
            const isLinear = n.outRegion.shape === 'linear' && n.inRegion.shape === 'linear';
            const next = isLinear ? DEFAULT_CROSSFADE_SHAPE : 'linear';
            onCrossfadeShapeChange(n.outgoingClipId, n.incomingClipId, next, next);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Two quick Cmd+clicks are two toggles, not a reset
            if (!onCrossfadeShapeChange || e.metaKey || e.ctrlKey) return;
            onCrossfadeShapeChange(n.outgoingClipId, n.incomingClipId, DEFAULT_CROSSFADE_SHAPE, DEFAULT_CROSSFADE_SHAPE);
          }}
          onContextMenu={(e) => {
            if (!onCrossfadeContextMenu) return;
            e.preventDefault();
            e.stopPropagation();
            onCrossfadeContextMenu(n.outgoingClipId, n.incomingClipId, e.clientX, e.clientY);
          }}
          style={{
            position: 'absolute',
            left: `${Math.round(x - NODE_R - 3)}px`,
            top: `${Math.round(y - NODE_R - 3)}px`,
            // Generous hit area around the visible dot. The extra pixel
            // while Alt is held is a LAYOUT nudge, not a hit area:
            // Chromium (so Electron too) re-evaluates the cursor after a
            // layout change under the pointer or a mouse move, but not
            // for a change to `cursor` alone — without it the arrows only
            // turned on the next mouse movement, which read as lag.
            width: (NODE_R + 3) * 2 + (altHeld ? 1 : 0),
            height: (NODE_R + 3) * 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Up/down arrows for the depth drag; left/right while Alt is
            // held, previewing the roll (user decision 2026-10-01)
            cursor: altHeld ? 'ew-resize' : 'ns-resize',
            // Above the fade curves (450), below envelope layers (500+)
            zIndex: 460,
          }}
        >
          <div
            style={{
              width: NODE_R * 2,
              height: NODE_R * 2,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1.5px solid rgba(0, 0, 0, 0.6)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      );
    });
  };


  // Shape handle on a quick fade of the clip UNDER THE POINTER (free
  // edges only — a
  // crossfaded edge's shape belongs to the intersection node). The
  // handle is a point ON the curve and the curve's stored state
  // (user decisions 2026-09-29, replacing the re-centring node): drag
  // it and the S-curve bends to pass through it; let go and it stays.
  // It moves inside FADE_HANDLE_LIMITS and nowhere else, so it can
  // neither leave the curve nor bend it into a corner. Extents are
  // pinned — length is the corner handle's job.
  const renderQuickFadeNodes = () => {
    if (!onClipFadeShapeChange) return null;
    // A clip at the FLOOR shows its edge handles only (2026-10-07, below)
    if (height <= FADE_CONTROLS_MIN_CLIP_HEIGHT) return null;
    const CLIP_HEADER_H = 20;
    const bodyTop = CLIP_HEADER_H + 1;
    const bodyHeight = Math.max(0, height - bodyTop - 1);
    const NODE_R = 5;
    // Under the pointer or mid-drag the handle ENLARGES, subtly, and
    // nothing else (user decision 2026-09-29, replacing the envelope
    // point's roundel tried the same day): it stays a plain white dot.
    // The amount is the clip handles' hover scale — Track.css.
    const BOX = (NODE_R + 3) * 2;
    const nodes: React.ReactNode[] = [];
    for (const clip of clips) {
      // Active, or on its way out (the soft exit)
      const clipActive = shapeActive.includes(String(clip.id));
      const leaving = !clipActive && leavingShape.has(String(clip.id));
      if (!clipActive && !leaving) continue;
      const eff = clipQuickFadeGeometry(clip);
      for (const side of ['in', 'out'] as const) {
        const fade = side === 'in' ? eff.fadeIn : eff.fadeOut;
        if (fade <= 0) continue;
        if (crossfadedEdges.has(`${clip.id}:${side}`)) continue;
        const dragKey = `${clip.id}:${side}`;
        // HOVER ONLY (user decision 2026-09-29): selection alone does
        // not show the shape handle — it would sit on every selected
        // clip's fades. (The corner handles joined it on 2026-10-01.)
        if (!leaving && fadeHoverClipId !== clip.id && shapeDrag !== dragKey) continue;
        const shape = (side === 'in' ? clip.fadeInShape : clip.fadeOutShape) ?? DEFAULT_QUICK_FADE_SHAPE;
        const regionStart = side === 'in' ? clip.start : clip.start + clip.duration - fade;
        // Position and gain are read off the drawn curve, never the
        // pointer — the handle is on the curve by construction.
        const { t: tDot, g: gain } = fadeHandleOf(side, shape);
        // Under the pointer, or being dragged (the pointer may trail the
        // handle at its limits — it is still the thing in hand)
        const handleActive = shapeHandleHover === dragKey || shapeDrag === dragKey;
        const x = CLIP_CONTENT_OFFSET + (regionStart + tDot * fade) * pixelsPerSecond;
        const y = bodyTop + (1 - gain) * bodyHeight;
        nodes.push(
          <div
            key={`quickfade-node-${dragKey}`}
            data-quickfade-node={side}
            data-clip-ref={clip.id}
            data-leaving={leaving ? 'true' : undefined}
            role="slider"
            aria-label={side === 'in' ? 'Quick fade in shape' : 'Quick fade out shape'}
            className="track-fade-shape-handle"
            data-hovered={handleActive ? 'true' : undefined}
            onMouseEnter={(e) => {
              fadeHoverProps(clip.id).onMouseEnter(e);
              if (e.buttons === 0) setShapeHandleHover(dragKey);
              setHintHover('fade-shape');
            }}
            onMouseMove={fadeHoverProps(clip.id).onMouseMove}
            onMouseLeave={() => {
              fadeHoverProps(clip.id).onMouseLeave();
              setShapeHandleHover((prev) => (prev === dragKey ? null : prev));
              setHintHover((prev) => (prev === 'fade-shape' ? null : prev));
            }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(gain * 100)}
            aria-valuetext={shape === 'linear'
              ? 'linear'
              : `${Math.round(gain * 100)}% level, ${Math.round(tDot * 100)}% along the fade`}
            onMouseDown={(e) => e.stopPropagation()}
            // Two gestures beside the drag:
            //  - Cmd/Ctrl+CLICK TOGGLES LINEAR — a straight line, or back
            //    to the default S-curve if it already is one (2026-10-01;
            //    the 2026-09-29 rule had it one-way, which read oddly next
            //    to the crossfade node's two-way double-click);
            //  - DOUBLE-CLICK RESETS it to the default, the S-curve,
            //    whatever it is now.
            onClick={(e) => {
              e.stopPropagation();
              if (e.metaKey || e.ctrlKey) {
                onClipFadeShapeChange(clip.id, side, shape === 'linear' ? DEFAULT_QUICK_FADE_SHAPE : 'linear');
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Two quick Cmd+clicks are two requests for linear, not a reset
              if (e.metaKey || e.ctrlKey) return;
              onClipFadeShapeChange(clip.id, side, DEFAULT_QUICK_FADE_SHAPE);
            }}
            onContextMenu={(e) => {
              if (!onFadeContextMenu) return;
              e.preventDefault();
              e.stopPropagation();
              onFadeContextMenu(clip.id, side, e.clientX, e.clientY);
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              // A press ON the handle proves the pointer is on it, whatever
              // the hover state last heard (it goes stale when the handle
              // was reached mid-press). Without this the handle could
              // unmount between press and release, and the click be lost.
              setFadeHoverClipId(clip.id);
              setShapeHandleHover(dragKey);
              // A Cmd/Ctrl press is the click above, never a drag
              if (e.metaKey || e.ctrlKey) return;
              const nodeEl = e.currentTarget as HTMLElement;
              try { nodeEl.setPointerCapture(e.pointerId); } catch { /* jsdom / older engines */ }
              setShapeDrag(dragKey);
              onFadeDragChange?.(clip.id);
              const startClientX = e.clientX;
              const startClientY = e.clientY;
              const startT = tDot;
              const startGain = gain;
              // VERTICAL only (user decision 2026-10-01, as the crossfade
              // node): the handle's place along the fade is held — the
              // middle, unless a stored project put it elsewhere — and
              // its gain follows the pointer, held to the handle's
              // limits. That point IS the new shape, the S-curve through
              // it. Sideways travel is ignored; the fade's start and end
              // never move.
              const onMove = (ev: PointerEvent) => {
                const next = clampFadeHandle({
                  t: startT,
                  g: startGain - (ev.clientY - startClientY) / Math.max(1, bodyHeight),
                });
                onClipFadeShapeChange(clip.id, side, next);
              };
              const onUp = (ev: PointerEvent) => {
                nodeEl.removeEventListener('pointermove', onMove);
                nodeEl.removeEventListener('pointerup', onUp);
                setShapeDrag(null);
                onFadeDragChange?.(null);
                settleFadeHover(clip.id, ev, nodeEl);
                settleHint(nodeEl, ev);
              };
              nodeEl.addEventListener('pointermove', onMove);
              nodeEl.addEventListener('pointerup', onUp);
            }}
            style={{
              position: 'absolute',
              left: `${Math.round(x - NODE_R - 3)}px`,
              top: `${Math.round(y - NODE_R - 3)}px`,
              width: (NODE_R + 3) * 2,
              height: (NODE_R + 3) * 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Up/down arrows: the handle only moves vertically
              cursor: 'ns-resize',
              zIndex: 460,
            }}
          >
            <svg
              width={BOX}
              height={BOX}
              viewBox={`0 0 ${BOX} ${BOX}`}
              style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}
            >
              {/* The dark edge is drawn INSIDE the radius, as the border was */}
              <circle
                data-quickfade-dot
                cx={BOX / 2}
                cy={BOX / 2}
                r={NODE_R - 0.5}
                fill="#FFFFFF"
                stroke="rgba(0, 0, 0, 0.6)"
                strokeWidth={1}
              />
            </svg>
          </div>,
        );
      }
    }
    return nodes.length > 0 ? nodes : null;
  };

  const renderFadeCurveOverlays = () => {
    if (fadeCurves.length === 0) return null;
    const CLIP_HEADER_H = 20;
    // The clip draws with a 1px border, so the header's true bottom is
    // wrapper-top + 21 — the overlay starts exactly there.
    const bodyTop = CLIP_HEADER_H + 1;
    const bodyHeight = Math.max(0, height - bodyTop - 1);
    const geometry = (region: (typeof fadeCurves)[number]) => ({
      left: Math.round(CLIP_CONTENT_OFFSET + region.start * pixelsPerSecond),
      width: Math.max(1, Math.round((region.end - region.start) * pixelsPerSecond)),
      key: `${region.clipId}-${region.side}-${region.authored ? 'authored' : 'default'}-${region.start}`,
    });
    // A QUICK FADE dims the area ABOVE its curve (user decision
    // 2026-09-29) — what the fade takes away reads darker, what is left
    // keeps the clip's own colour. A CROSSFADE instead shows BOTH
    // waveforms (user decision 2026-10-01, "you see what plays"): the
    // top clip's body already draws its own waveform shrunk by its
    // fade; the clip underneath, painted over by that body, gets a
    // GHOST of its waveform drawn over the overlap, shrunk by its own
    // fade — dwindling as the other grows — in its colour at half
    // opacity. The white veils that used to say "shared" here are
    // gone: two waveforms say it better. (ClipBody's TODO: a stereo
    // under clip ghosts its left channel.)
    // The dim above a curve and the line itself, both quieter since
    // 2026-10-06 ("the idle curve a little less bold… the curve just
    // stops abruptly" where it met the clip's top): the dim went from
    // 14% to 20% so the faded region reads as quieter audio, the line
    // from 55% to 35% — and, later the same day, the line HIDES at
    // rest altogether (data-fade-line-visible, Track.css)
    const FADE_DIM_FILL = 'rgba(0, 0, 0, 0.2)';
    const FADE_LINE_STROKE = 'rgba(0, 0, 0, 0.45)'; // 45% since 2026-10-07 ("a bit darker"); was 35, and 55 before 2026-10-06
    // TWO passes: every ghost first (449), every curve above them (450)
    const ghosts = crossfadeNodes.map((n) => {
      const outClip = clips.find((c) => c.id === n.outgoingClipId);
      const inClip = clips.find((c) => c.id === n.incomingClipId);
      if (!outClip || !inClip) return null;
      // The clip underneath: lower z (array position when equal — later is on top)
      const zOut = clipZIndex.get(outClip.id) ?? 2;
      const zIn = clipZIndex.get(inClip.id) ?? 2;
      const under = zOut === zIn ? (clips.indexOf(outClip) < clips.indexOf(inClip) ? outClip : inClip) : (zOut < zIn ? outClip : inClip);
      const wf = clipWaveforms.get(under.id);
      const data = wf?.mono ?? wf?.left;
      if (!data) return null;
      const left = Math.round(CLIP_CONTENT_OFFSET + n.overlapStart * pixelsPerSecond);
      const width = Math.max(1, Math.round((n.overlapEnd - n.overlapStart) * pixelsPerSecond));
      return (
        <CrossfadeGhost
          key={`crossfade-ghost-${n.outgoingClipId}-${n.incomingClipId}`}
          clipId={under.id}
          data={data}
          left={left}
          top={bodyTop}
          width={width}
          height={bodyHeight}
          color={clipStyle === 'classic' ? 'classic' : (under.ownColor ?? trackColor)}
          offsetSeconds={n.overlapStart - under.start}
          pixelsPerSecond={pixelsPerSecond}
          clipTrimStart={(under as any).trimStart || 0} // justified: trimStart not on Clip type — pending components sweep
          clipDuration={under.duration}
          clipFullDuration={(under as any).fullDuration} // justified: fullDuration not on Clip type — pending components sweep
          clipStretchFactor={(under as any).stretchFactor ?? 1} // justified: stretchFactor not on Clip type — pending components sweep
          fadeRegions={fadeRegionsByClip.get(under.id) ?? []}
        />
      );
    });
    const curves = fadeCurves.map((region) => {
      const g = geometry(region);
      // A curve being EDITED — its shape handle is mid-drag, and nothing
      // less (user decision 2026-09-29: not the pointer being over the
      // clip, not the handle being hovered, not a length drag) — gains a
      // WHITE edge along the UNDERSIDE of its line, and only there: the
      // dark line does not change, and nothing white shows above it,
      // where the clip is dimmed. It is a wide white stroke on the same
      // curve, CLIPPED to the area below the curve — that keeps the edge
      // the same thickness where the curve is steep, which shifting a
      // copy of the line downward would not. One curve at a time: the
      // clip's other fade stays plain. A CROSSFADE's two curves get the
      // same edge together while its node is in hand (user decision
      // 2026-10-01) — the X is one thing being edited.
      const crossfadeOf = region.authored ? undefined : crossfadeNodes.find((k) =>
        region.side === 'out' ? k.outgoingClipId === region.clipId : k.incomingClipId === region.clipId);
      const editing = region.authored
        ? shapeDrag === `${region.clipId}:${region.side}`
        : crossfadeOf != null && crossfadeDrag === `${crossfadeOf.outgoingClipId}-${crossfadeOf.incomingClipId}`;
      const curvePath = fadeCurvePath(region.side, 64, region.shape);
      const belowClipId = `${fadeClipIdBase}-below-${region.clipId}-${region.side}`;
      // The LINE shows only while its clip is selected, focused, under
      // the pointer, or being edited (2026-10-06, "what if the line
      // disappears entirely when not selected/hovered?"); at rest the
      // dim alone says there is a fade. A crossfade's line belongs to
      // both its clips. CSS fades it in and out at the handles' tempo.
      const owners = crossfadeOf ? [crossfadeOf.outgoingClipId, crossfadeOf.incomingClipId] : [region.clipId];
      const lineVisible = editing || owners.some((id) =>
        clips.find((c) => c.id === id)?.selected
        || focusedClipId === id
        || handleHoverClipId === id
        || fadeHoverClipId === id
        || fadeDragClipId === id);
      return (
        <div
          key={`fade-curve-${g.key}`}
          data-fade-curve={region.side}
          data-fade-authored={region.authored ? 'true' : 'false'}
          data-fade-editing={editing ? 'true' : undefined}
          data-fade-line-visible={lineVisible ? 'true' : undefined}
          style={{
            position: 'absolute',
            left: `${g.left}px`,
            top: `${bodyTop}px`,
            width: `${g.width}px`,
            height: `${bodyHeight}px`,
            pointerEvents: 'none',
            zIndex: 450,
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* The area above the curve dims — a quick fade's and a
                crossfade's alike (user decision 2026-10-01; the X was
                undimmed before). Each of the X's curves dims above
                itself in its own SVG, so the cap above the crossing,
                above both, takes both dims. */}
            <path
              data-fade-dim={region.side}
              d={fadeAreaAbovePath(region.side, 64, region.shape)}
              fill={FADE_DIM_FILL}
              stroke="none"
            />
            {editing && (
              <>
                <defs>
                  <clipPath id={belowClipId}>
                    <path d={fadeAreaBelowPath(region.side, 64, region.shape)} />
                  </clipPath>
                </defs>
                <path
                  data-fade-line-underside={region.side}
                  d={curvePath}
                  fill="none"
                  stroke="#FFFFFF"
                  // Half of it is clipped away and the dark line covers
                  // 0.75px more: ~1.5px of white shows under the line
                  strokeWidth={4.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  clipPath={`url(#${belowClipId})`}
                />
              </>
            )}
            <path
              data-fade-line={region.side}
              d={curvePath}
              fill="none"
              stroke={FADE_LINE_STROKE}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      );
    });
    return [...ghosts, ...curves];
  };

  // Calculate clip dimensions and positions
  // Each clip's waveform data, with the placeholder generated ONCE per
  // clip for clips that bring none (it is random: generated inside the
  // render, as it used to be, it changed every render — and the
  // crossfade ghost must draw the SAME array the clip's body does).
  // Full-duration arrays: a trimmed clip's hidden material is in here.
  const clipWaveforms = React.useMemo(() => {
    const map = new Map<string | number, { mono?: number[]; left?: number[]; right?: number[]; monoRms?: number[]; leftRms?: number[]; rightRms?: number[] }>();
    for (const clip of clips) {
      const isStereo = Boolean(clip.waveformLeft || clip.waveformRight);
      const trimStart = (clip as any).trimStart || 0; // justified: trimStart not on Clip type — pending components sweep
      const fullDuration = (clip as any).fullDuration || (trimStart + clip.duration); // justified: fullDuration not on Clip type — pending components sweep
      const entry: { mono?: number[]; left?: number[]; right?: number[]; monoRms?: number[]; leftRms?: number[]; rightRms?: number[] } = {
        mono: clip.waveform,
        left: clip.waveformLeft,
        right: clip.waveformRight,
        monoRms: clip.waveformRms,
        leftRms: clip.waveformLeftRms,
        rightRms: clip.waveformRightRms,
      };
      if (!entry.mono && !isStereo) entry.mono = generateSpeechWaveform(fullDuration, 1800);
      if (isStereo && (!entry.left || !entry.right)) {
        entry.left = generateSpeechWaveform(fullDuration, 1800);
        entry.right = generateSpeechWaveform(fullDuration, 1800);
      }
      // A REVERSED clip draws its arrays mirrored (2026-10-07) — body
      // and ghost alike, since both read this entry
      if (clip.reversed) {
        for (const k of ['mono', 'left', 'right', 'monoRms', 'leftRms', 'rightRms'] as const) {
          const arr = entry[k];
          if (arr) entry[k] = [...arr].reverse();
        }
      }
      map.set(clip.id, entry);
    }
    return map;
  }, [clips]);

  const renderClips = () => {
    return sortedClips.map((clip, clipIndex) => {
      const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;
      const isFirstClip = clipIndex === 0;

      // The clip's waveform data — its own, or the placeholder made once
      // for it (clipWaveforms); the crossfade ghost draws the same array
      const wf = clipWaveforms.get(clip.id);
      const waveformData = wf?.mono;
      const waveformLeft = wf?.left;
      const waveformRight = wf?.right;
      const isStereo = Boolean(clip.waveformLeft || clip.waveformRight);

      // Determine variant and channel mode
      let variant: 'waveform' | 'spectrogram' | 'midi' = 'waveform';
      let channelMode: 'mono' | 'stereo' | 'split-mono' | 'split-stereo' = 'mono';

      if (isMidiTrack && clip.midiNotes) {
        variant = 'midi';
      } else if (splitView) {
        channelMode = isStereo ? 'split-stereo' : 'split-mono';
        variant = 'spectrogram';
      } else if (spectrogramMode) {
        channelMode = isStereo ? 'stereo' : 'mono';
        variant = 'spectrogram';
      } else {
        channelMode = isStereo ? 'stereo' : 'mono';
        variant = 'waveform';
      }

      const clipSelected = (clip as any).selected || false; // justified: selected not on Clip type — pending components sweep
      // What the clip LOOKS like. Mid-marquee the rectangle speaks for
      // the whole track; otherwise the clip's own flag does.
      const clipSelectedVisual = marqueePreviewClipIds
        ? marqueePreviewClipIds.has(clip.id as number)
        : clipSelected;
      const isClipHovered = hoveredClipId != null && clip.id === hoveredClipId;
      const isDragging = draggingClipIds?.has(clip.id as number) ?? false;
      const isRaised = raisedClipIds?.has(clip.id as number) ?? false;

      return (
        <div
          key={clip.id}
          data-clip-id={clip.id}
          data-track-index={trackIndex}
          data-first-clip={isFirstClip}
          style={{
            position: 'absolute',
            // Round to integer pixels so the wrapper's accessibility
            // rect (which macOS VoiceOver uses to draw the focus frame)
            // doesn't drift sub-pixel against the painted clip — the
            // browser paints at pixel boundaries and AX uses the layout
            // rect, and any sub-pixel mismatch showed up as a focus
            // ring offset from the visible clip.
            left: `${Math.round(clipX)}px`,
            top: 0,
            // Explicit width/height so the focusable wrapper's bounding
            // box matches the visible Clip child. Without these the
            // wrapper can collapse and VoiceOver draws the frame around
            // a near-zero rect.
            width: `${Math.round(clipWidth)}px`,
            height: `${height}px`,
            // Stacking follows array position (overlap z-order); a
            // dragged or Cmd+Arrow-raised clip floats above everything
            // (mouse drag also dims to a 50% ghost; keyboard raise
            // stays solid so the moving clip reads as "still there").
            zIndex: isDragging || isRaised ? 1000 : (clipZIndex.get(clip.id) ?? 2),
            opacity: isDragging ? 0.5 : undefined,
          }}
          tabIndex={isFlatNavigation ? 0 : (isFirstClip && tabIndex !== undefined ? tabIndex : -1)}
          role="button"
          aria-label={`${clip.name} clip, starts at ${formatTimeForA11y(clip.start)}, ${formatTimeForA11y(clip.duration)} long`}
          onMouseEnter={(e) => {
            onHoverClip?.(clip.id as number);
            clipSurfaceHoverProps(clip.id).onMouseEnter(e);
            handleHoverProps(clip.id).onMouseEnter(e);
          }}
          onMouseMove={(e) => {
            clipSurfaceHoverProps(clip.id).onMouseMove(e);
            handleHoverProps(clip.id).onMouseMove(e);
          }}
          onMouseLeave={() => {
            onHoverClip?.(null);
            clipSurfaceHoverProps(clip.id).onMouseLeave();
            handleHoverProps(clip.id).onMouseLeave();
          }}
          onMouseDown={(e) => {
            // Clip receives DOM focus naturally via its tabIndex.
            // Mark as mouse-focused so CSS suppresses the outline (data-focus-mouse attr).
            // Do NOT stopPropagation — Canvas.tsx needs mouseDown to bubble for clip dragging.
            clipFocusFromMouseRef.current = true;
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
            (e.currentTarget as HTMLElement).setAttribute('data-focus-mouse', '');
          }}
          onClick={(e) => {
            // The clip body is a pass-through for time-selection
            // gestures: a plain or Shift click here does not register
            // as clip selection — the header (ClipHeader's onClick,
            // which stops propagation) is the path to plain and
            // shift+range selection. ONE exception (user decision
            // 2026-09-30): a CMD/CTRL click ANYWHERE on the clip is the
            // selection toggle, body included — Cmd is not a
            // time-selection modifier, so the body has nothing else to
            // do with it. (A Cmd+DRAG is the marquee; the host ignores
            // the click that follows one.)
            // We still consume mouseDownPosRef so a body drag doesn't
            // leave stale state for the next click.
            mouseDownPosRef.current = null;
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
              e.stopPropagation();
              onClipClick?.(clip.id, false, true);
            }
          }}
          onFocus={(e) => {
            setFocusedClipId(clip.id);
            if (clipFocusFromMouseRef.current) {
              // Mouse-driven focus: don't scroll, keep data-focus-mouse attr for CSS
              clipFocusFromMouseRef.current = false;
              return;
            }
            // Keyboard-driven focus: clear mouse attr so outline shows, and scroll into view
            (e.currentTarget as HTMLElement).removeAttribute('data-focus-mouse');
            scrollIntoViewIfNeeded(e.currentTarget as HTMLElement);
          }}
          onBlur={(e) => {
            // The clip's own controls: inside the wrapper (the trim
            // pair) or at track level carrying its id (fade handles,
            // buried duplicates)
            const to = e.relatedTarget;
            if (to instanceof Element && (e.currentTarget.contains(to)
              || to.closest(`[data-fade-clip="${clip.id}"], [data-clip-ref="${clip.id}"]`))) return;
            setFocusedClipId((prev) => (prev === clip.id ? null : prev));
          }}
          onKeyDown={(e) => {
            // If focus is invisible (mouse click), first Tab/Shift+Tab reveals the outline
            if (e.key === 'Tab' && (e.currentTarget as HTMLElement).hasAttribute('data-focus-mouse')) {
              e.preventDefault();
              (e.currentTarget as HTMLElement).removeAttribute('data-focus-mouse');
              return;
            }

            // Escape on a clip is handled by the global keyboard
            // shortcut (useKeyboardShortcuts) so the priority chain —
            // split mode > clear selections > unwind focus — works
            // consistently from any focused element. The first Esc
            // clears the clip / time selection; the next moves focus
            // up to the track container; another blurs.
            // (Previously this branch shortcut-focused the track
            // container and stopped propagation, which silently ate
            // the selection-clearing step.)

            // Delete key: let it bubble to App.tsx handler, but DON'T stop propagation
            // The App.tsx handler will read data-clip-id and data-track-index from this element
            if (e.key === 'Delete' || e.key === 'Backspace') {
              // Don't preventDefault or stopPropagation - let it reach App.tsx
              return;
            }

            // Handle selection with Enter key
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              // Pass actual modifier keys to support different selection modes:
              // - Plain Enter: toggle selection (deselect if single clip selected)
              // - Shift+Enter: range selection
              // - Cmd/Ctrl+Enter: toggle in/out of multi-selection
              onClipClick?.(clip.id, e.shiftKey, e.metaKey || e.ctrlKey);
              return;
            }

            // Open context menu with Shift+F10 or ContextMenu key (standard keyboard shortcuts)
            if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
              e.preventDefault();
              e.stopPropagation();
              // Calculate position of clip header for menu placement
              const clipElement = e.currentTarget as HTMLElement;
              const rect = clipElement.getBoundingClientRect();
              // Open menu at top-right corner of clip (where menu button is)
              onClipMenuClick?.(clip.id, rect.right - 20, rect.top + 10, true);
              return;
            }

            // Move clip horizontally with Cmd+Arrow Left/Right.
            // Alt acts as the speed modifier — same convention as the
            // playhead nudge: plain = 0.1s, Alt = 1s.
            if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey) {
              e.preventDefault();
              const moveAmount = e.altKey ? 1.0 : 0.1;
              const delta = e.key === 'ArrowRight' ? moveAmount : -moveAmount;
              onClipMove?.(clip.id, delta);
              return;
            }

            // Move clip to different track with Cmd+Arrow Up/Down. NOT
            // with Option: Option+Cmd+Up/Down is the app's track-height
            // step (2026-10-08, "we've got shortcuts fighting" — with a
            // clip focused the chord moved the clip AND resized the track)
            if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              const direction = e.key === 'ArrowDown' ? 1 : -1;
              onClipMoveToTrack?.(clip.id, direction);
              return;
            }

            // Time-stretch with Alt layered onto the trim shortcuts. Alt is
            // the "stretch instead of trim" modifier; otherwise the combo
            // matches the trim shortcuts exactly so direction semantics are
            // identical:
            //   Alt+Shift+ArrowLeft        → left edge moves left   (lengthen)
            //   Alt+Shift+ArrowRight       → right edge moves right (lengthen)
            //   Cmd+Alt+Shift+ArrowLeft    → right edge moves left  (shorten)
            //   Cmd+Alt+Shift+ArrowRight   → left edge moves right  (shorten)
            // Sign convention matches onClipTrim: positive delta shrinks,
            // negative delta grows.
            if (e.altKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
              e.preventDefault();
              const stretchAmount = 0.1;
              const isCompressing = e.metaKey || e.ctrlKey;
              const edge = isCompressing
                ? (e.key === 'ArrowLeft' ? 'right' : 'left')
                : (e.key === 'ArrowLeft' ? 'left' : 'right');
              const delta = isCompressing ? stretchAmount : -stretchAmount;
              onClipStretch?.(clip.id, edge, delta);
              return;
            }

            // Clip-edge editor on the bracket keys. Shift picks the
            // edge; the specific bracket picks the direction:
            //   [        → RIGHT edge moves LEFT   (contract)
            //   ]        → RIGHT edge moves RIGHT  (extend)
            //   Shift+[  → LEFT edge moves LEFT    (extend)
            //   Shift+]  → LEFT edge moves RIGHT   (contract)
            // Sign convention matches onClipTrim: positive delta
            // shrinks, negative delta grows.
            //
            // Match against e.code, e.key, AND e.keyCode so keyboard
            // layout quirks don't stop the shortcut from firing.
            const isBracketLeft = e.code === 'BracketLeft'
              || e.key === '[' || e.key === '{'
              || (e as any).keyCode === 219; // justified: keyCode deprecated but needed for cross-layout compat — pending components sweep
            const isBracketRight = e.code === 'BracketRight'
              || e.key === ']' || e.key === '}'
              || (e as any).keyCode === 221; // justified: keyCode deprecated but needed for cross-layout compat — pending components sweep
            if ((isBracketLeft || isBracketRight) && !e.altKey) {
              e.preventDefault();
              e.stopPropagation();
              const editAmount = 0.1;
              // Shift → LEFT edge, plain → RIGHT edge.
              const edge: 'left' | 'right' = e.shiftKey ? 'left' : 'right';
              // On the RIGHT edge: [ contracts (shrink), ] extends.
              // On the LEFT  edge: [ extends,  ] contracts.
              const isExtending = edge === 'right' ? isBracketRight : isBracketLeft;
              const delta = isExtending ? -editAmount : editAmount;

              // Cmd/Ctrl modifier switches trim → stretch. Same edge
              // and direction convention, so muscle memory carries
              // between the two operations:
              //   Cmd+[         → RIGHT edge stretch-in (compress)
              //   Cmd+]         → RIGHT edge stretch-out
              //   Cmd+Shift+[   → LEFT  edge stretch-out
              //   Cmd+Shift+]   → LEFT  edge stretch-in (compress)
              if (e.metaKey || e.ctrlKey) {
                onClipStretch?.(clip.id, edge, delta);
                return;
              }

              // Boundary check: if the user is trying to EXTEND (not
              // shrink) and there's no more source audio to reveal
              // on that side, don't dispatch the trim — fire the
              // shake animation so the shortcut isn't silent.
              // Mirrors the "cap the delta to available" logic in
              // Canvas.onClipTrim: `available` is measured in canvas
              // seconds, matching how the delta is applied.
              const BOUNDARY_EPS = 0.0005;
              const stretch = (clip as any).stretchFactor ?? 1; // justified: stretchFactor not on Clip type — pending components sweep
              const trimStart = (clip as any).trimStart ?? 0; // justified: trimStart not on Clip type — pending components sweep
              const fullDuration = (clip as any).fullDuration // justified: fullDuration not on Clip type — pending components sweep
                ?? (trimStart + clip.duration / stretch);
              const availableLeft = trimStart * stretch;
              const availableRight = (fullDuration - trimStart) * stretch - clip.duration;
              const blocked = isExtending && (
                (edge === 'left' && availableLeft <= BOUNDARY_EPS)
                || (edge === 'right' && availableRight <= BOUNDARY_EPS)
              );

              if (blocked) {
                // Bump the shake state so React remounts the shake
                // element (each token change → fresh DOM node → fresh
                // animation). Clear after the animation completes.
                setShakeState((prev) => ({
                  clipId: clip.id,
                  edge,
                  token: (prev?.token ?? 0) + 1,
                }));
                if (shakeTimeoutRef.current !== null) {
                  window.clearTimeout(shakeTimeoutRef.current);
                }
                shakeTimeoutRef.current = window.setTimeout(() => {
                  setShakeState(null);
                  shakeTimeoutRef.current = null;
                }, 180);
              }

              // Fire onClipTrim regardless of the blocked-shake state
              // so Canvas can select the focused clip. Canvas has its
              // own boundary check and will skip the actual TRIM_CLIP
              // dispatch when there's nothing to reveal.
              onClipTrim?.(clip.id, edge, delta);
              return;
            }

            // Tab / Shift+Tab: track-scoped clip navigation.
            //   Track flow (both directions):
            //     [track header] ↔ clip 1 ↔ clip 2 ↔ … ↔ clip N ↔ [next track header]
            //   • Shift+Tab on the FIRST clip → THIS track's header
            //   • Tab on the LAST clip       → NEXT track's header
            //   • Elsewhere → step to the neighbouring clip in DOM order
            //   Arrow keys stay reserved for matrix nav (playhead +
            //   track focus).
            if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
              const currentEl = e.currentTarget as HTMLElement;
              const isFirstOnTrack = clipIndex === 0;
              const isLastOnTrack = clipIndex === sortedClips.length - 1;

              if (e.shiftKey && isFirstOnTrack) {
                e.preventDefault();
                e.stopPropagation();
                onEnterPanel?.();
                return;
              }

              if (!e.shiftKey && isLastOnTrack && onTabFromLastClip) {
                e.preventDefault();
                e.stopPropagation();
                onTabFromLastClip();
                return;
              }

              const allClips = Array.from(
                document.querySelectorAll<HTMLElement>('[data-clip-id]'),
              );
              const currentIdx = allClips.indexOf(currentEl);
              if (currentIdx !== -1) {
                const targetIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1;
                const target = allClips[targetIdx];
                if (target) {
                  e.preventDefault();
                  e.stopPropagation();
                  // preventScroll: the browser's default focus-scroll is
                  // instant and races the smooth scroll our onFocus
                  // handler queues via scrollIntoViewIfNeeded — worse,
                  // it lands the clip in view so the "already visible"
                  // check short-circuits and no smooth scroll happens at
                  // all. Skipping the default lets our smooth pan run.
                  target.focus({ preventScroll: true });
                  return;
                }
                // No more clips in this direction — let the browser
                // move focus to the next tabbable element (ruler,
                // side panel button, etc.).
              }
              return;
            }

            // Shift+Arrow Up/Down on a clip: no-op for now, prevent browser default
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.shiftKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              return;
            }

            // Plain Arrow Up/Down on a focused clip: move TRACK focus
            // to the row above / below. The clip loses focus, the
            // track row gains it — matches the "arrows always move
            // around the matrix plane" model.
            //
            // Pressing an arrow is itself keyboard navigation, so we
            // clear the mouse-focus attribute before dispatching (any
            // subsequent redraw shows the visible focus ring on the
            // destination track).
            if (
              (e.key === 'ArrowDown' || e.key === 'ArrowUp')
              && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey
            ) {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLElement).removeAttribute('data-focus-mouse');
              const direction = e.key === 'ArrowDown' ? 1 : -1;
              onTrackNavigateVertical?.(direction, false, false);
              return;
            }

            // Plain Arrow Left/Right: fall through to the global
            // playhead-nudge handler (matrix X-axis nav).
          }}
        >
          <Clip
            shakeEdge={shakeState?.clipId === clip.id ? shakeState.edge : null}
            shakeToken={shakeState?.clipId === clip.id ? shakeState.token : 0}
            // The TRACK's colour, unless the user gave the clip its own
            // (`ownColor`, 2026-10-02 — the Clip properties panel and
            // the clip menu). Never the host's `color` field: MOVE_CLIP /
            // paste / seeding keep that in sync with the destination
            // track, and any path drifting (drop-below-creates-track, a
            // stale palette default, an older pasted clip) showed up as
            // a clip on a yellow track rendering blue — so the track's
            // own value, the one that drives the header and swatch, is
            // the default by construction, and the user's choice is a
            // separate field that no sync path writes.
            color={clipStyle === 'classic' ? 'classic' : (clip.ownColor ?? trackColor)}
            name={clip.name}
            width={clipWidth}
            height={height}
            selected={clipSelectedVisual}
            fadeRegions={fadeRegionsByClip.get(clip.id)}
            inTimeSelection={timeSelection && inTimeSelectionScope && timeSelection.renderOnCanvas !== false ? (
              clip.start < timeSelection.endTime && (clip.start + clip.duration) > timeSelection.startTime
            ) : false}
            clipStartTime={clip.start}
            timeSelectionRange={timeSelection}
            variant={variant}
            channelMode={channelMode}
            waveformData={waveformData}
            waveformDataRms={wf?.monoRms}
            waveformLeft={waveformLeft}
            waveformRight={waveformRight}
            waveformLeftRms={wf?.leftRms}
            waveformRightRms={wf?.rightRms}
            channelSplitRatio={channelSplitRatio}
            envelope={clip.envelopePoints}
            showEnvelope={envelopeMode}
            clipDuration={clip.duration}
            clipTrimStart={(clip as any).trimStart || 0} // justified: trimStart not on Clip type — pending components sweep
            clipFullDuration={(clip as any).fullDuration} // justified: fullDuration not on Clip type — pending components sweep
            clipStretchFactor={(clip as any).stretchFactor ?? 1} // justified: stretchFactor not on Clip type — pending components sweep
            clipPitchSemitones={clip.pitchSemitones ?? 0}
            pixelsPerSecond={pixelsPerSecond}
            hiddenPointIndices={clipHiddenPoints.get(clip.id) ?? EMPTY_NUMBER_ARRAY}
            hoveredPointIndices={clipHoveredPoints.get(clip.id) ?? EMPTY_NUMBER_ARRAY}
            cursorPosition={clipCursorPositions.get(clip.id) ?? null}
            envelopePointSizes={envelopePointSizes}
            spectrogramScale={spectrogramScale}
            isRecording={recordingClipId === clip.id}
            handlesHidden={hidesHandlesOf(clip.id)}
            handlesVisible={handlesFollow(clip)}
            handlesHiddenAt={{ left: isCrossfadedEdge(clip.id, 'left'), right: isCrossfadedEdge(clip.id, 'right') }}
            onHandleHover={setHintHover}
            midiNotes={clip.midiNotes}
            forceHeaderHover={isClipHovered}
            onHeaderClick={(shiftKey, metaKey) => onClipClick?.(clip.id, shiftKey, metaKey)}
            onRename={onClipRename ? (newName) => onClipRename(clip.id, newName) : undefined}
            onMenuClick={(x, y) => onClipMenuClick?.(clip.id, x, y)}
            onTrimEdge={
              onClipTrimEdge
                ? ({ edge, clientX }) => onClipTrimEdge(clip.id, edge, clientX)
                : undefined
            }
            onStretchEdge={
              onClipStretchEdge
                ? ({ edge, clientX }) => onClipStretchEdge(clip.id, edge, clientX)
                : undefined
            }
          />
        </div>
      );
    });
  };

  // EDGE TRIM ZONES — how an UNSELECTED clip is trimmed (user decisions
  // 2026-09-29). The hit box is ON the edge, half outside the clip, so
  // it is drawn here at track level: inside the clip's own box it could
  // not reach past the edge, and the clip's stacking context would put
  // it under every higher clip. Geometry and the rules for neighbours
  // and overlaps: utils/clipEdgeHitZones.ts.
  //
  // Living with the fade handles: a zone reaches EDGE_HIT_INSIDE_PX
  // into the clip and a fade handle's box starts exactly there
  // (FADE_HANDLE_BOX_INSET is that same number), so the two butt up
  // and never overlap; the fade controls are also stacked above the
  // zones, should they ever. And
  // the fade controls do not SHOW until the pointer is past the zone —
  // at least EDGE_HIT_INSIDE_PX into the clip (isWellInsideClip) — so
  // on the edge there is one thing to do, not two.
  //
  // Vertically the zone IS THE TRIM BOX'S ROW (user decision
  // 2026-09-30): the 32px directly under the 20px header, where the
  // selected clip's trim handle sits — so selecting a clip never moves
  // the grabbable edge, and the header stays whole for dragging. (The
  // app's zone runs from the clip's very top for a third of it, over
  // the header's ends; it was matched and then moved down the same
  // day, the header overlap being the accidental half of it.) A
  // collapsed clip — too short for its header — gives the zone half of
  // itself, as the app does. Below the zone the edge belongs to the
  // time selection, which can then start exactly on a clip's edge.
  //
  // A selected clip has its trim handles and no zones — EXCEPT at a
  // crossfaded edge (user decision 2026-10-01, to thin the pile-up in a
  // short overlap): there the crossfade owns the edge, the trim and
  // stretch buttons hide (Clip's handlesHiddenAt), and the zone stands
  // in for them whether or not the clip is selected — reaching through
  // the top clip's body for the under clip's edge, which rule 1 would
  // otherwise bury. Dragging a zone streams to the same onClipTrimEdge
  // the handles do — or, with OPTION/ALT held at the press (2026-09-30),
  // to onClipStretchEdge: the edge STRETCHES instead. Whether either
  // selects anything is the host's call, not made here.
  const isCrossfadedEdge = React.useCallback(
    (clipId: string | number, edge: 'left' | 'right') => crossfadedEdges.has(`${clipId}:${edge === 'left' ? 'in' : 'out'}`),
    [crossfadedEdges],
  );
  // The clip whose trim/stretch handles are up: a SELECTED clip under
  // the pointer, or with one of them (or a fade handle) in hand (see
  // handleHoverClipId) — or THE one selected clip, when the selection
  // is a single clip (`singleSelection`, the host's count): one clip's
  // furniture is not the mess, and it says "this is the clip you have".
  // An UNSELECTED clip shows none, hovered or not — it trims by its edge
  // zone (user decision 2026-10-01: "unselected items don't need to
  // show handles on hover"). The fade handles are a separate rule:
  // hover-only, selected or not.
  const handlesFollow = React.useCallback(
    (clip: TrackClip) => !!clip.selected
      && (handleHoverClipId === clip.id || edgeDragClipId === clip.id || fadeDragClipId === clip.id || singleSelection),
    [handleHoverClipId, edgeDragClipId, fadeDragClipId, singleSelection],
  );
  // The clip with its handles up has no zones (the handles ARE its
  // edges, with the zone's inside reach); every other clip trims by its
  // zones, selected or not (2026-10-01 — it was selected = handles).
  const edgeTrimZones = React.useMemo(() => {
    if (!onClipTrimEdge) return [];
    return computeEdgeHitZones(clips, {
      pixelsPerSecond,
      zOf: (clip) => clipZIndex.get(clip.id) ?? 2,
      eligible: (clip, edge) => clip.id !== recordingClipId && (!handlesFollow(clip as TrackClip) || isCrossfadedEdge(clip.id, edge)),
      throughOverlap: (clip, edge) => isCrossfadedEdge(clip.id, edge),
    });
  }, [clips, pixelsPerSecond, clipZIndex, onClipTrimEdge, recordingClipId, isCrossfadedEdge, handlesFollow]);

  // THE SOFT EXIT (hooks/useLeavingKeys.ts; user decision 2026-10-01,
  // "fade in and fade out, but quicker" — the fade IN is CSS alone,
  // @starting-style in Track.css): each hover-dependent control
  // stays HANDLE_LEAVE_MS after it stops applying, with data-leaving,
  // fading (Track.css). One key set per control; the render functions
  // draw active ∪ leaving. (Clip's in-clip trim/stretch pair does the
  // same for itself.)
  const fadeHandleActive = clips
    .filter((c) => (fadeHoverClipId === c.id || fadeDragClipId === c.id) && !hidesHandlesOf(c.id))
    .map((c) => String(c.id));
  const leavingFadeHandles = useLeavingKeys(fadeHandleActive);
  const buriedActive = clips
    .filter((c) => handlesFollow(c) && !hidesHandlesOf(c.id))
    .map((c) => String(c.id));
  const leavingBuried = useLeavingKeys(buriedActive);
  const shapeActive = clips
    .filter((c) => !hidesHandlesOf(c.id) && (fadeHoverClipId === c.id || (shapeDrag != null && shapeDrag.startsWith(`${c.id}:`))))
    .map((c) => String(c.id));
  const leavingShape = useLeavingKeys(shapeActive);
  const xNodeActive = (clipDragInProgress || fadeDragInHand != null)
    ? []
    : crossfadeNodes
      .filter((n) => fadeHoverClipId === n.outgoingClipId || fadeHoverClipId === n.incomingClipId
        || crossfadeDrag === `${n.outgoingClipId}-${n.incomingClipId}`)
      .map((n) => `${n.outgoingClipId}-${n.incomingClipId}`);
  const leavingXNodes = useLeavingKeys(xNodeActive);

  const renderEdgeTrimZones = () => {
    if (!onClipTrimEdge || edgeTrimZones.length === 0 || clipDragInProgress) return null;
    const shownZones = edgeTrimZones.filter((zone) => !hidesHandlesOf(zone.clipId));
    if (shownZones.length === 0) return null;
    // The trim box's row — the real app's rows (utils/clipHandleRows.ts:
    // from the top of a collapsed clip, under the header otherwise, half
    // the room clamped 22–32) — and never past HALF of a collapsed clip
    // (the app's own zone there), so the time selection keeps the
    // lower half of a tiny clip's edge
    const rows = clipHandleRows(height);
    const zoneTop = rows.trimTop;
    const zoneHeight = Math.min(rows.rowHeight, rows.collapsed ? Math.round(height / 2) : height - rows.trimTop);
    if (zoneHeight <= 0) return null;
    return shownZones.map((zone) => (
      <div
        key={`edge-trim-${zone.clipId}-${zone.edge}`}
        className={`track-edge-trim track-edge-trim--${zone.edge}${altHeld && onClipStretchEdge ? ' track-edge-trim--stretch' : ''}`}
        data-edge-trim={zone.edge}
        data-edge-mode={altHeld && onClipStretchEdge ? 'stretch' : 'trim'}
        onMouseEnter={() => setHintHover('edge')}
        onMouseLeave={() => setHintHover((prev) => (prev === 'edge' ? null : prev))}
        data-clip-ref={zone.clipId}
        aria-hidden="true"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          // The edge is not the clip's body or header: no clip drag, no
          // time selection and no playhead move starts from it
          e.stopPropagation();
          e.preventDefault();
          // Option at the press: the edge stretches. Decided at the
          // press, like the handles; letting go of Option mid-drag does
          // not turn a stretch into a trim.
          const stream = e.altKey && onClipStretchEdge ? onClipStretchEdge : onClipTrimEdge;
          // Self-cleaning attach-on-mousedown pair (as the buried
          // handles below): the pointer streams until mouseup. A press
          // that never moves changes nothing.
          const onMove = (ev: MouseEvent) => stream(zone.clipId, zone.edge, ev.clientX);
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: `${zoneTop}px`,
          // +1 while Alt is held: a layout nudge so Chromium switches the
          // cursor at once (see the crossfade node's width), not a reach
          height: `${zoneHeight + (altHeld && onClipStretchEdge ? 1 : 0)}px`,
          left: `${CLIP_CONTENT_OFFSET + zone.left}px`,
          width: `${zone.width}px`,
          // Above every stacked clip, below the fade veils and controls
          // (449+) and the envelope layers
          zIndex: 440,
        }}
      />
    ));
  };

  // Per-clip fade HANDLES (the curves render in the track-level pass,
  // renderFadeCurveOverlays, so an inherited fade stays visible where
  // its clip is buried). Rendered inside the wrapper so they ride the
  // clip's position and z.
  // Buried-edge trim/stretch handles: a SELECTED clip's edge that lies
  // under a higher-z overlapping clip gets its handle buttons
  // re-rendered here at track level, above the stack — the originals
  // inside the Clip are covered. Visible edges keep only the originals.
  const renderBuriedEdgeHandles = () => {
    // The same rows as the clip's own handles (utils/clipHandleRows.ts)
    const rows = clipHandleRows(height);
    if (isMidiTrack || (!onClipTrimEdge && !onClipStretchEdge)) return null;
    const nodes: React.ReactNode[] = [];
    for (const clip of clips) {
      // Active, or on its way out (the soft exit)
      const clipActive = buriedActive.includes(String(clip.id));
      const leaving = !clipActive && leavingBuried.has(String(clip.id));
      if (!clipActive && !leaving) continue;
      const leavingAttr = leaving ? 'true' : undefined;
      const z = clipZIndex.get(clip.id) ?? 2;
      const clipWidth = clip.duration * pixelsPerSecond;
      const xBase = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      const covered = (t: number) => clips.some((d) =>
        d.id !== clip.id
        && (clipZIndex.get(d.id) ?? 2) > z
        && d.start < t && t < d.start + d.duration);
      // A crossfaded edge gets no duplicates either: the crossfade owns
      // it, and its zone reaches through the top clip (2026-10-01)
      const edges: Array<'left' | 'right'> = [];
      if (covered(clip.start) && !isCrossfadedEdge(clip.id, 'left')) edges.push('left');
      if (covered(clip.start + clip.duration) && !isCrossfadedEdge(clip.id, 'right')) edges.push('right');
      for (const edge of edges) {
        // Same geometry as Clip.css: 30px boxes STRADDLING the edge, 24
        // outside (the app's) and EDGE_HIT_INSIDE_PX inside (the edge
        // zone's), trim at top 20, stretch at 52
        const xLeft = Math.round(edge === 'left' ? xBase - 24 : xBase + clipWidth - EDGE_HIT_INSIDE_PX);
        const startDrag = (kind: 'trim' | 'stretch') => (e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          const cb = kind === 'trim' ? onClipTrimEdge : onClipStretchEdge;
          if (!cb) return;
          // Self-cleaning attach-on-mousedown pair, mirroring Clip's
          // in-place handles: the callback streams clientX until mouseup
          const onMove = (ev: MouseEvent) => cb(clip.id, edge, ev.clientX);
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setEdgeDragClipId((prev) => (prev === clip.id ? null : prev));
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
          setEdgeDragClipId(clip.id); // the duplicate stays up for its drag
          cb(clip.id, edge, e.clientX);
        };
        if (onClipTrimEdge) {
          nodes.push(
            <button
              key={`buried-trim-${clip.id}-${edge}`}
              type="button"
              tabIndex={-1}
              data-buried-handle={`trim-${edge}`}
              data-clip-ref={clip.id}
              data-leaving={leavingAttr}
              onMouseEnter={() => setHintHover('trim')}
              onMouseLeave={() => setHintHover((prev) => (prev === 'trim' ? null : prev))}
              className={`clip-display__handle clip-display__handle--trim-${edge}`}
              aria-label={`Trim ${edge} edge`}
              onMouseDown={startDrag('trim')}
              style={{ position: 'absolute', left: xLeft, right: 'auto', top: rows.trimTop, height: rows.rowHeight, zIndex: 455 }}
            >
              {edge === 'left' ? <TrimLeftIcon /> : <TrimRightIcon />}
            </button>,
          );
        }
        nodes.push(
          <button
            key={`buried-stretch-${clip.id}-${edge}`}
            type="button"
            tabIndex={-1}
            data-buried-handle={`stretch-${edge}`}
            data-clip-ref={clip.id}
            data-leaving={leavingAttr}
            onMouseEnter={() => setHintHover('stretch')}
            onMouseLeave={() => setHintHover((prev) => (prev === 'stretch' ? null : prev))}
            className={`clip-display__handle clip-display__handle--stretch-${edge}`}
            aria-label={`Stretch ${edge} edge`}
            onMouseDown={startDrag('stretch')}
            style={{ position: 'absolute', left: xLeft, right: 'auto', top: rows.stretchTop, height: rows.rowHeight, zIndex: 455 }}
          >
            <StretchIcon />
          </button>,
        );
      }
    }
    return nodes.length > 0 ? nodes : null;
  };

  const clipQuickFadeGeometry = (clip: TrackClip) => {
    const w = fadeWindows.get(String(clip.id)) ?? { start: clip.start, end: clip.start + clip.duration };
    const windowLen = Math.max(0, w.end - w.start);
    const eff = effectiveFades(
      crossfadedEdges.has(`${clip.id}:in`) ? 0 : clip.fadeIn,
      crossfadedEdges.has(`${clip.id}:out`) ? 0 : clip.fadeOut,
      windowLen,
    );
    return { windowLen, ...eff };
  };

  // Quick-fade HANDLES — rendered at TRACK level (like the shape dots)
  // so they sit ABOVE the fade veils (z 450); inside the clip wrapper
  // they were trapped under its low stacking context and the veil
  // sheeted over them.
  const renderFadeHandles = () => {
    // (A clip drag empties fadeHandleActive via hidesHandlesOf; the
    // leaving ones still get their fade out)
    if (isMidiTrack || !onClipFadeChange) return null;
    // A clip at the FLOOR (44px, FADE_CONTROLS_MIN_CLIP_HEIGHT) shows
    // its EDGE handles only (user decision 2026-10-07, "hide the fade
    // handles when they get too small"): the trim and stretch rows take
    // its whole height there, and the length handle, its guideline, the
    // shape dot and the crossfade node would make four controls in
    // 44px. The fade stays visible as the dim above its curve, and
    // editable from the Fade-in / Fade-out menus and the properties
    // panel. It was "collapsed" until 2026-10-08; when the collapse
    // point moved to the real app's 72 the fades went with it, and that
    // was "culling the fade handles too early" — a 60px collapsed clip
    // has room for them. So the cut is its own number, the floor.
    if (height <= FADE_CONTROLS_MIN_CLIP_HEIGHT) return null;
    const HEADER_H = 20;
    const nodes: React.ReactNode[] = [];
    // The handle's BODY rests FADE_HANDLE_BODY_INSET inside the clip's
    // edge (10px since 2026-10-07; see the constant). Its box is centred
    // on it and clipped at the edge's owner's reach (6px), so at rest
    // the box is 6 to 30; the row is the trim box's (top = the header's
    // bottom), so the boxes at an edge share one row and the body's
    // middle is on the trim and stretch icons' middle.
    const FADE_HANDLE_EDGE_INSET = FADE_HANDLE_BODY_INSET;
    // The box sits in the TRIM ROW, whose place and height follow the
    // clip's height (utils/clipHandleRows.ts); the 36×32 glyph is
    // centred in the row, so on a shorter row it overflows top and
    // bottom harmlessly (pointer-events: none)
    const rows = clipHandleRows(height);
    const FADE_HANDLE_TOP = rows.trimTop;
    const FADE_ROW_H = rows.rowHeight;
    const GLYPH_TOP = Math.round((FADE_ROW_H - FADE_HANDLE_BOX.height) / 2);
    const HALF_BOX = FADE_HANDLE_BOX.width / 2;
    const HALF_BODY = FADE_GLYPH_BODY.size / 2;
    // Below this rendered width the two corner boxes, at rest, would
    // overlap each other — zoom in to edit fades on a narrow clip
    const FADE_HANDLE_MIN_CLIP_PX = 2 * (FADE_HANDLE_EDGE_INSET + HALF_BODY + HALF_BOX);
    for (const clip of clips) {
      // Handles show on the SELECTED clip and on the clip UNDER THE
      // POINTER (2026-09-29, widening the 2026-09-21 selected-only
      // rule); the drag guard keeps them up while the pointer is
      // captured.
      // …and since 2026-10-01 on the clip under the pointer ONLY: the
      // handles follow the pointer, not the selection (see
      // handleHoverClipId). A drag on a selected clip's handle still
      // applies to every selected clip.
      // Active, or on its way out (the soft exit)
      const clipActive = fadeHandleActive.includes(String(clip.id));
      const leaving = !clipActive && leavingFadeHandles.has(String(clip.id));
      if (!clipActive && !leaving) continue;
      const clipWidth = clip.duration * pixelsPerSecond;
      if (clipWidth < FADE_HANDLE_MIN_CLIP_PX) continue;
      const xBase = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      // Positions use EFFECTIVE fades (clamped to the free window and
      // to each other) so the controls sit on the drawn curves
      const { windowLen, fadeIn: fadeInSec, fadeOut: fadeOutSec } = clipQuickFadeGeometry(clip);
      const boundaryInX = fadeInSec * pixelsPerSecond;
      const boundaryOutX = clipWidth - fadeOutSec * pixelsPerSecond;
      // Audition-style adaptive placement: each handle sits on the BODY
      // side of its boundary (the natural spot) until the two would
      // collide — then both retreat INSIDE their own fade regions, so at
      // a mid-clip meeting each handle stays on its own curve instead of
      // swapping sides. Each HIT BOX runs from its boundary FADE_HIT_REACH
      // past the body's centre (GAP + HALF_BODY in), so the two boxes
      // touch when the boundaries are 2 × (GAP + HALF_BODY + FADE_HIT_REACH)
      // apart — 60px — and retreat with RETREAT_GAP of clearance left:
      // NONE (2026-10-07, "let's do 0px", after a 4px trial the same
      // minute; it was 8 on top of the 36px glyph's half, 14 in
      // practice) — they retreat only once the boxes would overlap.
      const GAP = FADE_HANDLE_EDGE_INSET;
      const RETREAT_GAP = 0;
      const handlesRetreat = boundaryOutX - boundaryInX < 2 * (GAP + HALF_BODY + FADE_HIT_REACH) + RETREAT_GAP;
      const handle = (side: 'in' | 'out') => {
        const boundaryX = side === 'in' ? boundaryInX : boundaryOutX;
        const inward = side === 'in' ? !handlesRetreat : handlesRetreat;
        // The VISIBLE BODY is what is placed: its near edge keeps a
        // constant gap to the boundary whichever side it sits on. The
        // gap is the body's rest inset from the clip's edge, so with NO
        // fade the handle's natural place IS its rest place — nothing
        // clamps, and pulling the handle back to where it rests pulls
        // the fade back to nothing (it was 3px, and the last 10px of a
        // retracting fade had to be dragged past the parked handle).
        // However short the fade, the body keeps FADE_HANDLE_EDGE_INSET
        // clear of the clip's own edge — it sits IN the clip, not on
        // its border, and clear of the trim handle just outside it
        // (with GAP equal to it, only the retreating side ever clamps)
        const size = FADE_GLYPH_BODY.size;
        const rawBodyLeft = inward ? boundaryX + GAP : boundaryX - GAP - size;
        const bodyLeft = Math.round(Math.max(FADE_HANDLE_EDGE_INSET, Math.min(clipWidth - FADE_HANDLE_EDGE_INSET - size, rawBodyLeft)));
        const bodyCentre = bodyLeft + HALF_BODY;
        // The HIT BOX: 30 wide, FADE_HIT_REACH either side of the body,
        // the body in its middle — with a fade it starts ON the fade's
        // boundary (the guideline's line, 2026-10-07) and keeps that
        // shape as the handle comes away from the edge (2026-10-06; it
        // filled out to the trim box's 36 before). Clamped to the 6px
        // lines (what owns the edge: the selected clip's trim box or
        // the unselected clip's edge zone, both reach 6 in), so at rest
        // it is 6 to 30.
        const boxLeft = Math.max(FADE_HANDLE_BOX_INSET, bodyCentre - FADE_HIT_REACH);
        const boxRight = Math.min(clipWidth - FADE_HANDLE_BOX_INSET, bodyCentre + FADE_HIT_REACH);
        const left = xBase + boxLeft;
        // The glyph stays centred on the body; where the box is clipped
        // it overflows the box (pointer-events: none — it adds nothing)
        const glyphLeft = (bodyCentre - HALF_BOX) - boxLeft;
        return (
          <div
            key={`fade-handle-${clip.id}-${side}`}
            data-fade-handle={side}
            data-fade-clip={clip.id}
            data-leaving={leaving ? 'true' : undefined}
            // Hover and press answer the way the trim and stretch
            // handles do (Track.css mirrors Clip.css's numbers)
            className="track-fade-handle"
            data-pressed={fadeDragClipId === clip.id && fadeDragSide === side ? 'true' : undefined}
            role="slider"
            aria-label={side === 'in' ? 'Quick fade in' : 'Quick fade out'}
            {...withHint(fadeHoverProps(clip.id), 'fade-length')}
            onContextMenu={(e) => {
              if (!onFadeContextMenu) return;
              e.preventDefault();
              e.stopPropagation();
              onFadeContextMenu(clip.id, side, e.clientX, e.clientY);
            }}
            aria-valuenow={side === 'in' ? fadeInSec : fadeOutSec}
            // The clip body is the time-selection surface — a fade drag
            // must not bubble into it (mirrors the trim handles)
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              const handleEl = e.currentTarget as HTMLElement;
              try { handleEl.setPointerCapture(e.pointerId); } catch { /* jsdom / older engines */ }
              setFadeHoverClipId(clip.id); // a press on it proves the pointer is here
              setFadeDragClipId(clip.id);
              setFadeDragSide(side);
              onFadeDragChange?.(clip.id);
              // The clip is static during a fade drag, so the fades
              // captured here stay valid for the session. The drag is
              // RELATIVE: the boundary moves by the pointer's travel from
              // the press, so the handle stays under the pointer wherever
              // on it the press landed (it used to put the boundary
              // itself under the pointer, a body's width away from the
              // handle in hand).
              // The handle is EXTENT ONLY (2026-09-21: "keep them
              // separate") — the midpoint dot owns the shape.
              const ownFade = side === 'in' ? fadeInSec : fadeOutSec;
              const pressX = e.clientX;
              const clipEnd = clip.start + clip.duration;
              // The whole window: the opposite fade is no cap — pulled
              // into, it gives way (the host's reducer shrinks it;
              // 2026-10-06, "have the other one pushed out of the way")
              const maxSeconds = windowLen;
              const onMove = (ev: PointerEvent) => {
                const travel = (ev.clientX - pressX) / pixelsPerSecond;
                let seconds = ownFade + (side === 'in' ? travel : -travel);
                // Grid snap: it is the fade's BOUNDARY, in project time,
                // that lands on the grid — not its length. Shift INVERTS
                // the host's switch, read live on each move, as a clip
                // drag's does (2026-10-01; it was Alt-to-bypass)
                let snappedTo: number | null = null;
                let snappedKind: 'grid' | 'alignment' | null = null;
                const snapNow = ev.shiftKey ? !snapEnabled : snapEnabled;
                // Shift with snapping ON is no snap at all — not even the
                // clip-edge alignment that stands in for the grid when
                // the switch is off (the clip drag's rule, 2026-10-01)
                const noSnapAtAll = ev.shiftKey && snapEnabled;
                const rawBoundary = side === 'in' ? clip.start + seconds : clipEnd - seconds;
                // A target the fade cannot reach (past its limits) is
                // not a snap: keep the pointer's own value there
                const take = (boundary: number, kind: 'grid' | 'alignment') => {
                  const snappedSeconds = side === 'in' ? boundary - clip.start : clipEnd - boundary;
                  if (snappedSeconds < 0 || snappedSeconds > maxSeconds) return;
                  seconds = snappedSeconds;
                  snappedTo = boundary;
                  snappedKind = kind;
                };
                if (snapTime && snapNow) {
                  take(snapTime(rawBoundary), 'grid');
                } else if (alignFadeBoundary && !noSnapAtAll) {
                  // Alignment: the boundary magnetically meets a clip
                  // edge on another track, as a clip's edges do
                  const edge = alignFadeBoundary(rawBoundary, trackIndex);
                  if (edge !== null) take(edge, 'alignment');
                }
                // Clamp to the free window: a quick fade never overlaps
                // a crossfade (or the opposite quick fade)
                seconds = Math.max(0, Math.min(maxSeconds, seconds));
                if (seconds < 0.02) seconds = 0; // snap tiny fades away
                onClipFadeChange?.(clip.id, side, seconds);
                if (snapTime || alignFadeBoundary) onFadeSnapGuideline?.(snappedTo, snappedKind);
              };
              const onUp = (ev: PointerEvent) => {
                handleEl.removeEventListener('pointermove', onMove);
                handleEl.removeEventListener('pointerup', onUp);
                setFadeDragClipId(null);
                setFadeDragSide(null);
                onFadeDragChange?.(null);
                settleHint(handleEl, ev);
                settleFadeHover(clip.id, ev, handleEl);
                if (snapTime || alignFadeBoundary) onFadeSnapGuideline?.(null, null);
              };
              handleEl.addEventListener('pointermove', onMove);
              handleEl.addEventListener('pointerup', onUp);
            }}
            style={{
              position: 'absolute',
              top: FADE_HANDLE_TOP,
              left: `${left}px`,
              width: boxRight - boxLeft,
              height: FADE_ROW_H,
              cursor: 'ew-resize',
              // Above the fade veils (450), beside the shape dots (460)
              zIndex: 455,
            }}
          >
            {/* Hover and press grow the GLYPH (Track.css), never the box
                — the hit area holds still under the pointer, as the trim
                and stretch handles' do. The glyph is centred on the body,
                so it grows about its own middle. */}
            <div
              className="track-fade-handle__glyph"
              style={{
                position: 'absolute',
                top: GLYPH_TOP,
                left: glyphLeft,
                width: FADE_HANDLE_BOX.width,
                height: FADE_HANDLE_BOX.height,
                pointerEvents: 'none',
              }}
            >
              <FadeHandleGlyph mirrored={side === 'out'} />
            </div>
          </div>
        );
      };
      // A crossfaded edge's quick-fade handle hides — the crossfade's
      // intersection node does the work there. A ZERO-extent handle on
      // a clip too narrow to grow a fade in also hides — otherwise it
      // stacks uselessly on top of the other handle. (The opposite fade
      // is no longer a cap — pulled into, it gives way, 2026-10-06 — so
      // the window alone decides.)
      const NO_ROOM_PX = 24;
      const roomFor = (own: number) =>
        own > 0 || windowLen * pixelsPerSecond >= NO_ROOM_PX;
      if (!crossfadedEdges.has(`${clip.id}:in`) && roomFor(fadeInSec)) nodes.push(handle('in'));
      if (!crossfadedEdges.has(`${clip.id}:out`) && roomFor(fadeOutSec)) nodes.push(handle('out'));
      // A dashed line drops from each fade's boundary — where the curve
      // meets the body's top — to the clip's BOTTOM, so the boundary can
      // be lined up against the waveform (the dev's lining-up aid, user
      // decision 2026-10-01; "only down to the bottom of the clip" — it
      // was canvas-deep). It showed for a LENGTH drag only; since
      // 2026-10-07 ("on hover, please show the dashed line") it is up
      // whenever the handles are — on HOVER, for every fade with length
      // — and during a drag for the fade in hand alone. It follows the
      // EFFECTIVE boundary, so a snapped drag's line sits on the
      // gridline. The dash is Track.css; it fades with the handles.
      const guidelineSides: Array<'in' | 'out'> = fadeDragClipId === clip.id && fadeDragSide
        ? [fadeDragSide]
        : (['in', 'out'] as const).filter((side) =>
          (side === 'in' ? fadeInSec : fadeOutSec) > 0 && !crossfadedEdges.has(`${clip.id}:${side}`));
      for (const side of guidelineSides) {
        const boundaryX = side === 'in' ? boundaryInX : boundaryOutX;
        nodes.push(
          <div
            key={`fade-guideline-${clip.id}-${side}`}
            className="track-fade-guideline"
            data-fade-guideline={side}
            data-fade-clip={clip.id}
            data-leaving={leaving ? 'true' : undefined}
            style={{
              position: 'absolute',
              top: HEADER_H,
              left: `${Math.round(xBase + boundaryX)}px`,
              width: 1,
              height: height - HEADER_H,
              pointerEvents: 'none',
              // Over the handles (455) and the shape dots (460): a line
              // this thin must not be cut by a box it crosses
              zIndex: 461,
            }}
          />,
        );
      }
    }
    return nodes.length > 0 ? nodes : null;
  };

  // Render envelope interaction layers for all clips at track level
  const renderEnvelopeInteractionLayers = () => {
    if (!envelopeMode || !onEnvelopePointsChange) return null;

    const CLIP_HEADER_HEIGHT = 20;

    return clips.map((clip, envIndex) => {
      const clipX = CLIP_CONTENT_OFFSET + clip.start * pixelsPerSecond;
      const clipWidth = clip.duration * pixelsPerSecond;

      return (
        <EnvelopeInteractionLayer
          key={`envelope-${clip.id}`}
          envelopePoints={clip.envelopePoints || []}
          onEnvelopePointsChange={(newPoints) => onEnvelopePointsChange(clip.id, newPoints)}
          onHiddenPointsChange={(hiddenIndices) => {
            setClipHiddenPoints((prev) => {
              const next = new Map(prev);
              if (hiddenIndices.length > 0) {
                next.set(clip.id, hiddenIndices);
              } else {
                next.delete(clip.id);
              }
              return next;
            });
          }}
          onHoveredPointsChange={(hoveredIndices) => {
            setClipHoveredPoints((prev) => {
              const next = new Map(prev);
              if (hoveredIndices.length > 0) {
                next.set(clip.id, hoveredIndices);
              } else {
                next.delete(clip.id);
              }
              return next;
            });
          }}
          onCursorPositionChange={(position) => {
            setClipCursorPositions((prev) => {
              const next = new Map(prev);
              if (position) {
                next.set(clip.id, position);
              } else {
                next.delete(clip.id);
              }
              return next;
            });
          }}
          enabled={envelopeMode}
          width={clipWidth}
          height={height - CLIP_HEADER_HEIGHT}
          duration={clip.duration}
          x={clipX}
          y={CLIP_HEADER_HEIGHT}
          zIndex={500 + envIndex}
        />
      );
    });
  };

  // Handle focus entering the track
  const handleTrackFocus = (e: React.FocusEvent) => {
    // Focus entered somewhere within the track (could be a clip or label)
    setHasKeyboardFocus(true);
    onFocusChange?.(true);

    // Container-focused (black/white bars) only when DOM focus is on
    // the container itself AND the user is in keyboard-input mode.
    // Mouse mode keeps the blue outline regardless of how the focus
    // event was triggered (click, arrow nav from a mouse-focused
    // track, programmatic focus). Arrow nav inherits the prior mode
    // so a Tab → next track → Up/Down → another track keeps the
    // black/white bars throughout.
    const fromMouse = focusFromMouseRef.current;
    focusFromMouseRef.current = false;
    const node = trackRef.current;
    // `data-focus-from-nav` is stamped by the arrow-nav path (Canvas
    // sets it right before .focus() lands on the target track). It
    // signals "the user is arrow-walking, not Tab-walking, so paint
    // the blue arrow-focus outline instead of the container-focused
    // black/white bars". We consume the attribute here so any later
    // Tab-driven focus into the same track re-picks the Tab style.
    const fromArrowNav = !!(node && node.hasAttribute('data-focus-from-nav'));
    if (fromArrowNav) {
      node.removeAttribute('data-focus-from-nav');
    }

    // In flat-nav mode the track wrapper is its own Tab stop and the
    // user can land on a track that's below the viewport. The .track
    // spans the full canvas width, so we can't use scrollIntoViewIfNeeded
    // (its inline: 'center' would yank the horizontal scroll). Instead,
    // scroll vertically only — when the track sits outside a comfortable
    // band, animate the scroll so the track top lands at TOP_OFFSET from
    // the viewport top.
    if (isFlatNavigation && !fromMouse && e.target === trackRef.current && node) {
      const scrollEl = node.closest('.canvas-scroll-container') as HTMLElement | null;
      if (scrollEl) {
        const trackRect = node.getBoundingClientRect();
        const containerRect = scrollEl.getBoundingClientRect();
        // Where the focused track's top should sit relative to the
        // viewport when we scroll. Enough breathing room above to show
        // the track's surrounding context (the previous track / timeline
        // ruler) while still keeping the focused track high enough that
        // most of the canvas below is visible.
        const TOP_OFFSET = 80;
        const BOTTOM_PAD = 24;
        const topOffset = trackRect.top - containerRect.top;
        const bottomOffset = trackRect.bottom - containerRect.bottom;
        const isAboveBand = topOffset < TOP_OFFSET;
        const isBelowBand = bottomOffset > -BOTTOM_PAD;
        if (isAboveBand || isBelowBand) {
          const nextScrollTop = scrollEl.scrollTop + topOffset - TOP_OFFSET;
          scrollEl.scrollTo({ top: Math.max(0, nextScrollTop), behavior: 'smooth' });
        }
      }
    }

    // Blue arrow-nav outline overrides the black/white container
    // outline: arrow keys walking off a focused clip onto a new
    // track shouldn't flip that track's style into Tab-nav mode.
    const containerHasFocus =
      e.target === trackRef.current
      && !fromMouse
      && !fromArrowNav
      && getInputMode() === 'keyboard';
    setIsContainerFocused(containerHasFocus);
    onContainerFocusChange?.(containerHasFocus);
  };

  // Handle focus leaving the track — tabIndex reset delegated to useContainerTabGroup
  const handleTrackBlur = (e: React.FocusEvent) => {
    // Let the hook handle tabIndex reset
    clipNavBlur(e);

    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const trackElement = e.currentTarget;

    // Only notify blur if focus is moving completely outside the track
    if (!relatedTarget || !trackElement.contains(relatedTarget)) {
      setHasKeyboardFocus(false);
      setIsContainerFocused(false);
      onFocusChange?.(false);
      // Don't clear container focus if moving to another track container (e.g. during reorder)
      const movingToTrackContainer = relatedTarget?.classList.contains('track');
      if (!movingToTrackContainer) {
        onContainerFocusChange?.(false);
      }
    } else {
      // Focus moved to a child — container no longer directly focused
      if (e.target === trackRef.current) {
        setIsContainerFocused(false);
        onContainerFocusChange?.(false);
      }
    }
  };

  const className = `track-wrapper ${isFocused ? 'track-wrapper--focused' : ''}`;

  // Render time selection overlay (only for the selected time range on track background)
  const renderTimeSelectionOverlay = () => {
    if (!timeSelection) return null;

    const startX = CLIP_CONTENT_OFFSET + timeSelection.startTime * pixelsPerSecond;
    const endX = CLIP_CONTENT_OFFSET + timeSelection.endTime * pixelsPerSecond;
    const selectionWidth = endX - startX;

    let overlayColor: string;
    if (inTimeSelectionScope) {
      overlayColor = isTimeSelectionDragging
        ? 'rgba(100, 127, 143, 0.55)'
        : 'rgba(98, 119, 136, 0.55)';
    } else {
      overlayColor = 'rgba(49, 56, 70, 0.55)';
    }

    return (
      <div
        style={{
          position: 'absolute',
          left: `${startX}px`,
          top: 0,
          width: `${selectionWidth}px`,
          height: `${height}px`,
          backgroundColor: overlayColor,
          pointerEvents: 'none',
          zIndex: 0, // Behind clips (clips have higher z-index)
        }}
      />
    );
  };

  return (
    <div className={`${className}${isContainerFocused ? ' track-wrapper--container-focused' : ''}`} data-track-index={trackIndex}>
      <div
        ref={trackRef}
        className={`track ${isSelected ? 'track--selected' : ''} ${isMuted ? 'track--muted' : ''}`}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: getTrackBackgroundColor(),
          opacity: isMuted ? 0.5 : 1,
          // For the debug hit-area overlay (Track.css): the fade
          // controls' reveal buffer is drawn from the same constant
          // isWellInsideClip reads, so the picture cannot drift from it
          ['--edge-hit-inside' as string]: `${EDGE_HIT_INSIDE_PX}px`,
        } as React.CSSProperties}
        tabIndex={trackTabIndex ?? -1}
        role="group"
        aria-label={`${trackName ?? `Track ${trackIndex + 1}`}, ${isLabelTrack ? 'label track' : isMidiTrack ? 'MIDI track' : 'audio track'}`}
        onMouseDown={(e) => {
          // Let the browser focus the .track div so Tab continues from here.
          // The ref tells handleTrackFocus to suppress the red container outline.
          focusFromMouseRef.current = true;
          trackClickXRef.current = e.clientX;
        }}
        onClickCapture={clipNavClickCapture}
        onClick={(e) => {
          // Don't focus the .track DOM element on click — that shows the red
          // container outline.  onTrackClick sets focusedTrackIndex which gives
          // the blue track-wrapper outline instead.
          onTrackClick?.(e);
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          // If the track container itself is focused (not a child clip), handle navigation
          if (e.currentTarget === document.activeElement) {
            if (e.key === 'Enter') {
              // Enter on track container: select track and deselect clips
              e.preventDefault();
              e.stopPropagation();
              onContainerEnter?.({ metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
              return;
            }
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
              // Cmd/Ctrl+Arrow: reorder track up / down. Pass the
              // current container-focused state along so the parent
              // only carries that indicator over to the new position
              // when it was actually set (which only happens after a
              // Tab-driven keyboard focus, not after a mouse click).
              e.preventDefault();
              e.stopPropagation();
              onTrackReorder?.(e.key === 'ArrowDown' ? 1 : -1, isContainerFocused);
            } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey && !e.metaKey && !e.ctrlKey) {
              // Plain / Shift+Arrow: navigate between tracks.
              //   Plain → follows-focus moves selection with focus
              //   Shift → extend range
              // (Peek mode via Alt is gone — Alt is now reserved for
              // clip-land navigation, not a focus-decouple modifier.)
              // Any OTHER modified arrow — Option+Cmd+Up/Down, the
              // track-height step (2026-10-08) — is left to bubble to
              // the app's shortcuts: this branch used to catch every
              // arrow and stop it, so the chord did nothing from a
              // focused track ("I promise it doesn't work").
              e.preventDefault();
              e.stopPropagation();
              onTrackNavigateVertical?.(
                e.key === 'ArrowDown' ? 1 : -1,
                e.shiftKey,
                false,
              );
            } else if (!isFlatNavigation && e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              // Empty track (no clips): treat Tab as if we're already
              // past the last clip — hand off to onTabFromLastClip so
              // focus jumps to the ruler / next track instead of
              // getting parked in this track's panel with no way to
              // reach the panel controls that would normally come
              // after (the flow assumes clips exist between them).
              if (sortedClips.length === 0 && onTabFromLastClip) {
                onTabFromLastClip();
                return;
              }
              if (!isContainerFocused && trackClickXRef.current !== null) {
                // Invisible focus from mouse click — Tab to nearest
                // clip on the track. When the track has no clips,
                // fall through to the keyboard branch so the user
                // still moves somewhere instead of getting a silent
                // no-op.
                const clipElements = trackRef.current?.querySelectorAll('[data-clip-id]');
                if (clipElements && clipElements.length > 0) {
                  const clickX = trackClickXRef.current;
                  let nearestDist = Infinity;
                  let nearestIdx = 0;
                  clipElements.forEach((el, i) => {
                    const rect = el.getBoundingClientRect();
                    const clipCenter = rect.left + rect.width / 2;
                    const dist = Math.abs(clickX - clipCenter);
                    if (dist < nearestDist) {
                      nearestDist = dist;
                      nearestIdx = i;
                    }
                  });
                  trackClickXRef.current = null;
                  // preventScroll — same rationale as the clip-to-clip
                  // Tab handler above; let scrollIntoViewIfNeeded run
                  // the smooth pan without the browser stealing it.
                  (clipElements[nearestIdx] as HTMLElement).focus({ preventScroll: true });
                } else {
                  // No clips → promote to keyboard-focus on the track
                  // itself so the user can see the focus state, then
                  // let the next Tab walk into the panel.
                  trackClickXRef.current = null;
                  const node = trackRef.current;
                  if (node) {
                    node.setAttribute('data-focus-from-nav', '1');
                    node.blur();
                    node.focus();
                  }
                }
              } else {
                // Visible keyboard focus — Tab enters panel controls
                onEnterPanel?.();
              }
            } else if (!isFlatNavigation && e.key === 'Tab' && e.shiftKey) {
              // Shift+Tab: go to previous track's clips or panel
              e.preventDefault();
              e.stopPropagation();
              onShiftTabOut?.();
            }
            return; // Don't run clip navigation when container itself is focused
          }
          // Suppress arrow-key clip-to-clip navigation when the focused
          // clip was focused via mouse. Only relevant for Home / End
          // (which useContainerTabGroup still owns); arrow keys are
          // reserved for matrix nav (playhead + track focus) and
          // don't reach clipNavKeyDown here.
          const activeEl = document.activeElement as HTMLElement | null;
          if (activeEl?.hasAttribute('data-focus-mouse')) return;

          // Plain / modified arrows are all reserved for matrix
          // navigation now — clip-to-clip stepping lives on Tab /
          // Shift+Tab, handled in the clip's own onKeyDown. Do NOT
          // delegate arrow keys to clipNavKeyDown.
          if (
            e.key === 'ArrowLeft' || e.key === 'ArrowRight'
            || e.key === 'ArrowUp' || e.key === 'ArrowDown'
          ) {
            return;
          }
          // Home / End still delegate for clip-list bookends.
          clipNavKeyDown(e);
        }}
        onFocus={handleTrackFocus}
        onBlur={handleTrackBlur}
      >
        {renderTimeSelectionOverlay()}

        {/* Clip header recess - 20px darkened area at top of track (hidden for label tracks and when track is too small) */}
        {/* Rendered after time selection overlay but before clips so clips render on top */}
        {!isLabelTrack && !isMidiTrack && height > 44 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
              zIndex: 1, // Above time selection overlay (z-index: 0), below clips (z-index: 2)
            }}
          />
        )}

        {renderClips()}
        {renderEdgeTrimZones()}
        {renderFadeCurveOverlays()}
        {renderCrossfadeNodes()}
        {renderQuickFadeNodes()}
        {renderFadeHandles()}
        {renderBuriedEdgeHandles()}
        {renderEnvelopeInteractionLayers()}

        {/* Split view divider - draggable horizontal line */}
        {splitView && onChannelSplitRatioChange && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingDivider(true);
              document.body.style.cursor = 'ns-resize';
            }}
            onMouseEnter={() => setDividerHover(true)}
            onMouseLeave={() => setDividerHover(false)}
            style={{
              position: 'absolute',
              top: `${20 + (height - 20) * channelSplitRatio}px`,
              left: 0,
              width: '100%',
              height: dividerHover || isDraggingDivider ? '3px' : '1px',
              backgroundColor: dividerHover || isDraggingDivider ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              cursor: 'ns-resize',
              // Above every stacked clip (clips band at 2+index)
              zIndex: 900,
              transform: dividerHover || isDraggingDivider ? 'translateY(-1px)' : 'none',
              transition: isDraggingDivider ? 'none' : 'all 0.1s ease',
            }}
          />
        )}
      </div>
    </div>
  );
};

export const TrackNew = React.memo(TrackNewComponent);

export default TrackNew;
