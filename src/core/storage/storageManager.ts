import { 
  openDB, 
  getNotes, 
  getTags, 
  getFolders, 
  saveNote, 
  saveFolder, 
  saveTag,
  bulkInsertNotes,
  bulkInsertTags,
  bulkInsertFolders
} from '../../db';
import { Note, Tag, Folder, AssetItem } from '../../types';

export interface StorageSnapshot {
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
  version: number;
  timestamp: string;
}

class StorageManager {
  // Shims for legacy/missing property safety
  private shimNote(rawNote: any): Note {
    return {
      ...rawNote,
      type: rawNote.type || 'markdown',
      title: rawNote.title || 'Untitled',
      content: rawNote.content || '',
      tagIds: rawNote.tagIds || [],
      folderId: rawNote.folderId || null,
      createdAt: rawNote.createdAt || Date.now(),
      updatedAt: rawNote.updatedAt || Date.now(),
      isDeleted: !!rawNote.isDeleted,
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

  async getNotes(): Promise<Note[]> {
    return getNotes();
  }

  async saveNote(note: Note): Promise<string> {
    await saveNote(note);
    return note.id;
  }

  async deleteNote(id: string): Promise<void> {
    return openDB().then((db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('notes', 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getTags(): Promise<Tag[]> {
    return getTags();
  }

  async saveTag(tag: Tag): Promise<string> {
    await saveTag(tag);
    return tag.id;
  }

  async getFolders(): Promise<Folder[]> {
    return getFolders();
  }

  async saveFolder(folder: Folder): Promise<string> {
    await saveFolder(folder);
    return folder.id;
  }

  private isAndroidBelow11(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    const match = ua.match(/android\s+([0-9.]+)/);
    if (match) {
      const version = parseFloat(match[1]);
      return version < 11.0;
    }
    return false;
  }

  private blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert Blob to ArrayBuffer.'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  async saveAsset(asset: AssetItem): Promise<string> {
    let dataToSave = asset.data;
    if (this.isAndroidBelow11() && asset.data instanceof Blob) {
      try {
        dataToSave = await this.blobToArrayBuffer(asset.data);
      } catch (err) {
        console.error('Android < 11 asset fallback pre-convert failed:', err);
      }
    }
    
    return openDB().then((db) => {
      return new Promise<string>((resolve, reject) => {
        const transaction = db.transaction('assets', 'readwrite');
        const store = transaction.objectStore('assets');
        const request = store.put({
          ...asset,
          data: dataToSave
        });
        request.onsuccess = () => resolve(asset.id);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getAsset(id: string): Promise<AssetItem | null> {
    return openDB().then((db) => {
      return new Promise<AssetItem | null>((resolve, reject) => {
        const transaction = db.transaction('assets', 'readonly');
        const store = transaction.objectStore('assets');
        const request = store.get(id);
        request.onsuccess = () => {
          const raw = request.result;
          if (!raw) {
            resolve(null);
            return;
          }
          let finalData = raw.data;
          if (finalData instanceof ArrayBuffer) {
            finalData = new Blob([finalData], { type: raw.mimeType });
          }
          resolve({
            ...raw,
            data: finalData
          });
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getAssetsByNote(noteId: string): Promise<AssetItem[]> {
    return openDB().then((db) => {
      return new Promise<AssetItem[]>((resolve, reject) => {
        const transaction = db.transaction('assets', 'readonly');
        const store = transaction.objectStore('assets');
        const index = store.index('noteId');
        const request = index.getAll(noteId);
        request.onsuccess = () => {
          const all = request.result || [];
          resolve(all.map(raw => {
            let finalData = raw.data;
            if (finalData instanceof ArrayBuffer) {
              finalData = new Blob([finalData], { type: raw.mimeType });
            }
            return {
              ...raw,
              data: finalData
            };
          }));
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async deleteAsset(id: string): Promise<void> {
    return openDB().then((db) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('assets', 'readwrite');
        const store = transaction.objectStore('assets');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

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
      version: 4,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(snapshot, null, 2);
  }

  async restoreSnapshot(snapshotJson: string): Promise<void> {
    const snapshot: StorageSnapshot = JSON.parse(snapshotJson);
    return openDB().then((db) => {
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['notes', 'tags', 'folders'], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        const notesStore = tx.objectStore('notes');
        const tagsStore = tx.objectStore('tags');
        const foldersStore = tx.objectStore('folders');

        notesStore.clear();
        tagsStore.clear();
        foldersStore.clear();

        for (const note of snapshot.notes) notesStore.put(this.shimNote(note));
        for (const tag of snapshot.tags) tagsStore.put(this.shimTag(tag));
        for (const folder of snapshot.folders) foldersStore.put(this.shimFolder(folder));
      });
    });
  }
}

export const storage = new StorageManager();
