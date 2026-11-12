import { useEffect, useRef } from 'react';
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
  // The playhead is still persisted — its latest value is read through a ref
  // whenever a tracks/effects change triggers a save.
  // The save not yet written — FLUSHED when the project changes (2026-11-12,
  // the project tabs: switching tabs changes the id, and cancelling the
  // pending save would drop the last 600 ms of the project left behind)
  const pendingRef = useRef<{ id: string; tracks: Track[]; masterEffects: Effect[]; playheadPosition: number } | null>(null);
  const playheadRef = useRef(playheadPosition);
  playheadRef.current = playheadPosition;

  useEffect(() => {
    if (!currentProjectId) return;
    pendingRef.current = { id: currentProjectId, tracks, masterEffects, playheadPosition: playheadRef.current };
    const handle = setTimeout(() => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) void writeProject({ ...pending, playheadPosition: playheadRef.current });
    }, 600);
    return () => clearTimeout(handle);
  }, [currentProjectId, tracks, masterEffects]);

  useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (pending && pending.id === currentProjectId) {
        pendingRef.current = null;
        void writeProject(pending);
      }
    };
  }, [currentProjectId]);
}

async function writeProject(p: { id: string; tracks: Track[]; masterEffects: Effect[]; playheadPosition: number }): Promise<void> {
  try {
    const existing = await getProject(p.id);
    if (!existing) return;
    await saveProject({
      ...existing,
      data: {
        ...(existing.data ?? {}),
        tracks: p.tracks,
        masterEffects: p.masterEffects,
        playheadPosition: p.playheadPosition,
        audioBuffers: existing.data?.audioBuffers,
      },
    });
  } catch (err) {
    console.error('Auto-save failed:', err);
  }
}
