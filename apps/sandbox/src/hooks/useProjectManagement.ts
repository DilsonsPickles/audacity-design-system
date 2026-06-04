import { useCallback } from 'react';
import { TracksState, TracksAction } from '../contexts/TracksContext';
import { saveProject, getProject } from '../utils/projectDatabase';
import { toast } from '@dilsonspickles/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { downloadProjectFile, readProjectFile } from '../lib/projectFile';

export interface UseProjectManagementOptions {
  dispatch: React.Dispatch<TracksAction>;
  currentProjectId: string | null;
  state: TracksState;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setIsCloudProject: (value: boolean) => void;
  setCurrentProjectId: (value: string | null) => void;
  audioManagerRef: React.RefObject<AudioPlaybackManager>;
}

export interface UseProjectManagementReturn {
  createNewProject: () => Promise<string>;
  handleSaveToComputer: () => Promise<void>;
  /** Reads a `.audacityweb` file the user picked from their computer,
   *  reconstructs tracks + audio buffers, persists a new IndexedDB row,
   *  and switches the editor to it. Returns the new project id. */
  openProjectFromFile: (file: File) => Promise<string | null>;
}

/**
 * Hook for managing project creation and saving
 * Handles creating new projects and saving project data to IndexedDB
 */
export function useProjectManagement(options: UseProjectManagementOptions): UseProjectManagementReturn {
  const {
    dispatch,
    currentProjectId,
    state,
    scrollContainerRef,
    setIsCloudProject,
    setCurrentProjectId,
    audioManagerRef,
  } = options;

  // Handler for creating a new project
  const createNewProject = useCallback(async () => {
    const projectId = `project-${Date.now()}`;
    console.log('Creating new project:', projectId);

    const newProject = {
      id: projectId,
      title: `New Project ${new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })}`,
      dateCreated: Date.now(),
      dateModified: Date.now(),
      isCloudProject: false,
      thumbnailUrl: undefined,
    };

    // Save to IndexedDB
    await saveProject(newProject);
    console.log('New project saved to IndexedDB:', projectId);

    // Reset state to start fresh
    dispatch({ type: 'RESET_STATE' });
    setIsCloudProject(false);

    setCurrentProjectId(projectId);
    return projectId;
  }, [dispatch, setIsCloudProject, setCurrentProjectId]);

  // Save the open project as a real .audacityweb file the user can move,
  // back up, email, or re-open later. Bundles tracks JSON + per-clip WAVs
  // + a thumbnail JPG into a single ZIP and triggers a browser download.
  // Also mirrors the latest state into IndexedDB so the home tab thumbnail
  // stays current.
  const handleSaveToComputer = useCallback(async () => {
    if (!currentProjectId) {
      toast.error('No project open');
      return;
    }

    try {
      const project = await getProject(currentProjectId);
      if (!project) {
        toast.error('Project not found');
        return;
      }

      // Capture a thumbnail of the canvas (best-effort).
      let thumbnailDataUrl: string | undefined;
      if (scrollContainerRef.current) {
        try {
          const domtoimage = (await import('dom-to-image-more')).default;
          thumbnailDataUrl = await domtoimage.toJpeg(scrollContainerRef.current, {
            quality: 0.8,
            bgcolor: '#F5F5F7',
            width: 448,
            height: 252,
            style: { transform: 'scale(1)', transformOrigin: 'top left' },
          });
        } catch {
          // Thumbnail is optional.
        }
      }

      // Pull per-clip audio buffers out of the playback manager.
      const wavBuffers: Record<string, ArrayBuffer> = {};
      const audioManager = audioManagerRef.current;
      if (audioManager) {
        const exported = audioManager.exportBuffersAsWav();
        for (const [clipId, wavData] of exported) {
          wavBuffers[clipId] = wavData;
        }
      }

      const title = project.title || 'Untitled Project';

      // Trigger the real file download.
      await downloadProjectFile({
        title,
        tracks: state.tracks,
        masterEffects: state.masterEffects,
        playheadPosition: state.playheadPosition,
        audioBuffers: wavBuffers,
        thumbnailDataUrl,
      });

      // Also persist the latest snapshot to IndexedDB so the home tab
      // shows the current thumbnail next time the user comes back.
      await saveProject({
        ...project,
        data: {
          tracks: state.tracks,
          masterEffects: state.masterEffects,
          playheadPosition: state.playheadPosition,
          audioBuffers: wavBuffers,
        },
        thumbnailUrl: thumbnailDataUrl ?? project.thumbnailUrl,
      });

      toast.success('Project downloaded');
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  }, [currentProjectId, state.tracks, state.masterEffects, state.playheadPosition, scrollContainerRef, audioManagerRef]);

  const openProjectFromFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const bundle = await readProjectFile(file);

        const audioManager = audioManagerRef.current;
        if (audioManager && Object.keys(bundle.audioBuffers).length > 0) {
          await audioManager.importBuffersFromWav(bundle.audioBuffers);
        }

        const projectId = `project-${Date.now()}`;
        await saveProject({
          id: projectId,
          title: bundle.title,
          dateCreated: Date.now(),
          dateModified: Date.now(),
          isCloudProject: false,
          isUploading: false,
          thumbnailUrl: bundle.thumbnailDataUrl,
          data: {
            tracks: bundle.tracks,
            masterEffects: bundle.masterEffects ?? [],
            playheadPosition: bundle.playheadPosition,
            audioBuffers: bundle.audioBuffers,
          },
        });

        setCurrentProjectId(projectId);
        setIsCloudProject(false);
        dispatch({ type: 'SET_TRACKS', payload: bundle.tracks as TracksState['tracks'] });
        dispatch({
          type: 'SET_MASTER_EFFECTS',
          payload: (Array.isArray(bundle.masterEffects) ? bundle.masterEffects : []) as TracksState['masterEffects'],
        });
        dispatch({ type: 'SET_PLAYHEAD_POSITION', payload: bundle.playheadPosition });
        if (audioManager) audioManager.loadClips(bundle.tracks as TracksState['tracks'], 0);

        toast.success('Project opened');
        return projectId;
      } catch (error) {
        console.error('Error opening project file:', error);
        const message = error instanceof Error ? error.message : 'Could not open project file';
        toast.error(message);
        return null;
      }
    },
    [audioManagerRef, dispatch, setCurrentProjectId, setIsCloudProject],
  );

  return {
    createNewProject,
    handleSaveToComputer,
    openProjectFromFile,
  };
}
