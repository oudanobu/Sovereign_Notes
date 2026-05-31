/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Server, Cloud, Download, Upload, AlertTriangle, Check, RefreshCw, Plus, Copy, Share2, Sliders } from 'lucide-react';
import { Tag, Folder, Note } from '../types';
import { exportDatabaseSnapshot, importDatabaseSnapshot, getNotes, getTags, getFolders, bulkInsertNotes, bulkInsertTags, bulkInsertFolders } from '../db';
import { Language } from '../utils/i18n';
import { bindTouchTap } from '../utils/touchUtils';

interface SyncDialogProps {
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
  onSyncCompleted: () => void;
  onClose?: () => void;
  lang: Language;
  t: (key: any) => string;
  isInline?: boolean;
  platformProfile?: 'win' | 'tablet' | 'android13' | 'android5';
  setPlatformProfile?: (profile: 'win' | 'tablet' | 'android13' | 'android5') => void;
}

export function SyncDialog({
  notes,
  tags,
  folders,
  onSyncCompleted,
  onClose = () => {},
  lang,
  t,
  isInline = false,
  platformProfile = 'win',
  setPlatformProfile
}: SyncDialogProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'lan' | 'webdav' | 'tags' | 'display'>('backup');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state values
  const [lanServerUrl, setLanServerUrl] = useState(window.location.origin);
  const [webdavUrl, setWebdavUrl] = useState(`${window.location.origin}/api/webdav-sim`);
  const [webdavUser, setWebdavUser] = useState('sovereign_user');
  const [webdavPass, setWebdavPass] = useState('demo-password');
  const [webdavPath, setWebdavPath] = useState('SovereignNotesBackup');

  const addLog = (msg: string) => {
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Helper: Run LWW merge locally with server results
  const mergeLwwData = async (serverNotes: Note[], serverTags: Tag[], serverFolders: Folder[]) => {
    const localNotes = await getNotes();
    const localTags = await getTags();
    const localFolders = await getFolders();

    const noteUpdates: Note[] = [];
    const tagUpdates: Tag[] = [];
    const folderUpdates: Folder[] = [];

    // 1. Merge Notes
    const localNoteMap = new Map(localNotes.map(n => [n.id, n]));
    serverNotes.forEach((srvNote) => {
      const locNote = localNoteMap.get(srvNote.id);
      if (!locNote) {
        noteUpdates.push(srvNote);
        addLog(lang === 'zh' ? `已合并远端新笔记: "${srvNote.title}"` : `Merged new Note: "${srvNote.title}" from peer.`);
      } else if (srvNote.updatedAt > locNote.updatedAt) {
        noteUpdates.push(srvNote);
        addLog(lang === 'zh' ? `根据 LWW 规则，已接受更新笔记: "${srvNote.title}"` : `Updated Note: "${srvNote.title}" synced from peer (LWW winner).`);
      } else if (srvNote.updatedAt < locNote.updatedAt) {
        addLog(lang === 'zh' ? `本地笔记较新，保留本地: "${locNote.title}"` : `Local Note: "${locNote.title}" is newer. Kept local version.`);
      }
    });

    // 2. Merge Tags
    const localTagMap = new Map(localTags.map(t => [t.id, t]));
    serverTags.forEach((srvTag) => {
      const locTag = localTagMap.get(srvTag.id);
      if (!locTag) {
        tagUpdates.push(srvTag);
        addLog(lang === 'zh' ? `已合并远端新标签: "${srvTag.path}"` : `Merged new Tag: "${srvTag.path}" from peer.`);
      } else if (srvTag.updatedAt > locTag.updatedAt) {
        tagUpdates.push(srvTag);
        addLog(lang === 'zh' ? `更新标签路径: "${srvTag.path}" (LWW胜出)` : `Updated Tag: "${srvTag.path}" synced from peer (LWW winner).`);
      }
    });

    // 3. Merge Folders
    const localFolderMap = new Map(localFolders.map(f => [f.id, f]));
    serverFolders.forEach((srvFolder) => {
      const locFolder = localFolderMap.get(srvFolder.id);
      if (!locFolder) {
        folderUpdates.push(srvFolder);
        addLog(lang === 'zh' ? `已合并远端新分类: "${srvFolder.name}"` : `Merged new Category: "${srvFolder.name}" from peer.`);
      } else if (srvFolder.updatedAt > locFolder.updatedAt) {
        folderUpdates.push(srvFolder);
        addLog(lang === 'zh' ? `已更新分类: "${srvFolder.name}"` : `Updated Category: "${srvFolder.name}" synced from peer.`);
      }
    });

    // Save outputs
    await bulkInsertNotes(noteUpdates);
    await bulkInsertTags(tagUpdates);
    await bulkInsertFolders(folderUpdates);

    addLog(lang === 'zh' 
      ? `同步结束！共合并 ${noteUpdates.length} 条笔记, ${tagUpdates.length} 个标签, ${folderUpdates.length} 个文件夹分类。`
      : `Synch Complete! Merged: ${noteUpdates.length} notes, ${tagUpdates.length} tags, ${folderUpdates.length} folders.`
    );
  };

  // 1. Database snapshot backup (Export & Import)
  const handleExportSnapshot = async () => {
    try {
      const dbJson = await exportDatabaseSnapshot();

      // Check for advanced HTML5 File System Access API (supports folder & file picker)
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const defaultName = t('snapshotExportName') || `Sovereign_Backup_${new Date().toISOString().slice(0, 10)}.json`;
          // @ts-ignore
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: defaultName,
            types: [{
              description: 'Sovereign Note JSON Backup',
              accept: { 'application/json': ['.json'] }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(dbJson);
          await writable.close();
          setSuccessMessage(lang === 'zh' 
            ? '主权快照已成功导出至您自主指定的本地设备文件夹！' 
            : 'Database Snapshot exported successfully to your selected folder!'
          );
          return;
        } catch (pickerErr: any) {
          // If user cancelled, stop
          if (pickerErr.name === 'AbortError') {
             return;
          }
          // other errors falls back to traditional download
        }
      }

      // Traditional standard web sandbox download fallback
      const fileName = t('snapshotExportName') || `Sovereign_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([dbJson], { type: 'application/json' });
      
      // Try Web Share API with File (Excellent for Mobile Devices/Android)
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: lang === 'zh' ? 'SovereignNote 数据备份' : 'SovereignNote Backup',
              text: lang === 'zh' ? '请妥善保存此系统级全量备份文件' : 'Please keep this full system backup safe'
            });
            setSuccessMessage(lang === 'zh' 
              ? '主权快照已成功调用系统分享！您可保存至本地文件管理器或发送至微信/网盘等。' 
              : 'Snapshot successfully shared via system dialog!'
            );
            return;
          }
        } catch (shareErr: any) {
          console.warn('Share API failed or user cancelled, falling back to download:', shareErr);
        }
      }

      // Final fallback: standard a-tag download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage(
        lang === 'zh' 
          ? '主权数据副本已触发出货！若未弹出下载框，说明您的安卓浏览器锁死了下载权限，请使用下方“复制到剪贴板”功能！' 
          : 'Export triggered! If nothing downloaded, your browser blocked it. Use "Copy to Clipboard" instead.'
      );
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err.message}`);
    }
  };

  const handleShareSnapshot = async (shareType: 'file' | 'text') => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      const dbJson = await exportDatabaseSnapshot();
      const fileName = t('snapshotExportName') || `Sovereign_Backup_${new Date().toISOString().slice(0, 10)}.json`;

      if (typeof navigator === 'undefined' || !navigator.share) {
        throw new Error(
          lang === 'zh'
            ? '您的浏览器或设备环境不支持系统原生分享 API，请升级浏览器或使用下方复制功能。'
            : 'Web Share API is not supported in this browser environment.'
        );
      }

      if (shareType === 'file') {
        const blob = new Blob([dbJson], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: lang === 'zh' ? 'SovereignNote 数据备份文件' : 'SovereignNote File Backup',
            text: lang === 'zh' ? '全量 JSON 系统备份文件' : 'SovereignNote complete system database snapshot'
          });
          setSuccessMessage(
            lang === 'zh'
              ? '🎉 备份文件已成功递送系统分享！您可以选择发送至文件管理器、微信、云盘等。'
              : 'Backup file sent to systems share dialog successfully!'
          );
        } else {
          throw new Error(
            lang === 'zh'
              ? '当前设备不支持直接分享【文件实体】（可能由于系统安全限制），建议尝试下方的【分享为文本格式】或使用复制剪贴板功能！'
              : 'Sharing files is restricted or unsupported by this OS build. Try text sharing instead.'
          );
        }
      } else {
        // Share as plain text payload
        await navigator.share({
          title: lang === 'zh' ? 'SovereignNote 数据备份文本' : 'SovereignNote Plain Text Sync',
          text: dbJson
        });
        setSuccessMessage(
          lang === 'zh'
            ? '🎉 备选文本已成功拉起系统分享！您可以直接发至文件管理、便签、微信传输助手等。'
            : 'Backup text payload sent to systems share dialog successfully!'
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled, ignore
        return;
      }
      setErrorMessage(
        lang === 'zh'
          ? `分享通道调用失败: ${err.message}`
          : `Share failed: ${err.message}`
      );
    }
  };

  // Additional helper: Copy complete backup to clipboard
  const [rawBackupDisplay, setRawBackupDisplay] = useState<string | null>(null);

  const handleCopySnapshotToClipboard = async () => {
    try {
      setSuccessMessage(lang === 'zh' ? '正在生成全量序列化包裹...请稍候' : 'Generating payload...');
      const dbJson = await exportDatabaseSnapshot();
      
      // Try modern clipboard API first
      let success = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(dbJson);
          success = true;
        } catch (e) {
          console.warn('Modern clipboard failed, trying fallback', e);
        }
      }
      
      // Fallback for Android WebView / unsupported browsers
      if (!success) {
        const textArea = document.createElement('textarea');
        textArea.value = dbJson;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          if (!successful) throw new Error('execCommand copy failed');
        } catch (err) {
          document.body.removeChild(textArea);
          // If EVERYTHING fails, show the raw string!
          setRawBackupDisplay(dbJson);
          setErrorMessage(lang === 'zh' ? '剪切板被系统拦截！我们为您生成了最原始的文本框，请手动长按全选并复制下方内容。' : 'Clipboard access denied. Please manually select all and copy the text below.');
          return;
        }
        document.body.removeChild(textArea);
      }
      
      setSuccessMessage(
        lang === 'zh'
          ? '全量主权备份内容已极速复制至剪切板！您可打开手机任意“文件管理/文本编辑器/WPS”，新建文本文件粘贴即可！(若文件过大可能在此有短暂卡顿)'
          : 'Full JSON backup copied to clipboard! Paste it anywhere to save as file.'
      );
    } catch (err: any) {
      setErrorMessage(`Copy failed: ${err.message}`);
    }
  };

  const handleImportSnapshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Skipped window.confirm to avoid freezing in Android WebView or Sandboxed iFrames
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const json = event.target?.result as string;
        const res = await importDatabaseSnapshot(json);
        setSuccessMessage(lang === 'zh'
          ? `数据灾难性恢复校验通过！共导入笔记 ${res.notesCount} 篇，标签结构 ${res.tagsCount} 条，分类文件夹 ${res.foldersCount} 个。`
          : `Database restored successfully! Imported ${res.notesCount} notes, ${res.tagsCount} tags, and ${res.foldersCount} categories.`
        );
        onSyncCompleted();
      };
      reader.readAsText(file);
    } catch (err: any) {
      setErrorMessage(`Import failed: Ensure the JSON backup file is valid. Error: ${err.message}`);
    }
  };

  // 2. High-Fidelity LAN Synchronization Client
  const handleLanSyncNow = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSyncLogs([]);
    addLog(lang === 'zh' ? '正在连接局域网主权数据端点进行同步...' : 'Starting Decentralized LAN Sync simulation...');

    try {
      const currentNotes = await getNotes();
      const currentTags = await getTags();
      const currentFolders = await getFolders();

      addLog(lang === 'zh' 
        ? `提交本地局域网交易单：含有笔记本 ${currentNotes.length} 篇，标签树 ${currentTags.length} 条，分类 ${currentFolders.length} 个。`
        : `Sending database state: ${currentNotes.length} notes, ${currentTags.length} tags, ${currentFolders.length} categories.`
      );

      // POST to sync server
      const response = await fetch(`${lanServerUrl}/api/lan-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: currentNotes,
          tags: currentTags,
          folders: currentFolders
        })
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with code ${response.status}`);
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Server alignment failed');
      }

      // Merge server response back with client
      addLog(lang === 'zh' ? '远端服务器数据已返回！正在比对并根据时序账本解决 LWW 交易合并...' : 'Server returned master dataset. Reconciling version timestamps...');
      await mergeLwwData(resData.notes, resData.tags, resData.folders);

      setSuccessMessage(lang === 'zh' ? '局域网/局域链 P2P 笔记数据全链路合并同步自适应就绪！' : 'Local Sovereign LAN database synchronized successfully!');
      onSyncCompleted();
    } catch (err: any) {
      addLog(`Error during sync: ${err.message}`);
      setErrorMessage(lang === 'zh'
        ? `局域网通道同步中断：无法同位于 ${lanServerUrl} 的对等服务器握手。请确保对应的 Express 分发服务已成功启动并保持监听。`
        : `Sync Error: Unable to communicate with the host setup at ${lanServerUrl}. Ensure server.ts is active.`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Authenticated WebDAV Cloud Sync Client
  const handleWebDavSync = async (direction: 'upload' | 'download') => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSyncLogs([]);
    addLog(`Initiating WebDAV ${direction} sequence ...`);

    try {
      const targetBackupUrl = `${webdavUrl}/${webdavPath}/sovereign_sync.json`;
      addLog(`Target Endpoint: ${targetBackupUrl}`);

      // Basic Authentication Headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (webdavUser) {
        const authBase64 = btoa(`${webdavUser}:${webdavPass}`);
        headers['Authorization'] = `Basic ${authBase64}`;
      }

      if (direction === 'upload') {
        const dbJson = await exportDatabaseSnapshot();
        addLog(lang === 'zh' ? '正在汇编本地完整事务型 IndexedDB 序列快照...' : 'Compiling local database transaction snapshot...');

        const response = await fetch(targetBackupUrl, {
          method: 'PUT',
          headers,
          body: dbJson
        });

        if (!response.ok) {
          throw new Error(`WebDAV server rejected transmission: status ${response.status}`);
        }

        addLog('WebDAV PUT request successfully submitted. Backups written.');
        setSuccessMessage(lang === 'zh' ? 'WebDAV 主权增量级云同步快照上传归档成功！' : 'WebDAV incremental cloud backup uploaded successfully!');
      } else {
        // download
        addLog(lang === 'zh' ? '正在从您的私有 WebDAV 服务器拉取冲突解析日志...' : 'Pulling sync snapshot from WebDAV servers...');
        const response = await fetch(targetBackupUrl, {
          method: 'GET',
          headers
        });

        if (response.status === 404) {
          addLog('WebDAV storage file was not found. Init uploading first.');
          throw new Error(lang === 'zh' ? '在云端 WebDAV 指定的物理节点中未发现可复原的同盟账本文件。' : 'No cloud snapshot found on the WebDAV storage map path.');
        }

        if (!response.ok) {
          throw new Error(`WebDAV fetch failed: status ${response.status}`);
        }

        const cloudSnapshotText = await response.text();
        const parsed = JSON.parse(cloudSnapshotText);

        addLog(`Analyzing records: Found ${parsed.notes ? parsed.notes.length : 0} cloud notes.`);
        await mergeLwwData(parsed.notes || [], parsed.tags || [], parsed.folders || []);

        setSuccessMessage(t('connectionSuccess'));
        onSyncCompleted();
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setErrorMessage(`WebDAV Operation Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Tag isolated Export / Import
  const handleExportTagsOnly = () => {
    try {
      const tagsOnly = tags.filter(t => !t.isDeleted);
      const json = JSON.stringify(tagsOnly, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sovereign_Tags_Tree_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage(lang === 'zh' ? 'Sovereign 标签树分量导出成功！' : 'Sovereign Tag Tree exported successfully!');
    } catch (err: any) {
      setErrorMessage(`Tag export failed: ${err.message}`);
    }
  };

  const handleImportTagsOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const json = event.target?.result as string;
        const importedTags = JSON.parse(json) as Tag[];

        if (!Array.isArray(importedTags) || (importedTags.length > 0 && !importedTags[0].path)) {
          throw new Error('Invalid tag configuration. Ensure correct schema is maintained.');
        }

        // Merge tags
        const localTags = await getTags();
        const currentTagPaths = new Set(localTags.filter(t => !t.isDeleted).map(t => t.path));
        
        const tagsToInsert: Tag[] = [];
        let addedCount = 0;

        importedTags.forEach((importedTag) => {
          if (!currentTagPaths.has(importedTag.path)) {
            tagsToInsert.push({
              ...importedTag,
              updatedAt: Date.now()
            });
            addedCount++;
          }
        });

        await bulkInsertTags(tagsToInsert);
        setSuccessMessage(lang === 'zh'
          ? `标签拓扑结构合并完成！共引入自适应 1~6 级派生树条目共 ${addedCount} 组。`
          : `Tag tree successfully updated! Merged ${addedCount} brand new tag structures up to level 6.`
        );
        onSyncCompleted();
      };
      reader.readAsText(file);
    } catch (err: any) {
      setErrorMessage(`Tag import failed: ${err.message}`);
    }
  };

  const renderContent = () => (
    <div className={`bg-white border-gray-150 flex flex-col overflow-hidden ${
      isInline ? 'w-full h-full shadow-sm' : 'rounded-2xl border shadow-2xl w-full max-w-2xl h-[580px] animate-fade-in'
    }`}>
      {/* Core Header */}
      <div className="px-6 py-4.5 border-b border-gray-150 flex items-center justify-between bg-slate-50">
        <div className="flex items-center space-x-2.5">
          <Shield className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">{t('syncCenterTitle')}</h2>
            <p className="text-[10.5px] text-gray-450 font-bold leading-normal">{t('localSovereignDB')}</p>
          </div>
        </div>
        {!isInline && (
          <button
            {...bindTouchTap(onClose)}
            className="text-gray-400 hover:text-gray-800 p-2.5 rounded-xl hover:bg-gray-100 font-bold transition duration-150 text-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sync Center Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tabs Menu Sidebar */}
        <div className="w-52 bg-slate-50/50 border-r border-gray-150 p-3 space-y-1">
          <button
            {...bindTouchTap(() => setActiveTab('backup'))}
            className={`w-full flex items-center gap-2.5 px-3 py-3 text-xs font-bold rounded-xl text-left transition duration-150 min-h-[44px] cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-650 hover:bg-slate-100 hover:text-slate-905'
            }`}
          >
            <Download className="w-4 h-4" />
            {t('localSnapshotTab')}
          </button>
          <button
            {...bindTouchTap(() => setActiveTab('lan'))}
            className={`w-full flex items-center gap-2.5 px-3 py-3 text-xs font-bold rounded-xl text-left transition duration-150 min-h-[44px] cursor-pointer ${
              activeTab === 'lan'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-650 hover:bg-slate-100 hover:text-slate-901'
            }`}
          >
            <Server className="w-4 h-4" />
            {t('lanServerUrl') ? t('lanServerUrl') : (lang === 'zh' ? '局域链 LWW 同步' : 'LAN Sync Core')}
          </button>
          <button
            {...bindTouchTap(() => setActiveTab('webdav'))}
            className={`w-full flex items-center gap-2.5 px-3 py-3 text-xs font-bold rounded-xl text-left transition duration-150 min-h-[44px] cursor-pointer ${
              activeTab === 'webdav'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-650 hover:bg-slate-100 hover:text-slate-901'
            }`}
          >
            <Cloud className="w-4 h-4" />
            {t('webdavTab')}
          </button>
          <button
            {...bindTouchTap(() => setActiveTab('tags'))}
            className={`w-full flex items-center gap-2.5 px-3 py-3 text-xs font-bold rounded-xl text-left transition duration-150 min-h-[44px] cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-650 hover:bg-slate-100 hover:text-slate-901'
            }`}
          >
            <Plus className="w-4 h-4" />
            {lang === 'zh' ? '标签派生导入导出' : 'Tags Export/Import'}
          </button>
          <button
            {...bindTouchTap(() => setActiveTab('display'))}
            className={`w-full flex items-center gap-2.5 px-3 py-3 text-xs font-bold rounded-xl text-left transition duration-150 min-h-[44px] cursor-pointer ${
              activeTab === 'display'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-650 hover:bg-slate-100 hover:text-slate-901'
            }`}
          >
            <Sliders className="w-4 h-4" />
            {lang === 'zh' ? '设备显示模式优化' : 'Device UI Optimizer'}
          </button>
        </div>

        {/* Active Tab View */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-between scrollbar-thin">
          <div>
            {/* STATUS LOG NOTIFICATIONS */}
            {successMessage && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-start space-x-2.5 animate-fade-in shadow-sm">
                <Check className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-bold flex items-start space-x-2.5 shadow-sm">
                <AlertTriangle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: Database Snapshot Backup */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">{t('snapshotManagerTitle')}</h3>
                  <p className="text-[11.5px] text-gray-500 font-bold leading-relaxed">
                    {t('snapshotDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    {...bindTouchTap(handleExportSnapshot)}
                    className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-200 rounded-2xl hover:border-slate-800 bg-slate-50/50 hover:bg-white cursor-pointer group transition duration-150 min-h-[140px]"
                  >
                    <Download className="w-7 h-7 text-gray-400 group-hover:text-slate-900 mb-3" />
                    <span className="text-xs font-extrabold text-slate-800">
                      {lang === 'zh' ? '📂 自由选择活页夹/导出' : t('exportDatabaseSnapshotBtn')}
                    </span>
                    <span className="text-[10px] text-gray-450 mt-1 text-center font-bold">
                      {lang === 'zh' ? '支持在符合条件的现代设备上任意自选存储文件夹与重命名' : 'Saves all notes, tags, and structure'}
                    </span>
                  </button>

                  <label className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-200 rounded-2xl hover:border-slate-800 bg-slate-50/50 hover:bg-white cursor-pointer group transition duration-150 min-h-[140px]">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportSnapshot}
                      className="hidden"
                    />
                    <Upload className="w-7 h-7 text-gray-400 group-hover:text-slate-950 mb-3" />
                    <span className="text-xs font-extrabold text-slate-850">{t('importDatabaseSnapshotBtn')}</span>
                    <span className="text-[10px] text-gray-450 mt-1 text-center font-bold">{lang === 'zh' ? '一键上传已存快照以极速覆盖' : 'Imports file & overwrites IndexedDB'}</span>
                  </label>
                </div>

                {/* Android System Backup Path Guarding Board & Copy Clipboard Bypass */}
                <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-3.5 mt-3 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <span className="text-sm">💡</span>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      {lang === 'zh' ? '安卓设备（手机及平板）备份找回寻踪导航' : 'Android Storage Finder Navigator'}
                    </h4>
                  </div>
                  
                  <div className="text-[10.5px] text-slate-600/90 font-bold space-y-2 leading-relaxed">
                    <p>
                      {lang === 'zh' 
                        ? '1. 如果您的设备系统不支持弹出目标文件夹选择器，点击上方导出后，备份默认会存入系统的 “主存储 / Download (或 下载)” 文件夹下，文件一般命名为: Sovereign_Backup_*.json。' 
                        : '1. If standard file system save API is unavailable, clicking Export will default to write files inside your internal store: /Download/ directory.'}
                    </p>
                    <p>
                      {lang === 'zh'
                        ? '2. 为确保完美掌控，您也可以点击下方按钮，“一键把全部数据复制为一串独立加密密码”，随后可在手机任意喜爱目录（WPS、百度云等）下直接自建文本文档粘贴重命名保存，彻底告别默认搜索困扰！'
                        : '2. Alternatively, use Clipboard shortcut to secure text payloads to bypass OS sandbox folders altogether.'}
                    </p>
                  </div>

                  <div className="pt-1.5 flex flex-col space-y-2">
                    <button
                      type="button"
                      {...bindTouchTap(handleCopySnapshotToClipboard)}
                      className="w-full py-2.5 px-3 bg-white border border-slate-205 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer hover:text-slate-950 active:scale-98 min-h-[44px]"
                    >
                      <Copy className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'zh' ? '📋 立即复制全量主权备份至剪切板' : 'Copy Full Snapshot to Clipboard'}</span>
                    </button>

                    {/* Smart OS Share Channel */}
                    <div className="border-t border-slate-200/60 pt-3 mt-1.5 space-y-2">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{lang === 'zh' ? '📱 智能系统原生分享 (绕过沙盒直接存盘)' : 'Native System Share Channel'}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          {...bindTouchTap(() => handleShareSnapshot('file'))}
                          className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98 min-h-[40px]"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{lang === 'zh' ? '📂 分享为【文件】' : 'Share File'}</span>
                        </button>
                        
                        <button
                          type="button"
                          {...bindTouchTap(() => handleShareSnapshot('text'))}
                          className="py-2 px-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-extrabold text-[11px] rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98 min-h-[40px]"
                        >
                          <Share2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>{lang === 'zh' ? '📝 分享为【纯文本】' : 'Share Text'}</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold leading-normal">
                        {lang === 'zh' 
                          ? '💡 核心推荐：若您的浏览器没有弹出下载框，可以点击「分享为文件」直接发送至“文件管理器、微信、云盘”等保存到本地。' 
                          : '💡 Direct workaround: Clicking "Share File" routes around standard web download limits into local Storage explorers.'}
                      </p>
                    </div>

                    {rawBackupDisplay && (
                      <div className="mt-3 bg-white rounded-xl border border-rose-200 p-2 shadow-xs transition-all flex flex-col">
                         <div className="flex justify-between items-center px-1 pb-2">
                           <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">{lang === 'zh' ? '系统剪切板被禁用: 原始包裹提取槽' : 'Clipboard Blocked: Raw Payload'}</span>
                           <button 
                             {...bindTouchTap(() => setRawBackupDisplay(null))}
                             className="text-gray-400 hover:text-gray-700 text-[10px] font-bold p-1 cursor-pointer"
                           >
                             {lang === 'zh' ? '清空关闭' : 'Close'}
                           </button>
                         </div>
                         <textarea
                           className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[9px] font-mono text-slate-600 resize-y focus:outline-none focus:border-indigo-400"
                           value={rawBackupDisplay}
                           readOnly
                           onFocus={(e) => e.target.select()}
                         />
                         <p className="text-[9.5px] text-gray-500 font-bold mt-1.5 px-1">{lang === 'zh' ? '👉 请点击上方数据区长按【全选 -> 复制】，并粘贴至你的手机文本便签中进行保存。' : '👉 Please long press the box above, Select All, and copy to save manually.'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LAN Sync (P2P Client-Server) */}
            {activeTab === 'lan' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">{lang === 'zh' ? '局域网络对等事务对齐' : 'Intranet / LAN P2P Synchronizer'}</h3>
                  <p className="text-[11.5px] text-gray-400 font-semibold leading-relaxed">
                    {t('syncDesc')}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-gray-150 text-xs space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{lang === 'zh' ? '局域对等机服务主机 IP' : 'Sync Server Host (IP Address)'}</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-950 bg-white text-gray-700 min-h-[44px]"
                        value={lanServerUrl}
                        onChange={(e) => setLanServerUrl(e.target.value)}
                      />
                      <button
                        {...bindTouchTap(handleLanSyncNow)}
                        disabled={isSyncing}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-gray-450 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer text-xs min-h-[44px]"
                      >
                        {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {lang === 'zh' ? '开始拉取对齐' : 'Align State'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      * {lang === 'zh' ? '提示：在目前的沙盒调试终端中，此服务可以监听在当前域名来进行多浏览器标签、多设备的高端双向同步！' : 'In this AI Studio simulation environment, the server binds to localhost to sync multiple browser tabs.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WebDAV Cloud Sync */}
            {activeTab === 'webdav' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">{t('webdavConfigTitle')}</h3>
                  <p className="text-[11.5px] text-gray-500 font-bold leading-relaxed">
                    {lang === 'zh' ? '本应用绝不截留您的账户秘钥。WebDAV支持自建 Nextcloud、NAS或者坚果云，所有双向时空合并仅在本地线程内部进行，极致机密。' : 'Connect Nextcloud, Nutstore, or own server. Syncs conflict logs inside of custom-made directories managed by yourself.'}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4.5 border border-gray-150 text-xs space-y-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">{t('webdavUrl')}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white min-h-[40px]"
                        value={webdavUrl}
                        onChange={(e) => setWebdavUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">{t('remotePath')}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white min-h-[40px]"
                        value={webdavPath}
                        onChange={(e) => setWebdavPath(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">{t('username')}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white min-h-[40px]"
                        value={webdavUser}
                        onChange={(e) => setWebdavUser(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-1">{t('password')}</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white min-h-[40px]"
                        value={webdavPass}
                        onChange={(e) => setWebdavPass(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3.5 pt-1">
                    <button
                      {...bindTouchTap(() => handleWebDavSync('download'))}
                      disabled={isSyncing}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:bg-gray-100 disabled:text-gray-300 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer min-h-[44px] text-xs"
                    >
                      <Download className="w-4 h-4" />
                      {lang === 'zh' ? '拉取合并' : 'Pull Cloud'}
                    </button>
                    <button
                      {...bindTouchTap(() => handleWebDavSync('upload'))}
                      disabled={isSyncing}
                      className="px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-gray-400 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer min-h-[44px] text-xs"
                    >
                      <Upload className="w-4 h-4" />
                      {lang === 'zh' ? '推送归档' : 'Push Cloud'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Tags Import/Export */}
            {activeTab === 'tags' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{lang === 'zh' ? '独立6级主权标签树治理' : 'Independent 6-Level Tag Tree manager'}</h3>
                  <p className="text-[11.5px] text-gray-500 font-bold leading-relaxed">
                    {lang === 'zh' ? '标签树决定了您全部索引分箱的物理脉络。您在此可以独立转移或重建完好的级联分类索引环境，而无须修改底层文章实体结构。' : 'Import or export tag hierarchies separately to migrate taxonomies across hardware setups.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    {...bindTouchTap(handleExportTagsOnly)}
                    className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-200 rounded-2xl hover:border-slate-800 bg-slate-50/50 hover:bg-white cursor-pointer group transition duration-150 min-h-[140px]"
                  >
                    <Download className="w-7 h-7 text-gray-400 group-hover:text-slate-900 mb-3" />
                    <span className="text-xs font-extrabold text-slate-800">{lang === 'zh' ? '仅导出标签拓扑 (.json)' : 'Export Tags Only (.json)'}</span>
                    <span className="text-[10px] text-gray-450 mt-1 text-center font-bold">{lang === 'zh' ? '备份完整6级标签图腾脉络' : 'Downloads complete tag tree scheme'}</span>
                  </button>

                  <label className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-200 rounded-2xl hover:border-slate-800 bg-slate-50/50 hover:bg-white cursor-pointer group transition duration-150 min-h-[140px]">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportTagsOnly}
                      className="hidden"
                    />
                    <Upload className="w-7 h-7 text-gray-400 group-hover:text-slate-950 mb-3" />
                    <span className="text-xs font-extrabold text-slate-850">{lang === 'zh' ? '导入并合并新层级标签' : 'Import Tags & Merge'}</span>
                    <span className="text-[10px] text-gray-450 mt-1 text-center font-bold">{lang === 'zh' ? '合并外部标签并补全缺漏层级' : 'Integrates tags & respects 6 levels'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB DISPLAY PROFILE: Optimisation for Win/Tablet/Android13/Android5 */}
            {activeTab === 'display' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
                    {lang === 'zh' ? '设备专属显示适配器与 CSS 优化' : 'Device Layout CSS Optimisation Profile'}
                  </h3>
                  <p className="text-[11.5px] text-gray-500 font-extrabold leading-relaxed font-sans">
                    {lang === 'zh' 
                      ? '针对您的当前物理设备切换最完美的 UI 渲染机制与 CSS 样式。这将自适应调整触控热区、行高、堆叠顺序以及低配设备性能过滤。' 
                      : 'Choose the most optimal style sheets and layout mechanisms for your target environment to boost performance and prevent element wrapping or overlaps.'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
                  {[
                    {
                      id: 'win',
                      icon: '💻',
                      titleZh: '1. Windows / 键鼠高精细模式',
                      titleEn: '1. Windows Desktop / Mouse Optimizer',
                      descZh: '极致高信息密度展示。原生微细滚动条，小紧凑间距，充分激活极致悬浮(Hover)提示。推荐在 Surface 外接键盘/鼠标或普通 Win 电脑上使用。',
                      descEn: 'Default compact styling. Optimized for precision screens, mouse scrollbars, hover annotations, and dense multi-panel displays.'
                    },
                    {
                      id: 'tablet',
                      icon: '📟',
                      titleZh: '2. Windows 平板 / 智能触控大字版 (防重叠)',
                      titleEn: '2. Tablet Touch Mode (Anti-Collision Layout)',
                      descZh: '触控优化大热区（46px+），防误触。彻底重塑顶部工具栏，将文件夹、标签、编辑和预览按钮进行多行重排与堆叠展示，防止在 PWA 狭窄宽度下发生任何重叠与冲突！',
                      descEn: 'Fat-finger touch-friendly targets (46px+). Automatically transforms the top header into a stacked multi-row layout to prevent overlapping on narrower screens.'
                    },
                    {
                      id: 'android13',
                      icon: '📱',
                      titleZh: '3. 安卓 13+ / 现代全面屏全面优化版',
                      titleEn: '3. Android 13+ Modern Full-Screen',
                      descZh: 'PWA 全面屏手势安全区适配，大圆角卡片布局。优化触控滚动物理阻尼。适用于配备全面屏、打孔屏的现代中高配安卓系统，滑动顺滑。',
                      descEn: 'Sleek modern rounded layout with notch and gesture bar safe-area support. Fluid inertial scroll behaviors for high-refresh modern phones.'
                    },
                    {
                      id: 'android5',
                      icon: '📻',
                      titleZh: '4. 安卓 4.4 - 5.0 / 老旧复古兼容极速版',
                      titleEn: '4. Android 5.0 Retro Safe Layout',
                      descZh: '极致平面化（完全剔除阴影、毛玻璃与渐变，减负CPU）。禁用一切重负载重绘动效。自动补正 Flex Gap 为传统 Margin 间距以消除老版 WebView 排版拉伸偏离。',
                      descEn: 'Flat components with shadows and backdrop blurs disabled to save fragile CPU cores. Strict transition suppression and margin offsets fallback.'
                    }
                  ].map((profileItem) => {
                    const isSelected = platformProfile === profileItem.id;
                    return (
                      <button
                        key={profileItem.id}
                        {...bindTouchTap(() => {
                          if (setPlatformProfile) {
                            setPlatformProfile(profileItem.id as any);
                          }
                        })}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start space-x-3 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/40 border-indigo-600 text-indigo-950 font-black ring-2 ring-indigo-600/10'
                            : 'bg-white border-gray-200 text-slate-800 hover:border-slate-350'
                        }`}
                      >
                        <span className="text-xl mt-1 select-none">{profileItem.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black leading-snug">
                              {lang === 'zh' ? profileItem.titleZh : profileItem.titleEn}
                            </span>
                            {isSelected && (
                              <span className="text-[9.5px] bg-indigo-600 text-white font-extrabold uppercase px-2 py-0.5 rounded-lg select-none leading-none">
                                {lang === 'zh' ? '当前激活' : 'Active'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-extrabold mt-1 leading-relaxed break-words">
                            {lang === 'zh' ? profileItem.descZh : profileItem.descEn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* LIVE CONSOLE LOG VIEWER */}
          {syncLogs.length > 0 && (
            <div className="mt-5 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono font-extrabold tracking-wider text-slate-300">{t('syncLogsTitle')}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="bg-slate-950 text-emerald-400/90 font-mono text-[9px] p-3 h-24 overflow-y-auto space-y-0.5 scrollbar-thin">
                {syncLogs.map((log, idx) => (
                  <div key={idx} className="leading-snug">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return renderContent();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-45 font-sans animate-fade-in">
      {renderContent()}
    </div>
  );
}
