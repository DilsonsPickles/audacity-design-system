// THE PHONE EDITOR (2026-11-25, a spike on feat/mobile — "Let's try
// building that out so I can test it"): a portrait layout drawn from the
// library's own components (TransportButton, TimeCode, ToolButton,
// ToggleButton, Slider, Icon, Clip) over the real project state, so it
// looks like the desktop app and acts on the same tracks. Stripped back:
// one strip per track above its lane, tap a clip to select it and get a
// sheet of actions, the transport and timecode on top.
import React from 'react';
import {
  Clip as ClipView,
  Icon,
  Slider,
  TimeCode,
  ToggleButton,
  ToolButton,
  TransportButton,
  useTheme,
  DEFAULT_QUICK_FADE_SHAPE,
} from '@audacity-ui/components';
import type { LocalFadeRegion } from '@audacity-ui/components';
import type { Track, TracksAction, TracksState } from '../../contexts/TracksContext';
import { TRACK_COLOR_PALETTE } from '../../contexts/reducers/shared';
import { buildNewTrack } from '../../utils/trackManagement';
import './MobileEditor.css';

const PIXELS_PER_SECOND = 40;
const LANE_HEIGHT = 96;
const CLIP_INSET = 2;
const RULER_STEP_SECONDS = 1;
const DEFAULT_FADE_SECONDS = 0.5;

export interface MobileEditorProps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  projectTitle: string;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
}

/** The track's palette colour, as TrackNew picks it: its own, else by index */
function colourOf(track: Track, index: number) {
  return track.color ?? TRACK_COLOR_PALETTE[index % TRACK_COLOR_PALETTE.length];
}

