import React from 'react';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { PianoRollPanel, PanelHeader, ContextMenu, ContextMenuItem, barSeconds, type PanelHeaderTab, type ThemeTokens } from '@audacity-ui/components';
import { type TracksState } from '../../contexts/TracksContext';
import { useTracksDispatch } from '../../contexts/useTracks';
import { MIDI_INSTRUMENTS } from '../../contexts/AudioEngineContext';
import type { EffectSelectorMenuState } from '../../hooks/useContextMenuState';
import { MacrosDockPanel } from './MacrosDockPanel';
import { ClipPropertiesDockPanel } from './ClipPropertiesDockPanel';
import { MixerDockPanel } from './MixerDockPanel';
import { activeDrawerTab, visibleDrawerGroups, type DrawerGroup, type DrawerTarget } from '../../utils/drawerGroups';

export type DrawerTabId = 'mixer' | 'piano-roll' | 'effects' | 'macros' | 'clip-properties';

export interface EditorBottomDrawerProps {
  /** Same TracksState object EditorLayout reads today — passed through
   *  verbatim (not re-derived) so mixer/piano-roll reads never drift from
   *  what the rest of EditorLayout sees in the same render. */
  state: TracksState;
  theme: ThemeTokens;
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';
  showMixer?: boolean;
  trackMeterLevels: Map<number, number>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  setEffectSelectorMenu: React.Dispatch<React.SetStateAction<EffectSelectorMenuState | null>>;
  bpm: number;
  beatsPerMeasure: number;
  /** The time signature's lower number */
  noteValue: number;
  playMidiNote: (pitch: number, duration?: number, instrumentId?: string) => void;
  midiInstrument: string;
  /** Written by this drawer's onAddNote when a note creates a brand-new MIDI
   *  clip, so usePianoRollSmoothScroll (owner of the ref) skips its next
   *  smooth-scroll — the clip is already positioned where the user drew. */
  skipPianoRollScrollRef: React.MutableRefObject<boolean>;
  hoveredMidiClipId: number | null;
  setHoveredMidiClipId: React.Dispatch<React.SetStateAction<number | null>>;
  drawerHeight: number;
  setDrawerHeight: React.Dispatch<React.SetStateAction<number>>;
  /** THE DRAWER'S PANELS (2026-11-10, "let me put Mixer and Effects side
   *  by side NOT in the same panel. Like in MuseScore"): groups side by
   *  side, each with its own tabs (utils/drawerGroups.ts) */
  groups: DrawerGroup[];
  /** The drawer tabs that are open right now */
  openIds: ReadonlySet<DrawerTabId>;
  /** When each tab was last activated — a group shows its latest */
  activeStamps: Partial<Record<DrawerTabId, number>>;
  onActivateTab: (tab: DrawerTabId) => void;
  onReorderGroup: (groupId: string, visibleOrder: DrawerTabId[]) => void;
  /** The splitter between two panels: every shown panel's new width share */
  onGroupFlexChange: (flexById: Record<string, number>) => void;
  /** The tab menu's moves between panels, and doing one */
  moveTargets: (tab: DrawerTabId) => Array<{ label: string; target: DrawerTarget }>;
  onMoveTab: (tab: DrawerTabId, target: DrawerTarget) => void;
  /** The Mixer's placement menu (it docks like the others since
   *  2026-11-10); absent = the drawer's own Close-only menu */
  onMixerMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** The Effects panel, when it is docked into this drawer (2026-11-10):
   *  the host's TrackEffectsPanel in its columns layout; null otherwise */
  effects?: React.ReactNode;
  onCloseEffects?: () => void;
  onEffectsMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether the Macros panel is docked into this drawer */
  macrosOpen?: boolean;
  onCloseMacros?: () => void;
  /** Opens the Macros placement menu (Float / Dock left / right / bottom) */
  onMacrosMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether the Clip properties panel is docked into this drawer (2026-10-02) */
  clipPropertiesOpen?: boolean;
  onCloseClipProperties?: () => void;
  onClipPropertiesMenuClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** A dockable panel's tab dragged UP out of the drawer's header: the
   *  host pops it into its OS window mid-gesture, as the side docks do
   *  (2026-10-02 — the drawer had no way out but the kebab menu). Only
   *  the dockable tabs (Macros, Clip properties) tear; Mixer and Piano
   *  roll live here; Effects tears too since 2026-11-10. */
  onTabTearOff?: (
    tabId: string,
    e: { clientX: number; clientY: number; screenX: number; screenY: number; pointerId: number },
  ) => void;
}

