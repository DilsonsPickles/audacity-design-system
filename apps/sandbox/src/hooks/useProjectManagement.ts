import { useCallback } from 'react';
import { TracksState, TracksAction } from '../contexts/TracksContext';
import { saveProject, getProject } from '../utils/projectDatabase';
import { toast } from '@audacity-ui/components';
import type { AudioPlaybackManager } from '@audacity-ui/audio';

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

  // Handler for saving project to computer
  const handleSaveToComputer = useCallback(async () => {
    console.log('Save to computer - currentProjectId:', currentProjectId);

    if (!currentProjectId) {
      console.error('No current project ID');
      toast.error('No project open');
      return;
    }

    try {
      // Get current project from IndexedDB
      const project = await getProject(currentProjectId);
      console.log('Retrieved project from IndexedDB:', project);
      if (!project) {
        console.error('Project not found for ID:', currentProjectId);
        toast.error('Project not found');
        return;
      }

      // Capture canvas screenshot for thumbnail
      let thumbnailUrl: string | undefined;
      if (scrollContainerRef.current) {
        console.log('Attempting to capture screenshot...');
        try {
          // Use dom-to-image-more (better CSS support than html2canvas)
          const domtoimage = (await import('dom-to-image-more')).default;

          // Capture as data URL directly (224x126 aspect ratio)
          const dataUrl = await domtoimage.toJpeg(scrollContainerRef.current, {
            quality: 0.8,
            bgcolor: '#F5F5F7',
            width: 448, // 2x for retina
            height: 252, // 2x for retina
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
            },
          });

          thumbnailUrl = dataUrl;
          console.log('Screenshot captured');
        } catch (error) {
          console.error('Error capturing screenshot:', error);
          // Continue without thumbnail
        }
      }

      // Export audio buffers as WAV ArrayBuffers for persistence
      const wavBuffers: Record<string, ArrayBuffer> = {};
      const audioManager = audioManagerRef.current;
      if (audioManager) {
        const exported = audioManager.exportBuffersAsWav();
        for (const [clipId, wavData] of exported) {
          wavBuffers[clipId] = wavData;
        }
      }

      // Serialize tracks state with full clip data including waveforms
      const projectData = {
        tracks: state.tracks,
        playheadPosition: state.playheadPosition,
        audioBuffers: wavBuffers,
      };

      console.log('Saving project to IndexedDB...');
      await saveProject({
        ...project,
        data: projectData,
        thumbnailUrl,
      });

      console.log('Project saved successfully');
      toast.success('Project saved');
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  }, [currentProjectId, state.tracks, state.playheadPosition, scrollContainerRef]);

  return {
    createNewProject,
    handleSaveToComputer,
  };
}
