import React from 'react';
import { ClipContextMenu, FadeMenuItems, TrackContextMenu, TimelineRulerContextMenu, ContextMenu, ContextMenuItem, Dialog, DialogFooter, Button } from '@audacity-ui/components';
import type { SpectrogramScale } from '@audacity-ui/components';
import { EFFECT_REGISTRY } from '@audacity-ui/core';
import type { Effect } from '@audacity-ui/components';
import { useDialogs } from '../contexts/DialogContext';
import { useContextMenus } from '../contexts/ContextMenuContext';
import { useClipProperties } from '../contexts/ClipPropertiesContext';
import { useLoopRegionContext } from '../contexts/LoopRegionContext';
import { confirmTrackDelete } from '../utils/confirmTrackDelete';
import { useTracks } from '../contexts/TracksContext';
import type { Track, Clip } from '../contexts/TracksContext';
import type { ClipboardState } from '../hooks/useKeyboardShortcuts';
import { FadeDurationDialog } from './FadeDurationDialog';
import { fadeTargets } from '../utils/fadeTargets';
import { FADE_SHAPE_PRESETS, fadeShapePresetOf, CROSSFADE_SHAPE_PRESETS, crossfadeShapePresetOf } from '../utils/fadeShapePresets';

export interface AppContextMenusProps {
  // Spectrogram
  spectrogramScale: SpectrogramScale;
  setSpectrogramScale: React.Dispatch<React.SetStateAction<SpectrogramScale>>;

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
  timeSelection: { startTime: number; endTime: number } | null;
  bpm: number;
  beatsPerMeasure: number;

  // Clipboard
  onClipboardSet: (clipboard: ClipboardState | null) => void;

  // OS preference
  os: 'windows' | 'macos';

  // Where the track-menu button that opened the track context menu
  // lives — used to send focus back when the menu closes.
  trackMenuTriggerRef?: React.MutableRefObject<HTMLElement | null>;
}

