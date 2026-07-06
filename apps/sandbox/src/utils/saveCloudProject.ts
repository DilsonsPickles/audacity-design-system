import type React from 'react';
import type { TracksState } from '../contexts/TracksContext';
import type { AudioPlaybackManager } from '@audacity-ui/audio';
import { toast, type StoredProject } from '@dilsonspickles/components';
import {
  saveProject as adieuSaveProject,
} from '../lib/adieu-client';
import { encodeBufferMap } from '../lib/binary';
import { SignInCancelledError } from '../contexts/AdieuContext';
import { saveProject, getProject, getProjects } from './projectDatabase';

export interface SaveCloudProjectDeps {
  currentProjectId: string | null;
  adieuSignedIn: boolean;
  adieuSignIn: () => Promise<void>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  audioManagerRef: React.MutableRefObject<AudioPlaybackManager>;
  state: TracksState;
  setIndexedDBProjects: React.Dispatch<React.SetStateAction<StoredProject[]>>;
  adieuRefreshProjects: () => Promise<void>;
}

export async function saveCloudProject({
  currentProjectId,
  adieuSignedIn,
  adieuSignIn,
  scrollContainerRef,
  audioManagerRef,
  state,
  setIndexedDBProjects,
  adieuRefreshProjects,
}: SaveCloudProjectDeps): Promise<void> {
  if (!currentProjectId) return;
  if (!adieuSignedIn) {
    try {
      await adieuSignIn();
    } catch (err) {
      if (err instanceof SignInCancelledError) return;
      toast.error(`Sign-in failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return;
    }
  }

  const syncToastId = toast.progress('Saving to audio.com…');
  try {
    const existing = await getProject(currentProjectId);
    const title = existing?.title || 'Untitled project';

    toast.updateProgress(syncToastId, 10, 'Capturing preview…');
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

    toast.updateProgress(syncToastId, 30, 'Packaging audio…');
    const audioBuffersRaw: Record<string, ArrayBuffer> = {};
    const audioManager = audioManagerRef.current;
    if (audioManager) {
      const exported = audioManager.exportBuffersAsWav();
      for (const [clipId, wav] of exported) audioBuffersRaw[clipId] = wav;
    }
    const audioBuffers = encodeBufferMap(audioBuffersRaw);

    toast.updateProgress(syncToastId, 60, 'Uploading…');
    // [save-debug] Confirm effects are present in the upload payload.
    await adieuSaveProject(currentProjectId, {
      title,
      data: {
        tracks: state.tracks,
        masterEffects: state.masterEffects,
        playheadPosition: state.playheadPosition,
        audioBuffers,
      },
      thumbnailDataUrl,
    });

    toast.updateProgress(syncToastId, 85, 'Saving locally…');
    await saveProject({
      id: currentProjectId,
      title,
      dateCreated: existing?.dateCreated ?? Date.now(),
      dateModified: Date.now(),
      isCloudProject: true,
      isUploading: false,
      thumbnailUrl: thumbnailDataUrl ?? existing?.thumbnailUrl,
      data: {
        tracks: state.tracks,
        masterEffects: state.masterEffects,
        playheadPosition: state.playheadPosition,
        audioBuffers: audioBuffersRaw,
      },
    });
    const updated = await getProjects();
    setIndexedDBProjects(updated);
    await adieuRefreshProjects().catch(() => {});

    toast.updateProgress(syncToastId, 100, 'Done');
    setTimeout(() => toast.dismiss(syncToastId), 400);
    toast.success('Saved to audio.com');
  } catch (err) {
    toast.dismiss(syncToastId);
    toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
