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
  onOpenPreferences: () => void;

  // View menu deps
  effectsPanelOpen: boolean;
  showRmsInWaveform: boolean;
  showVerticalRulers: boolean;
  pianoRollOpen: boolean;
  selectedTrackIndices: number[];
  onToggleEffectsPanel: () => void;
  onToggleRmsInWaveform: () => void;
  onToggleVerticalRulers: () => void;
  onTogglePianoRoll: () => void;

  // Effect menu deps
  onOpenPluginManager: () => void;

  // Generate menu deps
  onGenerateTone: () => void;

  // Record menu deps
  rollInTimeEnabled: boolean;
  onToggleRollInTime: () => void;

  // Tools menu deps
  onOpenMacroManager: () => void;
}

export function createMenuDefinitions(deps: MenuDefinitionDeps): Record<string, MenuItem[]> {
  const fileMenuItems: MenuItem[] = [
    {
      label: 'Import',
      shortcut: 'Ctrl+I',
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
      label: 'Show piano roll',
      checked: deps.pianoRollOpen,
      onClick: deps.onTogglePianoRoll,
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
    Effect: effectMenuItems,
    Generate: generateMenuItems,
    Tools: toolsMenuItems,
  };
}
