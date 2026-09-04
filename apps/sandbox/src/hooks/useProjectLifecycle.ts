import React from 'react';
import type { StoredProject } from '@audacity-ui/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { getAllEffects } from '@audacity-ui/core';
import { useTracksDispatch } from '../contexts/TracksContext';
import { getProject, getProjects, deleteProject } from '../utils/projectDatabase';
import { deleteProject as adieuDeleteProject } from '../lib/adieu-client';
import type { AdieuProjectSummary } from '../lib/adieu-client';
import { loadCloudProjectAsStored } from '../utils/cloudProjects';

/** Mirrors the inline shape App.tsx uses for the cloud-load progress modal. */
export type CloudLoadProgress = { progress: number; message: string } | null;

export interface UseProjectLifecycleOptions {
  /** In Electron, "New Project" opens a fresh window instead of replacing the current one. */
  isElectron: boolean;
  /** From useProjectManagement() — creates the blank IndexedDB row + resets tracks state. */
  createNewProject: () => Promise<string>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  /** From useMuseHub() — gates the missing-plugins scan on project open. */
  museHubSignedIn: boolean;
  showMissingPlugins: (names: string[]) => void;
  /** Ids of projects backed by adieu cloud storage — distinguishes the open/delete data path. */
  cloudProjectIds: Set<string>;
  cloudLoadCancelledRef: React.MutableRefObject<boolean>;
  setCloudLoadProgress: React.Dispatch<React.SetStateAction<CloudLoadProgress>>;
  setCurrentProjectId: (id: string | null) => void;
  setIsCloudProject: (value: boolean) => void;
  setActiveMenuItem: (value: 'home' | 'project' | 'export' | 'debug') => void;
  setIndexedDBProjects: React.Dispatch<React.SetStateAction<StoredProject[]>>;
  /** Current IndexedDB project list — read in onDeleteProject to detect cloud-backed rows. */
  indexedDBProjects: StoredProject[];
  adieuSignedIn: boolean;
  adieuCloudProjects: AdieuProjectSummary[];
  adieuRefreshProjects: () => Promise<void>;
}

export interface UseProjectLifecycleReturn {
  handleNewProject: () => Promise<void>;
  handleOpenProject: (projectId: string) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
}

/**
 * Owns HomeTab's three project-lifecycle handlers: new, open (local or
 * cloud), and delete. Extracted verbatim from App.tsx's inline HomeTab JSX —
 * see docs/codebase-map.md for the extraction history.
 */