/** A clip's quick fades as the Clip body draws them: clip-local seconds */
function fadeRegionsOf(clip: Track['clips'][number]): LocalFadeRegion[] {
  const regions: LocalFadeRegion[] = [];
  if (clip.fadeIn) regions.push({ side: 'in', start: 0, end: clip.fadeIn, shape: clip.fadeInShape ?? DEFAULT_QUICK_FADE_SHAPE });
  if (clip.fadeOut) regions.push({ side: 'out', start: clip.duration - clip.fadeOut, end: clip.duration, shape: clip.fadeOutShape ?? DEFAULT_QUICK_FADE_SHAPE });
  return regions;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

export function MobileEditor({
  state, dispatch, projectTitle, isPlaying, onPlay, onStop, onRecord, onStopRecording,
}: MobileEditorProps) {
  const { theme } = useTheme();
  const audioTracks = state.tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => !track.type || track.type === 'audio');

  const projectEnd = state.tracks.reduce(
    (end, t) => Math.max(end, ...t.clips.map((c) => c.start + c.duration)),
    0,
  );
  const contentSeconds = Math.max(projectEnd + 4, 12, state.playheadPosition + 4);
  const contentWidth = Math.ceil(contentSeconds * PIXELS_PER_SECOND);

  const selected = (() => {
    for (const { track, index } of audioTracks) {
      const clip = track.clips.find((c) => c.selected);
      if (clip) return { trackIndex: index, clip, colour: colourOf(track, index) };
    }
    return null;
  })();

  const recording = state.isRecording;
  const playhead = state.playheadPosition;

  const onLaneTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-mobile-clip]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const time = Math.max(0, (e.clientX - rect.left) / PIXELS_PER_SECOND);
    dispatch({ type: 'DESELECT_ALL_CLIPS' });
    dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: time });
  };

  const splitSelected = () => {
    if (!selected) return;
    const { clip, trackIndex } = selected;
    const within = playhead > clip.start + 0.01 && playhead < clip.start + clip.duration - 0.01;
    if (!within) return;
    dispatch({
      type: 'APPLY_CLIP_PLACEMENT',
      payload: { placements: [], mutations: [{ type: 'split', clipId: clip.id, trackIndex, leftEnd: playhead, rightStart: playhead }] },
    });
  };
  const toggleFade = (side: 'in' | 'out') => {
    if (!selected) return;
    const { clip, trackIndex } = selected;
    const current = side === 'in' ? clip.fadeIn : clip.fadeOut;
    const seconds = current ? 0 : Math.min(DEFAULT_FADE_SECONDS, clip.duration / 4);
    dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex, clipId: clip.id, side, seconds } });
  };
  const deleteSelected = () => {
    if (!selected) return;
    dispatch({ type: 'DELETE_CLIP', payload: { trackIndex: selected.trackIndex, clipId: selected.clip.id } });
  };
  const addTrack = () => {
    dispatch({ type: 'ADD_TRACK', payload: buildNewTrack('mono', state.tracks) });
  };

  const splitPossible = !!selected
    && playhead > selected.clip.start + 0.01
    && playhead < selected.clip.start + selected.clip.duration - 0.01;

  const ticks: number[] = [];
  for (let s = 0; s <= contentSeconds; s += RULER_STEP_SECONDS) ticks.push(s);

  const style = {
    '--m-surface': theme.background.surface.default,
    '--m-border': theme.border.default,
    '--m-text': theme.foreground.text.primary,
    '--m-text-secondary': theme.foreground.text.secondary,
    '--m-canvas': theme.background.canvas.default,
    '--m-lane': theme.background.canvas.track.idle,
    '--m-lane-selected': theme.background.canvas.track.selected,
    '--m-grid': theme.background.canvas.grid.major,
    '--m-card': theme.background.trackHeader.idle,
    '--m-card-selected': theme.background.trackHeader.selected,
    '--m-accent': theme.border.focus,
    '--m-menu': theme.background.menu.background,
    '--m-menu-hover': theme.background.menu.item.hover,
    '--m-divider': theme.background.menu.separator,
  } as React.CSSProperties;

  return (
    <div className="mobile-editor" style={style} data-mobile-editor>
      <header className="mobile-editor__bar">
        <span className="mobile-editor__title">{projectTitle}</span>
        <ToolButton icon="undo" ariaLabel="Undo" disabled={state.past.length === 0} onClick={() => dispatch({ type: 'UNDO' })} />
        <ToolButton icon="redo" ariaLabel="Redo" disabled={state.future.length === 0} onClick={() => dispatch({ type: 'REDO' })} />
      </header>

      <div className="mobile-editor__transport">
        <TransportButton
          icon={isPlaying ? 'pause' : 'play'}
          iconColor={theme.audio.transport.play}
          ariaLabel={isPlaying ? 'Pause' : 'Play'}
          disabled={recording}
          onClick={isPlaying ? onStop : onPlay}
        />
        <TransportButton icon="stop" ariaLabel="Stop" onClick={recording ? onStopRecording : onStop} />
        <TransportButton
          icon="record"
          iconColor={theme.audio.transport.record}
          recording={recording}
          ariaLabel={recording ? 'Recording' : 'Record'}
          onClick={recording ? onStopRecording : onRecord}
        />
        <TransportButton
          icon="skip-back"
          ariaLabel="Skip to start"
          disabled={recording}
          onClick={() => dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 })}
        />
        <span className="mobile-editor__spacer" />
        <TimeCode value={playhead} format="mm:ss+milliseconds" ariaLabel="Playhead position" showFormatSelector={false} />
      </div>

      <div className="mobile-editor__scroll">
        <div className="mobile-editor__content" style={{ width: contentWidth }}>
          <div className="mobile-editor__ruler" aria-hidden="true" onClick={onLaneTap}>
            {ticks.map((s) => (
              <React.Fragment key={s}>
                <span className="mobile-editor__tick" style={{ left: s * PIXELS_PER_SECOND, height: s % 5 === 0 ? 9 : 4 }} />
                {s % 5 === 0 && (
                  <span className="mobile-editor__tick-label" style={{ left: s * PIXELS_PER_SECOND + 3 }}>{formatClock(s).replace(/\.0$/, '')}</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {ticks.map((s) => (
            <span key={`g${s}`} className="mobile-editor__grid" style={{ left: s * PIXELS_PER_SECOND }} aria-hidden="true" />
          ))}

          {audioTracks.map(({ track, index }) => {
            const colour = colourOf(track, index);
            const trackSelected = selected?.trackIndex === index;
            return (
              <section key={track.id} className="mobile-editor__track" aria-label={track.name}>
                <div className="mobile-editor__strip" data-selected={trackSelected ? '' : undefined}>
                  <span className="mobile-editor__edge" style={{ background: theme.audio.clip[colour].header }} />
                  <Icon name="microphone" size={14} />
                  <span className="mobile-editor__track-name">{track.name}</span>
                  <div className="mobile-editor__volume">
                    <Slider
                      value={Math.round(((track.gain ?? -6) + 60) / 72 * 100)}
                      min={0}
                      max={100}
                      ariaLabel={`${track.name} volume`}
                      onChange={(v) => dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { gain: (v / 100) * 72 - 60 } } })}
                    />
                  </div>
                  <ToggleButton
                    size={32}
                    active={!!track.muted}
                    ariaLabel={`Mute ${track.name}`}
                    onClick={() => dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { muted: !track.muted } } })}
                  >M</ToggleButton>
                  <ToggleButton
                    size={32}
                    active={!!track.soloed}
                    ariaLabel={`Solo ${track.name}`}
                    onClick={() => dispatch({ type: 'UPDATE_TRACK', payload: { index, track: { soloed: !track.soloed } } })}
                  >S</ToggleButton>
                </div>
                <div
                  className="mobile-editor__lane"
                  data-selected={trackSelected ? '' : undefined}
                  style={{ height: LANE_HEIGHT }}
                  onClick={onLaneTap}
                >
                  {track.clips.map((clip) => (
                    <div
                      key={clip.id}
                      data-mobile-clip
                      className="mobile-editor__clip"
                      style={{ left: clip.start * PIXELS_PER_SECOND, top: CLIP_INSET }}
                      onClick={() => {
                        if (clip.selected) { dispatch({ type: 'DESELECT_ALL_CLIPS' }); return; }
                        dispatch({ type: 'DESELECT_ALL_CLIPS' });
                        dispatch({ type: 'SELECT_CLIP', payload: { trackIndex: index, clipId: clip.id } });
                      }}
                    >
                      <ClipView
                        color={clip.ownColor ?? colour}
                        name={clip.name}
                        width={clip.duration * PIXELS_PER_SECOND}
                        height={LANE_HEIGHT - CLIP_INSET * 2}
                        selected={!!clip.selected}
                        waveformData={clip.waveform}
                        waveformDataRms={clip.waveformRms}
                        clipDuration={clip.duration}
                        clipTrimStart={clip.trimStart ?? 0}
                        clipFullDuration={clip.fullDuration}
                        clipStretchFactor={clip.stretchFactor ?? 1}
                        pixelsPerSecond={PIXELS_PER_SECOND}
                        envelope={clip.envelopePoints}
                        fadeRegions={fadeRegionsOf(clip)}
                        clipStartTime={clip.start}
                        handlesHidden
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="mobile-editor__add">
            <button type="button" className="mobile-editor__add-button" onClick={addTrack}>
              <Icon name="plus" size={16} />
              Add track
            </button>
          </div>

          <span className="mobile-editor__playhead" style={{ left: playhead * PIXELS_PER_SECOND }} aria-hidden="true" />
        </div>
      </div>

      {selected ? (
        <section className="mobile-editor__sheet" aria-label={`${selected.clip.name} clip`}>
          <div className="mobile-editor__sheet-head">
            <span className="mobile-editor__swatch" style={{ background: theme.audio.clip[selected.clip.ownColor ?? selected.colour].header }} />
            <span className="mobile-editor__sheet-name">{selected.clip.name}</span>
            <span className="mobile-editor__sheet-range">
              {formatClock(selected.clip.start)} – {formatClock(selected.clip.start + selected.clip.duration)}
            </span>
            <ToolButton icon="close" ariaLabel="Close" onClick={() => dispatch({ type: 'DESELECT_ALL_CLIPS' })} />
          </div>
          <div role="menu" className="mobile-editor__menu">
            <button type="button" role="menuitem" className="mobile-editor__item" disabled={!splitPossible} onClick={splitSelected}>
              <Icon name="split" size={16} />
              <span>Split at playhead</span>
            </button>
            <button type="button" role="menuitem" className="mobile-editor__item" onClick={() => toggleFade('in')}>
              <span className="mobile-editor__item-slot" />
              <span>{selected.clip.fadeIn ? 'Remove fade-in' : 'Fade in'}</span>
            </button>
            <button type="button" role="menuitem" className="mobile-editor__item" onClick={() => toggleFade('out')}>
              <span className="mobile-editor__item-slot" />
              <span>{selected.clip.fadeOut ? 'Remove fade-out' : 'Fade out'}</span>
            </button>
            <div role="separator" className="mobile-editor__divider" />
            <button type="button" role="menuitem" className="mobile-editor__item" onClick={deleteSelected}>
              <Icon name="trash" size={16} />
              <span>Delete</span>
            </button>
          </div>
        </section>
      ) : (
        <footer className="mobile-editor__status">
          <span className="mobile-editor__status-cue">{recording ? 'Recording' : isPlaying ? 'Playing' : 'Stopped'}</span>
          <span className="mobile-editor__status-info">
            {audioTracks.length === 0 ? 'Add a track or press Record' : 'Tap a clip to edit it'}
          </span>
        </footer>
      )}
    </div>
  );
}