/** Unified tabbed panel for Mixer and Piano Roll, docked to the bottom of
 *  the editor. Owns tab defs/order/close, the PanelHeader resize drag,
 *  mixer channel building, and piano-roll MIDI handler wiring. Returns null
 *  when neither panel is open. */
export function EditorBottomDrawer({
  state,
  theme,
  activeMenuItem,
  showMixer,
  trackMeterLevels,
  audioManagerRef,
  setEffectSelectorMenu,
  bpm,
  beatsPerMeasure,
  noteValue,
  playMidiNote,
  midiInstrument,
  skipPianoRollScrollRef,
  hoveredMidiClipId,
  setHoveredMidiClipId,
  drawerHeight,
  setDrawerHeight,
  groups,
  openIds,
  activeStamps,
  onActivateTab,
  onReorderGroup,
  onGroupFlexChange,
  moveTargets,
  onMoveTab,
  onMixerMenuClick,
  effects,
  onCloseEffects,
  onEffectsMenuClick,
  macrosOpen,
  onCloseMacros,
  onMacrosMenuClick,
  clipPropertiesOpen,
  onCloseClipProperties,
  onClipPropertiesMenuClick,
  onTabTearOff,
}: EditorBottomDrawerProps) {
  const dispatch = useTracksDispatch();

  // Kebab menu for the Mixer / Piano roll tabs (Macros routes to the
  // shared placement menu via onMacrosMenuClick). Closing a tab lives
  // here — panel headers have no close button (2026-09-10).
  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; tab: DrawerTabId } | null>(null);

  const mixerOpen = showMixer && activeMenuItem !== 'export';
  const pianoRollOpen = state.pianoRollOpen && state.pianoRollTrackIndex !== null;
  const groupsShown = visibleDrawerGroups(groups, openIds);
  if (groupsShown.length === 0) return null;

  const allTabDefs: Record<DrawerTabId, PanelHeaderTab> = {
    mixer: { id: 'mixer', label: 'Mixer' },
    'piano-roll': { id: 'piano-roll', label: 'Piano roll' },
    effects: { id: 'effects', label: 'Effects' },
    macros: { id: 'macros', label: 'Macro manager' },
    'clip-properties': { id: 'clip-properties', label: 'Clip properties' },
  };

  // Close a drawer tab. The mixer is controlled by App.tsx's
  // setMixerPanelOpen, which we only have as a read prop — the
  // `close-mixer-panel` window CustomEvent is the established bridge
  // (App's useMixerPanelListener turns it into mixerPanelOpen=false).
  const closeTab = (tabId: string) => {
    if (tabId === 'mixer') {
      window.dispatchEvent(new CustomEvent('close-mixer-panel'));
    } else if (tabId === 'piano-roll') {
      dispatch({ type: 'SET_PIANO_ROLL_OPEN', payload: { open: false } });
    } else if (tabId === 'effects') {
      onCloseEffects?.();
    } else if (tabId === 'macros') {
      onCloseMacros?.();
    } else if (tabId === 'clip-properties') {
      onCloseClipProperties?.();
    }
  };

  // Content height = drawer height - header (32px)
  const contentHeight = drawerHeight - 32;

  // The drawer's height, from any panel's header
  const startHeightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = drawerHeight;
    const maxH = window.innerHeight * 0.5;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setDrawerHeight(Math.max(144, Math.min(maxH, startHeight + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // THE SPLITTER between two panels: both widths follow the pointer (each
  // at least 160px); every shown panel's share becomes its pixel width
  const groupRefs = new Map<string, HTMLDivElement>();
  const startSplit = (leftId: string, rightId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const widths = new Map(groupsShown.map((g) => [g.id, groupRefs.get(g.id)?.getBoundingClientRect().width ?? 0]));
    const startX = e.clientX;
    const l0 = widths.get(leftId) ?? 0;
    const r0 = widths.get(rightId) ?? 0;
    const onMove = (ev: MouseEvent) => {
      const dx = Math.max(160 - l0, Math.min(r0 - 160, ev.clientX - startX));
      const next: Record<string, number> = {};
      widths.forEach((w, id) => { next[id] = Math.max(1, w); });
      next[leftId] = Math.max(1, l0 + dx);
      next[rightId] = Math.max(1, r0 - dx);
      onGroupFlexChange(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const renderContent = (tab: DrawerTabId) => (
    <>
      {/* Effects content — the host's panel, in its columns layout */}
      {tab === 'effects' && effects}
      {/* Macros content — same sandbox wiring as the side docks */}
      {tab === 'macros' && macrosOpen && <MacrosDockPanel placement="end" />}
      {tab === 'clip-properties' && clipPropertiesOpen && <ClipPropertiesDockPanel placement="end" layout="columns" />}

      {/* Mixer content */}
      {tab === 'mixer' && mixerOpen && (
        <MixerDockPanel state={state} theme={theme} trackMeterLevels={trackMeterLevels} audioManagerRef={audioManagerRef} setEffectSelectorMenu={setEffectSelectorMenu} />
      )}

      {/* Piano Roll content */}
      {tab === 'piano-roll' && pianoRollOpen && (() => {
        const prTrack = state.tracks[state.pianoRollTrackIndex];
        if (!prTrack) return null;
        const prClip = prTrack.midiClips?.find(c => c.selected) ?? null;
        return (
          <PianoRollPanel
            hideHeader
            height={contentHeight}
            clip={prClip}
            allClips={prClip ? [prClip] : (prTrack.midiClips ?? [])}
            // The piano roll counts its beats as 60 / bpm: hand it the tempo in
            // the time signature's BEAT, so its beats and bars are the
            // timeline's (2026-11-04 — utils/musicalTime.ts in components)
            bpm={bpm * noteValue / 4}
            beatsPerMeasure={beatsPerMeasure}
            pixelsPerSecond={state.pianoRollPixelsPerSecond}
            scrollX={state.pianoRollScrollX}
            snap={state.pianoRollSnap}
            timeBasis={state.pianoRollTimeBasis}
            onSnapChange={(snap) => dispatch({ type: 'SET_PIANO_ROLL_SNAP', payload: snap })}
            onTimeBasisChange={(basis) => dispatch({ type: 'SET_PIANO_ROLL_TIME_BASIS', payload: basis })}
            onAddNote={(note) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const selectedClip = clips.find(c => c.selected);
              if (selectedClip) {
                // Note startTime is already in clip-local time — add directly
                const selectedClipIndex = clips.indexOf(selectedClip);
                const noteEnd = note.startTime + note.duration;
                // Expand clip if note falls outside current boundaries
                if (noteEnd > selectedClip.duration) {
                  dispatch({
                    type: 'TRIM_CLIP',
                    payload: {
                      trackIndex,
                      clipId: selectedClip.id,
                      newTrimStart: 0,
                      newDuration: noteEnd,
                    },
                  });
                }
                dispatch({ type: 'ADD_MIDI_NOTE', payload: { trackIndex, clipIndex: selectedClipIndex, note } });
              } else {
                // No selected clip — create one starting at beat 0
                const measureDuration = barSeconds(bpm, beatsPerMeasure, noteValue);
                const newClipId = Date.now();
                const newClip = {
                  id: newClipId,
                  name: 'MIDI Clip',
                  start: 0,
                  trimStart: 0,
                  duration: Math.max(measureDuration, note.startTime + note.duration),
                  notes: [note],
                };
                dispatch({ type: 'ADD_MIDI_CLIP', payload: { trackIndex, clip: newClip } });
                skipPianoRollScrollRef.current = true;
                dispatch({ type: 'SELECT_CLIP', payload: { trackIndex, clipId: newClipId } });
              }
            }}
            onDeleteNotes={(noteIds) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const idSet = new Set(noteIds);
              for (let ci = 0; ci < clips.length; ci++) {
                const clipNoteIds = clips[ci].notes.filter(n => idSet.has(n.id)).map(n => n.id);
                if (clipNoteIds.length > 0) {
                  dispatch({ type: 'DELETE_MIDI_NOTES', payload: { trackIndex, clipIndex: ci, noteIds: clipNoteIds } });
                }
              }
            }}
            onUpdateNote={(noteId, updates) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const clipIndex = clips.findIndex(c => c.notes.some(n => n.id === noteId));
              if (clipIndex >= 0) {
                dispatch({ type: 'UPDATE_MIDI_NOTE', payload: { trackIndex, clipIndex, noteId, updates } });
              }
            }}
            onMoveNotes={() => {/* handled via UPDATE_MIDI_NOTE */}}
            onResizeNote={(noteId, newDuration) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const clipIndex = clips.findIndex(c => c.notes.some(n => n.id === noteId));
              if (clipIndex >= 0) {
                dispatch({ type: 'RESIZE_MIDI_NOTE', payload: { trackIndex, clipIndex, noteId, newDuration } });
              }
            }}
            onSelectNote={(noteId, additive) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              if (!additive) {
                for (let ci = 0; ci < clips.length; ci++) {
                  if (clips[ci].notes.some(n => n.selected)) {
                    dispatch({ type: 'DESELECT_ALL_MIDI_NOTES', payload: { trackIndex, clipIndex: ci } });
                  }
                }
              }
              const clipIndex = clips.findIndex(c => c.notes.some(n => n.id === noteId));
              if (clipIndex >= 0) {
                dispatch({ type: 'SELECT_MIDI_NOTE', payload: { trackIndex, clipIndex, noteId, additive: true } });
              }
            }}
            onSelectNotes={(noteIds, additive) => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              const idSet = new Set(noteIds);
              if (!additive) {
                for (let ci = 0; ci < clips.length; ci++) {
                  if (clips[ci].notes.some(n => n.selected)) {
                    dispatch({ type: 'DESELECT_ALL_MIDI_NOTES', payload: { trackIndex, clipIndex: ci } });
                  }
                }
              }
              for (let ci = 0; ci < clips.length; ci++) {
                const clipNoteIds = clips[ci].notes.filter(n => idSet.has(n.id)).map(n => n.id);
                if (clipNoteIds.length > 0) {
                  dispatch({ type: 'SELECT_MIDI_NOTES', payload: { trackIndex, clipIndex: ci, noteIds: clipNoteIds, additive: true } });
                }
              }
            }}
            onDeselectAll={() => {
              const trackIndex = state.pianoRollTrackIndex!;
              const clips = prTrack.midiClips || [];
              for (let ci = 0; ci < clips.length; ci++) {
                if (clips[ci].notes.some(n => n.selected)) {
                  dispatch({ type: 'DESELECT_ALL_MIDI_NOTES', payload: { trackIndex, clipIndex: ci } });
                }
              }
            }}
            onPixelsPerSecondChange={(pps) => dispatch({ type: 'SET_PIANO_ROLL_PIXELS_PER_SECOND', payload: pps })}
            onScrollXChange={(sx) => dispatch({ type: 'SET_PIANO_ROLL_SCROLL_X', payload: sx })}
            onResizeClip={(_edge, newStart, newDuration, newTrimStart, clipId) => {
              const targetId = clipId ?? prClip?.id;
              if (!targetId) return;
              dispatch({
                type: 'TRIM_CLIP',
                payload: {
                  trackIndex: state.pianoRollTrackIndex!,
                  clipId: targetId,
                  newTrimStart,
                  newDuration,
                  newStart,
                },
              });
            }}
            onSelectClip={(clipId) => {
              dispatch({ type: 'SELECT_CLIP', payload: { trackIndex: state.pianoRollTrackIndex!, clipId } });
            }}
            onMoveClip={(clipId, newStart) => {
              const trackIndex = state.pianoRollTrackIndex!;
              dispatch({ type: 'MOVE_CLIP', payload: { clipId, fromTrackIndex: trackIndex, toTrackIndex: trackIndex, newStartTime: newStart } });
            }}
            hoveredClipId={hoveredMidiClipId}
            onHoverClip={setHoveredMidiClipId}
            onKeyClick={(pitch: number) => playMidiNote(pitch, 0.3, prTrack.instrument)}
            onPlayNote={(pitch: number) => playMidiNote(pitch, 0.3, prTrack.instrument)}
            instruments={MIDI_INSTRUMENTS}
            instrument={prTrack.instrument ?? midiInstrument}
            onInstrumentChange={(id: string) => {
              dispatch({ type: 'UPDATE_TRACK', payload: { index: state.pianoRollTrackIndex!, track: { instrument: id } } });
            }}
            trackColor={prTrack.color}
            playheadPosition={state.playheadPosition}
          />
        );
      })()}

    </>
  );

  return (
    <div
      style={{
        borderTop: `1px solid ${theme.border.default}`,
        flexShrink: 0,
        height: drawerHeight,
        minHeight: 144,
        maxHeight: '50vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
      }}
      data-bottom-drawer
    >
      {groupsShown.map((group, i) => {
        const activeTab = activeDrawerTab(group.tabs, activeStamps);
        return (
          <React.Fragment key={group.id}>
            {i > 0 && (
              <div
                className="bottom-drawer__splitter"
                role="separator"
                aria-orientation="vertical"
                style={{ width: 5, margin: '0 -2px', flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}
                onMouseDown={(e) => startSplit(groupsShown[i - 1].id, group.id, e)}
              >
                <div style={{ width: 1, background: theme.border.default }} />
              </div>
            )}
            <div
              ref={(el) => { if (el) groupRefs.set(group.id, el); }}
              data-drawer-group={group.id}
              style={{ flex: `${group.flex} 1 0`, minWidth: 160, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <PanelHeader
                tabs={group.tabs.map((t) => allTabDefs[t])}
                activeTabId={activeTab}
                onTabChange={(tabId) => onActivateTab(tabId as DrawerTabId)}
                onTabReorder={(newTabs) => onReorderGroup(group.id, newTabs.map((t) => t.id as DrawerTabId))}
                onTabTearOff={onTabTearOff
                  ? (tabId, e) => { if (tabId === 'mixer' || tabId === 'effects' || tabId === 'macros' || tabId === 'clip-properties') onTabTearOff(tabId, e); }
                  : undefined}
                onMenuClick={activeTab === 'mixer' && onMixerMenuClick
                  ? onMixerMenuClick
                  : activeTab === 'effects'
                  ? onEffectsMenuClick
                  : activeTab === 'macros'
                  ? onMacrosMenuClick
                  : activeTab === 'clip-properties'
                  ? onClipPropertiesMenuClick
                  : (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTabMenu({ x: rect.right, y: rect.bottom, tab: activeTab });
                  }}
                onResizeStart={startHeightResize}
                tabGroupId="dock-tabs-end"
              />
              {renderContent(activeTab)}
            </div>
          </React.Fragment>
        );
      })}

      {/* Mixer / Piano roll tab kebab menu — Close lives here */}
      <ContextMenu
        isOpen={tabMenu !== null}
        onClose={() => setTabMenu(null)}
        x={tabMenu?.x ?? 0}
        y={tabMenu?.y ?? 0}
      >
        {tabMenu && moveTargets(tabMenu.tab).map((m) => (
          <ContextMenuItem key={m.label} label={m.label} onClick={() => { onMoveTab(tabMenu.tab, m.target); setTabMenu(null); }} />
        ))}
        {tabMenu && moveTargets(tabMenu.tab).length > 0 && <ContextMenuItem isDivider label="" />}
        <ContextMenuItem
          label="Close"
          onClick={() => {
            if (tabMenu) closeTab(tabMenu.tab);
            setTabMenu(null);
          }}
        />
      </ContextMenu>
    </div>
  );
}
