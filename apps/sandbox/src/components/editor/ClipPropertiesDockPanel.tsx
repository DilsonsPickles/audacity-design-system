/**
 * ClipPropertiesDockPanel — sandbox wiring for the dockable
 * ClipPropertiesPanel (2026-10-02). Resolves the clip to show
 * (utils/clipPropertiesTarget.ts), maps it to the panel's view of a
 * clip, and turns each edit into the reducer action the rest of the app
 * already uses for it — rename and colour through UPDATE_CLIP, start
 * through MOVE_CLIP, length through TRIM_CLIP (clamped to the source),
 * fades through SET_CLIP_FADE / SET_CLIP_FADE_SHAPE (the fade menu's
 * presets), speed through STRETCH_CLIP — so the panel is one more way
 * in, never a second rule.
 */
import { ClipPropertiesPanel, type ClipPropertiesClip, type ClipPropertiesOption } from '@audacity-ui/components';
import { useTracks, type Clip } from '../../contexts/TracksContext';
import { useClipProperties } from '../../contexts/ClipPropertiesContext';
import { resolveClipPropertiesClip } from '../../utils/clipPropertiesTarget';
import { FADE_SHAPE_PRESETS, fadeShapePresetOf } from '../../utils/fadeShapePresets';

/** The colours a clip can wear — Clip['color'], labelled */
const CLIP_COLORS: ReadonlyArray<ClipPropertiesOption & { id: NonNullable<Clip['color']> }> = [
  { id: 'cyan', label: 'Cyan' },
  { id: 'blue', label: 'Blue' },
  { id: 'violet', label: 'Violet' },
  { id: 'magenta', label: 'Magenta' },
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'teal', label: 'Teal' },
];

const FADE_SHAPES: ReadonlyArray<ClipPropertiesOption> = FADE_SHAPE_PRESETS.map((p) => ({ id: p.id, label: p.label }));

const MIN_CLIP_SECONDS = 0.02;

export interface ClipPropertiesDockPanelProps {
  /** Where the panel sits in the app's reading order (docked left =
   *  before the tracks, right or bottom = after) */
  placement?: 'start' | 'end';
}

export function ClipPropertiesDockPanel({ placement = 'start' }: ClipPropertiesDockPanelProps = {}) {
  const { state, dispatch } = useTracks();
  const { clipPropertiesTarget } = useClipProperties();

  const resolved = resolveClipPropertiesClip(state.tracks, clipPropertiesTarget);
  const track = resolved ? state.tracks[resolved.trackIndex] : null;
  const clip = resolved?.clip ?? null;
  const trackIndex = resolved?.trackIndex ?? -1;

  const stretchFactor = (clip as { stretchFactor?: number } | null)?.stretchFactor ?? 1;
  const trimStart = clip?.trimStart ?? 0;
  // The source's length: stored once the clip has been trimmed or
  // stretched; before that the clip shows the whole source
  const fullDuration = clip ? (clip.fullDuration ?? trimStart + clip.duration / stretchFactor) : 0;

  const view: ClipPropertiesClip | null = clip && track ? {
    id: clip.id,
    name: clip.name,
    color: clip.color,
    trackName: track.name,
    start: clip.start,
    duration: clip.duration,
    trimStart,
    fullDuration,
    stretchFactor,
    fadeIn: clip.fadeIn ?? 0,
    fadeOut: clip.fadeOut ?? 0,
    fadeInShapeId: fadeShapePresetOf(clip.fadeInShape),
    fadeOutShapeId: fadeShapePresetOf(clip.fadeOutShape),
    groupId: clip.groupId,
  } : null;

  const update = (updates: Partial<Clip>) => {
    if (!clip) return;
    dispatch({ type: 'UPDATE_CLIP', payload: { trackIndex, clipId: clip.id, updates } });
  };

  return (
    <ClipPropertiesPanel
      clip={view}
      colors={CLIP_COLORS}
      fadeShapes={FADE_SHAPES}
      placement={placement}
      onRename={(name) => update({ name })}
      onColorChange={(colorId) => {
        const color = CLIP_COLORS.find((c) => c.id === colorId)?.id;
        if (color) update({ color });
      }}
      onStartChange={(seconds) => {
        if (!clip) return;
        dispatch({
          type: 'MOVE_CLIP',
          payload: { clipId: clip.id, fromTrackIndex: trackIndex, toTrackIndex: trackIndex, newStartTime: Math.max(0, seconds) },
        });
      }}
      onDurationChange={(seconds) => {
        if (!clip) return;
        // The visible length cannot exceed what the source has left
        // after the trim, at the clip's speed
        const maxSeconds = (fullDuration - trimStart) * stretchFactor;
        const newDuration = Math.max(MIN_CLIP_SECONDS, Math.min(maxSeconds, seconds));
        dispatch({ type: 'TRIM_CLIP', payload: { trackIndex, clipId: clip.id, newTrimStart: trimStart, newDuration } });
      }}
      onFadeChange={(side, seconds) => {
        if (!clip) return;
        dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex, clipId: clip.id, side, seconds: Math.max(0, seconds) } });
      }}
      onFadeShapeChange={(side, shapeId) => {
        if (!clip) return;
        const preset = FADE_SHAPE_PRESETS.find((p) => p.id === shapeId);
        if (preset) dispatch({ type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex, clipId: clip.id, side, shape: preset.shape } });
      }}
      onSpeedChange={(percent) => {
        if (!clip || !(percent > 0)) return;
        // Speed is the inverse of the stretch: 200% plays twice as fast,
        // so the clip is half as long. The start holds.
        const newStretchFactor = 100 / percent;
        const newDuration = clip.duration * (newStretchFactor / stretchFactor);
        dispatch({ type: 'STRETCH_CLIP', payload: { trackIndex, clipId: clip.id, newDuration, newStretchFactor } });
      }}
    />
  );
}
