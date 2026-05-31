/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { Note, Tag, Folder } from './src/types';

interface ServerDB {
  notes: Record<string, Note>;
  tags: Record<string, Tag>;
  folders: Record<string, Folder>;
}

// In-memory sync database mirroring the shared network environment
const serverDB: ServerDB = {
  notes: {},
  tags: {},
  folders: {}
};

// Simulated WebDAV Storage Map
const webdavStorage: Record<string, string> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PROPFIND', 'MKCOL'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Depth']
  }));
  app.use(express.json({ limit: '50mb' }));

  // API 1: LAN Sync Hub Endpoint
  // Integrates client data and server data using LWW (Last-Write-Wins)
  app.post('/api/lan-sync', (req, res) => {
    try {
      const { notes, tags, folders } = req.body as {
        notes: Note[];
        tags: Tag[];
        folders: Folder[];
      };

      const syncLogs: string[] = [];

      // Helper function to sync a table using LWW
      function syncTable<T extends { id: string; updatedAt: number; isDeleted: boolean }>(
        clientItems: T[],
        serverRecord: Record<string, T>,
        tableName: string
      ) {
        clientItems.forEach((clientItem) => {
          const serverItem = serverRecord[clientItem.id];
          if (!serverItem) {
            // New item on the client
            serverRecord[clientItem.id] = clientItem;
            syncLogs.push(`[${tableName}] Added new item ${clientItem.id} from client`);
          } else if (clientItem.updatedAt > serverItem.updatedAt) {
            // Client has a newer version
            serverRecord[clientItem.id] = clientItem;
            syncLogs.push(`[${tableName}] Client-side update won for ${clientItem.id} (LWW)`);
          } else if (clientItem.updatedAt < serverItem.updatedAt) {
            // Server has a newer version, client needs to pull it
            syncLogs.push(`[${tableName}] Server-side update won for ${clientItem.id} (LWW)`);
          }
        });
      }

      syncTable(notes || [], serverDB.notes, 'Notes');
      syncTable(tags || [], serverDB.tags, 'Tags');
      syncTable(folders || [], serverDB.folders, 'Folders');

      // Return integrated server database
      res.json({
        success: true,
        serverTime: Date.now(),
        notes: Object.values(serverDB.notes),
        tags: Object.values(serverDB.tags),
        folders: Object.values(serverDB.folders),
        logs: syncLogs
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 2: WebDAV Simulated Endpoints
  // Mimics simple WebDAV backup files (reads, writes, properties)
  app.get('/api/webdav-sim/*', (req, res) => {
    const filePath = req.params[0];
    const data = webdavStorage[filePath];
    if (data) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
    } else {
      res.status(404).json({ error: `File /${filePath} not found in WebDAV storage` });
    }
  });

  app.put('/api/webdav-sim/*', (req, res) => {
    const filePath = req.params[0];
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    webdavStorage[filePath] = bodyStr;
    res.status(201).json({ success: true, message: 'WebDAV PUT success' });
  });

  // Mock PROPFIND for cloud folders check
  app.all('/api/webdav-sim/*', (req, res, next) => {
    if (req.method === 'PROPFIND') {
      const filePath = req.params[0];
      const data = webdavStorage[filePath];
      res.setHeader('Content-Type', 'application/xml');
      res.status(207).send(`<?xml version="1.0" encoding="utf-8" ?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/api/webdav-sim/${filePath}</d:href>
    <d:propstat>
      <d:prop>
        <d:resourcetype>${filePath.endsWith('.json') ? '' : '<d:collection/>'}</d:resourcetype>
        <d:getcontentlength>${data ? data.length : 0}</d:getcontentlength>
        <d:status>HTTP/1.1 200 OK</d:status>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`);
    } else {
      next();
    }
  });

  // Vite middleware for development, static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
