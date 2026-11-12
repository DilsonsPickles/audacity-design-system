import React from 'react';
import { toast } from '@audacity-ui/components';
import type { StoredProject } from '@audacity-ui/components';
import type { TracksAction, TracksState } from '../contexts/TracksContext';

type MenuItem = 'home' | 'project' | 'export' | 'debug';

export interface UseProjectTabsDeps {
  state: TracksState;
  dispatch: React.Dispatch<TracksAction>;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  setIsCloudProject: (value: boolean) => void;
  setActiveMenuItem: (item: MenuItem) => void;
  projects: StoredProject[];
  /** Opens a project from storage — for a tab with no state kept yet */
  openProject: (id: string) => Promise<void>;
  /** Stops playback before another project's state comes in */
  stopPlayback: () => void;
}

export interface UseProjectTabsReturn {
  /** The open projects, in tab order */
  openProjectIds: string[];
  /** Brings an open project's tab forward (opens it if it is not open) */
  switchToProject: (id: string) => void;
  /** Closes a project's tab; the active one hands over to its neighbour, or Home */
  closeProject: (id: string) => void;
}

/**
 * PROJECT TABS (2026-11-12, "make it so that I can have two projects open
 * using different tabs in the same electron window? Like Figma!"): every
 * project opened — from Home, New project, a file — gets a tab, and each tab
 * KEEPS ITS PROJECT'S WHOLE STATE in memory (tracks, selection, playhead,
 * undo history), so switching tabs swaps the state in with REPLACE_STATE
 * and comes back exactly as it was left. Storage is unchanged: the
 * autosave writes each project to IndexedDB as before.
 *
 * The kept state is a MIRROR of the live state, written on every change
 * under the current project's id — so it relies on a project switch
 * committing the new id and the new state together (React batches them;
 * the autosave already relies on the same).
 */
export function useProjectTabs(deps: UseProjectTabsDeps): UseProjectTabsReturn {
  const { state, currentProjectId } = deps;
  const [openProjectIds, setOpenProjectIds] = React.useState<string[]>([]);
  const sessionsRef = React.useRef(new Map<string, TracksState>());
  // Ref-mirror (see CLAUDE.md): the handlers read live deps
  const depsRef = React.useRef(deps);
  depsRef.current = deps;
  const openIdsRef = React.useRef(openProjectIds);
  openIdsRef.current = openProjectIds;

  React.useEffect(() => {
    if (currentProjectId) sessionsRef.current.set(currentProjectId, state);
  }, [currentProjectId, state]);

  // Whatever opened a project, it has a tab
  React.useEffect(() => {
    if (!currentProjectId) return;
    setOpenProjectIds((ids) => (ids.includes(currentProjectId) ? ids : [...ids, currentProjectId]));
  }, [currentProjectId]);

  // A project that no longer exists (deleted from Home) loses its tab
  React.useEffect(() => {
    if (deps.projects.length === 0) return;
    const known = new Set(deps.projects.map((p) => p.id));
    setOpenProjectIds((ids) => {
      const next = ids.filter((id) => known.has(id) || id === depsRef.current.currentProjectId);
      for (const id of ids) if (!next.includes(id)) sessionsRef.current.delete(id);
      return next.length === ids.length ? ids : next;
    });
  }, [deps.projects]);

  const activate = (id: string): boolean => {
    const d = depsRef.current;
    if (d.state.isRecording) {
      toast.info('Recording in progress', 'Stop the recording before switching projects');
      return false;
    }
    if (id === d.currentProjectId) {
      d.setActiveMenuItem('project');
      return true;
    }
    d.stopPlayback();
    const kept = sessionsRef.current.get(id);
    if (!kept) {
      void d.openProject(id);
      return true;
    }
    d.dispatch({ type: 'REPLACE_STATE', payload: kept });
    d.setCurrentProjectId(id);
    d.setIsCloudProject(d.projects.find((p) => p.id === id)?.isCloudProject ?? false);
    d.setActiveMenuItem('project');
    return true;
  };

  const switchToProject = (id: string) => { activate(id); };

  const closeProject = (id: string) => {
    const d = depsRef.current;
    const ids = openIdsRef.current;
    const index = ids.indexOf(id);
    if (index === -1) return;
    const rest = ids.filter((x) => x !== id);
    if (id === d.currentProjectId) {
      const next = rest[Math.min(index, rest.length - 1)];
      if (next) {
        if (!activate(next)) return;
      } else {
        if (d.state.isRecording) {
          toast.info('Recording in progress', 'Stop the recording before closing the project');
          return;
        }
        d.stopPlayback();
        d.dispatch({ type: 'RESET_STATE' });
        d.setCurrentProjectId(null);
        d.setActiveMenuItem('home');
      }
    }
    sessionsRef.current.delete(id);
    setOpenProjectIds(rest);
  };

  return { openProjectIds, switchToProject, closeProject };
}
