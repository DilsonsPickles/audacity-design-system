import React from 'react';
import { ProjectToolbar, type TransportToolbarProps } from '@dilsonspickles/components';
import { useDialogs } from '../contexts/DialogContext';
import { useTracks } from '../contexts/TracksContext';
import { getProjects } from '../utils/projectDatabase';
import type { StoredProject } from '@dilsonspickles/components';

// TransportToolbar is the module that owns the Workspace union — reuse its
// type rather than duplicating the literal list here.
type Workspace = TransportToolbarProps['workspace'];

export interface ProjectToolbarContainerProps {
  activeMenuItem: 'home' | 'project' | 'export' | 'debug';
  setActiveMenuItem: React.Dispatch<React.SetStateAction<'home' | 'project' | 'export' | 'debug'>>;
  setHomeTabKey: React.Dispatch<React.SetStateAction<number>>;
  setIndexedDBProjects: React.Dispatch<React.SetStateAction<StoredProject[]>>;
  currentProjectId: string | null;
  createNewProject: () => Promise<string>;

  // Center actions
  showMixer: boolean;
  setMixerPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAudioSetupMenuAnchor: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setMarketplaceModal: React.Dispatch<React.SetStateAction<{
    open: boolean;
    trackIndex?: number;
    anchorRect?: DOMRect | null;
    replaceIndex?: number;
  }>>;

  // Workspace selector
  workspace: Workspace;
  onWorkspacePick: (next: Workspace) => void;
}

/**
 * Wraps ProjectToolbar: the home/project/export/debug nav logic, the
 * center action buttons (Mixer/Audio setup/Share/Get effects), the
 * workspace selector, and undo/redo. Moved verbatim from App.tsx.
 *
 * Pulls `setIsShareDialogOpen` / `setIsDebugPanelOpen` from DialogContext
 * and `dispatch` from TracksContext rather than taking them as props,
 * following the pattern already used by AppContextMenus/AppDialogs.
 */
export function ProjectToolbarContainer({
  activeMenuItem,
  setActiveMenuItem,
  setHomeTabKey,
  setIndexedDBProjects,
  currentProjectId,
  createNewProject,
  showMixer,
  setMixerPanelOpen,
  setAudioSetupMenuAnchor,
  setMarketplaceModal,
  workspace,
  onWorkspacePick,
}: ProjectToolbarContainerProps) {
  const { setIsShareDialogOpen, setIsDebugPanelOpen } = useDialogs();
  const { dispatch } = useTracks();

  return (
    <ProjectToolbar
      activeItem={activeMenuItem}
      onMenuItemClick={async (item) => {
        setActiveMenuItem(item);
        // Force HomeTab to remount and reload projects when navigating back to home
        if (item === 'home') {
          setHomeTabKey(prev => prev + 1);
          // Load projects from IndexedDB
          const projects = await getProjects();
          setIndexedDBProjects(projects);
        }
        // Auto-create a new project if navigating to project tab with no active project
        if (item === 'project' && !currentProjectId) {
          await createNewProject();
          // Reload projects list so HomeTab will have the fresh project when user navigates back
          const projects = await getProjects();
          setIndexedDBProjects(projects);
        }
        if (item === 'debug') {
          setIsDebugPanelOpen(true);
        }
      }}
      showDebugMenu={true}
      centerActions={activeMenuItem !== 'export' ? [
        ...(showMixer ? [{
          icon: 'mixer' as const,
          label: 'Mixer',
          onClick: () => setMixerPanelOpen(prev => !prev),
        }] : []),
        {
          icon: 'cog' as const,
          label: 'Audio setup',
          onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setAudioSetupMenuAnchor({ x: rect.left, y: rect.bottom + 4 });
          },
        },
        {
          icon: 'cloud' as const,
          label: 'Share audio',
          onClick: () => setIsShareDialogOpen(true),
        },
        {
          icon: 'plugins' as const,
          label: 'Get effects',
          onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMarketplaceModal({ open: true, anchorRect: rect });
          },
        },
      ] : undefined}
      workspaceSelector={activeMenuItem !== 'export' ? {
        value: workspace,
        options: [
          { value: 'music', label: 'Music' },
          { value: 'classic', label: 'Classic' },
          { value: 'modern', label: 'Modern' },
          { value: 'spectral-editing', label: 'Spectral editing' },
        ],
        onChange: (next: string) => onWorkspacePick(next as Workspace),
      } : undefined}
      historyActions={activeMenuItem !== 'export' ? {
        onUndo: () => dispatch({ type: 'UNDO' }),
        onRedo: () => dispatch({ type: 'REDO' }),
      } : undefined}
    />
  );
}
