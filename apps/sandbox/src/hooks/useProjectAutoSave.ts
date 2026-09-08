import { useEffect } from 'react';
import { saveProject, getProject } from '../utils/projectDatabase';
import type { Track, Effect } from '../contexts/TracksContext';

export interface UseProjectAutoSaveDeps {
  currentProjectId: string | null;
  tracks: Track[];
  masterEffects: Effect[];
  playheadPosition: number;
}

export function useProjectAutoSave(deps: UseProjectAutoSaveDeps): void {
  const { currentProjectId, tracks, masterEffects, playheadPosition } = deps;

  // Debounced auto-save: whenever the project state changes (tracks or
  // effects), persist it back to IndexedDB so navigating Home → Project and
  // re-opening the project picks up the latest edits.
  //
  // playheadPosition is deliberately NOT in the dependency list. Each save
  // structured-clones the full tracks payload (waveform arrays included)
  // through IndexedDB on the main thread, and keying on the playhead made
  // that fire 600 ms after every timeline click and every playback stop.
  // The playhead is still persisted — the closure captures its latest value
  // whenever a tracks/effects change triggers a save.
  useEffect(() => {
    if (!currentProjectId) return;
    const handle = setTimeout(async () => {
      try {
        const existing = await getProject(currentProjectId);
        if (!existing) return;
        await saveProject({
          ...existing,
          data: {
            ...(existing.data ?? {}),
            tracks: tracks,
            masterEffects: masterEffects,
            playheadPosition: playheadPosition,
            audioBuffers: existing.data?.audioBuffers,
          },
        });
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playheadPosition intentionally omitted, see comment above
  }, [currentProjectId, tracks, masterEffects]);
}
