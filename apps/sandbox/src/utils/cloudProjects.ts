import {
  getProject as adieuGetProject,
  assetUrl as adieuAssetUrl,
  type AdieuProjectSummary,
} from '../lib/adieu-client';
import { decodeBufferMap } from '../lib/binary';
import { type StoredProject } from '@audacity-ui/components';

/** Shape of a cloud audio file entry as stored in localStorage and passed to dialogs. */
export interface CloudAudioFile {
  id: string;
  title: string;
  dateText: string;
  duration: string;
  size: string;
  blobUrl: string;
  waveformData: number[];
}

// Fetch a cloud project and shape it like an IndexedDB project so the
// existing onOpenProject hydration code can consume it unchanged.
export async function loadCloudProjectAsStored(
  id: string,
): Promise<StoredProject | null> {
  try {
    const project = await adieuGetProject(id);
    const ts = Date.parse(project.updatedAt) || Date.now();
    // Cloud payload encodes audioBuffers as base64 strings; decode to
    // ArrayBuffers so downstream code (audioManager.importBuffersFromWav)
    // sees the same shape it gets from IndexedDB.
    const rawData = project.data as {
      tracks?: unknown[];
      masterEffects?: unknown[];
      playheadPosition?: number;
      audioBuffers?: Record<string, string | ArrayBuffer>;
    } | null;
    const data = rawData
      ? {
          ...rawData,
          audioBuffers: decodeBufferMap(rawData.audioBuffers),
        }
      : null;
    return {
      id: project.id,
      title: project.title,
      dateCreated: ts,
      dateModified: ts,
      thumbnailUrl: project.thumbnailUrl
        ? adieuAssetUrl(project.thumbnailUrl)
        : undefined,
      isCloudProject: true,
      data,
    };
  } catch {
    return null;
  }
}

export function cloudSummaryToStored(p: AdieuProjectSummary): StoredProject {
  const ts = Date.parse(p.updatedAt) || Date.now();
  return {
    id: p.id,
    title: p.title,
    dateCreated: ts,
    dateModified: ts,
    thumbnailUrl: p.thumbnailUrl ? adieuAssetUrl(p.thumbnailUrl) : undefined,
    isCloudProject: true,
  };
}
