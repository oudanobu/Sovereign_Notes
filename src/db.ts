/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Tag, Folder, CalendarEvent } from './types';

const DB_NAME = 'LocalSovereignNotesDB';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        console.warn('Database connection closed due to version change.');
      };
      resolve(db);
    };

    request.onblocked = () => {
      console.warn('Database open is blocked by another tab or older connection.');
    };

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

      // 6. Assets Store (added for storageManager compatibility)
      if (!db.objectStoreNames.contains('assets')) {
        const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
        assetStore.createIndex('noteId', 'noteId', { unique: false });
      }
    };
  });

  return dbPromise;
}

// Note Operations
export function getNotes(): Promise<Note[]> {
  return openDB().then((db) => {
    return new Promise<Note[]>((resolve, reject) => {
      const transaction = db.transaction('notes', 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveNote(note: Note): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('notes', 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.put(note);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function bulkInsertNotes(notes: Note[]): Promise<void> {
  if (notes.length === 0) return Promise.resolve();
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      notes.forEach((note) => {
        store.put(note);
      });
    });
  });
}

// Tag Operations
export function getTags(): Promise<Tag[]> {
  return openDB().then((db) => {
    return new Promise<Tag[]>((resolve, reject) => {
      const transaction = db.transaction('tags', 'readonly');
      const store = transaction.objectStore('tags');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveTag(tag: Tag): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('tags', 'readwrite');
      const store = transaction.objectStore('tags');
      const request = store.put(tag);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function bulkInsertTags(tags: Tag[]): Promise<void> {
  if (tags.length === 0) return Promise.resolve();
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tags', 'readwrite');
      const store = tx.objectStore('tags');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tags.forEach((tag) => {
        store.put(tag);
      });
    });
  });
}

// Folder Operations
export function getFolders(): Promise<Folder[]> {
  return openDB().then((db) => {
    return new Promise<Folder[]>((resolve, reject) => {
      const transaction = db.transaction('folders', 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveFolder(folder: Folder): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('folders', 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function bulkInsertFolders(folders: Folder[]): Promise<void> {
  if (folders.length === 0) return Promise.resolve();
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      folders.forEach((folder) => {
        store.put(folder);
      });
    });
  });
}

// Sync Meta Operations
export function getSyncMeta(key: string): Promise<string | null> {
  return openDB().then((db) => {
    return new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction('sync_meta', 'readonly');
      const store = transaction.objectStore('sync_meta');
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveSyncMeta(key: string, value: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('sync_meta', 'readwrite');
      const store = transaction.objectStore('sync_meta');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// Snapshot Full DB Export
export function exportDatabaseSnapshot(): Promise<string> {
  return Promise.all([getNotes(), getTags(), getFolders()]).then(([notes, tags, folders]) => {
    const snapshot = {
      notes,
      tags,
      folders,
      exportTimestamp: Date.now(),
      version: DB_VERSION
    };
    return JSON.stringify(snapshot, null, 2);
  });
}

// Snapshot Full DB Import
export function importDatabaseSnapshot(jsonString: string): Promise<{
  notesCount: number;
  tagsCount: number;
  foldersCount: number;
}> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return Promise.reject(err);
  }
  if (!parsed.notes || !parsed.tags || !parsed.folders) {
    return Promise.reject(new Error('Invalid backup file. Missing essential database tables.'));
  }

  return openDB().then((db) => {
    return new Promise<{
      notesCount: number;
      tagsCount: number;
      foldersCount: number;
    }>((resolve, reject) => {
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
  });
}

// Event Operations
export function getEvents(): Promise<CalendarEvent[]> {
  return openDB().then((db) => {
    return new Promise<CalendarEvent[]>((resolve, reject) => {
      if (!db.objectStoreNames.contains('events')) {
        resolve([]);
        return;
      }
      const transaction = db.transaction('events', 'readonly');
      const store = transaction.objectStore('events');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveEvent(event: CalendarEvent): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('events', 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.put(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function bulkInsertEvents(events: CalendarEvent[]): Promise<void> {
  if (events.length === 0) return Promise.resolve();
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      events.forEach((event) => {
        store.put(event);
      });
    });
  });
}
