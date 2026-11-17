import { useCallback } from 'react';
import { usePreferences } from '@audacity-ui/components';
import { activeWorkspaceId, hiddenToolsOf } from '../utils/workspaces';

/**
 * THE WORKSPACE IN USE'S HIDDEN TOOLS (2026-11-17): what Customise toolbar,
 * the builder's checkboxes and the title bar's checklist read and write —
 * one list per workspace, so hiding a tool in one leaves the others alone.
 */
export function useHiddenTools(): { hidden: string[]; setHidden: (next: string[]) => void; workspace: string } {
  const { preferences, updatePreference } = usePreferences();
  const workspace = activeWorkspaceId(preferences);
  const hidden = hiddenToolsOf(preferences, workspace);
  const setHidden = useCallback((next: string[]) => {
    updatePreference('workspaceHiddenTools', { ...(preferences.workspaceHiddenTools ?? {}), [workspace]: next });
  }, [preferences.workspaceHiddenTools, updatePreference, workspace]);
  return { hidden, setHidden, workspace };
}
