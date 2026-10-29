import type { MenuItem } from '@audacity-ui/components';

export interface MenuDefinitionDeps {
  // File menu deps
  isCloudProject: boolean;
  dontShowSaveModalAgain: boolean;
  onImportAudio: () => void;
  onSyncToast: () => void;
  onShowSaveProjectModal: () => void;
  onSaveToComputer: () => void;

  // Edit menu deps
  onOpenLabelEditor: () => void;
  onOpenGoTo: () => void;
  /** Edit › Group clips / Ungroup clips (2026-10-14): the clip menu lost
   *  its Group / Ungroup rows to the Figma frame, so the pair moved here,
   *  where the real build's app menu keeps them (appmenumodel.cpp, Clip);
   *  they act on the SELECTED clips */
  canGroupClips: boolean;
  canUngroupClips: boolean;
  onGroupClips: () => void;
  onUngroupClips: () => void;
  onOpenKeyboardMap: () => void;
  /** View › Mixer (M): the mixer panel on / off */
  onToggleMixer: () => void;
  onOpenPreferences: () => void;

  // View menu deps
  effectsPanelOpen: boolean;
  showRmsInWaveform: boolean;
  showVerticalRulers: boolean;
  showQuickFadeHandles: boolean;
  pianoRollOpen: boolean;
  selectedTrackIndices: number[];
  onToggleEffectsPanel: () => void;
  onToggleRmsInWaveform: () => void;
  onToggleVerticalRulers: () => void;
  onToggleQuickFadeHandles: () => void;
  /** Tracks > Group selected tracks (folders v1) */
  onGroupSelectedTracks: () => void;
  onTogglePianoRoll: () => void;
  onFitTracksToHeight: () => void;
  onExpandAllTracks: () => void;
  onCollapseAllTracks: () => void;
  onResetAllTrackHeights: () => void;
  onCollapseSelectedTracks: () => void;
  onExpandSelectedTracks: () => void;
  onFitSelectedTracksToHeight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;

  // Effect menu deps
  onOpenPluginManager: () => void;

  // Generate menu deps
  onGenerateTone: () => void;

  // Record menu deps
  rollInTimeEnabled: boolean;
  onToggleRollInTime: () => void;
  /** Record › Timer record… (2026-10-19): the scheduled-recording dialog */
  onOpenTimerRecord: () => void;

  // Tools menu deps
  onOpenMacroManager: () => void;
}

