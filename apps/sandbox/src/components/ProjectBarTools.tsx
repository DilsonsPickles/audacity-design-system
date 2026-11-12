import React from 'react';
import { Dropdown, GhostButton, Icon, Tab, ToolButton, useTheme, type ToolMeta, type ToolbarOrientation } from '@audacity-ui/components';

type MenuItem = 'home' | 'project' | 'export' | 'debug';

export interface ProjectBarToolsDeps {
  activeMenuItem: MenuItem;
  onNavigate: (item: MenuItem) => void;
  showMixer: boolean;
  onToggleMixer: () => void;
  onAudioSetup: (anchor: { x: number; y: number }) => void;
  onShareAudio: () => void;
  onGetEffects: (anchorRect: DOMRect) => void;
  workspace: string;
  workspaceOptions: ReadonlyArray<{ value: string; label: string }>;
  onWorkspacePick: (next: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  /** The tools hidden in Customise toolbar (the tabs cannot be) */
  hidden: ReadonlySet<string>;
  /** The open project's title, the Project tab's text (2026-11-11) */
  projectTitle?: string;
  /** The open projects, one tab each (2026-11-12); absent = one Project tab */
  projectTabs?: ProjectTabInfo[];
  /** The project the editor is showing */
  activeProjectId?: string | null;
  onSelectProject?: (id: string) => void;
  onCloseProject?: (id: string) => void;
  /** A tab dragged along the bar puts the tabs in a new order (2026-11-12) */
  onReorderProjects?: (ids: string[]) => void;
  /** The + after the tabs: a new project in a new tab */
  onNewProject?: () => void;
  /** The tabs, the workspace picker and Share audio live in the app's
   *  title bar (AppTitleBar), not the docks */
  tabsInTitleBar?: boolean;
}

/** One open project's tab (2026-11-12, the project tabs) */
export interface ProjectTabInfo {
  id: string;
  title: string;
}

type ProjectTabsProps = Pick<ProjectBarToolsDeps, 'activeMenuItem' | 'onNavigate' | 'projectTitle' | 'projectTabs' | 'activeProjectId' | 'onSelectProject' | 'onCloseProject' | 'onReorderProjects' | 'onNewProject'>;

/** Pointer travel before a press on a tab becomes a drag */
const TAB_DRAG_THRESHOLD_PX = 4;

/**
 * A TAB DRAGGED ALONG THE BAR REORDERS THE TABS (2026-11-12): past the
 * threshold the press is a drag, and the order follows the pointer live —
 * the dragged tab takes the slot whose neighbour's middle it has passed —
 * so the tab stays under the pointer as the others step aside; the click
 * that ends a drag selects nothing. Pointer capture keeps the drag going
 * off the bar.
 */
function useTabReorder(ids: string[], onReorder: ((ids: string[]) => void) | undefined) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const suppressClickRef = React.useRef(false);
  const idsRef = React.useRef(ids);
  idsRef.current = ids;

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onReorder || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-project-tab-close]')) return;
    const startX = e.clientX;
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) < TAB_DRAG_THRESHOLD_PX) return;
        dragging = true;
        suppressClickRef.current = true;
        setDraggingId(id);
        try { el.setPointerCapture(pointerId); } catch { /* the press has ended */ }
      }
      const tabs = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-project-tab]') ?? []);
      const current = idsRef.current;
      const from = current.indexOf(id);
      let to = from;
      tabs.forEach((tab) => {
        const other = tab.getAttribute('data-project-tab');
        if (!other || other === id) return;
        const r = tab.getBoundingClientRect();
        const mid = r.left + r.width / 2;
        const i = current.indexOf(other);
        if (i < from && ev.clientX < mid) to = Math.min(to, i);
        if (i > from && ev.clientX > mid) to = Math.max(to, i);
      });
      if (to !== from) {
        const next = current.filter((x) => x !== id);
        next.splice(to, 0, id);
        idsRef.current = next;
        onReorder(next);
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (dragging) {
        setDraggingId(null);
        // the click that ends the drag lands after this — let it pass first
        setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    e.stopPropagation();
    e.preventDefault();
  };

  return { containerRef, draggingId, onPointerDown, onClickCapture };
}

/**
 * The Home and project tabs — the docks' tabs tool and the title bar's.
 * THE TABS ARE FIGMA'S DOCUMENT TABS (2026-11-11): Home a house alone, then
 * the open projects. ONE TAB PER OPEN PROJECT since 2026-11-12 ("two
 * projects open using different tabs in the same electron window? Like
 * Figma!"): each its icon and title, a close × on hover (always on the
 * active one), a middle-click closes it too, and a + after the last opens
 * a new project in a new tab. A host that passes no `projectTabs` gets the
 * old single Project tab.
 */
