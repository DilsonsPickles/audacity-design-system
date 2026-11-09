import { useCallback, useMemo } from 'react';
import {
  defaultToolbarLayout, EXPORT_TOOLBAR_LAYOUT, isToolbarLayout, moveBar, moveTool, moveToolToNewBar, normaliseLayout, usePreferences,
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
  /** Move one tool into a bar, before a tool or at its end (the edit mode) */
  moveToolInto: (toolId: string, barId: string, beforeToolId: string | null) => void;
  /** Pull one tool out into a new bar of its own */
  moveToolToNewBar: (toolId: string, region: ToolbarRegion, beforeBarId: string | null) => void;
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

  // One edit of the layout in force, stored for this workspace
  const edit = useCallback((change: (base: ToolbarLayout) => ToolbarLayout) => {
    if (activeMenuItem === 'export') return;
    const base = custom ?? defaultToolbarLayout(workspace);
    const next = change(base);
    if (next === base) return;
    updatePreference('toolbarLayouts', { ...(preferences.toolbarLayouts ?? {}), [workspace]: next });
  }, [activeMenuItem, custom, preferences.toolbarLayouts, updatePreference, workspace]);

  const moveBarTo = useCallback((barId: string, region: ToolbarRegion, index: number) => {
    edit((base) => moveBar(base, barId, region, index));
  }, [edit]);
  const moveToolInto = useCallback((toolId: string, barId: string, beforeToolId: string | null) => {
    edit((base) => moveTool(base, toolId, barId, beforeToolId));
  }, [edit]);
  const moveToolToNew = useCallback((toolId: string, region: ToolbarRegion, beforeBarId: string | null) => {
    edit((base) => moveToolToNewBar(base, toolId, region, beforeBarId));
  }, [edit]);

  const resetLayout = useCallback(() => {
    const next = { ...(preferences.toolbarLayouts ?? {}) };
    delete next[workspace];
    updatePreference('toolbarLayouts', next);
  }, [preferences.toolbarLayouts, updatePreference, workspace]);

  return { layout, customised: custom !== null, moveBarTo, moveToolInto, moveToolToNewBar: moveToolToNew, resetLayout };
}
