import React from 'react';
import { toast } from '@audacity-ui/components';
import type { StoredProject } from '@audacity-ui/components';
import type { TracksAction, TracksState } from '../contexts/TracksContext';

type MenuItem = 'home' | 'project' | 'export' | 'debug';

/** What a tab keeps OUTSIDE the tracks state (2026-11-12): the loop region,
 *  the zoom and the scroll — window state, saved as a tab is left and put
 *  back when it is returned to */
export interface ProjectView {
  loop: { enabled: boolean; start: number | null; end: number | null };
  pixelsPerSecond: number;
  scrollLeft: number;
  scrollTop: number;
}

/** The open tabs, kept across launches (localStorage — session state for
 *  this machine, never part of a project) */
export const OPEN_TABS_KEY = 'audacity-open-project-tabs';
interface StoredTabs { ids: string[]; active: string | null; inProject: boolean }

function readStoredTabs(): StoredTabs | null {
  try {
    const raw = localStorage.getItem(OPEN_TABS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredTabs>;
    if (!Array.isArray(v.ids)) return null;
    return { ids: v.ids.filter((x): x is string => typeof x === 'string'), active: typeof v.active === 'string' ? v.active : null, inProject: v.inProject === true };
  } catch {
    return null;
  }
}

function writeStoredTabs(tabs: StoredTabs): void {
  try {
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(tabs));
  } catch {
    // storage unavailable — the tabs just are not restored
  }
}

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
  /** Whether the editor (not Home) is showing — kept with the tabs so a
   *  relaunch lands where it was left */
  inProject: boolean;
  /** The window's view of the project in front, read as its tab is left… */
  captureView: () => ProjectView;
  /** …and put back when it is returned to; a tab never seen gets null */
  restoreView: (view: ProjectView | null) => void;
  /** Lists the stored projects — the restore checks the saved tabs still exist */
  listProjects: () => Promise<StoredProject[]>;
  /** Restore the tabs saved at the last launch (false in a window booted
   *  for a new project) */
  restoreOnLaunch: boolean;
}

export interface UseProjectTabsReturn {
  /** The open projects, in tab order */
  openProjectIds: string[];
  /** Brings an open project's tab forward (opens it if it is not open) */
  switchToProject: (id: string) => void;
  /** Closes a project's tab; the active one hands over to its neighbour, or Home */
  closeProject: (id: string) => void;
  /** Puts the tabs in a new order (a tab dragged along the bar) */
  reorderProjects: (ids: string[]) => void;
  /** Keeps the window's view for the project in front — call before
   *  opening another project by any route but a tab switch */
  parkView: () => void;
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
  const viewsRef = React.useRef(new Map<string, ProjectView>());
  const restoredRef = React.useRef(!deps.restoreOnLaunch);
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

  // RESTORE ON LAUNCH: the saved tabs that still exist come back, and the
  // project that was in front is opened again if the editor was showing.
  // The others open from storage when their tab is first pressed.
  React.useEffect(() => {
    if (restoredRef.current) return;
    let cancelled = false;
    const saved = readStoredTabs();
    if (!saved || saved.ids.length === 0) { restoredRef.current = true; return; }
    void depsRef.current.listProjects().then((projects) => {
      if (cancelled) return;
      const known = new Set(projects.map((p) => p.id));
      const ids = saved.ids.filter((id) => known.has(id));
      restoredRef.current = true;
      if (ids.length === 0) return;
      setOpenProjectIds((current) => [...ids, ...current.filter((id) => !ids.includes(id))]);
      const active = saved.active && ids.includes(saved.active) ? saved.active : null;
      if (active && saved.inProject && !depsRef.current.currentProjectId) void depsRef.current.openProject(active);
    }).catch(() => { restoredRef.current = true; });
    // (StrictMode runs this twice: the first run's answer is dropped, the
    // second does the restore)
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!restoredRef.current) return;
    writeStoredTabs({ ids: openProjectIds, active: currentProjectId, inProject: deps.inProject && currentProjectId !== null });
  }, [openProjectIds, currentProjectId, deps.inProject]);

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
    if (d.currentProjectId) viewsRef.current.set(d.currentProjectId, d.captureView());
    const kept = sessionsRef.current.get(id);
    d.restoreView(viewsRef.current.get(id) ?? null);
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
        d.restoreView(null);
        d.dispatch({ type: 'RESET_STATE' });
        d.setCurrentProjectId(null);
        d.setActiveMenuItem('home');
      }
    }
    sessionsRef.current.delete(id);
    viewsRef.current.delete(id);
    setOpenProjectIds(rest);
  };

  const reorderProjects = (ids: string[]) => {
    setOpenProjectIds((current) => {
      if (ids.length !== current.length || ids.some((id) => !current.includes(id))) return current;
      return ids.every((id, i) => id === current[i]) ? current : ids;
    });
  };

  // Opening a project from Home (not a tab switch) leaves the window's view
  // behind too: the project being left keeps it for its tab
  const parkView = () => {
    const d = depsRef.current;
    if (d.currentProjectId) viewsRef.current.set(d.currentProjectId, d.captureView());
  };

  return { openProjectIds, switchToProject, closeProject, reorderProjects, parkView };
}