export function ProjectTabs({ activeMenuItem, onNavigate, projectTitle, projectTabs, activeProjectId, onSelectProject, onCloseProject, onReorderProjects, onNewProject }: ProjectTabsProps) {
  const inProject = activeMenuItem !== 'home';
  const reorder = useTabReorder(projectTabs?.map((p) => p.id) ?? [], onReorderProjects);
  const { theme } = useTheme();
  // The × and the + take the THEME'S colours, the tabs' own (2026-11-12,
  // "icons in top bar area are black in dark mode": they inherited the
  // page's black): the active tab's × the primary text, the rest secondary
  const colours = {
    '--project-tabs-text': theme.foreground.text.primary,
    '--project-tabs-text-secondary': theme.foreground.text.secondary,
  } as React.CSSProperties;
  return (
    // ("Main menu": F6's section walk and the status bar find it by name)
    <div className="project-tabs" role="group" aria-label="Main menu" data-project-tool="tabs" ref={reorder.containerRef} onClickCapture={reorder.onClickCapture} style={colours}>
      <Tab
        variant="document"
        label="Home"
        icon={<Icon name="home" size={16} />}
        iconOnly
        isActive={activeMenuItem === 'home'}
        onClick={() => onNavigate('home')}
      />
      {projectTabs && onSelectProject ? (
        <>
          {projectTabs.map((p) => {
            const active = inProject && p.id === activeProjectId;
            return (
              <div
                key={p.id}
                className={`project-tab${active ? ' project-tab--active' : ''}${reorder.draggingId === p.id ? ' project-tab--dragging' : ''}`}
                data-project-tab={p.id}
                onPointerDown={reorder.onPointerDown(p.id)}
                onAuxClick={(e) => { if (e.button === 1 && onCloseProject) { e.preventDefault(); onCloseProject(p.id); } }}
              >
                <Tab
                  variant="document"
                  label={p.title}
                  icon={<Icon name="waveform" size={16} />}
                  isActive={active}
                  onClick={() => onSelectProject(p.id)}
                />
                {onCloseProject && (
                  <button
                    type="button"
                    className="project-tab__close"
                    aria-label={`Close ${p.title}`}
                    data-project-tab-close={p.id}
                    tabIndex={active ? 0 : -1}
                    onClick={(e) => { e.stopPropagation(); onCloseProject(p.id); }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {onNewProject && (
            <button type="button" className="project-tabs__new" aria-label="New project" data-project-tab-new onClick={onNewProject}>
              <Icon name="plus" size={16} />
            </button>
          )}
        </>
      ) : (
        <Tab
          variant="document"
          label={projectTitle || 'Untitled project'}
          icon={<Icon name="waveform" size={16} />}
          isActive={inProject}
          onClick={() => onNavigate('project')}
        />
      )}
    </div>
  );
}

/**
 * THE PROJECT TOOLBAR'S PIECES AS TOOLS (2026-11-10, "bring those into the
 * toolbar layout chaos"): the tabs, the four actions, the workspace picker
 * and undo and redo, drawn wherever the docks put them. The ids are seeded
 * by components' defaultToolbarLayout as the top dock's first row. In a
 * side dock the actions and the history are their icons alone; the tabs
 * and the workspace picker have no vertical form. Null for any other id.
 */
export function renderProjectTool(id: string, orientation: ToolbarOrientation, deps: ProjectBarToolsDeps): React.ReactNode {
  const vertical = orientation === 'vertical';
  // Hidden in Customise toolbar: drawn nowhere (the tabs are never hidden)
  if (id !== 'project-tabs' && deps.hidden.has(id)) return null;
  const action = (icon: React.ComponentProps<typeof GhostButton>['icon'], label: string, onClick: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <GhostButton icon={icon} ariaLabel={label} label={vertical ? undefined : label} size={vertical ? 'medium' : undefined} onClick={onClick} />
  );
  switch (id) {
    case 'project-tabs':
      // In the title bar instead when the app draws one (2026-11-11)
      return deps.tabsInTitleBar ? null : <ProjectTabs {...deps} />;
    case 'mixer-button':
      return deps.showMixer ? action('mixer', 'Mixer', () => deps.onToggleMixer()) : null;
    case 'audio-setup':
      // In the title bar instead when the app draws one (2026-11-11)
      if (deps.tabsInTitleBar) return null;
      // AN ICON BUTTON BESIDE THE METERS since 2026-11-11 — the toolbar's
      // standard 28px button, as its neighbours the mic and volume are;
      // its name stays "Audio setup" for the screen reader and status bar
      // (ToolButton's click carries no event: the wrapper's gives the
      // menu its anchor, a keyboard press included — its click bubbles)
      return (
        <span
          style={{ display: 'inline-flex' }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            deps.onAudioSetup({ x: r.left, y: r.bottom + 4 });
          }}
        >
          <ToolButton icon="cog" ariaLabel="Audio setup" />
        </span>
      );
    case 'share-audio':
      // In the title bar instead when the app draws one (2026-11-11)
      if (deps.tabsInTitleBar) return null;
      return action('cloud', 'Share audio', () => deps.onShareAudio());
    case 'get-effects':
      return action('plugins', 'Get effects', (e) => deps.onGetEffects(e.currentTarget.getBoundingClientRect()));
    case 'workspace':
      if (deps.tabsInTitleBar) return null;
      return (
        <div className="project-workspace" data-project-tool="workspace" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Workspace</span>
          <Dropdown value={deps.workspace} width="162px" options={[...deps.workspaceOptions]} onChange={deps.onWorkspacePick} />
        </div>
      );
    // Two tools, each the toolbar's standard icon button (2026-11-10, "undo
    // and redo can be two separate buttons. Make them use the standard icon
    // button that the other tools do")
    case 'undo':
      return <ToolButton icon="undo" ariaLabel="Undo" onClick={() => deps.onUndo()} />;
    case 'redo':
      return <ToolButton icon="redo" ariaLabel="Redo" onClick={() => deps.onRedo()} />;
    default:
      return null;
  }
}

/** The project tools' meta: the tabs and the workspace picker are a row's only */
export function projectToolMeta(id: string): ToolMeta | undefined {
  switch (id) {
    case 'project-tabs': case 'workspace': return { vertical: false };
    case 'mixer-button': case 'audio-setup': case 'share-audio': case 'get-effects': case 'undo': case 'redo': return { vertical: true };
    default: return undefined;
  }
}
