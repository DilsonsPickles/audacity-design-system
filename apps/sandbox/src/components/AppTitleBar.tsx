import React from 'react';
import { Button, useTheme } from '@audacity-ui/components';
import { ProjectTabs, renderProjectTool, type ProjectBarToolsDeps } from './ProjectBarTools';

/**
 * THE APP'S OWN TITLE BAR (2026-11-11, "a custom app header which includes
 * the electron window's three dots. Like the Figma header where the project
 * tab header is part of the application shell"): on macOS the desktop shell
 * hides the native title bar (main.cjs, titleBarStyle 'hiddenInset') and
 * this 32px row takes its place — the traffic lights inset over its left
 * end (TRAFFIC_LIGHTS_PX keeps them clear), then the Home and project tabs,
 * Figma's document tabs. The row is the window's DRAG REGION; the tabs are
 * not (`-webkit-app-region: no-drag`), so they take clicks. A double-click
 * on the empty bar zooms the window, as the native bar did.
 *
 * Drawn when the shell says so (`electronShell.customTitleBar`), or in a
 * browser for a preview with localStorage `audacity-title-bar` = '1'.
 */
export const TRAFFIC_LIGHTS_PX = 76;

// THE RIGHT END (2026-11-11, the first row's buttons moved out): the
// WORKSPACE picker, then SHARE AUDIO as the primary button — Figma's file-
// level controls; both honour Customise toolbar's hidden list, and both are
// out of the window's drag region so they take clicks.
export function AppTitleBar({ deps, insetForTrafficLights, vibrancy = false }: { deps: ProjectBarToolsDeps; insetForTrafficLights: boolean; vibrancy?: boolean }) {
  const { activeMenuItem, onNavigate, projectTitle } = deps;
  const { theme } = useTheme();
  return (
    <div
      className="app-title-bar"
      data-app-title-bar
      data-vibrancy={vibrancy || undefined}
      style={{
        // The ACTIVE tab is the TOOLBAR'S OWN colour (`background.toolbar`,
        // "primary bg") so it runs into the toolbar below, Figma's; the BAR
        // is that colour 10% darker — derived, so it is the darker of the
        // two in BOTH themes (2026-11-11: surface.elevated / surface.default
        // matched in light only — in dark the toolbar is #2E353C, and
        // elevated is the LIGHTER grey). Over the window's vibrancy the bar
        // is a light tint of it, so the native glass shows through.
        '--app-title-bar-bg': vibrancy
          ? `color-mix(in srgb, color-mix(in srgb, ${theme.background.toolbar}, black 10%) 35%, transparent)`
          : `color-mix(in srgb, ${theme.background.toolbar}, black 10%)`,
        '--app-title-bar-active': theme.background.toolbar,
        '--app-title-bar-border': theme.border.onSurface,
        paddingLeft: insetForTrafficLights ? TRAFFIC_LIGHTS_PX : 0,
      } as React.CSSProperties}
    >
      <ProjectTabs activeMenuItem={activeMenuItem} onNavigate={onNavigate} projectTitle={projectTitle} />
      {activeMenuItem !== 'home' && (
        <div className="app-title-bar__end" data-app-title-bar-end>
          {renderProjectTool('workspace', 'horizontal', { ...deps, tabsInTitleBar: false })}
          {!deps.hidden.has('share-audio') && (
            <Button variant="primary" size="small" onClick={() => deps.onShareAudio()}>Share audio</Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Whether the app draws its own title bar */
export function hasCustomTitleBar(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.electronShell?.customTitleBar) return true;
  try { return window.localStorage.getItem('audacity-title-bar') === '1'; } catch { return false; }
}
