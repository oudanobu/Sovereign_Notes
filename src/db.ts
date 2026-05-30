/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Tag, Folder, CalendarEvent } from './types';

const DB_NAME = 'LocalSovereignNotesDB';
const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Notes Store
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        noteStore.createIndex('folderId', 'folderId', { unique: false });
        noteStore.createIndex('isDeleted', 'isDeleted', { unique: false });
      }

      // 2. Tags Store
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagStore.createIndex('parentId', 'parentId', { unique: false });
        tagStore.createIndex('path', 'path', { unique: false });
        tagStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        tagStore.createIndex('isDeleted', 'isDeleted', { unique: false });
      }

      // 3. Folders Store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('parentId', 'parentId', { unique: false });
        folderStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        folderStore.createIndex('isDeleted', 'isDeleted', { unique: false });
      }

      // 4. Sync Meta Store
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }

      // 5. Events Store
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('date', 'date', { unique: false });
        eventStore.createIndex('isDeleted', 'isDeleted', { unique: false });
      }
    };
  });
}

// Low-level helper to wrap IndexedDB store requests in promise
function getStore(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode = 'readonly'
): IDBObjectStore {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// Note Operations
export async function getNotes(): Promise<Note[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'notes');
    const request = store.getAll();
    request.onsuccess = () => {
      // Return only non-deleted notes by default, or handle soft deletes downstream
      resolve(request.result || []);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveNote(note: Note): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'notes', 'readwrite');
    const request = store.put(note);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function bulkInsertNotes(notes: Note[]): Promise<void> {
  if (notes.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    notes.forEach((note) => {
      store.put(note);
    });
  });
}

// Tag Operations
export async function getTags(): Promise<Tag[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'tags');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTag(tag: Tag): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'tags', 'readwrite');
    const request = store.put(tag);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function bulkInsertTags(tags: Tag[]): Promise<void> {
  if (tags.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tags', 'readwrite');
    const store = tx.objectStore('tags');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tags.forEach((tag) => {
      store.put(tag);
    });
  });
}

// Folder Operations
export async function getFolders(): Promise<Folder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'folders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'folders', 'readwrite');
    const request = store.put(folder);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function bulkInsertFolders(folders: Folder[]): Promise<void> {
  if (folders.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    folders.forEach((folder) => {
      store.put(folder);
    });
  });
}

// Sync Meta Operations
export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'sync_meta');
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSyncMeta(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'sync_meta', 'readwrite');
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Snapshot Full DB Export
export async function exportDatabaseSnapshot(): Promise<string> {
  const notes = await getNotes();
  const tags = await getTags();
  const folders = await getFolders();
  
  const snapshot = {
    notes,
    tags,
    folders,
    exportTimestamp: Date.now(),
    version: DB_VERSION
  };
  
  return JSON.stringify(snapshot, null, 2);
}

// Snapshot Full DB Import
export async function importDatabaseSnapshot(jsonString: string): Promise<{
  notesCount: number;
  tagsCount: number;
  foldersCount: number;
}> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.notes || !parsed.tags || !parsed.folders) {
    throw new Error('Invalid backup file. Missing essential database tables.');
  }

  // Clear existing databases in transaction & write new ones
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['notes', 'tags', 'folders'], 'readwrite');
    
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      resolve({
        notesCount: parsed.notes.length,
        tagsCount: parsed.tags.length,
        foldersCount: parsed.folders.length,
      });
    };

    // Clear stores
    tx.objectStore('notes').clear();
    tx.objectStore('tags').clear();
    tx.objectStore('folders').clear();

    // Populate stores
    const notesStore = tx.objectStore('notes');
    parsed.notes.forEach((n: Note) => notesStore.put(n));

    const tagsStore = tx.objectStore('tags');
    parsed.tags.forEach((t: Tag) => tagsStore.put(t));

    const foldersStore = tx.objectStore('folders');
    parsed.folders.forEach((f: Folder) => foldersStore.put(f));
  });
}

// Event Operations
export async function getEvents(): Promise<CalendarEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('events')) {
      resolve([]);
      return;
    }
    const store = getStore(db, 'events');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEvent(event: CalendarEvent): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, 'events', 'readwrite');
    const request = store.put(event);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

