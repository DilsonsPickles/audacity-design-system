import React from 'react';
import { ClipContextMenu, type GapMode, FadeMenuItems, TrackContextMenu, TimelineRulerContextMenu, ContextMenu, ContextMenuItem, Dialog, DialogFooter, Button } from '@audacity-ui/components';
import type { SpectrogramScale } from '@audacity-ui/components';
import { EFFECT_REGISTRY } from '@audacity-ui/core';
import type { Effect } from '@audacity-ui/components';
import { useDialogs } from '../contexts/DialogContext';
import { useContextMenus } from '../contexts/ContextMenuContext';
import { useLoopRegionContext } from '../contexts/LoopRegionContext';
import { confirmTrackDelete } from '../utils/confirmTrackDelete';
import { useTracks } from '../contexts/TracksContext';
import type { Clip } from '../contexts/TracksContext';
import type { ClipboardState } from '../hooks/useKeyboardShortcuts';
import { FadeDialog, FADE_MIXED, type FadeDialogEdits, type FadeDialogValues } from './FadeDialog';
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

  // "Fade-in length…" / "Fade-out length…" from the clip menu and the
  // handle menu, and ⌥F (useFadeDialogHotkey): the FADES dialog on the
  // clicked clip — or, when it is part of the clip selection, every
  // selected audio clip (fadeTargets, the fade rule). The state is the
  // context-menu state's (which clip, which side's field takes focus);
  // the targets and their values are read from the live tracks here.
  const openFadeDialogFor = (trackIndex: number, clipId: number, side: 'in' | 'out') => {
    setFadeDialog({ trackIndex, clipId, focusSide: side });
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
    fadeDialog, setFadeDialog,
    trackContextMenu, setTrackContextMenu,
    timelineRulerContextMenu, setTimelineRulerContextMenu,
    effectSelectorMenu, setEffectSelectorMenu,
    setEffectDialog,
  } = useContextMenus();
  // The Fades dialog's undo gesture and snapshot (2026-10-14, live
  // preview): begun when the dialog opens — with the edit rule's
  // deselect, since the edit begins here — and the targets' fades noted
  // so a field typed back to its opening value restores that side
  const fadeDialogApplied = React.useRef(false);
  const fadeDialogSnapshotRef = React.useRef<Array<{ trackIndex: number; clipId: number; fadeIn: number; fadeOut: number }> | null>(null);
  React.useEffect(() => {
    if (!fadeDialog) return;
    const dialogTargets = fadeTargets(tracks, fadeDialog.trackIndex, fadeDialog.clipId);
    const own = tracks[fadeDialog.trackIndex]?.clips.find((c: Clip) => c.id === fadeDialog.clipId);
    if (own && !own.selected && tracks.some((t) => t.clips.some((c: Clip) => c.selected))) {
      dispatch({ type: 'DESELECT_ALL_CLIPS' });
    }
    fadeDialogSnapshotRef.current = dialogTargets.map((t) => {
      const c = tracks[t.trackIndex]?.clips.find((x: Clip) => x.id === t.clipId);
      return { trackIndex: t.trackIndex, clipId: t.clipId, fadeIn: c?.fadeIn ?? 0, fadeOut: c?.fadeOut ?? 0 };
    });
    fadeDialogApplied.current = false;
    dispatch({ type: 'BEGIN_UNDO_GESTURE' });
    // Read at OPEN only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fadeDialog]);
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
        // Pitch & speed off their defaults — Reset and Render light up
        // (the real build's updatePitchSpeedModifiedEnabledState)
        const stretchOf = (clip: Clip) => (clip as { stretchFactor?: number }).stretchFactor ?? 1;
        const pitchSpeedModified = !!targetClip && ((targetClip.pitchSemitones ?? 0) !== 0 || stretchOf(targetClip) !== 1);
        const { trackIndex, clipId } = clipContextMenu;
        // The clicked clip, audio or MIDI
        const clickedClip = () => targetClip
          // justified: midiClips uses @audacity-ui/core MidiClip which shares id:number
          || (targetTrack?.midiClips || []).find((c) => c.id === clipId);
        const toClipboard = (operation: 'cut' | 'copy') => {
          const clip = clickedClip();
          if (clip) onClipboardSet({ clips: [{ ...clip, trackIndex }], operation, wholeGroupIds: [] });
        };
        // Cut and… / Delete and… (2026-10-14, the real build's three forms):
        // leave the gap = the plain delete; close it on this track / on
        // every track = DELETE_CLIP_CLOSE_GAP's ripple
        const removeClip = (mode: GapMode) => {
          if (mode === 'leave-gap') dispatch({ type: 'DELETE_CLIP', payload: { trackIndex, clipId } });
          else dispatch({ type: 'DELETE_CLIP_CLOSE_GAP', payload: { trackIndex, clipId, scope: mode === 'close-gap-all' ? 'all' : 'track' } });
        };
        const resetPitchSpeed = () => {
          // The properties panel's Reset, for the clicked clip or every
          // selected clip when the clicked one is selected (the fade rule)
          for (const t of fadeTargets(tracks, trackIndex, clipId)) {
            const clip = tracks[t.trackIndex]?.clips.find((c: Clip) => c.id === t.clipId);
            if (!clip) continue;
            if (clip.pitchSemitones) dispatch({ type: 'UPDATE_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clipId, updates: { pitchSemitones: undefined } } });
            if (stretchOf(clip) !== 1) dispatch({ type: 'STRETCH_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clipId, newDuration: clip.duration / stretchOf(clip), newStretchFactor: 1 } });
          }
        };

        return (
          <ClipContextMenu
            isOpen={clipContextMenu.isOpen}
            x={clipContextMenu.x}
            y={clipContextMenu.y}
            os={os}
            autoFocus={clipContextMenu.openedViaKeyboard}
            onClose={() => setClipContextMenu(null)}
            onRename={() => {
              setClipContextMenu(null);
            }}
            onColorChange={(color) => {
              // The clip's OWN colour (2026-10-02): the clicked clip, or
              // every selected clip when the clicked one is selected —
              // the fade menu's rule. 'track' takes the override away.
              const ownColor = color === 'track' ? undefined : (color as Clip['ownColor']);
              for (const t of fadeTargets(tracks, trackIndex, clipId)) {
                dispatch({ type: 'UPDATE_CLIP', payload: { trackIndex: t.trackIndex, clipId: t.clipId, updates: { ownColor } } });
              }
              setClipContextMenu(null);
            }}
            onCut={() => { toClipboard('cut'); removeClip('leave-gap'); setClipContextMenu(null); }}
            onCopy={() => { toClipboard('copy'); setClipContextMenu(null); }}
            onDuplicate={() => {
              setClipContextMenu(null);
            }}
            onDelete={() => { removeClip('leave-gap'); setClipContextMenu(null); }}
            onCutAnd={(mode) => { toClipboard('cut'); removeClip(mode); setClipContextMenu(null); }}
            onDeleteAnd={(mode) => { removeClip(mode); setClipContextMenu(null); }}
            onEditFades={() => openFadeDialog('in')}
            onSplit={() => {
              setClipContextMenu(null);
            }}
            onSplitAtSilences={() => {
              setClipContextMenu(null);
            }}
            stretchWithTempo={false}
            onToggleStretchWithTempo={() => {
            }}
            onOpenPitchSpeedDialog={() => {
              setClipContextMenu(null);
            }}
            pitchSpeedModified={pitchSpeedModified}
            onResetPitchSpeed={() => { resetPitchSpeed(); setClipContextMenu(null); }}
            onRenderPitchSpeed={() => {
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
      {/* The FADES dialog — lives OUTSIDE the clip menu's conditional:
          opening it closes the menu. Its targets are the fade rule's,
          read live; it stays closed for a clip with no fades (MIDI). */}
      {(() => {
        const targets = fadeDialog
          ? fadeTargets(tracks, fadeDialog.trackIndex, fadeDialog.clipId)
            .map((t) => ({ ...t, clip: tracks[t.trackIndex]?.clips.find((c: Clip) => c.id === t.clipId) }))
            .filter((t): t is typeof t & { clip: Clip } => !!t.clip)
          : [];
        const merge = <T,>(vals: T[]): T | typeof FADE_MIXED => (vals.every((v) => v === vals[0]) ? vals[0] : FADE_MIXED);
        const values: FadeDialogValues = {
          in: { seconds: merge(targets.map((t) => t.clip.fadeIn ?? 0)), shape: merge(targets.map((t) => fadeShapePresetOf(t.clip.fadeInShape))) },
          out: { seconds: merge(targets.map((t) => t.clip.fadeOut ?? 0)), shape: merge(targets.map((t) => fadeShapePresetOf(t.clip.fadeOutShape))) },
        };
        // THE DIALOG PREVIEWS LIVE (2026-10-14): its edits apply at once,
        // inside an undo gesture begun when it opened (the effect below),
        // so the fade handles follow the fields; Apply ENDS the gesture
        // (one undo step), Cancel / Escape CANCELS it (the snapshot comes
        // back). `fadeDialogApplied` tells close() which.
        const applyFadeEdits = (edits: FadeDialogEdits) => {
          const restoreSide = (t: typeof targets[number], side: 'in' | 'out') => {
            const snap = fadeDialogSnapshotRef.current?.find((s) => s.trackIndex === t.trackIndex && s.clipId === t.clipId);
            if (!snap) return;
            dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side, seconds: side === 'in' ? snap.fadeIn : snap.fadeOut } });
          };
          for (const t of targets) {
            if (edits.fadeIn !== undefined) dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side: 'in', seconds: Math.min(edits.fadeIn, t.clip.duration) } });
            else restoreSide(t, 'in');
            if (edits.fadeOut !== undefined) dispatch({ type: 'SET_CLIP_FADE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side: 'out', seconds: Math.min(edits.fadeOut, t.clip.duration) } });
            else restoreSide(t, 'out');
            const inPreset = edits.fadeInShape ? FADE_SHAPE_PRESETS.find((p) => p.id === edits.fadeInShape) : undefined;
            if (inPreset) dispatch({ type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side: 'in', shape: inPreset.shape } });
            const outPreset = edits.fadeOutShape ? FADE_SHAPE_PRESETS.find((p) => p.id === edits.fadeOutShape) : undefined;
            if (outPreset) dispatch({ type: 'SET_CLIP_FADE_SHAPE', payload: { trackIndex: t.trackIndex, clipId: t.clipId, side: 'out', shape: outPreset.shape } });
          }
        };
        const close = () => {
          const was = fadeDialog;
          dispatch({ type: fadeDialogApplied.current ? 'END_UNDO_GESTURE' : 'CANCEL_UNDO_GESTURE' });
          fadeDialogApplied.current = false;
          fadeDialogSnapshotRef.current = null;
          setFadeDialog(null);
          // Focus back to the clip (the global rule for a closing menu;
          // the fade handle it may have come from is gone by now)
          if (was) requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[data-clip-id="${was.clipId}"][data-track-index="${was.trackIndex}"]`)?.focus();
          });
        };
        return (
          <FadeDialog
            isOpen={fadeDialog !== null && targets.length > 0}
            targetCount={targets.length}
            values={values}
            maxSeconds={targets.length > 0 ? Math.min(...targets.map((t) => t.clip.duration)) : 0}
            presets={FADE_SHAPE_PRESETS}
            focusSide={fadeDialog?.focusSide ?? 'in'}
            os={os}
            onClose={close}
            onPreview={applyFadeEdits}
            onApply={(edits: FadeDialogEdits) => {
              fadeDialogApplied.current = true;
              applyFadeEdits(edits);
            }}
          />
        );
      })()}
    </>
  );
}
