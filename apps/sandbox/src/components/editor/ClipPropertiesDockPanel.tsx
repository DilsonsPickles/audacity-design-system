/**
 * ClipPropertiesDockPanel — sandbox wiring for the dockable
 * ClipPropertiesPanel (2026-10-02). Resolves what to show
 * (utils/clipPropertiesTarget.ts — the FOCUSED clip first (2026-10-06),
 * so arrowing or clicking to another clip switches the panel; else the
 * single selected clip; else the EMPTY state (2026-10-07); or, with
 * SEVERAL clips selected and the focus among them or nowhere, their
 * merge — utils/clipPropertiesSelection.ts; a focused clip OUTSIDE the
 * selection is shown alone), maps it to the panel's view, and
 * turns each edit into the reducer action the rest of the app already
 * uses for it — rename and colour through UPDATE_CLIP, start through
 * MOVE_CLIP, length and both edge trims through TRIM_CLIP (clamped to
 * the source; the left trim moves the start as the mouse's does), fades
 * through SET_CLIP_FADE / SET_CLIP_FADE_SHAPE (the fade menu's presets),
 * pitch through UPDATE_CLIP (pitchSemitones), speed through
 * STRETCH_CLIP, the track through MOVE_CLIP with the start held
 * (2026-10-06, "perhaps parent track can be changed too") — so the
 * panel is one more way in, never a second rule.
 * In the selection state an edit applies to EVERY selected clip, each
 * clamped to its own room (the fade menu's rule made visible).
 *
 * Two actions (2026-10-06): RESET PITCH & SPEED puts every target back
 * to 0 semitones and 100% (the same two actions the fields use), and
 * EXPORT renders each target as it plays — envelope, quick fades, pitch
 * and speed — through the audio manager's `exportClip` and hands the
 * browser a WAV named after the clip. The format list is the export
 * modal's short list; only WAV is encoded in the prototype, the others
 * are rendered as WAV and say so.
 */
import React from 'react';
import { ClipPropertiesPanel, PITCH_LIMIT_SEMITONES, toast, type ClipPropertiesClip, type ClipPropertiesOption, type ClipPropertiesShapeOption, type ClipPropertiesExportSettings, CLIP_COLOR_ITEMS } from '@audacity-ui/components';
import { useTracks, type Clip, type TracksAction } from '../../contexts/TracksContext';
import { usePlayback } from '../../contexts/PlaybackContext';
import { downloadBlob, safeFileName } from '../../utils/downloadBlob';
import { useClipProperties } from '../../contexts/ClipPropertiesContext';
import { resolveClipPropertiesClip, singleSelectedClip } from '../../utils/clipPropertiesTarget';
import { useFocusedClip } from '../../hooks/useFocusedClip';
import { selectedClipEntries, mergeSelectedClips } from '../../utils/clipPropertiesSelection';
import { FADE_SHAPE_PRESETS, fadeShapePresetOf } from '../../utils/fadeShapePresets';

/** The track's own colour, then the clip palette (the clip menu's list) */
const TRACK_COLOR = 'track';
const CLIP_COLORS: ReadonlyArray<ClipPropertiesOption> = [
  { id: TRACK_COLOR, label: 'Track color' },
  ...CLIP_COLOR_ITEMS.map(([id, label]) => ({ id, label })),
];

const FADE_SHAPES: ReadonlyArray<ClipPropertiesShapeOption> = FADE_SHAPE_PRESETS.map((p) => ({ id: p.id, label: p.label, shape: p.shape }));

const MIN_CLIP_SECONDS = 0.02;

/** The Export block's choices: the export modal's common formats and
 *  rates. The prototype encodes WAV; the rest render as WAV. */
