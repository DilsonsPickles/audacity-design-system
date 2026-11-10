import React from 'react';
import { Dropdown, GhostButton, Tab, type ToolMeta, type ToolbarOrientation } from '@audacity-ui/components';

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
}

const TABS: ReadonlyArray<{ id: MenuItem; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'project', label: 'Project' },
  { id: 'export', label: 'Export' },
  { id: 'debug', label: 'Debug' },
];

/**
 * THE PROJECT TOOLBAR'S PIECES AS TOOLS (2026-11-10, "bring those into the
 * toolbar layout chaos"): the tabs, the four actions, the workspace picker
 * and undo / redo, drawn wherever the docks put them. The ids are seeded
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
      return (
        // ("Main menu": F6's section walk and the status bar find it by name)
        <div className="project-tabs" role="group" aria-label="Main menu" data-project-tool="tabs">
          {TABS.map((t) => (
            <Tab key={t.id} label={t.label} isActive={deps.activeMenuItem === t.id} onClick={() => deps.onNavigate(t.id)} />
          ))}
        </div>
      );
    case 'mixer-button':
      return deps.showMixer ? action('mixer', 'Mixer', () => deps.onToggleMixer()) : null;
    case 'audio-setup':
      return action('cog', 'Audio setup', (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        deps.onAudioSetup({ x: r.left, y: r.bottom + 4 });
      });
    case 'share-audio':
      return action('cloud', 'Share audio', () => deps.onShareAudio());
    case 'get-effects':
      return action('plugins', 'Get effects', (e) => deps.onGetEffects(e.currentTarget.getBoundingClientRect()));
    case 'workspace':
      return (
        <div className="project-workspace" data-project-tool="workspace" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Workspace</span>
          <Dropdown value={deps.workspace} width="162px" options={[...deps.workspaceOptions]} onChange={deps.onWorkspacePick} />
        </div>
      );
    case 'undo-redo':
      return (
        <div style={{ display: 'inline-flex', flexDirection: vertical ? 'column' : 'row', gap: 4 }} data-project-tool="history">
          <GhostButton icon="undo" ariaLabel="Undo" size="medium" onClick={() => deps.onUndo()} />
          <GhostButton icon="redo" ariaLabel="Redo" size="medium" onClick={() => deps.onRedo()} />
        </div>
      );
    default:
      return null;
  }
}

/** The project tools' meta: the tabs and the workspace picker are a row's only */
export function projectToolMeta(id: string): ToolMeta | undefined {
  switch (id) {
    case 'project-tabs': case 'workspace': return { vertical: false };
    case 'mixer-button': case 'audio-setup': case 'share-audio': case 'get-effects': case 'undo-redo': return { vertical: true };
    default: return undefined;
  }
}
