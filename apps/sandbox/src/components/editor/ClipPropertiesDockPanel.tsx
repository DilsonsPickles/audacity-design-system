/**
 * ClipPropertiesDockPanel — sandbox wiring for the dockable
 * ClipPropertiesPanel (2026-10-02). Resolves what to show
 * (utils/clipPropertiesTarget.ts — the single selected clip first, so
 * selecting another clip switches the panel; else the clip it last
 * showed; or, with SEVERAL clips selected, their merge —
 * utils/clipPropertiesSelection.ts), maps it to the panel's view, and
 * turns each edit into the reducer action the rest of the app already
 * uses for it — rename and colour through UPDATE_CLIP, start through
 * MOVE_CLIP, length through TRIM_CLIP (clamped to the source), fades
 * through SET_CLIP_FADE / SET_CLIP_FADE_SHAPE (the fade menu's presets),
 * pitch through UPDATE_CLIP (pitchSemitones), speed through
 * STRETCH_CLIP — so the panel is one more way in, never a second rule.
 * In the selection state an edit applies to EVERY selected clip, each
 * clamped to its own room (the fade menu's rule made visible).
 */
import React from 'react';
import { ClipPropertiesPanel, PITCH_LIMIT_SEMITONES, type ClipPropertiesClip, type ClipPropertiesOption, CLIP_COLOR_ITEMS } from '@audacity-ui/components';
import { useTracks, type Clip, type TracksAction } from '../../contexts/TracksContext';
import { useClipProperties } from '../../contexts/ClipPropertiesContext';
import { resolveClipPropertiesClip, singleSelectedClip } from '../../utils/clipPropertiesTarget';
import { selectedClipEntries, mergeSelectedClips } from '../../utils/clipPropertiesSelection';
import { FADE_SHAPE_PRESETS, fadeShapePresetOf } from '../../utils/fadeShapePresets';

/** The track's own colour, then the clip palette (the clip menu's list) */
const TRACK_COLOR = 'track';
const CLIP_COLORS: ReadonlyArray<ClipPropertiesOption> = [
  { id: TRACK_COLOR, label: 'Track color' },
  ...CLIP_COLOR_ITEMS.map(([id, label]) => ({ id, label })),
];

const FADE_SHAPES: ReadonlyArray<ClipPropertiesOption> = FADE_SHAPE_PRESETS.map((p) => ({ id: p.id, label: p.label }));

const MIN_CLIP_SECONDS = 0.02;

const stretchOf = (clip: Clip) => (clip as { stretchFactor?: number }).stretchFactor ?? 1;
const trimStartOf = (clip: Clip) => clip.trimStart ?? 0;
// The source's length: stored once the clip has been trimmed or
// stretched; before that the clip shows the whole source
const fullDurationOf = (clip: Clip) => clip.fullDuration ?? trimStartOf(clip) + clip.duration / stretchOf(clip);

export interface ClipPropertiesDockPanelProps {
  /** Where the panel sits in the app's reading order (docked left =
   *  before the tracks, right or bottom = after) */
  placement?: 'start' | 'end';
  /** The bottom drawer lays the groups out in columns */
  layout?: 'stack' | 'columns';
}

