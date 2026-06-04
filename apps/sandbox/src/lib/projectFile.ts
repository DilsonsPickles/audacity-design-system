// Real "save to / open from computer" bundle format.
//
// A web-audacity project is packaged as a single ZIP file with extension
// `.audacityweb`:
//
//   project.json              — manifest: title, dates, tracks, playheadPosition
//   thumbnail.jpg             — optional canvas screenshot for the home tab
//   audio/<clipId>.wav        — one file per clip buffer
//
// The format is round-trippable: open the saved file in this app, get back
// the same tracks, clips, and audio. It is NOT compatible with native
// Audacity 4 — different project format entirely.

import JSZip from 'jszip';

const FILE_EXTENSION = 'audacityweb';
const MANIFEST_NAME = 'project.json';
const THUMBNAIL_NAME = 'thumbnail.jpg';
const AUDIO_DIR = 'audio';
const FORMAT_VERSION = 1;

export interface ProjectManifest {
  version: number;
  title: string;
  dateCreated: number;
  dateModified: number;
  tracks: unknown[];
  masterEffects?: unknown[];
  playheadPosition: number;
}

export interface ProjectBundle {
  title: string;
  tracks: unknown[];
  masterEffects?: unknown[];
  playheadPosition: number;
  audioBuffers: Record<string, ArrayBuffer>;
  thumbnailDataUrl?: string;
}

function sanitizeFilename(input: string): string {
  return (
    input
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'Untitled'
  );
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) return null;
  const [, mime, b64] = m;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Build a ZIP blob from a project's in-memory state. */
export async function buildProjectFile(bundle: ProjectBundle): Promise<Blob> {
  const zip = new JSZip();

  const now = Date.now();
  const manifest: ProjectManifest = {
    version: FORMAT_VERSION,
    title: bundle.title,
    dateCreated: now,
    dateModified: now,
    tracks: bundle.tracks,
    masterEffects: bundle.masterEffects ?? [],
    playheadPosition: bundle.playheadPosition,
  };
  zip.file(MANIFEST_NAME, JSON.stringify(manifest));

  if (bundle.thumbnailDataUrl) {
    const blob = dataUrlToBlob(bundle.thumbnailDataUrl);
    if (blob) zip.file(THUMBNAIL_NAME, blob);
  }

  const audioFolder = zip.folder(AUDIO_DIR);
  if (audioFolder) {
    for (const [clipId, wav] of Object.entries(bundle.audioBuffers)) {
      audioFolder.file(`${clipId}.wav`, wav);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

/** Trigger a browser download of the project as a `.audacityweb` file. */
export async function downloadProjectFile(bundle: ProjectBundle): Promise<void> {
  const blob = await buildProjectFile(bundle);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(bundle.title)}.${FILE_EXTENSION}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Parse a previously-saved `.audacityweb` file back into in-memory state. */
export async function readProjectFile(file: File | Blob): Promise<ProjectBundle> {
  const zip = await JSZip.loadAsync(file);

  const manifestEntry = zip.file(MANIFEST_NAME);
  if (!manifestEntry) throw new Error('Not a valid project file: missing project.json');
  const manifestText = await manifestEntry.async('string');
  let manifest: ProjectManifest;
  try {
    manifest = JSON.parse(manifestText) as ProjectManifest;
  } catch {
    throw new Error('Project file manifest is corrupted');
  }
  if (manifest.version > FORMAT_VERSION) {
    throw new Error(
      `Project file is from a newer version (${manifest.version}); please update web-audacity to open it.`,
    );
  }

  const audioBuffers: Record<string, ArrayBuffer> = {};
  const audioFiles = zip.folder(AUDIO_DIR);
  if (audioFiles) {
    const tasks: Array<Promise<void>> = [];
    audioFiles.forEach((relativePath, entry) => {
      if (!relativePath.toLowerCase().endsWith('.wav')) return;
      const clipId = relativePath.replace(/\.wav$/i, '');
      tasks.push(
        entry.async('arraybuffer').then((buf) => {
          audioBuffers[clipId] = buf;
        }),
      );
    });
    await Promise.all(tasks);
  }

  let thumbnailDataUrl: string | undefined;
  const thumb = zip.file(THUMBNAIL_NAME);
  if (thumb) {
    const blob = await thumb.async('blob');
    thumbnailDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  return {
    title: manifest.title,
    tracks: manifest.tracks,
    masterEffects: manifest.masterEffects ?? [],
    playheadPosition: manifest.playheadPosition,
    audioBuffers,
    thumbnailDataUrl,
  };
}

/** File-picker accept attribute for project files. */
export const PROJECT_FILE_ACCEPT = `.${FILE_EXTENSION},application/zip`;