export const CLIP_EXPORT_FORMATS: ReadonlyArray<ClipPropertiesOption> = [
  { id: 'wav', label: 'WAV' },
  { id: 'mp3', label: 'MP3' },
  { id: 'flac', label: 'FLAC' },
  { id: 'ogg', label: 'Ogg Vorbis' },
];
export const CLIP_EXPORT_SAMPLE_RATES: ReadonlyArray<ClipPropertiesOption> = [
  { id: '44100', label: '44.1 kHz' },
  { id: '48000', label: '48 kHz' },
  { id: '96000', label: '96 kHz' },
];

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
  const { audioManagerRef } = usePlayback();
  const [exporting, setExporting] = React.useState(false);

  // The panel FOLLOWS THE FOCUSED CLIP (2026-10-06, "can it be the
  // focused clip?"): the clip with DOM focus is what it shows; else a
  // single selected clip (selection by menu or macro still switches
  // the panel). The target is RECORDED for the ⌥⌘I hotkey's focus
  // return and the menu's open — not for display: with no focus and no
  // single selection the panel is EMPTY (2026-10-07).
  const focused = useFocusedClip();
  const single = singleSelectedClip(state.tracks);
  const next = focused ?? (single ? { trackIndex: single.trackIndex, clipId: single.clip.id } : null);
  React.useEffect(() => {
    if (!next) return;
    if (clipPropertiesTarget?.trackIndex === next.trackIndex && clipPropertiesTarget.clipId === next.clipId) return;
    setClipPropertiesTarget(next);
  }, [next?.trackIndex, next?.clipId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Several selected, with the focus among them or on no clip: the
  // merged selection. A focused clip outside the selection is shown
  // alone — focus wins. One or none selected: the resolved clip.
  const selected = selectedClipEntries(state.tracks);
  const focusedInSelection = !!focused && selected.some((e) => e.trackIndex === focused.trackIndex && e.clip.id === focused.clipId);
  const selection = selected.length >= 2 && (!focused || focusedInSelection) ? mergeSelectedClips(selected, TRACK_COLOR) : null;
  // (The recorded target is for the hotkey's focus return, not for
  // display: with no focus and no single selection the panel is EMPTY,
  // 2026-10-07 — it used to keep the last clip it showed)
  const resolved = selection ? null : resolveClipPropertiesClip(state.tracks, focused);
  const track = resolved ? state.tracks[resolved.trackIndex] : null;
  const clip = resolved?.clip ?? null;
  const trackIndex = resolved?.trackIndex ?? -1;

  // The tracks a clip can live on: the audio tracks, by id
  const trackOptions: ClipPropertiesOption[] = state.tracks
    .filter((t) => !t.type || t.type === 'audio')
    .map((t) => ({ id: String(t.id), label: t.name }));

  const view: ClipPropertiesClip | null = clip && track ? {
    id: clip.id,
    name: clip.name,
    color: clip.ownColor ?? TRACK_COLOR,
    trackColor: track.color,
    trackName: track.name,
    trackId: String(track.id),
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
    fadeInShape: clip.fadeInShape,
    fadeOutShape: clip.fadeOutShape,
    reversed: clip.reversed ?? false,
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

  const resetPitchSpeed = () => {
    forEachTarget((t) => (t.clip.pitchSemitones ? { type: 'UPDATE_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clip.id, updates: { pitchSemitones: undefined } } } : null));
    forEachTarget((t) => (stretchOf(t.clip) !== 1
      ? { type: 'STRETCH_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clip.id, newDuration: t.clip.duration / stretchOf(t.clip), newStretchFactor: 1 } }
      : null));
  };

  const exportTargets = async ({ format, sampleRate }: ClipPropertiesExportSettings) => {
    if (targets.length === 0 || exporting) return;
    setExporting(true);
    const manager = audioManagerRef.current;
    const names: string[] = [];
    try {
      for (const t of targets) {
        const { blob } = await manager.exportClip(t.clip, { sampleRate: sampleRate || undefined, siblings: state.tracks[t.trackIndex]?.clips ?? [] });
        const fileName = `${safeFileName(t.clip.name)}.wav`;
        downloadBlob(blob, fileName);
        names.push(fileName);
      }
      const asWav = format === 'wav' ? '' : ` ${format.toUpperCase()} encoding is not in the prototype; rendered as WAV.`;
      toast.success(names.length === 1 ? 'Clip exported' : `${names.length} clips exported`, `${names.join(', ')}.${asWav}`);
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ClipPropertiesPanel
      clip={view}
      selection={selection}
      colors={CLIP_COLORS}
      tracks={trackOptions}
      onTrackChange={(trackId) => {
        const toTrackIndex = state.tracks.findIndex((t) => String(t.id) === trackId);
        if (toTrackIndex < 0) return;
        // Every target moves to that track, its start held; the moved
        // clip keeps its selection, so the panel follows it there — and
        // a clip shown without a selection is pointed at by hand
        forEachTarget((t) => (t.trackIndex === toTrackIndex ? null : {
          type: 'MOVE_CLIP',
          payload: { clipId: t.clip.id, fromTrackIndex: t.trackIndex, toTrackIndex, newStartTime: t.clip.start },
        }));
        if (!selection && clip && trackIndex !== toTrackIndex) setClipPropertiesTarget({ trackIndex: toTrackIndex, clipId: clip.id });
      }}
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
      onTrimStartChange={selection ? undefined : (seconds) => {
        if (!clip) return;
        // Hide this much of the source at the head, the content staying
        // put: the start moves by the change (in timeline seconds, so
        // through the stretch) and the length gives it up — the mouse's
        // left-edge trim (useClipTrimming), with the same clamps: never
        // before the source, never past the clip's own end, never before
        // the project's start
        const stretch = stretchOf(clip);
        const current = trimStartOf(clip);
        const latest = current + (clip.duration - MIN_CLIP_SECONDS) / stretch;
        const earliest = Math.max(0, current - clip.start / stretch);
        const newTrimStart = Math.max(earliest, Math.min(latest, seconds));
        const delta = (newTrimStart - current) * stretch;
        if (delta === 0) return;
        dispatch({ type: 'TRIM_CLIP', payload: { trackIndex, clipId: clip.id, newTrimStart, newDuration: clip.duration - delta, newStart: clip.start + delta } });
      }}
      onTrimEndChange={selection ? undefined : (seconds) => {
        if (!clip) return;
        // Hide this much of the source at the tail: the right-edge trim
        // said from the other side (Length is the same edit as a length)
        const stretch = stretchOf(clip);
        const room = fullDurationOf(clip) - trimStartOf(clip);
        const newTrimEnd = Math.max(0, Math.min(room - MIN_CLIP_SECONDS / stretch, seconds));
        dispatch({ type: 'TRIM_CLIP', payload: { trackIndex, clipId: clip.id, newTrimStart: trimStartOf(clip), newDuration: (room - newTrimEnd) * stretch } });
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
      onResetPitchSpeed={resetPitchSpeed}
      onReverseChange={(reversed) => forEachTarget((t) => ((t.clip.reversed ?? false) === reversed ? null : {
        type: 'REVERSE_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clip.id },
      }))}
      exportFormats={CLIP_EXPORT_FORMATS}
      exportSampleRates={CLIP_EXPORT_SAMPLE_RATES}
      onExport={(settings) => { void exportTargets(settings); }}
      exporting={exporting}
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
