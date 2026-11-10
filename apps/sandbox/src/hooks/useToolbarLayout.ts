import { useCallback, useMemo } from 'react';
import {
  coerceToolbarLayout, defaultToolbarLayout, EXPORT_TOOLBAR_LAYOUT, moveBar, moveTool, moveToolToNewBar, normaliseLayout, setBarSize, usePreferences, withCustomiseTool,
  type BarPlacement, type ToolbarBarAxis, type ToolbarLayout, type ToolbarWorkspace,
} from '@audacity-ui/components';

export interface UseToolbarLayoutReturn {
  /** The layout in force: the Export tab's own, else the user's for this
   *  workspace, else the workspace's seed */
  layout: ToolbarLayout;
  /** The user has a layout of their own for this workspace */
  customised: boolean;
  /** Move a whole bar (the grip drag): beside a bar of a row, or onto a new row */
  moveBarTo: (barId: string, placement: BarPlacement) => void;
  /** Move one tool into a bar, before a tool or at its end (the edit mode) */
  moveToolInto: (toolId: string, barId: string, beforeToolId: string | null) => void;
  /** Pull one tool out into a new bar of its own, in a row or on a new one */
  moveToolToNewBar: (toolId: string, placement: BarPlacement) => void;
  /** A bar's width (horizontal docks) or height (vertical); null = natural */
  resizeBar: (barId: string, axis: ToolbarBarAxis, size: number | null) => void;
  /** Back to the workspace's seed */
  resetLayout: () => void;
}

/**
 * THE TOOLBAR LAYOUT, PER WORKSPACE (2026-11-09, the custom toolbars
 * design): a workspace is a saved layout. The built-in workspaces are
 * seeds (`defaultToolbarLayout`); a user's rearrangement is stored in the
 * preferences blob under `toolbarLayouts[workspace]`, so switching
 * workspaces swaps the whole layout and each keeps its own. The Export
 * tab draws its own fixed bars. A stored layout from the first cut (each
 * dock a flat list of bars, 2026-11-09) is read as one row a dock;
 * anything else that is not a layout is ignored.
 */
export function useToolbarLayout(workspace: ToolbarWorkspace, activeMenuItem: string): UseToolbarLayoutReturn {
  const { preferences, updatePreference } = usePreferences();
  const stored = preferences.toolbarLayouts?.[workspace];
  const custom = useMemo(() => coerceToolbarLayout(stored), [stored]);
  const layout = useMemo(() => {
    if (activeMenuItem === 'export') return EXPORT_TOOLBAR_LAYOUT;
    // (a layout saved before the cog was a tool gets it at the top dock's end)
    return normaliseLayout(withCustomiseTool(custom ?? defaultToolbarLayout(workspace)));
  }, [activeMenuItem, custom, workspace]);

  // One edit of the layout in force, stored for this workspace
  const edit = useCallback((change: (base: ToolbarLayout) => ToolbarLayout) => {
    if (activeMenuItem === 'export') return;
    const base = withCustomiseTool(custom ?? defaultToolbarLayout(workspace));
    const next = change(base);
    if (next === base) return;
    updatePreference('toolbarLayouts', { ...(preferences.toolbarLayouts ?? {}), [workspace]: next });
  }, [activeMenuItem, custom, preferences.toolbarLayouts, updatePreference, workspace]);

  const moveBarTo = useCallback((barId: string, placement: BarPlacement) => {
    edit((base) => moveBar(base, barId, placement));
  }, [edit]);
  const moveToolInto = useCallback((toolId: string, barId: string, beforeToolId: string | null) => {
    edit((base) => moveTool(base, toolId, barId, beforeToolId));
  }, [edit]);
  const moveToolToNew = useCallback((toolId: string, placement: BarPlacement) => {
    edit((base) => moveToolToNewBar(base, toolId, placement));
  }, [edit]);

  const resizeBar = useCallback((barId: string, axis: ToolbarBarAxis, size: number | null) => {
    edit((base) => setBarSize(base, barId, axis, size));
  }, [edit]);

  const resetLayout = useCallback(() => {
    const next = { ...(preferences.toolbarLayouts ?? {}) };
    delete next[workspace];
    updatePreference('toolbarLayouts', next);
  }, [preferences.toolbarLayouts, updatePreference, workspace]);

  return { layout, customised: custom !== null, moveBarTo, moveToolInto, moveToolToNewBar: moveToolToNew, resizeBar, resetLayout };
}
