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

// THE RIGHT END (2026-11-11, the first row's buttons moved out) — THE
// CORNER since 2026-11-16: the layout's app-level title bar items (Debug,
// Audio setup, Workspace, Share audio, Get effects, Mixer) in the user's
// order, flat compact buttons, out of the window's drag region so they take
// clicks; each honours the hidden list.
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
      {/* VERTICAL TABS (2026-11-16): the rail holds the projects and marks the
          one in front, so the title bar shows no tabs and no name ("we can
          get rid of title in the header when in vertical tabs") */}
      {!deps.tabsVertical && <ProjectTabs {...deps} />}
      {activeMenuItem !== 'home' && (
        // THE CORNER (2026-11-16, "that area at the top right with debug,
        // setup, get effects etc is a special area"): the layout's title bar
        // items, in their order — app-level controls only, never an editing
        // tool. A right-click here is the corner's checklist (ToolbarBarMenu
        // for the Title bar), Edit toolbars… among it.
        <div
          className="app-title-bar__end"
          data-app-title-bar-end
          onContextMenu={(e) => {
            if (!deps.onTitleBarMenu) return;
            e.preventDefault();
            setWorkspaceMenu(null);
            deps.onTitleBarMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          {(deps.titleItems ?? []).filter((id) => !deps.hidden.has(id)).map((id) => {
            switch (id) {
              case 'debug':
                return deps.onOpenDebug ? (
                  <GhostButton key={id} icon="menu" size="compact" label="Debug" ariaLabel="Debug panel"
                    onClick={() => { setWorkspaceMenu(null); deps.onOpenDebug?.(); }} />
                ) : null;
              case 'audio-setup':
                return (
                  <GhostButton key={id} icon="cog" size="compact" label="Audio setup" ariaLabel="Audio setup"
                    onClick={(e) => {
                      // One title-bar menu at a time (2026-11-11)
                      setWorkspaceMenu(null);
                      const r = e.currentTarget.getBoundingClientRect();
                      deps.onAudioSetup({ x: r.left, y: r.bottom + 4 });
                    }} />
                );
              case 'workspace':
                return (
                  <div key={id} className="project-workspace" data-project-tool="workspace">
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
                      {deps.onResetWorkspace && (
                        <>
                          <ContextMenuItem isDivider />
                          <ContextMenuItem
                            label="Reset workspace to default"
                            onClick={() => deps.onResetWorkspace?.()}
                            onClose={() => setWorkspaceMenu(null)}
                          />
                        </>
                      )}
                    </ContextMenu>
                  </div>
                );
              case 'share-audio':
                return <GhostButton key={id} icon="cloud" size="compact" label="Share audio" ariaLabel="Share audio" onClick={() => deps.onShareAudio()} />;
              case 'get-effects':
                return (
                  <GhostButton key={id} icon="plugins" size="compact" label="Get effects" ariaLabel="Get effects"
                    onClick={(e) => { setWorkspaceMenu(null); deps.onGetEffects(e.currentTarget.getBoundingClientRect()); }} />
                );
              case 'mixer-button':
                return deps.showMixer ? <GhostButton key={id} icon="mixer" size="compact" label="Mixer" ariaLabel="Mixer" onClick={() => deps.onToggleMixer()} /> : null;
              default:
                return null;
            }
          })}
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
