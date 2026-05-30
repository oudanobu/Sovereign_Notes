/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MindMapNode {
  id: string;
  topic: string;
  children?: MindMapNode[];
  direction?: 'left' | 'right';
}

export interface MindMapData {
  format: string;
  meta: {
    name: string;
    author: string;
  };
  data: MindMapNode;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'mindmap';
  mindmapData?: MindMapData;
  folderId: string | null;
  tagIds: string[]; // List of tag IDs explicitly assigned
  updatedAt: number; // Unix timestamp for LWW sync
  isDeleted: boolean; // Soft delete flag
}

export interface Tag {
  id: string;
  name: string;
  parentId: string | null; // Null if root level
  path: string; // e.g. "爷爷/父亲/儿子/孙子/曾孙/玄孙"
  level: number; // 0 (root) up to 5 (6th level)
  updatedAt: number;
  isDeleted: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: number;
  isDeleted: boolean;
}

export interface SyncMeta {
  key: string;
  value: string;
}

export interface SyncPayload {
  clientId: string;
  lastSyncTime: number;
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
}

export interface SyncResponse {
  serverTime: number;
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
}

export interface WebDavConfig {
  url: string;
  username: string;
  password?: string;
  folderPath: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // "YYYY-MM-DD" style e.g. "2026-05-30"
  title: string;
  description?: string;
  color?: string; // e.g. "rose", "indigo", "emerald", "amber"
  createdAt: number;
  isDeleted: boolean;
}

