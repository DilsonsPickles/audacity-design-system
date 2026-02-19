/**
 * Project Database using IndexedDB via Dexie
 * Stores full project data including audio waveforms and clips
 */

import Dexie, { Table } from 'dexie';

export interface StoredProject {
  id: string;
  title: string;
  dateCreated: number;
  dateModified: number;
  thumbnailUrl?: string;
  isCloudProject: boolean;
  isUploading?: boolean;
  data?: {
    tracks: any[]; // Use any to avoid type conflicts between core and local Track types
    playheadPosition: number;
  };
}

class ProjectDatabase extends Dexie {
  projects!: Table<StoredProject, string>;

  constructor() {
    super('AudacityProjects');
    this.version(1).stores({
      projects: 'id, dateModified, dateCreated',
    });
  }
}

const db = new ProjectDatabase();

/**
 * Get all saved projects from IndexedDB
 */
export async function getProjects(): Promise<StoredProject[]> {
  try {
    const projects = await db.projects.orderBy('dateModified').reverse().toArray();
    return projects;
  } catch (error) {
    console.error('Error loading projects from IndexedDB:', error);
    return [];
  }
}

/**
 * Save a project to IndexedDB
 */
export async function saveProject(project: StoredProject): Promise<void> {
  try {
    const now = Date.now();
    const existingProject = await db.projects.get(project.id);

    if (existingProject) {
      // Update existing project
      await db.projects.put({
        ...project,
        dateModified: now,
      });
    } else {
      // Add new project
      await db.projects.add({
        ...project,
        dateCreated: now,
        dateModified: now,
      });
    }
  } catch (error) {
    console.error('Error saving project to IndexedDB:', error);
    throw error;
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<StoredProject | null> {
  try {
    const project = await db.projects.get(id);
    return project || null;
  } catch (error) {
    console.error('Error getting project from IndexedDB:', error);
    return null;
  }
}

/**
 * Delete a project from IndexedDB
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    await db.projects.delete(id);
  } catch (error) {
    console.error('Error deleting project from IndexedDB:', error);
    throw error;
  }
}

/**
 * Delete multiple projects
 */
export async function deleteProjects(ids: string[]): Promise<void> {
  try {
    await db.projects.bulkDelete(ids);
  } catch (error) {
    console.error('Error deleting projects from IndexedDB:', error);
    throw error;
  }
}

/**
 * Clear all projects (use with caution!)
 */
export async function clearAllProjects(): Promise<void> {
  await db.projects.clear();
}

/**
 * Get storage usage info
 */
export async function getStorageInfo(): Promise<{ used: number; total: number; available: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const total = estimate.quota || 0;
      return {
        used,
        total,
        available: total - used,
      };
    }
    return { used: 0, total: 0, available: 0 };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { used: 0, total: 0, available: 0 };
  }
}