export function useProjectLifecycle(options: UseProjectLifecycleOptions): UseProjectLifecycleReturn {
  const {
    isElectron,
    createNewProject,
    audioManagerRef,
    museHubSignedIn,
    showMissingPlugins,
    cloudProjectIds,
    cloudLoadCancelledRef,
    setCloudLoadProgress,
    setCurrentProjectId,
    setIsCloudProject,
    setActiveMenuItem,
    setIndexedDBProjects,
    indexedDBProjects,
    adieuSignedIn,
    adieuCloudProjects,
    adieuRefreshProjects,
  } = options;

  const dispatch = useTracksDispatch();

  const handleNewProject = async () => {
    // In Electron, "New Project" opens a fresh window instead of
    // replacing the current one — mirrors how desktop DAWs treat
    // each project as its own document window. The new window
    // boots into the home tab; the user can then create/open a
    // project there.
    if (isElectron) {
      const api = (window as unknown as {
        electronShell?: { openNewWindow: () => void };
      }).electronShell;
      if (api) {
        api.openNewWindow();
        return;
      }
    }
    await createNewProject();
    // Reload projects list
    const projects = await getProjects();
    setIndexedDBProjects(projects);
    setActiveMenuItem('project');
  };

  const handleOpenProject = async (projectId: string) => {
    // Cloud projects come from moose-hub; locals from IndexedDB.
    // The lists are presented exclusively (no merged view) so this
    // dispatch is unambiguous.
    const isCloud = cloudProjectIds.has(projectId);
    if (isCloud) {
      cloudLoadCancelledRef.current = false;
      setCloudLoadProgress({ progress: 5, message: 'Connecting to audio.com…' });
    }
    const bailIfCancelled = () => isCloud && cloudLoadCancelledRef.current;
    try {
    if (isCloud) setCloudLoadProgress({ progress: 10, message: 'Downloading project…' });
    const project = isCloud
      ? await loadCloudProjectAsStored(projectId)
      : await getProject(projectId);
    if (bailIfCancelled()) return;
    if (project) {
      if (isCloud) setCloudLoadProgress({ progress: 60, message: 'Decoding audio…' });
      setCurrentProjectId(projectId);

      // Restore cloud project status (project-specific)
      setIsCloudProject(project.isCloudProject ?? false);

      // Restore tracks state from project data, or reset to empty if none
      if (project.data?.tracks) {
        if (isCloud) setCloudLoadProgress({ progress: 75, message: 'Restoring tracks…' });
        // Runtime hardening: older persisted projects may omit `clips` on a track
        // (e.g. label tracks saved before the field was required). Normalise to []
        // so Track.clips: Clip[] invariant holds for all downstream consumers.
        const normalizedTracks = project.data.tracks.map((t) => ({
          ...t,
          clips: t.clips ?? [],
        }));
        dispatch({ type: 'SET_TRACKS', payload: normalizedTracks });

        // If the user is signed out of MuseHub, any effects in the
        // project that aren't built-in Audacity effects are
        // inaccessible — surface them in the Missing plugins modal.
        if (!museHubSignedIn) {
          const builtIn = new Set(
            getAllEffects().map((e) => e.name.toLowerCase()),
          );
          const missing: string[] = [];
          const seen = new Set<string>();
          for (const track of project.data.tracks) {
            for (const effect of track.effects ?? []) {
              const name = effect.name;
              if (!builtIn.has(name.toLowerCase()) && !seen.has(name)) {
                seen.add(name);
                missing.push(name);
              }
            }
          }
          if (missing.length > 0) {
            showMissingPlugins(missing);
          }
        }
      } else {
        dispatch({ type: 'SET_TRACKS', payload: [] });
      }

      // Restore master effects
      dispatch({
        type: 'SET_MASTER_EFFECTS',
        payload: Array.isArray(project.data?.masterEffects) ? project.data.masterEffects : [],
      });

      // Restore audio buffers from saved WAV data
      if (project.data?.audioBuffers) {
        if (isCloud) {
          const clipCount = Object.keys(project.data.audioBuffers).length;
          setCloudLoadProgress({
            progress: 88,
            message: `Loading ${clipCount} audio clip${clipCount === 1 ? '' : 's'}…`,
          });
        }
        const audioManager = audioManagerRef.current;
        await audioManager.importBuffersFromWav(project.data.audioBuffers);
        if (bailIfCancelled()) return;
        // Reload clips for playback now that buffers are available
        if (project.data.tracks) {
          audioManager.loadClips(project.data.tracks, 0);
        }
      }

      // Always start playhead at 0 on project open
      dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: 0 });

      if (isCloud) setCloudLoadProgress({ progress: 100, message: 'Done' });
      setActiveMenuItem('project');
    } else {
    }
    } finally {
      if (isCloud) {
        // Brief hold at 100% so the user sees the bar fill before it
        // disappears; matches the save-toast dismiss delay.
        setTimeout(() => setCloudLoadProgress(null), 250);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    // Delete from both layers so the project doesn't pop back in
    // via the merge after the next refetch. catch() so a missing
    // entry on either side doesn't abort the other delete.
    const isCloud =
      adieuSignedIn &&
      (adieuCloudProjects.some((p) => p.id === projectId) ||
        indexedDBProjects.some((p) => p.id === projectId && p.isCloudProject));
    await Promise.allSettled([
      deleteProject(projectId),
      isCloud ? adieuDeleteProject(projectId) : Promise.resolve(),
    ]);
    const updated = await getProjects();
    setIndexedDBProjects(updated);
    if (isCloud) await adieuRefreshProjects();
  };

  return { handleNewProject, handleOpenProject, handleDeleteProject };
}
