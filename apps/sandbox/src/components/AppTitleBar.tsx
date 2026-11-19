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
/** A project tab's least width (index.css `.project-tab` min-width) */
const TAB_MIN_PX = 96;
/** The extra room a label waits for before it comes back */
const COMPACT_HYSTERESIS_PX = 24;
/** Stage changes allowed before the next task (a guard against a loop) */
const MAX_COMPACT_CHANGES = 4;

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
  // THE LABELS GO WHEN THE BAR RUNS OUT OF ROOM (2026-11-19, "When we get
  // down to smaller screen sizes, can the title bar buttons lose their
  // labels? This behaviour can be seen in the real build"): the real build's
  // top bar goes compact toolbar by toolbar in `compactPriorityOrder`
  // (ProjectPage.qml) — the Workspaces toolbar first, then the Project
  // toolbar's buttons. Here: once the tabs are squeezed to their least and
  // nothing is left, stage 1 takes the Workspace label, stage 2 every other
  // corner button's; each label comes back once the room it needs (measured
  // as it went) is free again, with a margin so the edge does not flicker
  const barRef = React.useRef<HTMLDivElement>(null);
  const [compact, setCompact] = React.useState<0 | 1 | 2>(0);
  const compactRef = React.useRef(compact);
  compactRef.current = compact;
  const savedRef = React.useRef<[number, number, number]>([0, 0, 0]);
  const pendingRef = React.useRef<{ stage: 1 | 2; before: number } | null>(null);
  // NEVER A LOOP (2026-11-19 — the first cut measured the corner's width
  // two ways, read a squeezed one as the label's saving, and flipped
  // stages until React aborted the app): the widths are both the corner's
  // full content width, and at most MAX_COMPACT_CHANGES stage changes run
  // before the next task; past that the stage is left as it is
  const changesRef = React.useRef(0);
  const mayChange = () => {
    if (changesRef.current === 0) setTimeout(() => { changesRef.current = 0; }, 0);
    changesRef.current += 1;
    return changesRef.current <= MAX_COMPACT_CHANGES;
  };
  const measureCompact = React.useCallback(() => {
    const bar = barRef.current;
    const end = bar?.querySelector<HTMLElement>('.app-title-bar__end');
    if (!bar || !end) return;
    const stage = compactRef.current;
    const pending = pendingRef.current;
    if (pending && pending.stage === stage) {
      savedRef.current[stage] = Math.max(0, pending.before - end.scrollWidth);
      pendingRef.current = null;
    }
    // the room left once every project tab is at its least: the bar's own
    // inset, the Home tab and + button as they are, each project tab at
    // TAB_MIN_PX, and the corner at its full width — independent of how the
    // browser happens to share the room out between tabs and corner
    const tabs = bar.querySelector<HTMLElement>('.project-tabs');
    const tabsLeast = tabs
      ? Array.from(tabs.children).reduce((sum, c) => sum + (c.classList.contains('project-tab') ? TAB_MIN_PX : (c as HTMLElement).offsetWidth), 0)
      : 0;
    const inset = parseFloat(getComputedStyle(bar).paddingLeft) || 0;
    const slack = bar.clientWidth - (inset + tabsLeast + end.scrollWidth);
    if (slack < 0 && stage < 2) {
      if (!mayChange()) return;
      pendingRef.current = { stage: (stage + 1) as 1 | 2, before: end.scrollWidth };
      setCompact((stage + 1) as 1 | 2);
    } else if (stage > 0 && slack > savedRef.current[stage] + COMPACT_HYSTERESIS_PX) {
      if (!mayChange()) return;
      setCompact((stage - 1) as 0 | 1);
    }
  }, []);
  React.useLayoutEffect(() => { measureCompact(); });
  React.useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureCompact());
    ro.observe(bar);
    return () => ro.disconnect();
  }, [measureCompact]);
  const labelOf = (label: string) => (compact >= 2 ? undefined : label);
  return (
    <div
      ref={barRef}
      data-compact={compact || undefined}
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
      // THE BAR'S EMPTY STRIP TAKES A RIGHT-CLICK TOO (2026-11-17): the
      // corner's checklist, from anywhere on the bar that nothing else
      // claimed — the tabs' and the corner's own handlers preventDefault
      // first, so they keep their menus
      onContextMenu={(e) => {
        if (e.defaultPrevented || !deps.onTitleBarMenu) return;
        e.preventDefault();
        setWorkspaceMenu(null);
        deps.onTitleBarMenu({ x: e.clientX, y: e.clientY });
      }}
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
                  <GhostButton key={id} icon="menu" size="compact" label={labelOf('Debug')} ariaLabel="Debug panel"
                    onClick={() => { setWorkspaceMenu(null); deps.onOpenDebug?.(); }} />
                ) : null;
              case 'audio-setup':
                return (
                  <GhostButton key={id} icon="cog" size="compact" label={labelOf('Audio setup')} ariaLabel="Audio setup"
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
                      // THE UNSAVED DOT (2026-11-19): a made workspace that
                      // has drifted from its saved state
                      label={compact >= 1 ? undefined : `Workspace: ${workspaceName}${deps.workspaceModified ? ' •' : ''}`}
                      ariaLabel={`Workspace: ${workspaceName}${deps.workspaceModified ? ', unsaved changes' : ''}`}
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
                      <ContextMenuItem isDivider />
                      {deps.onNewWorkspace && (
                        <ContextMenuItem label="New workspace…" onClick={() => deps.onNewWorkspace?.()} onClose={() => setWorkspaceMenu(null)} />
                      )}
                      {deps.onRenameWorkspace && (
                        <ContextMenuItem label="Rename workspace…" onClick={() => deps.onRenameWorkspace?.()} onClose={() => setWorkspaceMenu(null)} />
                      )}
                      {deps.onDeleteWorkspace && (
                        <ContextMenuItem label="Delete workspace" onClick={() => deps.onDeleteWorkspace?.()} onClose={() => setWorkspaceMenu(null)} />
                      )}
                      {deps.onSaveWorkspace && (
                        <ContextMenuItem
                          label="Save changes to workspace"
                          disabled={!deps.workspaceModified}
                          onClick={() => deps.onSaveWorkspace?.()}
                          onClose={() => setWorkspaceMenu(null)}
                        />
                      )}
                      {deps.onResetWorkspace && (
                        <ContextMenuItem
                          label={deps.resetWorkspaceLabel ?? 'Reset workspace to default'}
                          onClick={() => deps.onResetWorkspace?.()}
                          onClose={() => setWorkspaceMenu(null)}
                        />
                      )}
                    </ContextMenu>
                  </div>
                );
              case 'share-audio':
                return <GhostButton key={id} icon="cloud" size="compact" label={labelOf('Share audio')} ariaLabel="Share audio" onClick={() => deps.onShareAudio()} />;
              case 'get-effects':
                return (
                  <GhostButton key={id} icon="plugins" size="compact" label={labelOf('Get effects')} ariaLabel="Get effects"
                    onClick={(e) => { setWorkspaceMenu(null); deps.onGetEffects(e.currentTarget.getBoundingClientRect()); }} />
                );
              case 'mixer-button':
                return deps.showMixer ? <GhostButton key={id} icon="mixer" size="compact" label={labelOf('Mixer')} ariaLabel="Mixer" onClick={() => deps.onToggleMixer()} /> : null;
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
