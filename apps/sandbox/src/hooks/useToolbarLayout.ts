import { useCallback, useEffect, useMemo } from 'react';
import {
  coerceToolbarLayout, defaultToolbarLayout, EXPORT_TOOLBAR_LAYOUT, moveBar, moveTool, moveToolToNewBar, normaliseLayout, setBarSize, usePreferences, withProjectTools, withTitleBar, withTitleBarItem, withTitleBarOnlyItems, withProjectRowMoves, PROJECT_TOOLS_HIDDEN_BY_DEFAULT,
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
  /** Any edit of the layout in force, stored for this workspace (the
   *  toolbar builder's, 2026-11-11) */
  editLayout: (change: (base: ToolbarLayout) => ToolbarLayout) => void;
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
export function useToolbarLayout(workspace: string, seedWorkspace: ToolbarWorkspace, activeMenuItem: string): UseToolbarLayoutReturn {
  const { preferences, updatePreference } = usePreferences();
  const stored = preferences.toolbarLayouts?.[workspace];
  // ONCE PER PROFILE (2026-11-11): a profile saved before the first row's
  // buttons moved out gets Mixer and Get effects hidden, as a new one has
  // them; after that the hidden list is the user's own again
  useEffect(() => {
    if (preferences.projectButtonsMoved) return;
    const hidden = new Set(preferences.toolbarHiddenTools ?? []);
    PROJECT_TOOLS_HIDDEN_BY_DEFAULT.forEach((id) => hidden.add(id));
    updatePreference('toolbarHiddenTools', [...hidden]);
    updatePreference('projectButtonsMoved', true);
  }, [preferences.projectButtonsMoved, preferences.toolbarHiddenTools, updatePreference]);
  // ONCE PER PROFILE (2026-11-16, the title bar's corner): DEBUG was drawn
  // in the title bar by hand; it is a corner item now, so every stored
  // layout gets it just after the tabs — after that it is the user's to
  // remove or move
  useEffect(() => {
    if (preferences.titleBarDebugAdded) return;
    const layouts = preferences.toolbarLayouts ?? {};
    const next: Record<string, unknown> = {};
    let changed = false;
    for (const [key, value] of Object.entries(layouts)) {
      const coerced = coerceToolbarLayout(value);
      if (!coerced) { next[key] = value; continue; }
      const added = withTitleBarItem(coerced, 'debug');
      if (added !== coerced) changed = true;
      next[key] = added;
    }
    if (changed) updatePreference('toolbarLayouts', next as typeof layouts);
    updatePreference('titleBarDebugAdded', true);
  }, [preferences.titleBarDebugAdded, preferences.toolbarLayouts, updatePreference]);
  const custom = useMemo(() => coerceToolbarLayout(stored), [stored]);
  const layout = useMemo(() => {
    if (activeMenuItem === 'export') return EXPORT_TOOLBAR_LAYOUT;
    // (the cog is NOT put back since 2026-11-16 — it removes like any tool,
    // and a right-click on any toolbar opens the builder)
    return normaliseLayout(withTitleBarOnlyItems(withTitleBar(withProjectRowMoves(withProjectTools(custom ?? defaultToolbarLayout(seedWorkspace))))));
  }, [activeMenuItem, custom, seedWorkspace]);

  // One edit of the layout in force, stored for this workspace
  const edit = useCallback((change: (base: ToolbarLayout) => ToolbarLayout) => {
    if (activeMenuItem === 'export') return;
    const base = withTitleBarOnlyItems(withTitleBar(withProjectRowMoves(withProjectTools(custom ?? defaultToolbarLayout(seedWorkspace)))));
    const next = change(base);
    if (next === base) return;
    updatePreference('toolbarLayouts', { ...(preferences.toolbarLayouts ?? {}), [workspace]: next });
  }, [activeMenuItem, custom, preferences.toolbarLayouts, updatePreference, workspace, seedWorkspace]);

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

  return { layout, customised: custom !== null, moveBarTo, moveToolInto, moveToolToNewBar: moveToolToNew, resizeBar, resetLayout, editLayout: edit };
}