export function ClipPropertiesDockPanel({ placement = 'start', layout = 'stack' }: ClipPropertiesDockPanelProps = {}) {
  const { state, dispatch } = useTracks();
  const { clipPropertiesTarget, setClipPropertiesTarget } = useClipProperties();

  // The panel FOLLOWS the selection: a single selected clip becomes the
  // clip it shows, and stays it when the selection is cleared — until
  // the next single selection (user decision 2026-10-02)
  const single = singleSelectedClip(state.tracks);
  React.useEffect(() => {
    if (!single) return;
    if (clipPropertiesTarget?.trackIndex === single.trackIndex && clipPropertiesTarget.clipId === single.clip.id) return;
    setClipPropertiesTarget({ trackIndex: single.trackIndex, clipId: single.clip.id });
  }, [single?.trackIndex, single?.clip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Several selected: the merged selection; one or none: the resolved clip
  const selected = selectedClipEntries(state.tracks);
  const selection = selected.length >= 2 ? mergeSelectedClips(selected, TRACK_COLOR) : null;
  const resolved = selection ? null : resolveClipPropertiesClip(state.tracks, clipPropertiesTarget);
  const track = resolved ? state.tracks[resolved.trackIndex] : null;
  const clip = resolved?.clip ?? null;
  const trackIndex = resolved?.trackIndex ?? -1;

  const view: ClipPropertiesClip | null = clip && track ? {
    id: clip.id,
    name: clip.name,
    color: clip.ownColor ?? TRACK_COLOR,
    trackName: track.name,
    start: clip.start,
    duration: clip.duration,
    trimStart: trimStartOf(clip),
    fullDuration: fullDurationOf(clip),
    stretchFactor: stretchOf(clip),
    pitchSemitones: clip.pitchSemitones ?? 0,
    fadeIn: clip.fadeIn ?? 0,
    fadeOut: clip.fadeOut ?? 0,
    fadeInShapeId: fadeShapePresetOf(clip.fadeInShape),
    fadeOutShapeId: fadeShapePresetOf(clip.fadeOutShape),
    groupId: clip.groupId,
  } : null;

  // The clips an edit applies to: every selected clip in the selection
  // state, else the one shown
  const targets: Array<{ trackIndex: number; clip: Clip }> = selection
    ? selected.map((e) => ({ trackIndex: e.trackIndex, clip: e.clip }))
    : clip ? [{ trackIndex, clip }] : [];
  const forEachTarget = (make: (t: { trackIndex: number; clip: Clip }) => TracksAction | null) => {
    for (const t of targets) {
      const action = make(t);
      if (action) dispatch(action);
    }
  };
  const update = (updates: Partial<Clip>) => forEachTarget((t) => ({ type: 'UPDATE_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clip.id, updates } }));

  return (
    <ClipPropertiesPanel
      clip={view}
      selection={selection}
      colors={CLIP_COLORS}
      fadeShapes={FADE_SHAPES}
      placement={placement}
      layout={layout}
      onRename={selection ? undefined : (name) => update({ name })}
      onColorChange={(colorId) => {
        if (colorId === TRACK_COLOR) { update({ ownColor: undefined }); return; }
        const own = CLIP_COLOR_ITEMS.find(([id]) => id === colorId)?.[0];
        if (own) update({ ownColor: own });
      }}
      onStartChange={selection ? undefined : (seconds) => {
        if (!clip) return;
        dispatch({
          type: 'MOVE_CLIP',
          payload: { clipId: clip.id, fromTrackIndex: trackIndex, toTrackIndex: trackIndex, newStartTime: Math.max(0, seconds) },
        });
      }}
      onDurationChange={selection ? undefined : (seconds) => {
        if (!clip) return;
        // The visible length cannot exceed what the source has left
        // after the trim, at the clip's speed
        const maxSeconds = (fullDurationOf(clip) - trimStartOf(clip)) * stretchOf(clip);
        const newDuration = Math.max(MIN_CLIP_SECONDS, Math.min(maxSeconds, seconds));
        dispatch({ type: 'TRIM_CLIP', payload: { trackIndex, clipId: clip.id, newTrimStart: trimStartOf(clip), newDuration } });
      }}
      onFadeChange={(side, seconds) => forEachTarget((t) => ({
        type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clip.id, side, seconds: Math.max(0, seconds) },
      }))}
      onFadeShapeChange={(side, shapeId) => {
        const preset = FADE_SHAPE_PRESETS.find((p) => p.id === shapeId);
        if (!preset) return;
        forEachTarget((t) => ({ type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: t.trackIndex, clipId: t.clip.id, side, shape: preset.shape } }));
      }}
      onPitchChange={(semitones) => {
        // Two octaves either way; 0 clears the field rather than storing it
        const n = Math.max(-PITCH_LIMIT_SEMITONES, Math.min(PITCH_LIMIT_SEMITONES, semitones));
        update({ pitchSemitones: n === 0 ? undefined : n });
      }}
      onSpeedChange={(percent) => {
        if (!(percent > 0)) return;
        // Speed is the inverse of the stretch: 200% plays twice as fast,
        // so a clip is half as long. Each clip's start holds.
        const newStretchFactor = 100 / percent;
        forEachTarget((t) => ({
          type: 'STRETCH_CLIP',
          payload: { trackIndex: t.trackIndex, clipId: t.clip.id, newDuration: t.clip.duration * (newStretchFactor / stretchOf(t.clip)), newStretchFactor },
        }));
      }}
    />
  );
}
