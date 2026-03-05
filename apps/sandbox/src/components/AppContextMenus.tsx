import React from 'react';
import { ClipContextMenu, TrackContextMenu, TimelineRulerContextMenu, ContextMenu, ContextMenuItem, Dialog, DialogFooter, Button } from '@audacity-ui/components';
import type { SpectrogramScale } from '@audacity-ui/components';
import { EFFECT_REGISTRY } from '@audacity-ui/core';
import type { Effect } from '@audacity-ui/components';
import type { ClipContextMenuState, TrackContextMenuState, TimelineRulerContextMenuState, EffectSelectorMenuState } from '../hooks/useContextMenuState';

export interface AppContextMenusProps {
  // Context menu states
  clipContextMenu: ClipContextMenuState | null;
  setClipContextMenu: React.Dispatch<React.SetStateAction<ClipContextMenuState | null>>;
  trackContextMenu: TrackContextMenuState | null;
  setTrackContextMenu: React.Dispatch<React.SetStateAction<TrackContextMenuState | null>>;
  timelineRulerContextMenu: TimelineRulerContextMenuState | null;
  setTimelineRulerContextMenu: React.Dispatch<React.SetStateAction<TimelineRulerContextMenuState | null>>;
  effectSelectorMenu: EffectSelectorMenuState | null;
  setEffectSelectorMenu: React.Dispatch<React.SetStateAction<EffectSelectorMenuState | null>>;

  // Spectrogram settings
  isSpectrogramSettingsOpen: boolean;
  setIsSpectrogramSettingsOpen: (open: boolean) => void;
  spectrogramScale: SpectrogramScale;
  setSpectrogramScale: React.Dispatch<React.SetStateAction<SpectrogramScale>>;

  // Track/clip data
  tracks: any[];
  masterEffects: Effect[];
  dispatch: React.Dispatch<any>;

  // Timeline ruler options
  timelineFormat: 'minutes-seconds' | 'beats-measures';
  setTimelineFormat: React.Dispatch<React.SetStateAction<'minutes-seconds' | 'beats-measures'>>;
  updateDisplayWhilePlaying: boolean;
  setUpdateDisplayWhilePlaying: React.Dispatch<React.SetStateAction<boolean>>;
  pinnedPlayHead: boolean;
  setPinnedPlayHead: React.Dispatch<React.SetStateAction<boolean>>;
  clickRulerToStartPlayback: boolean;
  setClickRulerToStartPlayback: React.Dispatch<React.SetStateAction<boolean>>;
  showVerticalRulers: boolean;
  setShowVerticalRulers: React.Dispatch<React.SetStateAction<boolean>>;

  // Loop region
  loopRegionEnabled: boolean;
  setLoopRegionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  loopRegionStart: number | null;
  setLoopRegionStart: React.Dispatch<React.SetStateAction<number | null>>;
  loopRegionEnd: number | null;
  setLoopRegionEnd: React.Dispatch<React.SetStateAction<number | null>>;
  timeSelection: { startTime: number; endTime: number } | null;
  bpm: number;
  beatsPerMeasure: number;

  // Clipboard
  onClipboardSet: (clipboard: { clips: any[]; operation: 'copy' | 'cut'; timeSelection?: { startTime: number; endTime: number } } | null) => void;

  // OS preference
  os: 'windows' | 'macos';
}

