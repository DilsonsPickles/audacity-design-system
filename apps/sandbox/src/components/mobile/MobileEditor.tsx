// THE PHONE EDITOR (2026-11-25, a spike on feat/mobile — "Let's try
// building that out so I can test it"): a portrait layout drawn from the
// library's own components (TransportButton, TimeCode, ToolButton,
// ToggleButton, Slider, Icon, Clip) over the real project state, so it
// looks like the desktop app and acts on the same tracks. Stripped back:
// one strip per track above its lane, tap a clip to select it and get a
// sheet of actions, the transport and timecode on top.
//
// MOVING A CLIP (2026-11-25, "I should be able to select a clip and move it
// around via the head right?"): a SELECTED clip's header is a grab handle —
// drag it sideways to move the clip in time, up or down to move it to
// another track (it lands in the lane under the finger), released as one
// MOVE_CLIP, one undo step. Only a selected clip's header takes the drag
// (touch-action: none there alone), so a finger on anything else still
// scrolls the project. Near the scroller's edges the view scrolls along.
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
/** How far the finger travels before a press on the header is a drag */
const DRAG_THRESHOLD_PX = 4;
/** The band at the scroller's edges that scrolls the view during a drag */
const AUTOSCROLL_EDGE_PX = 40;
const AUTOSCROLL_MAX_PX = 12;

