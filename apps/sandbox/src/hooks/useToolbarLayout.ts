import { useCallback, useMemo } from 'react';
import {
  defaultToolbarLayout, EXPORT_TOOLBAR_LAYOUT, isToolbarLayout, moveBar, normaliseLayout, usePreferences,
  type ToolbarLayout, type ToolbarRegion, type ToolbarWorkspace,
} from '@audacity-ui/components';

export interface UseToolbarLayoutReturn {
  /** The layout in force: the Export tab's own, else the user's for this
   *  workspace, else the workspace's seed */
  layout: ToolbarLayout;
  /** The user has a layout of their own for this workspace */
  customised: boolean;
  /** Move a whole bar (the grip drag) */
  moveBarTo: (barId: string, region: ToolbarRegion, index: number) => void;
  /** Back to the workspace's seed */
  resetLayout: () => void;
}

/**
 * THE TOOLBAR LAYOUT, PER WORKSPACE (2026-11-09, the custom toolbars
 * design): a workspace is a saved layout. The built-in workspaces are
 * seeds (`defaultToolbarLayout`); a user's rearrangement is stored in the
 * preferences blob under `toolbarLayouts[workspace]`, so switching
 * workspaces swaps the whole layout and each keeps its own. The Export
 * tab draws its own fixed bars. A stored layout that is not a layout
 * (an older blob) is ignored.
 */
export function useToolbarLayout(workspace: ToolbarWorkspace, activeMenuItem: string): UseToolbarLayoutReturn {
  const { preferences, updatePreference } = usePreferences();
  const stored = preferences.toolbarLayouts?.[workspace];
  const custom = isToolbarLayout(stored) ? stored : null;
  const layout = useMemo(() => {
    if (activeMenuItem === 'export') return EXPORT_TOOLBAR_LAYOUT;
    return normaliseLayout(custom ?? defaultToolbarLayout(workspace));
  }, [activeMenuItem, custom, workspace]);

  const moveBarTo = useCallback((barId: string, region: ToolbarRegion, index: number) => {
    if (activeMenuItem === 'export') return;
    const base = custom ?? defaultToolbarLayout(workspace);
    const next = moveBar(base, barId, region, index);
    if (next === base) return;
    updatePreference('toolbarLayouts', { ...(preferences.toolbarLayouts ?? {}), [workspace]: next });
  }, [activeMenuItem, custom, preferences.toolbarLayouts, updatePreference, workspace]);

  const resetLayout = useCallback(() => {
    const next = { ...(preferences.toolbarLayouts ?? {}) };
    delete next[workspace];
    updatePreference('toolbarLayouts', next);
  }, [preferences.toolbarLayouts, updatePreference, workspace]);

  return { layout, customised: custom !== null, moveBarTo, resetLayout };
}
