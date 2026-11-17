import type { PreferencesState, ToolbarWorkspace } from '@audacity-ui/components';

/** The built-in workspaces, in the workspace menu's order, by their display names */
export const WORKSPACE_NAMES: Record<ToolbarWorkspace, string> = {
  music: 'Music',
  classic: 'Classic',
  modern: 'Modern',
  'spectral-editing': 'Spectral editing',
};

export const isBuiltinWorkspace = (id: string | undefined): id is ToolbarWorkspace => !!id && id in WORKSPACE_NAMES;

/** The workspace in use, by id: the stored one if it still exists, else Classic */
export function activeWorkspaceId(preferences: Pick<PreferencesState, 'activeWorkspace' | 'customWorkspaces'>): string {
  const id = preferences.activeWorkspace;
  return isBuiltinWorkspace(id) || (preferences.customWorkspaces ?? []).some((w) => w.id === id) ? id : 'classic';
}

/**
 * A workspace's hidden tools (2026-11-17, "1 and 2" — each workspace keeps
 * its own): its entry in `workspaceHiddenTools`, else the old shared list
 * (`toolbarHiddenTools`), which every workspace starts from until its own
 * list is first changed.
 */
export function hiddenToolsOf(preferences: Pick<PreferencesState, 'workspaceHiddenTools' | 'toolbarHiddenTools'>, workspace: string): string[] {
  return preferences.workspaceHiddenTools?.[workspace] ?? preferences.toolbarHiddenTools ?? [];
}
