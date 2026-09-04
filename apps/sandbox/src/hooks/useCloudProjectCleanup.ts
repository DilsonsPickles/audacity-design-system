import React from 'react';
import { deleteProject, getProjects } from '../utils/projectDatabase';
import type { StoredProject } from '@audacity-ui/components';
import type { AdieuProjectSummary } from '../lib/adieu-client';
import type { TracksAction } from '../contexts/TracksContext';

export interface UseCloudProjectCleanupDeps {
  adieuSignedIn: boolean;
  adieuCloudProjectsLoaded: boolean;
  adieuCloudProjects: AdieuProjectSummary[];
  indexedDBProjects: StoredProject[];
  setIndexedDBProjects: React.Dispatch<React.SetStateAction<StoredProject[]>>;
  currentProjectId: string | null;
  setCurrentProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsCloudProject: React.Dispatch<React.SetStateAction<boolean>>;
  dispatch: React.Dispatch<TracksAction>;
}

export function useCloudProjectCleanup(deps: UseCloudProjectCleanupDeps): void {
  const {
    adieuSignedIn,
    adieuCloudProjectsLoaded,
    adieuCloudProjects,
    indexedDBProjects,
    setIndexedDBProjects,
    currentProjectId,
    setCurrentProjectId,
    setIsCloudProject,
    dispatch,
  } = deps;

  // When adieu's project list refreshes, prune any IndexedDB rows that were
  // cached copies of cloud projects but no longer exist on the server (e.g.
  // the user deleted them from adieu's web UI). Without this, the merge
  // re-surfaces them as local-only entries.
  //
  // Guarded on `cloudProjectsLoaded` so the initial empty cloudProjects
  // (before hydrate() returns) isn't mistaken for "every cached cloud
  // project was deleted." Without this guard, every page reload with a
  // valid token would wipe cached cloud-project thumbnails before the
  // network round-trip completes.
  React.useEffect(() => {
    if (!adieuSignedIn || !adieuCloudProjectsLoaded) return;
    const liveCloudIds = new Set(adieuCloudProjects.map((p) => p.id));
    const orphans = indexedDBProjects.filter(
      (p) => p.isCloudProject && !p.isUploading && !liveCloudIds.has(p.id),
    );
    if (orphans.length === 0) return;
    (async () => {
      await Promise.allSettled(orphans.map((o) => deleteProject(o.id)));
      const updated = await getProjects();
      setIndexedDBProjects(updated);
    })();
  }, [adieuSignedIn, adieuCloudProjectsLoaded, adieuCloudProjects, indexedDBProjects]);

  // When the user is signed out of audio.com, wipe any IndexedDB rows that
  // were cached cloud copies. They could belong to a previous account on
  // this browser — leaving them around would leak project titles +
  // thumbnails to whoever signs in next. Local-only projects are untouched.
  // Also nudges the editor out of a cloud project if one was open.
  React.useEffect(() => {
    if (adieuSignedIn) return;
    const cloudCached = indexedDBProjects.filter((p) => p.isCloudProject);
    if (cloudCached.length === 0) return;
    (async () => {
      await Promise.allSettled(cloudCached.map((p) => deleteProject(p.id)));
      const updated = await getProjects();
      setIndexedDBProjects(updated);
      if (currentProjectId && cloudCached.some((p) => p.id === currentProjectId)) {
        setCurrentProjectId(null);
        setIsCloudProject(false);
        dispatch({ type: 'SET_TRACKS', payload: [] });
        dispatch({ type: 'SET_MASTER_EFFECTS', payload: [] });
      }
    })();
  }, [adieuSignedIn, indexedDBProjects, currentProjectId, dispatch]);
}