interface ClipDrag {
  clipId: number;
  fromTrack: number;
  toTrack: number;
  pointerId: number;
  startX: number;
  startY: number;
  startScroll: number;
  /** The clip's travel in content pixels, scrolling included */
  dx: number;
  /** The landing lane's offset from the clip's own, in pixels */
  dy: number;
  moved: boolean;
}

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const laneRefs = useRef(new Map<number, HTMLDivElement>());
  const [drag, setDrag] = useState<ClipDrag | null>(null);
  const dragRef = useRef<ClipDrag | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);

  /** The track whose section (strip + lane) is under y; past the ends, the end one */
  const trackAt = useCallback((y: number): number | null => {
    const entries = [...laneRefs.current.entries()]
      .map(([index, lane]) => ({ index, rect: (lane.parentElement ?? lane).getBoundingClientRect() }))
      .sort((a, b) => a.rect.top - b.rect.top);
    if (entries.length === 0) return null;
    const hit = entries.find((e) => y >= e.rect.top && y < e.rect.bottom);
    if (hit) return hit.index;
    return y < entries[0].rect.top ? entries[0].index : entries[entries.length - 1].index;
  }, []);

  /** Re-reads the drag from the last pointer position and the scroll */
  const updateDrag = useCallback(() => {
    const current = dragRef.current;
    const scroller = scrollRef.current;
    if (!current || !scroller) return;
    const { x, y } = pointerRef.current;
    const moved = current.moved
      || Math.abs(x - current.startX) > DRAG_THRESHOLD_PX
      || Math.abs(y - current.startY) > DRAG_THRESHOLD_PX;
    const toTrack = moved ? (trackAt(y) ?? current.toTrack) : current.fromTrack;
    const fromLane = laneRefs.current.get(current.fromTrack);
    const toLane = laneRefs.current.get(toTrack);
    const dy = fromLane && toLane
      ? toLane.getBoundingClientRect().top - fromLane.getBoundingClientRect().top
      : 0;
    const next: ClipDrag = {
      ...current,
      moved,
      toTrack,
      dx: moved ? x - current.startX + (scroller.scrollLeft - current.startScroll) : 0,
      dy,
    };
    dragRef.current = next;
    setDrag(next);
  }, [trackAt]);

  // While a clip is in hand, a finger near the scroller's edge scrolls the
  // view toward it, faster the nearer it is, and the clip goes with it.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const tick = () => {
      const scroller = scrollRef.current;
      const current = dragRef.current;
      if (scroller && current?.moved) {
        const rect = scroller.getBoundingClientRect();
        const { x, y } = pointerRef.current;
        const speed = (into: number) => Math.ceil(AUTOSCROLL_MAX_PX * (1 - Math.max(0, into) / AUTOSCROLL_EDGE_PX));
        let sx = 0;
        let sy = 0;
        if (x < rect.left + AUTOSCROLL_EDGE_PX) sx = -speed(x - rect.left);
        else if (x > rect.right - AUTOSCROLL_EDGE_PX) sx = speed(rect.right - x);
        if (y < rect.top + AUTOSCROLL_EDGE_PX) sy = -speed(y - rect.top);
        else if (y > rect.bottom - AUTOSCROLL_EDGE_PX) sy = speed(rect.bottom - y);
        if (sx || sy) {
          scroller.scrollLeft += sx;
          scroller.scrollTop += sy;
          updateDrag();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging, updateDrag]);

  const beginClipDrag = (e: React.PointerEvent<HTMLDivElement>, clipId: number, trackIndex: number) => {
    if (e.button !== 0 || recording) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerRef.current = { x: e.clientX, y: e.clientY };
    const next: ClipDrag = {
      clipId,
      fromTrack: trackIndex,
      toTrack: trackIndex,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: scrollRef.current?.scrollLeft ?? 0,
      dx: 0,
      dy: 0,
      moved: false,
    };
    dragRef.current = next;
    setDrag(next);
  };
  const moveClipDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    updateDrag();
  };
  const endClipDrag = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const current = dragRef.current;
    if (current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    if (!current.moved) return;
    // The click that ends a drag must not toggle the clip's selection
    suppressClickRef.current = true;
    if (!commit) return;
    const clip = state.tracks[current.fromTrack]?.clips.find((c) => c.id === current.clipId);
    if (!clip) return;
    const newStartTime = Math.max(0, clip.start + current.dx / PIXELS_PER_SECOND);
    if (newStartTime === clip.start && current.toTrack === current.fromTrack) return;
    dispatch({
      type: 'MOVE_CLIP',
      payload: { clipId: clip.id, fromTrackIndex: current.fromTrack, toTrackIndex: current.toTrack, newStartTime },
    });
  };

  /** Where a clip draws while it is in hand: its own travel, never before 0 */
  const dragOffsetOf = (clip: Track['clips'][number]) => {
    if (!drag || drag.clipId !== clip.id || !drag.moved) return null;
    return { x: Math.max(drag.dx, -clip.start * PIXELS_PER_SECOND), y: drag.dy };
  };

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

      <div className="mobile-editor__scroll" ref={scrollRef}>
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
                  ref={(el) => { if (el) laneRefs.current.set(index, el); else laneRefs.current.delete(index); }}
                  className="mobile-editor__lane"
                  data-selected={trackSelected ? '' : undefined}
                  data-drop={drag?.moved && drag.toTrack === index && drag.toTrack !== drag.fromTrack ? '' : undefined}
                  style={{ height: LANE_HEIGHT }}
                  onClick={onLaneTap}
                >
                  {track.clips.map((clip) => {
                    const offset = dragOffsetOf(clip);
                    return (
                    <div
                      key={clip.id}
                      data-mobile-clip
                      data-dragging={offset ? '' : undefined}
                      className="mobile-editor__clip"
                      style={{
                        left: clip.start * PIXELS_PER_SECOND,
                        top: CLIP_INSET,
                        transform: offset ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
                      }}
                      onClick={() => {
                        if (suppressClickRef.current) { suppressClickRef.current = false; return; }
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
                      {clip.selected && (
                        <div
                          className="mobile-editor__grab"
                          data-mobile-grab
                          aria-hidden="true"
                          onPointerDown={(e) => beginClipDrag(e, clip.id, index)}
                          onPointerMove={moveClipDrag}
                          onPointerUp={(e) => endClipDrag(e, true)}
                          onPointerCancel={(e) => endClipDrag(e, false)}
                        />
                      )}
                    </div>
                    );
                  })}
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
              {(() => {
                const start = selected.clip.start + (dragOffsetOf(selected.clip)?.x ?? 0) / PIXELS_PER_SECOND;
                return `${formatClock(start)} – ${formatClock(start + selected.clip.duration)}`;
              })()}
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
