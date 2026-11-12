import React from 'react';
import { ContextMenu, ContextMenuItem, GhostButton, useTheme } from '@audacity-ui/components';
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
export const TRAFFIC_LIGHTS_PX = 76;

// THE RIGHT END (2026-11-11, the first row's buttons moved out): the
// WORKSPACE picker, then SHARE AUDIO, flat buttons — Figma's file-
// level controls; both honour Customise toolbar's hidden list, and both are
// out of the window's drag region so they take clicks.
export function AppTitleBar({ deps, insetForTrafficLights, vibrancy = false }: { deps: ProjectBarToolsDeps; insetForTrafficLights: boolean; vibrancy?: boolean }) {
  const { activeMenuItem } = deps;
  // THE WORKSPACE IS MUSESCORE'S "Workspace: Default" (2026-11-11, "can we
  // do workspace: Default like MSS does?" → in the title bar, same spot):
  // ONE flat button — the workspace icon and "Workspace: <name>" — opening
  // a menu of the workspaces, the current one checked. It replaced a
  // "Workspace" label beside a dropdown.
  const [workspaceMenu, setWorkspaceMenu] = React.useState<{ x: number; y: number } | null>(null);
  const workspaceName = deps.workspaceOptions.find((o) => o.value === deps.workspace)?.label ?? deps.workspace;
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
        // The short dividers between the right-hand controls: the text
        // colour at 20%, so they read on the bar in either theme (the
        // border colour is lighter than the bar in light mode)
        '--app-title-bar-divider': `color-mix(in srgb, ${theme.foreground.text.primary} 20%, transparent)`,
        paddingLeft: insetForTrafficLights ? TRAFFIC_LIGHTS_PX : 0,
      } as React.CSSProperties}
    >
      <ProjectTabs {...deps} />
      {activeMenuItem !== 'home' && (
        <div className="app-title-bar__end" data-app-title-bar-end>
          {/* AUDIO SETUP in the same style (the same day, "can we also try
              doing the audio setup in that style?"): a flat cog-and-label
              button, opening the Audio setup menu under it */}
          {!deps.hidden.has('audio-setup') && (
            <GhostButton
              icon="cog"
              size="compact"
              label="Audio setup"
              ariaLabel="Audio setup"
              onClick={(e) => {
                // One title-bar menu at a time (2026-11-11, "if I click
                // workspaces and then audio setup, the workspace dropdown
                // isn't hiding")
                setWorkspaceMenu(null);
                const r = e.currentTarget.getBoundingClientRect();
                deps.onAudioSetup({ x: r.left, y: r.bottom + 4 });
              }}
            />
          )}
          {!deps.hidden.has('workspace') && (
            <div className="project-workspace" data-project-tool="workspace">
              <GhostButton
                icon="workspace"
                size="compact"
                label={`Workspace: ${workspaceName}`}
                ariaLabel={`Workspace: ${workspaceName}`}
                active={workspaceMenu !== null}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setWorkspaceMenu((open) => (open ? null : { x: r.left, y: r.bottom + 4 }));
                }}
              />
              <ContextMenu isOpen={workspaceMenu !== null} onClose={() => setWorkspaceMenu(null)} x={workspaceMenu?.x ?? 0} y={workspaceMenu?.y ?? 0} portalTo={typeof document === 'undefined' ? null : document.body}>
                {deps.workspaceOptions.map((o) => (
                  <ContextMenuItem
                    key={o.value}
                    label={o.label}
                    checked={o.value === deps.workspace}
                    onClick={() => deps.onWorkspacePick(o.value)}
                    onClose={() => setWorkspaceMenu(null)}
                  />
                ))}
              </ContextMenu>
            </div>
          )}
          {!deps.hidden.has('share-audio') && (
            // The flat style of Audio setup and Workspace (the same day,
            // "make the share audio the same style as setup and workspace";
            // it was a secondary Button, a primary one before that)
            <GhostButton icon="cloud" size="compact" label="Share audio" ariaLabel="Share audio" onClick={() => deps.onShareAudio()} />
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
