import React from 'react';
import type { MenuItem } from '@dilsonspickles/components';

export interface UseElectronMenuBridgeOptions {
  menuDefinitions: Record<string, MenuItem[]>;
}

/**
 * Routes Electron native-menu clicks to the same handlers the in-app menu
 * uses. We look up by item label so renaming the in-app menu in
 * menuDefinitions automatically keeps the native menu in sync (rather
 * than via brittle array indices). Extracted verbatim from App.tsx — see
 * docs/codebase-map.md for the extraction history. Only exercised in the
 * desktop app (Electron); tsc is the gate for this hook.
 */
export function useElectronMenuBridge(options: UseElectronMenuBridgeOptions): void {
  const { menuDefinitions } = options;

  const menuByLabel = React.useMemo(() => {
    const map = new Map<string, (() => void) | undefined>();
    for (const items of Object.values(menuDefinitions)) {
      for (const item of items) {
        if (item.label) map.set(item.label, item.onClick);
      }
    }
    return map;
  }, [menuDefinitions]);

  const electronCommandsRef = React.useRef<Record<string, () => void>>({});
  electronCommandsRef.current = {
    'file:import': () => menuByLabel.get('Import')?.(),
    'file:save': () => menuByLabel.get('Save Project')?.(),
    'edit:labels': () => menuByLabel.get('Edit Labels...')?.(),
    'edit:preferences': () => menuByLabel.get('Preferences')?.(),
    'view:toggle-effects': () => menuByLabel.get('Show effects')?.(),
    'view:toggle-rms': () => menuByLabel.get('Show RMS in waveform')?.(),
    'view:toggle-rulers': () => menuByLabel.get('Show vertical rulers')?.(),
    'view:toggle-piano-roll': () => menuByLabel.get('Show piano roll')?.(),
    'record:toggle-lead-in': () => menuByLabel.get('Enable lead in time')?.(),
    'effect:manage-plugins': () => menuByLabel.get('Manage Plugins...')?.(),
    'generate:tone': () => menuByLabel.get('Tone...')?.(),
    'tools:manage-macros': () => menuByLabel.get('Manage macros...')?.(),
  };

  React.useEffect(() => {
    const api = (window as unknown as {
      electronMenu?: { onCommand: (cb: (cmd: string) => void) => () => void };
    }).electronMenu;
    if (!api) return;
    return api.onCommand((cmd) => {
      electronCommandsRef.current[cmd]?.();
    });
  }, []);
}
