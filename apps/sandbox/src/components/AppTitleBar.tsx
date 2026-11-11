import React from 'react';
import { useTheme } from '@audacity-ui/components';
import { ProjectTabs, type ProjectBarToolsDeps } from './ProjectBarTools';

/**
 * THE APP'S OWN TITLE BAR (2026-11-11, "a custom app header which includes
 * the electron window's three dots. Like the Figma header where the project
 * tab header is part of the application shell"): on macOS the desktop shell
 * hides the native title bar (main.cjs, titleBarStyle 'hiddenInset') and
 * this 40px row takes its place — the traffic lights inset over its left
 * end (TRAFFIC_LIGHTS_PX keeps them clear), then the Home and project tabs,
 * Figma's document tabs. The row is the window's DRAG REGION; the tabs are
 * not (`-webkit-app-region: no-drag`), so they take clicks. A double-click
 * on the empty bar zooms the window, as the native bar did.
 *
 * Drawn when the shell says so (`electronShell.customTitleBar`), or in a
 * browser for a preview with localStorage `audacity-title-bar` = '1'.
 */
export const TRAFFIC_LIGHTS_PX = 80;

export function AppTitleBar({ activeMenuItem, onNavigate, projectTitle, insetForTrafficLights }: Pick<ProjectBarToolsDeps, 'activeMenuItem' | 'onNavigate' | 'projectTitle'> & { insetForTrafficLights: boolean }) {
  const { theme } = useTheme();
  return (
    <div
      className="app-title-bar"
      data-app-title-bar
      style={{
        '--app-title-bar-bg': theme.background.toolbar,
        '--app-title-bar-border': theme.border.onSurface,
        paddingLeft: insetForTrafficLights ? TRAFFIC_LIGHTS_PX : 0,
      } as React.CSSProperties}
    >
      <ProjectTabs activeMenuItem={activeMenuItem} onNavigate={onNavigate} projectTitle={projectTitle} />
    </div>
  );
}

/** Whether the app draws its own title bar */
export function hasCustomTitleBar(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.electronShell?.customTitleBar) return true;
  try { return window.localStorage.getItem('audacity-title-bar') === '1'; } catch { return false; }
}