export function AppContextMenus({
  clipContextMenu, setClipContextMenu,
  trackContextMenu, setTrackContextMenu,
  timelineRulerContextMenu, setTimelineRulerContextMenu,
  effectSelectorMenu, setEffectSelectorMenu,
  isSpectrogramSettingsOpen, setIsSpectrogramSettingsOpen,
  spectrogramScale, setSpectrogramScale,
  tracks, masterEffects, dispatch,
  timelineFormat, setTimelineFormat,
  updateDisplayWhilePlaying, setUpdateDisplayWhilePlaying,
  pinnedPlayHead, setPinnedPlayHead,
  clickRulerToStartPlayback, setClickRulerToStartPlayback,
  showVerticalRulers, setShowVerticalRulers,
  loopRegionEnabled, setLoopRegionEnabled,
  loopRegionStart, setLoopRegionStart,
  loopRegionEnd, setLoopRegionEnd,
  timeSelection, bpm, beatsPerMeasure,
  onClipboardSet,
  os,
}: AppContextMenusProps) {
  return (
    <>
      {/* Clip Context Menu */}
      {clipContextMenu && (
        <ClipContextMenu
          isOpen={clipContextMenu.isOpen}
          x={clipContextMenu.x}
          y={clipContextMenu.y}
          autoFocus={clipContextMenu.openedViaKeyboard}
          onClose={() => setClipContextMenu(null)}
          onRename={() => {
            setClipContextMenu(null);
          }}
          onColorChange={(_color) => {
            setClipContextMenu(null);
          }}
          onCut={() => {
            if (clipContextMenu) {
              const track = tracks[clipContextMenu.trackIndex];
              const clip = track?.clips.find((c: any) => c.id === clipContextMenu.clipId)
                || (track?.midiClips || []).find((c: any) => c.id === clipContextMenu.clipId);

              if (clip) {
                onClipboardSet({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'cut' });

                dispatch({
                  type: 'DELETE_CLIP',
                  payload: {
                    trackIndex: clipContextMenu.trackIndex,
                    clipId: clipContextMenu.clipId,
                  },
                });

              }
              setClipContextMenu(null);
            }
          }}
          onCopy={() => {
            if (clipContextMenu) {
              const track = tracks[clipContextMenu.trackIndex];
              const clip = track?.clips.find((c: any) => c.id === clipContextMenu.clipId)
                || (track?.midiClips || []).find((c: any) => c.id === clipContextMenu.clipId);

              if (clip) {
                onClipboardSet({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'copy' });
              }
              setClipContextMenu(null);
            }
          }}
          onDuplicate={() => {
            setClipContextMenu(null);
          }}
          onDelete={() => {
            if (clipContextMenu) {
              dispatch({
                type: 'DELETE_CLIP',
                payload: {
                  trackIndex: clipContextMenu.trackIndex,
                  clipId: clipContextMenu.clipId,
                },
              });
              setClipContextMenu(null);
            }
          }}
          onSplit={() => {
            setClipContextMenu(null);
          }}
          onExport={() => {
            setClipContextMenu(null);
          }}
          stretchWithTempo={false}
          onToggleStretchWithTempo={() => {
          }}
          onOpenPitchSpeedDialog={() => {
            setClipContextMenu(null);
          }}
          onRenderPitchSpeed={() => {
            setClipContextMenu(null);
          }}
        />
      )}

      {/* Spectrogram Settings Dialog */}
      <Dialog
        isOpen={isSpectrogramSettingsOpen}
        onClose={() => setIsSpectrogramSettingsOpen(false)}
        title="Spectrogram Settings"
        width={360}
        minHeight={0}
        os={os}
        footer={
          <DialogFooter
            rightContent={
              <Button variant="primary" size="default" onClick={() => setIsSpectrogramSettingsOpen(false)}>
                Close
              </Button>
            }
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {([
            { value: 'linear', label: 'Linear', description: 'Evenly spaced frequency bands' },
            { value: 'logarithmic', label: 'Logarithmic', description: 'Log scale, similar to musical intervals' },
            { value: 'mel', label: 'Mel', description: 'Perceptual scale based on human pitch perception' },
            { value: 'bark', label: 'Bark', description: 'Psychoacoustic scale (critical bands)' },
            { value: 'erb', label: 'ERB', description: 'Equivalent Rectangular Bandwidth scale' },
            { value: 'period', label: 'Period', description: 'Displays period (1/f) rather than frequency' },
          ] as { value: SpectrogramScale; label: string; description: string }[]).map(({ value, label, description }) => (
            <label key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="radio"
                value={value}
                checked={spectrogramScale === value}
                onChange={() => setSpectrogramScale(value)}
                style={{ cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, lineHeight: '18px' }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', lineHeight: '15px', opacity: 0.6 }}>
                  {description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </Dialog>

      {/* Track Context Menu */}
      {trackContextMenu && (
        <TrackContextMenu
          isOpen={trackContextMenu.isOpen}
          x={trackContextMenu.x}
          y={trackContextMenu.y}
          autoFocus={trackContextMenu.openedViaKeyboard}
          onClose={() => setTrackContextMenu(null)}
          onDelete={() => {
            if (trackContextMenu) {
              dispatch({
                type: 'DELETE_TRACK',
                payload: trackContextMenu.trackIndex,
              });
              setTrackContextMenu(null);
            }
          }}
          onColorChange={(color) => {
            if (trackContextMenu) {
              const track = tracks[trackContextMenu.trackIndex];
              track?.clips.forEach((clip: any) => {
                dispatch({
                  type: 'UPDATE_CLIP',
                  payload: {
                    trackIndex: trackContextMenu.trackIndex,
                    clipId: clip.id,
                    updates: { color },
                  },
                });
              });
              setTrackContextMenu(null);
            }
          }}
          onSpectrogramSettings={() => {
            setIsSpectrogramSettingsOpen(true);
          }}
        />
      )}

      {/* Timeline Ruler Context Menu */}
      {timelineRulerContextMenu && (
        <TimelineRulerContextMenu
          isOpen={timelineRulerContextMenu.isOpen}
          x={timelineRulerContextMenu.x}
          y={timelineRulerContextMenu.y}
          onClose={() => setTimelineRulerContextMenu(null)}
          timeFormat={timelineFormat}
          onTimeFormatChange={(format) => {
            setTimelineFormat(format);
            setTimelineRulerContextMenu(null);
          }}
          updateDisplayWhilePlaying={updateDisplayWhilePlaying}
          onToggleUpdateDisplay={() => {
            setUpdateDisplayWhilePlaying(!updateDisplayWhilePlaying);
            setTimelineRulerContextMenu(null);
          }}
          pinnedPlayHead={pinnedPlayHead}
          onTogglePinnedPlayHead={() => {
            setPinnedPlayHead(!pinnedPlayHead);
            setTimelineRulerContextMenu(null);
          }}
          clickRulerToStartPlayback={clickRulerToStartPlayback}
          onToggleClickRulerToStartPlayback={() => {
            setClickRulerToStartPlayback(!clickRulerToStartPlayback);
            setTimelineRulerContextMenu(null);
          }}
          loopRegionEnabled={loopRegionEnabled}
          onToggleLoopRegion={() => {
            if (!loopRegionEnabled) {
              if (loopRegionStart === null || loopRegionEnd === null) {
                if (timeSelection) {
                  setLoopRegionStart(timeSelection.startTime);
                  setLoopRegionEnd(timeSelection.endTime);
                } else {
                  const secondsPerBeat = 60 / bpm;
                  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
                  const loopDuration = secondsPerMeasure * 4;
                  setLoopRegionStart(0);
                  setLoopRegionEnd(loopDuration);
                }
              }
            }
            setLoopRegionEnabled(!loopRegionEnabled);
            setTimelineRulerContextMenu(null);
          }}
          onClearLoopRegion={() => {
            setLoopRegionStart(null);
            setLoopRegionEnd(null);
            setLoopRegionEnabled(false);
            setTimelineRulerContextMenu(null);
          }}
          onSetLoopRegionToSelection={() => {
            if (timeSelection) {
              setLoopRegionStart(timeSelection.startTime);
              setLoopRegionEnd(timeSelection.endTime);
              setLoopRegionEnabled(true);
            } else {
            }
            setTimelineRulerContextMenu(null);
          }}
          onSetSelectionToLoop={() => {
            if (loopRegionStart !== null && loopRegionEnd !== null) {
              dispatch({
                type: 'SET_TIME_SELECTION',
                payload: { startTime: loopRegionStart, endTime: loopRegionEnd },
              });
            } else {
            }
            setTimelineRulerContextMenu(null);
          }}
          creatingLoopSelectsAudio={false}
          onToggleCreatingLoopSelectsAudio={() => {
            setTimelineRulerContextMenu(null);
          }}
          showVerticalRulers={showVerticalRulers}
          onToggleVerticalRulers={() => {
            setShowVerticalRulers(!showVerticalRulers);
            setTimelineRulerContextMenu(null);
          }}
        />
      )}

      {/* Effect Selector Menu */}
      {effectSelectorMenu && (() => {
        const closeAndRestoreFocus = () => {
          const trigger = effectSelectorMenu.triggerElement;
          setEffectSelectorMenu(null);
          if (trigger) {
            setTimeout(() => trigger.focus(), 0);
          }
        };

        const addEffect = (effectName: string) => {
          const isMaster = effectSelectorMenu.trackIndex === undefined;

          if (isMaster) {
            const newEffect: Effect = {
              id: `m${masterEffects.length + 1}`,
              name: effectName,
              enabled: true,
            };
            dispatch({ type: 'ADD_MASTER_EFFECT', payload: newEffect });
          } else {
            const trackIndex = effectSelectorMenu.trackIndex!;
            const currentEffects = tracks[trackIndex]?.effects || [];
            const newEffect: Effect = {
              id: `t${trackIndex}-${currentEffects.length + 1}`,
              name: effectName,
              enabled: true,
            };
            dispatch({ type: 'ADD_TRACK_EFFECT', payload: { trackIndex, effect: newEffect } });
          }

          closeAndRestoreFocus();
        };

        return (
          <ContextMenu
            isOpen={effectSelectorMenu.isOpen}
            x={effectSelectorMenu.x}
            y={effectSelectorMenu.y}
            onClose={closeAndRestoreFocus}
          >
            {Object.entries(EFFECT_REGISTRY).map(([categoryName, effectDefs]) => (
              <ContextMenuItem
                key={categoryName}
                label={categoryName}
              >
                {effectDefs.map((effectDef) => (
                  <ContextMenuItem
                    key={effectDef.id}
                    label={effectDef.name}
                    onClick={() => addEffect(effectDef.name)}
                  />
                ))}
              </ContextMenuItem>
            ))}
          </ContextMenu>
        );
      })()}
    </>
  );
}
