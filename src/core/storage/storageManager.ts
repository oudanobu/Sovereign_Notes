import { openDB, IDBPDatabase } from 'idb';
import { Note, Tag, Folder } from '../../types';

const DB_NAME = 'LocalSovereignNotesDB';
const DB_VERSION = 2; // Matched for consistent migration

// Types for Migration Shim & Backup
export interface StorageSnapshot {
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
  version: number;
  timestamp: string;
}

class StorageManager {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          noteStore.createIndex('folderId', 'folderId', { unique: false });
          noteStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        }
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
          tagStore.createIndex('parentId', 'parentId', { unique: false });
          tagStore.createIndex('path', 'path', { unique: false });
          tagStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          tagStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        }
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
          folderStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          folderStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        }
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('date', 'date', { unique: false });
          eventStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        }
      },
    });
  }

  // --- Migration Shim: Defensive Data Filling ---
  private shimNote(rawNote: any): Note {
    return {
      ...rawNote,
      // Fallbacks for critical properties missing in old versions
      type: rawNote.type || 'markdown',
      title: rawNote.title || 'Untitled',
      content: rawNote.content || '',
      tagIds: rawNote.tagIds || [],
      folderId: rawNote.folderId || null,
      createdAt: rawNote.createdAt || Date.now(),
      updatedAt: rawNote.updatedAt || Date.now(),
      isDeleted: !!rawNote.isDeleted,
      // For Mindmap / Whiteboard, ensure minimum data
      mindmapData: rawNote.type === 'mindmap' && rawNote.mindmapData ? rawNote.mindmapData : (rawNote.mindmapData || undefined),
    };
  }

  private shimTag(rawTag: any): Tag {
    return {
      ...rawTag,
      name: rawTag.name || 'Unnamed Tag',
      color: rawTag.color || '#94a3b8',
      parentId: rawTag.parentId || null,
    };
  }

  private shimFolder(rawFolder: any): Folder {
    return {
      ...rawFolder,
      name: rawFolder.name || 'Unnamed Folder',
      color: rawFolder.color || '#cbd5e1',
      parentId: rawFolder.parentId || null,
    };
  }

  // --- Core CRUD ---
  async getNotes(): Promise<Note[]> {
    const db = await this.dbPromise;
    const rawNotes = await db.getAll('notes');
    return rawNotes.map(this.shimNote);
  }

  async saveNote(note: Note): Promise<string> {
    const db = await this.dbPromise;
    await db.put('notes', note);
    return note.id;
  }

  async deleteNote(id: string): Promise<void> {
    // We prefer soft deletes, but here is physical delete if needed
    const db = await this.dbPromise;
    await db.delete('notes', id);
  }

  async getTags(): Promise<Tag[]> {
    const db = await this.dbPromise;
    const rawTags = await db.getAll('tags');
    return rawTags.map(this.shimTag);
  }

  async saveTag(tag: Tag): Promise<string> {
    const db = await this.dbPromise;
    await db.put('tags', tag);
    return tag.id;
  }

  async getFolders(): Promise<Folder[]> {
    const db = await this.dbPromise;
    const rawFolders = await db.getAll('folders');
    return rawFolders.map(this.shimFolder);
  }

  async saveFolder(folder: Folder): Promise<string> {
    const db = await this.dbPromise;
    await db.put('folders', folder);
    return folder.id;
  }

  // --- Snapshot Exports for Backup ---
  async generateSnapshot(): Promise<string> {
    const [notes, tags, folders] = await Promise.all([
      this.getNotes(),
      this.getTags(),
      this.getFolders()
    ]);

    const snapshot: StorageSnapshot = {
      notes,
      tags,
      folders,
      version: DB_VERSION,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(snapshot, null, 2);
  }

  async restoreSnapshot(snapshotJson: string): Promise<void> {
    const snapshot: StorageSnapshot = JSON.parse(snapshotJson);
    const db = await this.dbPromise;
    const tx = db.transaction(['notes', 'tags', 'folders'], 'readwrite');
    
    await tx.objectStore('notes').clear();
    await tx.objectStore('tags').clear();
    await tx.objectStore('folders').clear();

    for (const note of snapshot.notes) tx.objectStore('notes').put(this.shimNote(note));
    for (const tag of snapshot.tags) tx.objectStore('tags').put(this.shimTag(tag));
    for (const folder of snapshot.folders) tx.objectStore('folders').put(this.shimFolder(folder));
    
    await tx.done;
  }
}

export const storage = new StorageManager();