export function createMenuDefinitions(deps: MenuDefinitionDeps): Record<string, MenuItem[]> {
  const fileMenuItems: MenuItem[] = [
    {
      label: 'Import',
      // Cmd+I now splits the focused clip at the playhead — Import is
      // reachable via this menu item until we pick a new binding.
      onClick: deps.onImportAudio,
    },
    {
      label: 'Save Project',
      shortcut: 'Ctrl+S',
      onClick: () => {
        if (deps.isCloudProject) {
          deps.onSyncToast();
        } else {
          if (!deps.dontShowSaveModalAgain) {
            deps.onShowSaveProjectModal();
          } else {
            deps.onSaveToComputer();
          }
        }
      }
    },
  ];

  const editMenuItems: MenuItem[] = [
    {
      label: 'Edit Labels...',
      shortcut: 'Ctrl+B',
      onClick: deps.onOpenLabelEditor,
    },
    {
      label: 'Go to...',
      onClick: deps.onOpenGoTo,
    },
    {
      label: 'Group clips',
      disabled: !deps.canGroupClips,
      onClick: deps.onGroupClips,
    },
    {
      label: 'Ungroup clips',
      disabled: !deps.canUngroupClips,
      onClick: deps.onUngroupClips,
    },
    {
      label: 'Preferences',
      shortcut: 'Ctrl+,',
      onClick: deps.onOpenPreferences,
    },
  ];

  const viewMenuItems: MenuItem[] = [
    {
      label: 'Show effects',
      checked: deps.effectsPanelOpen,
      onClick: deps.onToggleEffectsPanel,
    },
    {
      label: 'Show RMS in waveform',
      checked: deps.showRmsInWaveform,
      onClick: deps.onToggleRmsInWaveform,
    },
    {
      label: 'Show vertical rulers',
      checked: deps.showVerticalRulers,
      onClick: deps.onToggleVerticalRulers,
    },
    {
      label: 'Show quick fade handles',
      checked: deps.showQuickFadeHandles,
      onClick: deps.onToggleQuickFadeHandles,
    },
    {
      label: 'Show piano roll',
      checked: deps.pianoRollOpen,
      onClick: deps.onTogglePianoRoll,
    },
    {
      // AU3 heritage: View > Track Size > Fit to Height / Expand All /
      // Collapse All. Our Menu has no submenus, so they live flat in View.
      label: 'Fit tracks to height',
      shortcut: 'Ctrl+Shift+F',
      onClick: deps.onFitTracksToHeight,
    },
    {
      label: 'Expand all tracks',
      shortcut: 'Ctrl+Shift+X',
      onClick: deps.onExpandAllTracks,
    },
    {
      label: 'Collapse all tracks',
      shortcut: 'Ctrl+Shift+C',
      onClick: deps.onCollapseAllTracks,
    },
    {
      // Back to the default height, whatever each track is (2026-10-29 —
      // Expand never shrinks, so this is the way back to normal)
      label: 'Reset all track heights',
      onClick: deps.onResetAllTrackHeights,
    },
    {
      // The one-track forms (2026-10-08, "collapse just the selected
      // track"): the selected tracks, or the track you are on
      label: 'Expand selected tracks',
      shortcut: 'Ctrl+Alt+X',
      onClick: deps.onExpandSelectedTracks,
    },
    {
      label: 'Collapse selected tracks',
      shortcut: 'Ctrl+Alt+C',
      onClick: deps.onCollapseSelectedTracks,
    },
    {
      label: 'Fit selected tracks to height',
      shortcut: 'Ctrl+Alt+0',
      onClick: deps.onFitSelectedTracksToHeight,
    },
    // Horizontal zoom (2026-10-12): the real app's Ctrl+= / Ctrl+-
    {
      label: 'Zoom in',
      shortcut: 'Ctrl+=',
      onClick: deps.onZoomIn,
    },
    {
      label: 'Zoom out',
      shortcut: 'Ctrl+-',
      onClick: deps.onZoomOut,
    },
    {
      label: 'Mixer',
      shortcut: 'M',
      onClick: deps.onToggleMixer,
    },
    {
      label: 'Keyboard map',
      onClick: deps.onOpenKeyboardMap,
    },
  ];

  const effectMenuItems: MenuItem[] = [
    {
      label: 'Manage Plugins...',
      onClick: deps.onOpenPluginManager,
    },
  ];

  const generateMenuItems: MenuItem[] = [
    {
      label: 'Tone...',
      onClick: deps.onGenerateTone,
    },
  ];

  const recordMenuItems: MenuItem[] = [
    {
      label: 'Enable lead in time',
      checked: deps.rollInTimeEnabled,
      onClick: deps.onToggleRollInTime,
    },
    { label: '', divider: true },
    {
      label: 'Timer record...',
      onClick: deps.onOpenTimerRecord,
    },
  ];

  const tracksMenuItems: MenuItem[] = [
    {
      label: 'Group selected tracks',
      shortcut: 'Ctrl+G',
      onClick: deps.onGroupSelectedTracks,
    },
  ];

  const toolsMenuItems: MenuItem[] = [
    {
      label: 'Manage macros...',
      onClick: deps.onOpenMacroManager,
    },
  ];

  return {
    File: fileMenuItems,
    Edit: editMenuItems,
    View: viewMenuItems,
    Record: recordMenuItems,
    Tracks: tracksMenuItems,
    Effect: effectMenuItems,
    Generate: generateMenuItems,
    Tools: toolsMenuItems,
  };
}