export function AppContextMenus({
  spectrogramScale, setSpectrogramScale,
  timelineFormat, setTimelineFormat,
  updateDisplayWhilePlaying, setUpdateDisplayWhilePlaying,
  pinnedPlayHead, setPinnedPlayHead,
  clickRulerToStartPlayback, setClickRulerToStartPlayback,
  showVerticalRulers, setShowVerticalRulers,
  timeSelection, bpm, beatsPerMeasure,
  onClipboardSet,
  os,
  trackMenuTriggerRef,
}: AppContextMenusProps) {
  const { state, dispatch } = useTracks();
  const { tracks, masterEffects } = state;

  // "Fade in…" / "Fade out…" from the clip menu: the clicked clip, or —
  // when it is part of the clip selection — every selected audio clip
  // (the same rule a row's Create group follows).
  const [fadeDialog, setFadeDialog] = React.useState<{
    side: 'in' | 'out';
    targets: Array<{ trackIndex: number; clipId: number; duration: number }>;
    initialSeconds: number | undefined;
  } | null>(null);
  const openFadeDialogFor = (trackIndex: number, clipId: number, side: 'in' | 'out') => {
    const track = tracks[trackIndex];
    const clicked = track?.clips.find((c: Clip) => c.id === clipId);
    if (!clicked) return;
    const selected: Array<{ trackIndex: number; clipId: number; duration: number }> = [];
    tracks.forEach((t: Track, ti: number) => t.clips.forEach((c: Clip) => { if (c.selected) selected.push({ trackIndex: ti, clipId: c.id, duration: c.duration }); }));
    const targets = clicked.selected && selected.length > 0
      ? selected
      : [{ trackIndex, clipId: clicked.id, duration: clicked.duration }];
    setFadeDialog({ side, targets, initialSeconds: side === 'in' ? clicked.fadeIn : clicked.fadeOut });
  };
  // The fade menu's two edits, shared by the clip menu's Fade ▸ submenus
  // and the handle's right-click menu (one list, FadeMenuItems): every
  // target by the fade rule (fadeTargets)
  const setFadeShape = (trackIndex: number, clipId: number, side: 'in' | 'out', presetId: string) => {
    const preset = FADE_SHAPE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    for (const t of fadeTargets(tracks, trackIndex, clipId)) {
      dispatch({ type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side, shape: preset.shape } });
    }
  };
  const removeFade = (trackIndex: number, clipId: number, side: 'in' | 'out') => {
    for (const t of fadeTargets(tracks, trackIndex, clipId)) {
      dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side, seconds: 0 } });
    }
  };
  const openFadeDialog = (side: 'in' | 'out') => {
    if (!clipContextMenu) return;
    openFadeDialogFor(clipContextMenu.trackIndex, clipContextMenu.clipId, side);
    setClipContextMenu(null);
  };
  const { isSpectrogramSettingsOpen, setIsSpectrogramSettingsOpen } = useDialogs();
  const {
    clipContextMenu, setClipContextMenu,
    fadeContextMenu, setFadeContextMenu,
    crossfadeContextMenu, setCrossfadeContextMenu,
    trackContextMenu, setTrackContextMenu,
    timelineRulerContextMenu, setTimelineRulerContextMenu,
    effectSelectorMenu, setEffectSelectorMenu,
    setEffectDialog,
  } = useContextMenus();
  const { openClipProperties } = useClipProperties();
  const {
    loopRegionEnabled, setLoopRegionEnabled,
    loopRegionStart, setLoopRegionStart,
    loopRegionEnd, setLoopRegionEnd,
  } = useLoopRegionContext();

  // Returns focus to the menu's originating button after it closes.
  // Used by every track-context-menu action that calls
  // `setTrackContextMenu(null)`. If the original trigger no longer
  // exists (Delete removed the whole track), falls back to the
  // nearest remaining track's menu button so the user lands somewhere
  // in the same neighbourhood — finally the Add-new button if every
  // track is gone.
  const restoreTrackMenuFocus = React.useCallback(
    (deletedTrackIndex?: number) => {
      const trigger = trackMenuTriggerRef?.current ?? null;
      // TrackContextMenu fires both an action handler and onClose
      // back-to-back (see swatch onClick and ContextMenuItem). The
      // first restore wins; the second sees a null trigger and no
      // deletedTrackIndex hint, so we bail to avoid moving focus a
      // second time (which would otherwise land on the side-panel
      // "Add new" fallback).
      if (!trigger && deletedTrackIndex === undefined) return;
      if (trackMenuTriggerRef) trackMenuTriggerRef.current = null;
      setTimeout(() => {
        if (trigger && document.contains(trigger)) {
          trigger.focus();
          return;
        }
        // Trigger is gone (deleted track). Pick the nearest remaining
        // track's menu button.
        const panels = document.querySelectorAll<HTMLElement>('.track-control-panel');
        if (panels.length > 0 && deletedTrackIndex !== undefined) {
          const targetIdx = Math.max(0, Math.min(panels.length - 1, deletedTrackIndex));
          const candidate = panels[targetIdx].querySelector<HTMLElement>(
            '[aria-label="Track menu"]',
          );
          if (candidate) {
            candidate.focus();
            return;
          }
        }
        // Last resort: the side panel's Add-new button.
        const addBtn = document.querySelector<HTMLElement>(
          '.track-control-side-panel__header button',
        );
        addBtn?.focus();
      }, 0);
    },
    [trackMenuTriggerRef],
  );

  return (
    <>
      {/* Clip Context Menu */}
      {clipContextMenu && (() => {
        const targetTrack = tracks[clipContextMenu.trackIndex];
        const targetClip = targetTrack?.clips.find((c: Clip) => c.id === clipContextMenu.clipId);
        const targetGroupId = targetClip?.groupId;
        const selectedClipsCount = tracks.reduce(
          (sum: number, t: Track) => sum + t.clips.filter((c: Clip) => c.selected).length,
          0
        );
        const canGroup = selectedClipsCount >= 2;
        const canUngroup = !!targetGroupId;

        return (
          <ClipContextMenu
            isOpen={clipContextMenu.isOpen}
            x={clipContextMenu.x}
            y={clipContextMenu.y}
            autoFocus={clipContextMenu.openedViaKeyboard}
            onClose={() => setClipContextMenu(null)}
            onOpenProperties={() => {
              // The panel follows the selection, so opening it on a clip
              // selects that clip — the two never disagree
              if (!targetClip?.selected) {
                dispatch({ type: 'SELECT_CLIP', payload: { trackIndex: clipContextMenu.trackIndex, clipId: clipContextMenu.clipId } });
              }
              openClipProperties({ trackIndex: clipContextMenu.trackIndex, clipId: clipContextMenu.clipId });
              setClipContextMenu(null);
            }}
            onRename={() => {
              setClipContextMenu(null);
            }}
            onColorChange={(color) => {
              // The clip's OWN colour (2026-10-02): the clicked clip, or
              // every selected clip when the clicked one is selected —
              // the fade menu's rule. 'track' takes the override away.
              const ownColor = color === 'track' ? undefined : (color as Clip['ownColor']);
              for (const t of fadeTargets(tracks, clipContextMenu.trackIndex, clipContextMenu.clipId)) {
                dispatch({ type: 'UPDATE_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clipId, updates: { ownColor } } });
              }
              setClipContextMenu(null);
            }}
            onCut={() => {
              if (clipContextMenu) {
                const track = tracks[clipContextMenu.trackIndex];
                const clip = track?.clips.find((c: Clip) => c.id === clipContextMenu.clipId)
                  // justified: midiClips uses @audacity-ui/core MidiClip which shares id:number
                  || (track?.midiClips || []).find((c) => c.id === clipContextMenu.clipId);

                if (clip) {
                  onClipboardSet({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'cut', wholeGroupIds: [] });

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
                const clip = track?.clips.find((c: Clip) => c.id === clipContextMenu.clipId)
                  // justified: midiClips uses @audacity-ui/core MidiClip which shares id:number
                  || (track?.midiClips || []).find((c) => c.id === clipContextMenu.clipId);

                if (clip) {
                  onClipboardSet({ clips: [{ ...clip, trackIndex: clipContextMenu.trackIndex }], operation: 'copy', wholeGroupIds: [] });
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
            onFadeIn={() => openFadeDialog('in')}
            onFadeOut={() => openFadeDialog('out')}
            fadePresets={FADE_SHAPE_PRESETS}
            fadeInState={targetClip ? { presetId: fadeShapePresetOf(targetClip.fadeInShape), hasFade: (targetClip.fadeIn ?? 0) > 0 } : undefined}
            fadeOutState={targetClip ? { presetId: fadeShapePresetOf(targetClip.fadeOutShape), hasFade: (targetClip.fadeOut ?? 0) > 0 } : undefined}
            onFadeShape={(side, presetId) => { setFadeShape(clipContextMenu.trackIndex, clipContextMenu.clipId, side, presetId); setClipContextMenu(null); }}
            onRemoveFade={(side) => { removeFade(clipContextMenu.trackIndex, clipContextMenu.clipId, side); setClipContextMenu(null); }}
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
            canGroup={canGroup}
            canUngroup={canUngroup}
            onGroup={() => {
              if (canGroup) {
                dispatch({ type: 'GROUP_SELECTED_CLIPS' });
              }
              setClipContextMenu(null);
            }}
            onUngroup={() => {
              if (targetGroupId) {
                dispatch({ type: 'UNGROUP_CLIPS', payload: { groupId: targetGroupId } });
              }
              setClipContextMenu(null);
            }}
          />
        );
      })()}

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
          onClose={() => {
            setTrackContextMenu(null);
            restoreTrackMenuFocus();
          }}
          onDelete={() => {
            if (trackContextMenu) {
              const deletedIdx = trackContextMenu.trackIndex;
              const t = tracks[deletedIdx];
              const hasContent = t
                && ((t.clips?.length ?? 0) > 0 || (t.midiClips?.length ?? 0) > 0);
              // Close the context menu first so it doesn't sit behind
              // the confirmation dialog.
              setTrackContextMenu(null);
              confirmTrackDelete(
                1,
                () => {
                  dispatch({
                    type: 'DELETE_TRACK',
                    payload: deletedIdx,
                  });
                  // The trigger button vanishes with the track — fall
                  // back to the nearest remaining track's menu button.
                  restoreTrackMenuFocus(deletedIdx);
                },
                { skipDialog: !hasContent },
              );
            }
          }}
          onColorChange={(color) => {
            if (trackContextMenu) {
              // Keep the track's own colour in sync — otherwise a
              // subsequent paste onto this track reads the stale
              // palette default from state.tracks[i].color and stamps
              // the pasted clip with the wrong hue.
              dispatch({
                type: 'UPDATE_TRACK',
                payload: {
                  index: trackContextMenu.trackIndex,
                  track: { color },
                },
              });
              const track = tracks[trackContextMenu.trackIndex];
              track?.clips.forEach((clip: Clip) => {
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
              restoreTrackMenuFocus();
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
          let newEffectId: string;
          let effectIndex: number;

          if (isMaster) {
            newEffectId = `m${masterEffects.length + 1}`;
            effectIndex = masterEffects.length;
            const newEffect: Effect = {
              id: newEffectId,
              name: effectName,
              enabled: true,
            };
            dispatch({ type: 'ADD_MASTER_EFFECT', payload: newEffect });
          } else {
            const trackIndex = effectSelectorMenu.trackIndex!;
            const currentEffects = tracks[trackIndex]?.effects || [];
            newEffectId = `t${trackIndex}-${currentEffects.length + 1}`;
            effectIndex = currentEffects.length;
            const newEffect: Effect = {
              id: newEffectId,
              name: effectName,
              enabled: true,
            };
            dispatch({ type: 'ADD_TRACK_EFFECT', payload: { trackIndex, effect: newEffect } });
          }

          // Open the effect dialog for the newly added effect
          setEffectDialog({
            isOpen: true,
            effectId: newEffectId,
            effectName,
            trackIndex: effectSelectorMenu.trackIndex,
            effectIndex,
          });

          setEffectSelectorMenu(null);
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
      {/* A crossfade's own menu, from a right-click on its intersection
          node (2026-10-01): its shape presets, applied to both curves
          at once so the crossing stays in the middle; the current one
          checked, a depth-dragged crossing checks none. The crossfade is
          its two clips' — no selection rule applies. */}
      {crossfadeContextMenu && (() => {
        const { trackIndex, outgoingClipId, incomingClipId, x, y } = crossfadeContextMenu;
        const track = tracks[trackIndex];
        const outgoing = track?.clips.find((c: Clip) => c.id === outgoingClipId);
        const incoming = track?.clips.find((c: Clip) => c.id === incomingClipId);
        if (!outgoing || !incoming) return null;
        const current = crossfadeShapePresetOf(outgoing.crossfadeOutShape, incoming.crossfadeInShape);
        const close = () => setCrossfadeContextMenu(null);
        return (
          <ContextMenu isOpen={crossfadeContextMenu.isOpen} x={x} y={y} onClose={close}>
            {CROSSFADE_SHAPE_PRESETS.map((preset) => (
              <ContextMenuItem
                key={preset.id}
                label={preset.label}
                checked={current === preset.id}
                onClick={() => {
                  dispatch({ type: 'SET_CROSSFADE_SHAPE', payload: { trackIndex, outgoingClipId, incomingClipId, outShape: preset.shape, inShape: preset.shape } });
                  close();
                }}
              />
            ))}
          </ContextMenu>
        );
      })()}
      {/* A quick fade's own menu, from a right-click on its length or
          shape handle (2026-10-01): the shape presets (the fade's current
          one checked; a handle dragged between them checks none), its
          length by the number, and removal. Every action follows the
          fade-edit rule — a selected clip's fade is every selected
          clip's (utils/fadeTargets.ts). */}
      {fadeContextMenu && (() => {
        const { trackIndex, clipId, side, x, y } = fadeContextMenu;
        const clip = tracks[trackIndex]?.clips.find((c: Clip) => c.id === clipId);
        if (!clip) return null;
        const close = () => setFadeContextMenu(null);
        // The same list as the clip menu's Fade ▸ Fade in/out ▸ — this is
        // the shortcut to it
        return (
          <ContextMenu isOpen={fadeContextMenu.isOpen} x={x} y={y} onClose={close}>
            <FadeMenuItems
              side={side}
              presets={FADE_SHAPE_PRESETS}
              state={{
                presetId: fadeShapePresetOf(side === 'in' ? clip.fadeInShape : clip.fadeOutShape),
                hasFade: (side === 'in' ? clip.fadeIn ?? 0 : clip.fadeOut ?? 0) > 0,
              }}
              onShape={(s, presetId) => setFadeShape(trackIndex, clipId, s, presetId)}
              onLength={(s) => openFadeDialogFor(trackIndex, clipId, s)}
              onRemove={(s) => removeFade(trackIndex, clipId, s)}
              onClose={close}
            />
          </ContextMenu>
        );
      })()}
      {/* Fade in… / Fade out… duration entry — lives OUTSIDE the clip menu's
          conditional: opening it closes the menu. */}
      <FadeDurationDialog
        isOpen={fadeDialog !== null}
        side={fadeDialog?.side ?? 'in'}
        targetCount={fadeDialog?.targets.length ?? 0}
        initialSeconds={fadeDialog?.initialSeconds}
        maxSeconds={fadeDialog ? Math.min(...fadeDialog.targets.map((t) => t.duration)) : 0}
        os={os}
        onClose={() => setFadeDialog(null)}
        onApply={(seconds) => {
        if (!fadeDialog) return;
        for (const t of fadeDialog.targets) {
        dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side: fadeDialog.side, seconds: Math.min(seconds, t.duration) } });
        }
        }}
      />
    </>
  );
}
