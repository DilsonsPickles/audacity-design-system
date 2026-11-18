import type { PreferencesState, ToolbarLayout, ToolbarWorkspace } from '@audacity-ui/components';

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

/** What Reset workspace to default puts back: the layout (null = the
 *  base's seed, by deleting the stored one), the hidden tools and the tab
 *  orientation */
export interface WorkspaceResetState {
  layout: ToolbarLayout | null;
  hidden: string[];
  tabsVertical: boolean;
}

/**
 * RESETTING A WORKSPACE YOU MADE GOES BACK TO HOW YOU MADE IT (2026-11-19,
 * "Should resetting a workspace you made go back to how it was when you made
 * it?" → "Yes, change it" — a made workspace reset to its BASE's seed, so
 * resetting "Studio" turned it into Classic and lost it): a workspace made
 * since then keeps its starting state (`CustomWorkspace.start`) and resets to
 * that; a built-in, or a made one from before, resets to the seed as before.
 */
export function workspaceResetState(
  preferences: Pick<PreferencesState, 'customWorkspaces'>,
  workspace: string,
  defaultHidden: readonly string[],
): WorkspaceResetState {
  const start = (preferences.customWorkspaces ?? []).find((w) => w.id === workspace)?.start;
  if (start) return { layout: start.layout, hidden: [...start.hidden], tabsVertical: !!start.tabsVertical };
  return { layout: null, hidden: [...defaultHidden], tabsVertical: false };
}
