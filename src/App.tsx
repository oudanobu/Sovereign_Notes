/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  PlusCircle,
  Calendar as CalendarIcon,
  Search,
  Download,
  RefreshCw,
  Edit3,
  Eye,
  Columns,
  Workflow,
  Sparkles,
  Sliders,
  PenTool,
  BookOpen
} from 'lucide-react';
import { Note, Tag, Folder, MindMapData, CalendarEvent } from './types';
import { openDB, getNotes, getTags, getFolders, saveNote, saveTag, saveFolder, bulkInsertNotes, bulkInsertTags, bulkInsertFolders, getEvents, saveEvent } from './db';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { MindMapEditor } from './components/MindMapEditor';
import { CalendarPanel } from './components/CalendarPanel';
import { FolderTagHierarchy } from './components/FolderTagHierarchy';
import { SyncDialog } from './components/SyncDialog';
import { ChangelogDialog } from './components/ChangelogDialog';
import { RichTextEditor } from './components/RichTextEditor';
import { WhiteboardEditor } from './components/WhiteboardEditor';
import { useLanguage } from './utils/i18n';
import { bindTouchTap } from './utils/touchUtils';

export default function App() {
  const { lang, setLang, t } = useLanguage();

  // Responsive mobile active panel state
  const [activePanel, setActivePanel] = useState<'sidebar' | 'list' | 'workspace'>('list');

  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Filtering states
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing states
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTagIds, setNoteTagIds] = useState<string[]>([]);
  const [noteFolderId, setNoteFolderId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'dual' | 'mindmap' | 'whiteboard' | 'richtext'>('dual');
  const [activeNoteType, setActiveNoteType] = useState<'markdown' | 'mindmap' | 'whiteboard'>('markdown');
  const [mindmapData, setMindmapData] = useState<MindMapData | undefined>(undefined);

  // New accessibility states
  const [isLargeFont, setIsLargeFont] = useState<boolean>(() => localStorage.getItem('sovereign_large_font') === 'true');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'whiteboard'>('all');

  // Navigation state
  const [mainView, setMainView] = useState<'notes' | 'settings'>('notes');
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  // Initialize and check database seeding
  useEffect(() => {
    async function initAndLoad() {
      // Ensure DB triggers upgraders
      await openDB();

      let loadedNotes = await getNotes();
      let loadedTags = await getTags();
      let loadedFolders = await getFolders();

      // If database is blank, pre-seed with excellent premium examples
      if (loadedNotes.length === 0 && loadedTags.length === 0 && loadedFolders.length === 0) {
        // 1. Create categories
        const seedFolders: Folder[] = [
          { id: 'f_seed_1', name: '🗺️ System Architecture (系统架构)', parentId: null, updatedAt: Date.now(), isDeleted: false },
          { id: 'f_seed_2', name: '💡 Brainstorms (灵感沙盒)', parentId: null, updatedAt: Date.now(), isDeleted: false }
        ];

        // 2. Create nested tags representing 6 complete levels (爷爷/父亲/儿子/孙子/曾孙/玄孙)
        const seedTags: Tag[] = [
          { id: 't_seed_lvl0', name: 'Programming (编程开发)', parentId: null, path: 'Programming (编程开发)', level: 0, updatedAt: Date.now(), isDeleted: false },
          { id: 't_seed_lvl1', name: 'Web Dev (前端设计)', parentId: 't_seed_lvl0', path: 'Programming (编程开发)/Web Dev (前端设计)', level: 1, updatedAt: Date.now(), isDeleted: false },
          { id: 't_seed_lvl2', name: 'React (React框架)', parentId: 't_seed_lvl1', path: 'Programming (编程开发)/Web Dev (前端设计)/React (React框架)', level: 2, updatedAt: Date.now(), isDeleted: false },
          { id: 't_seed_lvl3', name: 'Architecture (系统设计)', parentId: 't_seed_lvl2', path: 'Programming (编程开发)/Web Dev (前端设计)/React (React框架)/Architecture (系统设计)', level: 3, updatedAt: Date.now(), isDeleted: false },
          { id: 't_seed_lvl4', name: 'Local First (本地优先)', parentId: 't_seed_lvl3', path: 'Programming (编程开发)/Web Dev (前端设计)/React (React框架)/Architecture (系统设计)/Local First (本地优先)', level: 4, updatedAt: Date.now(), isDeleted: false },
          { id: 't_seed_lvl5', name: 'Sovereign DB (主权数据库)', parentId: 't_seed_lvl4', path: 'Programming (编程开发)/Web Dev (前端设计)/React (React框架)/Architecture (系统设计)/Local First (本地优先)/Sovereign DB (主权数据库)', level: 5, updatedAt: Date.now(), isDeleted: false },
        ];

        // 3. Create interactive markdown welcome notebook
        const note1: Note = {
          id: 'n_seed_1',
          title: '📖 Welcome to SovereignNote! (主权笔记欢迎您！)',
          content: `# SovereignNote: Your Private Note Sanctuary (主权笔记：您的绝对私密笔记避难所)

This notebook operates with **100% data privacy** and no mandatory cloud dependencies.
本应用是一个支持局域网同步、本地强加密、无任何外界审查和强制云端关联的 **本地优先 (Local-First)** 个人知识库。

---

## 🌟 Key Features (核心亮点)

### 1. 6-Level Hierarchical Sieve (1~6 级无限级联标签树)
- Utilize the tag explorer on the bottom-left sidebar.
- 您可以在创建标签时，直接输入由“斜杠”切分的复合层级路径。例如：\`开发/前端/React\`。系统将自动帮你级联生成最多 6 层深的完美标签分类网络！
- Notes filtering will automatically index parent tags recursively.
- 过滤上级标签时，系统会自适应、递归检索其所有子级标签标记过的笔记。

### 2. Dual Markdown Editors & Checklists (高维对等双栏编辑器)
- Write syntax on the left pane and see fluid rendering on the right instantly.
- 在左侧编写，右侧像素级自适应渲染。全面支持待办勾选框：
  - [x] Supports touchscreen tap checklists
  - [x] 支持老旧平板（如安卓5.0、Windows 32位设备）的触控自适应
  - [ ] Supports full markdown structures

### 3. Embedded MindMap Board (自带交互思维导图)
- Click the **Interactive Mind Map Board** editing tab to form graphic networks.
- 极速切换到思维导图画板，完全利用 SVG 生成流畅树图，支持手指拖动、节点添加、级联删除，彻底在手持平板上爆发灵感！

### 4. Tablet Touch Fine-tuning (平板与触控完美降级兼容手势)
- Interface clickable bounds guarantee a safe touch area corresponding strictly to the **44x44 pixels principle**, wiping out the classic browser tap-latency on low-end systems.
- 全站点击及拖动按钮热区（Padding）符合 **“胖手指”触控靶点法则 (≥ 44px)**，同时锁定 CSS 双击缩放、消除旧版内核的 300ms 点击延迟，确保手指点击平滑如丝。
`,
          type: 'markdown',
          folderId: 'f_seed_1',
          tagIds: ['t_seed_lvl5'],
          updatedAt: Date.now(),
          isDeleted: false
        };

        // 4. Create initial Mindmap note
        const note2: Note = {
          id: 'n_seed_2',
          title: '🗺️ Project Sovereign Mindmap (软件主权架构图)',
          content: '',
          type: 'mindmap',
          mindmapData: {
            format: 'node_tree',
            meta: { name: 'Seed Master Map', author: 'SovereignNote' },
            data: {
              id: 'root',
              topic: 'SovereignNote Core',
              children: [
                {
                  id: 'c-1',
                  topic: 'Local-First Storage (本地持久存储)',
                  direction: 'right',
                  children: [
                    { id: 'c-1-1', topic: 'IndexedDB Store (离线沙盒存储)', children: [] },
                    { id: 'c-1-2', topic: 'JSON Snapshot Dumps (文件单机快照)', children: [] }
                  ]
                },
                {
                  id: 'c-2',
                  topic: 'Decentralized Peer Sync (局域同盟同步)',
                  direction: 'left',
                  children: [
                    { id: 'c-2-1', topic: 'WebDAV Protocol Client (坚果云/自建私有云)', children: [] },
                    { id: 'c-2-2', topic: 'LWW Reconciliation (冲突解决LWW算法)', children: [] }
                  ]
                }
              ]
            }
          },
          folderId: 'f_seed_2',
          tagIds: ['t_seed_lvl2'],
          updatedAt: Date.now(),
          isDeleted: false
        };

        await bulkInsertFolders(seedFolders);
        await bulkInsertTags(seedTags);
        await bulkInsertNotes([note1, note2]);

        loadedNotes = [note1, note2];
        loadedTags = seedTags;
        loadedFolders = seedFolders;
      }

      const loadedEvents = await getEvents();

      setNotes(loadedNotes);
      setTags(loadedTags);
      setFolders(loadedFolders);
      setEvents(loadedEvents);

      // Select first note on launch
      const nonDeletedNotes = loadedNotes.filter(n => !n.isDeleted);
      if (nonDeletedNotes.length > 0) {
        handleSelectNote(nonDeletedNotes[0]);
      }
    }

    initAndLoad();
  }, []);

  // Update notes state, tags state, folders state
  const loadDatabaseState = async () => {
    const loadedNotes = await getNotes();
    const loadedTags = await getTags();
    const loadedFolders = await getFolders();
    const loadedEvents = await getEvents();
    setNotes(loadedNotes);
    setTags(loadedTags);
    setFolders(loadedFolders);
    setEvents(loadedEvents);
  };

  const handleSaveEvent = async (event: CalendarEvent) => {
    await saveEvent(event);
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === event.id);
      if (idx > -1) {
        return prev.map(e => e.id === event.id ? event : e);
      }
      return [...prev, event];
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    const current = events.find(e => e.id === eventId);
    if (!current) return;
    const deletedEvent = { ...current, isDeleted: true };
    await saveEvent(deletedEvent);
    setEvents(prev => prev.map(e => e.id === eventId ? deletedEvent : e));
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTagIds(note.tagIds || []);
    setNoteFolderId(note.folderId);
    setActiveNoteType(note.type);
    if (note.type === 'mindmap') {
      setMindmapData(note.mindmapData);
      setEditorMode('mindmap');
    } else if (note.type === 'whiteboard') {
      setEditorMode('whiteboard');
    } else {
      setEditorMode('dual');
    }
    setActivePanel('workspace');
  };

  // Note Action Handlers
  const handleCreateNote = async (type: 'markdown' | 'mindmap' | 'whiteboard') => {
    const newNoteId = 'note_' + Math.random().toString(36).substring(2, 9);
    
    let defaultTitle = '';
    if (type === 'markdown') {
      defaultTitle = lang === 'zh' ? '🗒️ 未命名 Markdown 笔记' : '🗒️ Untitled Markdown';
    } else if (type === 'mindmap') {
      defaultTitle = lang === 'zh' ? '🗺️ 未命名思维导图' : '🗺️ Untitled Mindmap';
    } else {
      defaultTitle = lang === 'zh' ? '🎨 未命名绘图白板' : '🎨 Untitled Whiteboard';
    }

    const newNote: Note = {
      id: newNoteId,
      title: defaultTitle,
      content: type === 'whiteboard' ? '[]' : (type === 'markdown' ? '# New Note\nWrite syntax here...' : ''),
      type: type,
      folderId: selectedFolderId && selectedFolderId !== 'null' ? selectedFolderId : null,
      tagIds: selectedTagId ? [selectedTagId] : [],
      updatedAt: Date.now(),
      isDeleted: false
    };

    if (type === 'mindmap') {
      newNote.mindmapData = {
        format: 'node_tree',
        meta: { name: 'Mind Map', author: 'Sovereign User' },
        data: {
          id: 'root',
          topic: t('centralIdeaFallback'),
          children: [
            { id: 'n1', topic: t('mainBranchA'), direction: 'right', children: [] },
            { id: 'n2', topic: t('mainBranchB'), direction: 'left', children: [] }
          ]
        }
      };
    }

    await saveNote(newNote);
    await loadDatabaseState();
    handleSelectNote(newNote);
  };

  // Auto-Save modifications locally
  const triggerLocalSave = async (
    fields: Partial<Pick<Note, 'title' | 'content' | 'tagIds' | 'folderId' | 'type' | 'mindmapData'>>
  ) => {
    if (!selectedNoteId) return;
    const current = notes.find(n => n.id === selectedNoteId);
    if (!current) return;

    const updatedNote: Note = {
      ...current,
      ...fields,
      updatedAt: Date.now()
    };

    await saveNote(updatedNote);
    
    // Update local state arrays quickly to keep keyboard typing slick
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? updatedNote : n));
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(t('confirmTrashNote'))) return;
    const current = notes.find(n => n.id === noteId);
    if (!current) return;

    const deletedNote: Note = {
      ...current,
      isDeleted: true,
      updatedAt: Date.now()
    };

    await saveNote(deletedNote);
    await loadDatabaseState();

    const activeList = notes.filter(n => !n.isDeleted && n.id !== noteId);
    if (activeList.length > 0) {
      handleSelectNote(activeList[0]);
    } else {
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      setNoteTagIds([]);
      setNoteFolderId(null);
    }
  };

  // Folder Operations Database Side
  const handleCreateFolder = async (name: string) => {
    const newF: Folder = {
      id: 'folder_' + Math.random().toString(36).substring(2, 9),
      name,
      parentId: null,
      updatedAt: Date.now(),
      isDeleted: false
    };
    await saveFolder(newF);
    await loadDatabaseState();
  };

  const handleDeleteFolder = async (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    const updated = { ...folder, isDeleted: true, updatedAt: Date.now() };
    await saveFolder(updated);

    // Notes associated with deleted folders simply become uncategorized
    const relatedNotes = notes.filter(n => n.folderId === id);
    for (const n of relatedNotes) {
      await saveNote({ ...n, folderId: null, updatedAt: Date.now() });
    }

    await loadDatabaseState();
    if (selectedFolderId === id) setSelectedFolderId(null);
  };

  // Enforces hierarchical paths up to 6 levels natively
  const handleCreateTag = async (name: string, parentId: string | null) => {
    const parentTag = parentId ? tags.find(t => t.id === parentId) : null;
    
    if (parentTag && parentTag.level >= 5) {
      alert(t('configViolationTagLevel'));
      return;
    }

    // Support slash-split automatic nestings
    if (!parentId && name.includes('/')) {
      const parts = name.split('/');
      let currentParentId: string | null = null;
      let currentPath = '';

      for (let i = 0; i < Math.min(parts.length, 6); i++) {
        const segment = parts[i].trim();
        if (!segment) continue;

        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const exists = tags.find(t => !t.isDeleted && t.path.toLowerCase() === currentPath.toLowerCase());

        if (exists) {
          currentParentId = exists.id;
        } else {
          const newId = 'tag_' + Math.random().toString(36).substring(2, 9);
          const newTag: Tag = {
            id: newId,
            name: segment,
            parentId: currentParentId,
            path: currentPath,
            level: i,
            updatedAt: Date.now(),
            isDeleted: false
          };
          await saveTag(newTag);
          currentParentId = newId;
        }
      }
    } else {
      // Standard singular creation
      const cleanPath = parentTag ? `${parentTag.path}/${name}` : name;
      const level = parentTag ? parentTag.level + 1 : 0;
      
      const newTag: Tag = {
        id: 'tag_' + Math.random().toString(36).substring(2, 9),
        name,
        parentId,
        path: cleanPath,
        level,
        updatedAt: Date.now(),
        isDeleted: false
      };
      await saveTag(newTag);
    }

    await loadDatabaseState();
  };

  const handleDeleteTag = async (id: string) => {
    const targetTag = tags.find(t => t.id === id);
    if (!targetTag) return;

    // Recursive soft deletion of tag and sub-tags matching targetPrefix/
    const subTags = tags.filter(t => t.path === targetTag.path || t.path.startsWith(targetTag.path + '/'));
    for (const t of subTags) {
      await saveTag({ ...t, isDeleted: true, updatedAt: Date.now() });
    }

    // Unassign deleted tags from active notes
    const deletedTagIds = new Set(subTags.map(t => t.id));
    const relatedNotes = notes.filter(n => n.tagIds.some(tid => deletedTagIds.has(tid)));
    for (const n of relatedNotes) {
      const filteredIds = n.tagIds.filter(tid => !deletedTagIds.has(tid));
      await saveNote({ ...n, tagIds: filteredIds, updatedAt: Date.now() });
    }

    await loadDatabaseState();
    if (selectedTagId && deletedTagIds.has(selectedTagId)) {
      setSelectedTagId(null);
    }
  };

  // Isolated tag and note imports
  const handleImportNoteFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      const newNoteId = 'note_' + Math.random().toString(36).substring(2, 9);
      const parsedTitle = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      let parsedType: 'markdown' | 'mindmap' = 'markdown';
      let parsedContent = text;
      let parsedMindmap: MindMapData | undefined = undefined;

      if (extension === 'json') {
        try {
          const mapCheck = JSON.parse(text);
          if (mapCheck.format === 'node_tree') {
            parsedType = 'mindmap';
            parsedMindmap = mapCheck;
            parsedContent = '';
          }
        } catch (err) {
          // not mindmap, treat as normal text
        }
      } else if (extension === 'csv') {
        parsedContent = `### Imported Spreadsheet\n\n\`\`\`csv\n${text}\n\`\`\``;
      }

      const imported: Note = {
        id: newNoteId,
        title: `📥 ${parsedTitle}`,
        content: parsedContent,
        type: parsedType,
        mindmapData: parsedMindmap,
        folderId: selectedFolderId && selectedFolderId !== 'null' ? selectedFolderId : null,
        tagIds: selectedTagId ? [selectedTagId] : [],
        updatedAt: Date.now(),
        isDeleted: false
      };

      await saveNote(imported);
      await loadDatabaseState();
      handleSelectNote(imported);
    };
    reader.readAsText(file);
  };

  const handleExportCurrentNote = (format: 'md' | 'txt' | 'html' | 'json') => {
    if (!selectedNoteId) return;
    const current = notes.find(n => n.id === selectedNoteId);
    if (!current) return;

    let payload = '';
    let fileName = `${current.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

    if (format === 'json') {
      payload = JSON.stringify(current, null, 2);
      fileName += '.json';
    } else if (format === 'html') {
      payload = `<!DOCTYPE html><html><head><title>${current.title}</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;color:#333;}</style></head><body><h1>${current.title}</h1><div>${current.content}</div></body></html>`;
      fileName += '.html';
    } else if (format === 'txt') {
      payload = current.content;
      fileName += '.txt';
    } else {
      payload = current.content;
      fileName += '.md';
    }

    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk Exports by Folders and Tags recursively
  const handleBulkExportByFolder = () => {
    if (!selectedFolderId && selectedFolderId !== 'null') return;
    
    const targetFolderNotes = notes.filter((n) => {
      if (n.isDeleted) return false;
      if (selectedFolderId === 'null') return n.folderId === null;
      return n.folderId === selectedFolderId;
    });

    if (targetFolderNotes.length === 0) {
      alert(lang === 'zh' ? '该目录下无任何笔记内容。' : 'Category is empty. Writing no files.');
      return;
    }

    const folderName = selectedFolderId === 'null' ? (lang === 'zh' ? '未分类' : 'Uncategorized') : folders.find(f => f.id === selectedFolderId)?.name || 'Notebooks';
    const bundle = {
      folderName,
      exportDate: new Date().toISOString(),
      notesCount: targetFolderNotes.length,
      notes: targetFolderNotes
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sovereign_Folder_${folderName.replace(/\s+/g, '_')}_Backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkExportByTagRecursively = () => {
    if (!selectedTagId) return;
    const activeParent = tags.find(t => t.id === selectedTagId && !t.isDeleted);
    if (!activeParent) return;

    // Recursive search tag IDs (ID itself or prefix path matcher)
    const relatedTagIds = new Set(
      tags.filter(t => !t.isDeleted && (t.id === activeParent.id || t.path.startsWith(activeParent.path + '/'))).map(t => t.id)
    );

    const filteredNotes = notes.filter((n) => {
      if (n.isDeleted) return false;
      return n.tagIds.some(tid => relatedTagIds.has(tid));
    });

    if (filteredNotes.length === 0) {
      alert(lang === 'zh' 
        ? `在标签路径“${activeParent.path}”及其子级衍生下未找到相关绑定的笔记。` 
        : `No notes associated recursively under Tag Path: "${activeParent.path}"`
      );
      return;
    }

    const bundle = {
      tagName: activeParent.name,
      tagPath: activeParent.path,
      subtagsSearched: relatedTagIds.size,
      notesCount: filteredNotes.length,
      notes: filteredNotes
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sovereign_TagFilter_${activeParent.name}_Recursive.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Comprehensive Search and Filter Pipeline
  const filteredNotesList = useMemo(() => {
    return notes.filter((note) => {
      // 1. Skip soft-deleted index
      if (note.isDeleted) return false;

      // 1.5 Unique Type Separation Filter (Whiteboards Studio vs Standard Notebooks)
      if (selectedTypeFilter === 'whiteboard') {
        if (note.type !== 'whiteboard') return false;
      }

      // 2. Folder Category Filter (Explicit click or Uncategorized)
      if (selectedFolderId !== null) {
        if (selectedFolderId === 'null') {
          if (note.folderId !== null) return false;
        } else {
          if (note.folderId !== selectedFolderId) return false;
        }
      }

      // 3. 6-Level Tag recursive filter
      if (selectedTagId !== null) {
        const activeFilterTag = tags.find(t => t.id === selectedTagId);
        if (activeFilterTag) {
          const matchingTagIds = new Set(
            tags.filter(t => !t.isDeleted && (t.id === activeFilterTag.id || t.path.startsWith(activeFilterTag.path + '/'))).map(t => t.id)
          );
          const hasMatch = note.tagIds.some(tid => matchingTagIds.has(tid));
          if (!hasMatch) return false;
        }
      }

      // 4. Calendar date lookup
      if (selectedDate !== null) {
        const noteDate = new Date(note.updatedAt);
        const match =
          noteDate.getFullYear() === selectedDate.getFullYear() &&
          noteDate.getMonth() === selectedDate.getMonth() &&
          noteDate.getDate() === selectedDate.getDate();
        if (!match) return false;
      }

      // 5. Search query match
      if (searchQuery.trim()) {
        const cleanQuery = searchQuery.toLowerCase().trim();
        const titleMatch = note.title.toLowerCase().includes(cleanQuery);
        const contentMatch = note.content.toLowerCase().includes(cleanQuery);
        
        // Match associated tag paths as well
        const tagMatch = note.tagIds.some((tid) => {
          const associatedTag = tags.find(t => t.id === tid && !t.isDeleted);
          return associatedTag ? associatedTag.path.toLowerCase().includes(cleanQuery) : false;
        });

        if (!titleMatch && !contentMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [notes, tags, selectedFolderId, selectedTagId, selectedDate, searchQuery, selectedTypeFilter]);

  const activeSelectedNoteInstance = notes.find(n => n.id === selectedNoteId && !n.isDeleted);

  return (
    <div className={`absolute inset-0 flex flex-col bg-gray-50 text-slate-800 overflow-hidden font-sans antialiased ${isLargeFont ? 'large-font-mode' : ''}`}>
      
      {/* Columns Container Wrapper */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        
        {/* 1. LEFT SIDEBAR PANEL */}
        <aside className={`w-full lg:w-80 border-r border-gray-200 bg-white flex flex-col justify-between h-full flex-shrink-0 ${
          activePanel === 'sidebar' ? 'flex' : 'hidden lg:flex'
        }`}>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          
          {/* Logo Name & Settings / Language triggers */}
          <div className="flex flex-col space-y-3.5 border-b border-gray-150 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-7 w-7 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-black tracking-tight text-sm text-slate-900 uppercase">SovereignNote</span>
                  <span className="block text-[8.5px] font-bold text-gray-400 -mt-0.5 uppercase tracking-widest">{lang === 'zh' ? '主权双语笔记' : 'Sovereign UI'}</span>
                </div>
              </div>

              {/* Language Selector & Big Font Accessibility Button bar */}
              <div className="flex items-center space-x-1.5">
                <button
                  {...bindTouchTap(() => setLang(lang === 'en' ? 'zh' : 'en'))}
                  className="px-1.5 hover:bg-slate-150 border border-gray-200 hover:border-slate-400 bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase rounded-xl transition duration-150 flex flex-col items-center justify-center shadow-xs cursor-pointer min-h-[44px] min-w-[42px]"
                  title={lang === 'en' ? '切换为中文版' : 'Switch to English Context'}
                >
                  <Sparkles className="w-3 h-3 text-indigo-500 mb-0.5" />
                  <span>{lang === 'en' ? '中文' : 'EN'}</span>
                </button>

                <button
                  {...bindTouchTap(() => {
                    const nextLargeVal = !isLargeFont;
                    setIsLargeFont(nextLargeVal);
                    localStorage.setItem('sovereign_large_font', String(nextLargeVal));
                  })}
                  className={`px-1.5 border rounded-xl font-black text-[10px] uppercase transition duration-150 flex flex-col items-center justify-center shadow-xs cursor-pointer min-h-[44px] min-w-[42px] ${
                    isLargeFont 
                      ? 'bg-rose-600 border-rose-650 text-white shadow-sm' 
                      : 'bg-slate-50 border-gray-250 text-slate-700 hover:bg-slate-100 hover:border-slate-350'
                  }`}
                  title={lang === 'zh' ? '一键开启整体系统高对比度大字体' : 'Toggle Large Font accessibility Scale'}
                >
                  <BookOpen className="w-3 h-3 text-pink-500 mb-0.5" />
                  <span>{isLargeFont ? '大' : 'A'}</span>
                </button>
              </div>
            </div>

            {/* Return to notes button if in settings, otherwise Sync Settings button */}
            {mainView === 'settings' ? (
              <button
                {...bindTouchTap(() => {
                  setMainView('notes');
                  setActivePanel('list');
                })}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-950 transition flex items-center justify-between space-x-1.5 cursor-pointer font-bold transition-all min-h-[44px]"
                title={lang === 'zh' ? '返回笔记' : 'Back to Notes'}
              >
                <div className="flex items-center space-x-2 text-xs">
                  <FileText className="w-4 h-4 text-slate-800" />
                  <span>{lang === 'zh' ? '返回笔记' : 'Back to Notes'}</span>
                </div>
              </button>
            ) : (
              <button
                {...bindTouchTap(() => {
                  setMainView('settings');
                  setActivePanel('workspace');
                })}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-950 transition flex items-center justify-between space-x-1.5 cursor-pointer font-bold transition-all min-h-[44px]"
                title={t('syncCenter')}
              >
                <div className="flex items-center space-x-2 text-xs">
                  <Sliders className="w-4 h-4 text-slate-800" />
                  <span>{t('syncCenter')}</span>
                </div>
                <span className="text-[9px] bg-slate-900 text-slate-200 py-0.5 px-2 rounded-full uppercase tracking-wider font-extrabold">{lang === 'zh' ? '开启同步' : 'Online'}</span>
              </button>
            )}
          </div>

          {/* Column Category Separation Bar */}
          <div className="flex border-b border-gray-150 pb-3.5 mb-2 gap-1.5 shrink-0 select-none">
            <button
              {...bindTouchTap(() => {
                setSelectedTypeFilter('all');
                setActivePanel('list');
              })}
              className={`flex-1 text-center py-2 px-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition duration-150 cursor-pointer min-h-[44px] flex items-center justify-center space-x-1 border ${
                selectedTypeFilter === 'all'
                  ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                  : 'bg-slate-50 border-gray-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span>📂 {lang === 'zh' ? '综合文库' : 'Library'}</span>
            </button>
            <button
              {...bindTouchTap(() => {
                setSelectedTypeFilter('whiteboard');
                setActivePanel('list');
              })}
              className={`flex-1 text-center py-2 px-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition duration-150 cursor-pointer min-h-[44px] flex items-center justify-center space-x-1 border ${
                selectedTypeFilter === 'whiteboard'
                  ? 'bg-purple-600 border-purple-705 text-white shadow-sm'
                  : 'bg-slate-50 border-gray-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span>🎨 {lang === 'zh' ? '独立画板' : 'Canvas'}</span>
            </button>
          </div>

          {/* Categories and 6 Level Tags */}
          <FolderTagHierarchy
            folders={folders}
            tags={tags}
            notes={notes}
            selectedFolderId={selectedFolderId}
            selectedTagId={selectedTagId}
            onSelectFolder={(id) => {
              setSelectedDate(null);
              setSelectedFolderId(id);
              setActivePanel('list');
            }}
            onSelectTag={(id) => {
              setSelectedDate(null);
              setSelectedTagId(id);
              setActivePanel('list');
            }}
            onCreateFolder={handleCreateFolder}
            onCreateTag={handleCreateTag}
            onDeleteFolder={handleDeleteFolder}
            onDeleteTag={handleDeleteTag}
            lang={lang}
            t={t}
          />

          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50 text-slate-700"
            />
          </div>

          {/* Interactive Date calendar */}
          <CalendarPanel
            notes={notes}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedFolderId(null);
              setSelectedTagId(null);
              setSelectedDate(date);
              setActivePanel('list');
            }}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
            lang={lang}
            t={t}
          />
        </div>

        {/* Sync panel indicator */}
        <div className="border-t border-gray-150 p-4 bg-slate-50/50 flex justify-between items-center text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('localSovereignDB')}</span>
          </div>
          <button
            {...bindTouchTap(() => setShowChangelog(true))}
            className="text-[9.5px] font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer active:scale-95 transition-all outline-none py-1 px-2 hover:bg-indigo-55/60 rounded-lg min-h-[32px] flex items-center justify-center font-extrabold"
            title={t('aboutTitle')}
          >
            {t('versionString')}
          </button>
        </div>
      </aside>

      {/* Conditionally render List + Workspace OR Settings Workspace */}
      {mainView === 'notes' ? (
        <>
          {/* 2. CENTER LIST BLOCK */}
          <section className={`w-full lg:w-80 border-r border-gray-200 bg-slate-50/50 flex flex-col h-full flex-shrink-0 ${
            activePanel === 'list' ? 'flex' : 'hidden lg:flex'
          }`}>
        <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center space-x-2">
            <button
              {...bindTouchTap(() => setActivePanel('sidebar'))}
              className="lg:hidden p-2 text-slate-700 bg-slate-50/85 hover:text-slate-950 hover:bg-slate-100 border border-gray-200 rounded-xl transition cursor-pointer min-h-[38px] flex items-center justify-center font-bold text-xs"
              title={t('backToFilters')}
            >
              <span>{t('backToFilters')}</span>
            </button>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-450">{t('notebooks')}</h2>
              <p className="text-[10px] text-gray-500 font-extrabold uppercase mt-0.5 tracking-wider">{filteredNotesList.length} {t('filteredItems')}</p>
            </div>
          </div>

          {/* Document launcher buttons - 44px Optimised target */}
          <div className="flex items-center space-x-1.5 animate-fade-in">
            {selectedTypeFilter !== 'whiteboard' && (
              <>
                <button
                  {...bindTouchTap(() => handleCreateNote('markdown'))}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 hover:text-slate-950 transition cursor-pointer flex items-center justify-center space-x-1 min-h-[44px] min-w-[50px] border border-gray-150 bg-slate-50/50"
                  title={t('addMarkdown')}
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-extrabold uppercase text-slate-800">MD</span>
                </button>
                <button
                  {...bindTouchTap(() => handleCreateNote('mindmap'))}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-700 hover:text-slate-950 transition cursor-pointer flex items-center justify-center space-x-1 min-h-[44px] min-w-[50px] border border-gray-150 bg-slate-50/50"
                  title={t('addMindmap')}
                >
                  <Workflow className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-extrabold uppercase text-slate-800">Map</span>
                </button>
              </>
            )}
            <button
              {...bindTouchTap(() => handleCreateNote('whiteboard'))}
              className={`p-1.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1 min-h-[44px] min-w-[50px] border ${
                selectedTypeFilter === 'whiteboard'
                  ? 'bg-purple-600 border-purple-700 text-white hover:bg-purple-705'
                  : 'bg-slate-50 hover:bg-slate-100 border-gray-150 text-slate-800 hover:text-slate-950'
              }`}
              title={lang === 'zh' ? '添加自由绘画手写白板' : 'Add Infinite Canvas Whiteboard'}
            >
              <PenTool className={`w-4 h-4 ${selectedTypeFilter === 'whiteboard' ? 'text-white' : 'text-purple-600'}`} />
              <span className={`text-[10px] font-black uppercase ${selectedTypeFilter === 'whiteboard' ? 'text-white' : 'text-slate-800'}`}>
                {lang === 'zh' ? '画板' : 'Canvas'}
              </span>
            </button>
          </div>
        </div>

        {/* Notes Items list map (Tappable hot-spots min-height 44px) */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-150 scrollbar-thin">
          {filteredNotesList.map((note) => {
            const isActive = selectedNoteId === note.id;
            const updatedString = new Date(note.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Clean teaser text representing note content
            const contentCleanTeaser = note.type === 'whiteboard'
              ? (lang === 'zh' ? '🎨 触控手写无限绘图白板 (已自动存储，支持导出照片)' : '🎨 Infinite Canvas Whiteboard (Auto-saved, PNG export)')
              : (note.content
                ? note.content.replace(/#+\s/g, '').replace(/[*_`]/g, '').slice(0, 75)
                : (lang === 'zh' ? '暂无内容描摹。添加属性...' : 'Empty Notebook. Fill elements...'));

            return (
              <div
                key={note.id}
                {...bindTouchTap(() => handleSelectNote(note))}
                className={`p-4 cursor-pointer transition relative note-list-item min-h-[48px] flex flex-col justify-center ${
                  isActive ? 'bg-white border-l-4 border-slate-900 shadow-sm' : 'hover:bg-gray-150/40'
                }`}
              >
                <div className="flex justify-between items-start space-x-1 pb-1">
                  <h4 className="font-extrabold text-xs font-sans text-slate-800 leading-snug line-clamp-2 pr-1 flex-1">{note.title}</h4>
                  <span className={`text-[10px] uppercase font-bold py-0.5 px-1.5 rounded-md ${
                    note.type === 'mindmap' 
                      ? 'bg-blue-50 text-blue-600 border border-blue-105' 
                      : (note.type === 'whiteboard' ? 'bg-purple-50 text-purple-600 border border-purple-105' : 'bg-slate-100 text-slate-650')
                  }`}>
                    {note.type === 'mindmap' ? 'Map' : (note.type === 'whiteboard' ? (lang === 'zh' ? '白板' : 'Board') : 'MD')}
                  </span>
                </div>

                <p className="text-[10.5px] text-gray-500 font-semibold font-sans leading-relaxed line-clamp-2 mt-0.5 mb-2.5">
                  {contentCleanTeaser}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-mono text-slate-400 font-bold">{updatedString}</span>
                  
                  {/* Category badge */}
                  {note.folderId && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold py-0.5 px-2 rounded-md truncate max-w-[125px] border border-gray-150">
                      {folders.find(f => f.id === note.folderId)?.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredNotesList.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-xs font-extrabold text-slate-600">{t('emptyListTitle')}</p>
              <p className="text-[10.5px] font-bold text-gray-400 max-w-xs mx-auto leading-relaxed">{t('emptyListSubtitle')}</p>
            </div>
          )}
        </div>

        {/* Bulk tools for active directory (Spacious touch headers) */}
        {(selectedFolderId || selectedTagId) && (
          <div className="p-3.5 border-t border-gray-150 bg-white flex flex-col space-y-2 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-wider">{t('filteredFolderActions')}</span>
              <button
                {...bindTouchTap(() => setBulkActionOpen(!bulkActionOpen))}
                className="text-[10px] font-bold text-slate-900 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer min-h-[38px] flex items-center justify-center font-bold"
              >
                {bulkActionOpen ? t('hideActions') : t('expandActions')}
              </button>
            </div>
            {bulkActionOpen && (
              <div className="space-y-1.5 pt-2 animate-fade-in">
                {selectedFolderId && (
                  <button
                    {...bindTouchTap(handleBulkExportByFolder)}
                    className="w-full text-left text-[11px] font-bold text-slate-700 hover:text-slate-950 p-2.5 hover:bg-slate-50 border rounded-xl flex items-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('exportCategory')}
                  </button>
                )}
                {selectedTagId && (
                  <button
                    {...bindTouchTap(handleBulkExportByTagRecursively)}
                    className="w-full text-left text-[11px] font-bold text-slate-700 hover:text-slate-950 p-2.5 hover:bg-slate-50 border rounded-xl flex items-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('exportTagSubtree')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. RIGHT WRITING AND RENDER WORKPLACE */}
      <main className={`flex-1 bg-white flex flex-col h-full min-w-0 ${
        activePanel === 'workspace' ? 'flex' : 'hidden lg:flex'
      }`}>
        {activeSelectedNoteInstance ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* WORKSPACE TOPBAR CONTROL BOARD */}
            <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center space-y-4 sm:space-y-0 flex-shrink-0 bg-slate-50 relative z-10">
              <div className="flex-1 w-full sm:w-auto min-w-0 mr-0 sm:mr-4">
                <div className="flex items-center space-x-2">
                  {/* Back button to list on mobile/tablet screen */}
                  <button
                    {...bindTouchTap(() => setActivePanel('list'))}
                    className="lg:hidden px-3 py-2 text-slate-700 bg-white border border-gray-200 hover:text-slate-955 hover:bg-slate-100 rounded-xl transition cursor-pointer min-h-[38px] flex items-center justify-center font-extrabold text-xs whitespace-nowrap"
                    title={t('backToList')}
                  >
                    <span>{t('backToList')}</span>
                  </button>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => {
                      setNoteTitle(e.target.value);
                      triggerLocalSave({ title: e.target.value });
                    }}
                    className="w-full bg-transparent border-none text-sm font-black text-slate-900 focus:outline-none focus:ring-0 placeholder-gray-300 font-sans p-0 leading-tight"
                    placeholder={t('noteTitlePlaceholder')}
                  />
                </div>
                
                {/* Categorization Dropdowns */}
                <div className="flex items-center space-x-2 mt-2 text-[10.5px] text-gray-500 font-bold font-sans">
                  <span>{t('inCategory')}</span>
                  <select
                    value={noteFolderId || ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setNoteFolderId(val);
                      triggerLocalSave({ folderId: val });
                    }}
                    className="bg-transparent border border-gray-250 hover:border-slate-450 text-gray-650 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-white focus:outline-none text-[10px] font-bold min-h-[38px]"
                  >
                    <option value="">{t('uncategorized')}</option>
                    {folders.filter(f => !f.isDeleted).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  <span className="mx-1 text-gray-300">|</span>
                  <span>{t('tagsLabel')}</span>
                  <div className="flex flex-wrap items-center -ml-1.5 -mt-1.5">
                    {noteTagIds.map((tid) => {
                      const tInstance = tags.find(tag => tag.id === tid && !tag.isDeleted);
                      if (!tInstance) return null;
                      return (
                        <span key={tid} className="bg-slate-100 border border-gray-200 text-slate-700 font-extrabold px-2 py-1 rounded-xl text-[9.5px] flex items-center space-x-1 uppercase min-h-[30px] ml-1.5 mt-1.5">
                          {tInstance.name}
                          <button
                            {...bindTouchTap(() => {
                              const remaining = noteTagIds.filter(id => id !== tid);
                              setNoteTagIds(remaining);
                              triggerLocalSave({ tagIds: remaining });
                            })}
                            className="hover:text-red-500 font-bold text-[9px] w-4.5 h-4.5 flex items-center justify-center cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}

                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !noteTagIds.includes(val)) {
                          const updated = [...noteTagIds, val];
                          setNoteTagIds(updated);
                          triggerLocalSave({ tagIds: updated });
                        }
                      }}
                      className="bg-transparent border border-none text-slate-500 py-1.5 px-2.5 cursor-pointer focus:outline-none text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-850 min-h-[38px] ml-1.5 mt-1.5"
                    >
                      <option value="">{t('addTagBtn')}</option>
                      {tags.filter(tInst => !tInst.isDeleted && !noteTagIds.includes(tInst.id)).map(tInst => (
                        <option key={tInst.id} value={tInst.id}>{tInst.path}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* EDITOR VIEW SWITCHES */}
              <div className="flex items-center flex-wrap space-x-3 flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                {activeNoteType === 'markdown' ? (
                  <div className="bg-gray-150/70 p-1 rounded-xl flex items-center border border-gray-200 shadow-xs">
                    <button
                      {...bindTouchTap(() => setEditorMode('edit'))}
                      className={`px-2 py-1.5 text-[10px] font-black uppercase rounded-lg tracking-wider transition min-h-[36px] ${
                        editorMode === 'edit'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-gray-550 hover:text-gray-901'
                      }`}
                    >
                      <Edit3 className="w-3 h-3 inline mr-1" />
                      {t('writeMode')}
                    </button>
                    <button
                      {...bindTouchTap(() => setEditorMode('dual'))}
                      className={`px-2 py-1.5 text-[10px] font-black uppercase rounded-lg tracking-wider transition min-h-[36px] ${
                        editorMode === 'dual'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-gray-550 hover:text-gray-901'
                      }`}
                    >
                      <Columns className="w-3 h-3 inline mr-1" />
                      {t('dualView')}
                    </button>
                    <button
                      {...bindTouchTap(() => setEditorMode('preview'))}
                      className={`px-2 py-1.5 text-[10px] font-black uppercase rounded-lg tracking-wider transition min-h-[36px] ${
                        editorMode === 'preview'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-gray-550 hover:text-gray-901'
                      }`}
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      {t('readMode')}
                    </button>
                    <button
                      {...bindTouchTap(() => setEditorMode('richtext'))}
                      className={`px-2 py-1.5 text-[10px] font-black uppercase rounded-lg tracking-wider transition min-h-[36px] ${
                        editorMode === 'richtext'
                          ? 'bg-purple-600 text-white shadow-sm font-black'
                          : 'text-gray-550 hover:text-gray-901'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {lang === 'zh' ? '富文本' : 'Rich'}
                    </button>
                  </div>
                ) : activeNoteType === 'whiteboard' ? (
                  <div className="bg-purple-50 border border-purple-150 text-purple-705 px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase flex items-center space-x-1.5 tracking-wider shadow-xs min-h-[40px]">
                    <PenTool className="w-3.5 h-3.5 text-purple-650 animate-pulse" />
                    <span>{lang === 'zh' ? '手写无限绘图板' : 'Infinite Board UI'}</span>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-[10.5px] font-extrabold uppercase flex items-center space-x-2 tracking-wider shadow-xs min-h-[44px]">
                    <Workflow className="w-4 h-4 text-blue-500" />
                    {t('interactiveMindmapBoard')}
                  </div>
                )}

                {/* Import and export action dropdown buttons per-note */}
                <div className="h-5 w-px bg-gray-200"></div>
                
                <div className="flex items-center space-x-1.5 text-xs text-gray-550">
                  <select
                    onChange={(e) => {
                      const val = e.target.value as any;
                      if (val) {
                        handleExportCurrentNote(val);
                        e.target.value = ''; // Clean selection
                      }
                    }}
                    className="bg-transparent border border-gray-250 text-gray-650 px-2.5 py-1.5 rounded-xl hover:bg-white focus:outline-none text-[10.5px] font-extrabold cursor-pointer min-h-[38px]"
                  >
                    <option value="">{t('exportNote')}</option>
                    <option value="md">Markdown (.md)</option>
                    <option value="txt">Plain Text (.txt)</option>
                    <option value="html">HTML web sheet (.html)</option>
                    {activeNoteType === 'mindmap' && <option value="json">Map Data File (.json)</option>}
                  </select>

                  <label className="border border-gray-255 rounded-xl px-3 py-2 text-[10.5px] font-black hover:bg-white cursor-pointer transition min-h-[38px] flex items-center justify-center">
                    <input
                      type="file"
                      accept=".md,.txt,.html,.json,.csv"
                      onChange={handleImportNoteFile}
                      className="hidden"
                    />
                    {t('importBtn')}
                  </label>

                  <button
                    {...bindTouchTap(() => handleDeleteNote(activeSelectedNoteInstance.id))}
                    className="p-2 border border-red-150 text-red-550 hover:bg-red-50 hover:text-red-700 rounded-xl transition cursor-pointer text-[10px] font-extrabold min-h-[38px] flex items-center justify-center uppercase"
                    title={t('trashBtn')}
                  >
                    🗑️ {t('trashBtn')}
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC WRITING PORT */}
            <div className="flex-1 min-h-0 overflow-hidden">
              
              {/* MARKDOWN EDITOR LAYOUT PORTS */}
              {editorMode === 'edit' && activeNoteType === 'markdown' && (
                <textarea
                  className="w-full h-full p-6 text-xs font-mono border-none focus:outline-none focus:ring-0 resize-none leading-relaxed text-slate-800 bg-white"
                  value={noteContent}
                  onChange={(e) => {
                    setNoteContent(e.target.value);
                    triggerLocalSave({ content: e.target.value });
                  }}
                  placeholder={t('startMarkdownPlaceholder')}
                />
              )}

              {editorMode === 'preview' && activeNoteType === 'markdown' && (
                <div className="w-full h-full p-8 overflow-y-auto bg-white prose max-w-none scrollbar-thin selectable-content">
                  <MarkdownRenderer content={noteContent} />
                </div>
              )}

              {editorMode === 'dual' && activeNoteType === 'markdown' && (
                <div className="w-full h-full flex divide-x divide-gray-150">
                  <div className="w-1/2 h-full">
                    <textarea
                      className="w-full h-full p-6 text-xs font-mono border-none focus:outline-none focus:ring-0 resize-none leading-relaxed bg-slate-50/50 text-gray-850"
                      value={noteContent}
                      onChange={(e) => {
                        setNoteContent(e.target.value);
                        triggerLocalSave({ content: e.target.value });
                      }}
                      placeholder={t('startMarkdownPlaceholder')}
                    />
                  </div>
                  <div className="w-1/2 h-full p-6 overflow-y-auto bg-white scrollbar-thin selectable-content">
                    <MarkdownRenderer content={noteContent} />
                  </div>
                </div>
              )}

              {/* MINDMAP BOARD INTEGRATOR */}
              {activeNoteType === 'mindmap' && (
                <div className="w-full h-full p-5 bg-slate-50 flex flex-col overflow-y-auto scrollbar-thin">
                  <MindMapEditor
                    data={mindmapData}
                    onChange={(updatedData) => {
                      setMindmapData(updatedData);
                      triggerLocalSave({ mindmapData: updatedData });
                    }}
                    lang={lang}
                    t={t}
                  />
                </div>
              )}

              {/* WYSIWYG RICH TEXT EDITOR PORT */}
              {editorMode === 'richtext' && activeNoteType === 'markdown' && (
                <div className="w-full h-full p-5 bg-slate-100/40 flex flex-col overflow-hidden">
                  <RichTextEditor
                    value={noteContent}
                    onChange={(updatedMarkdown) => {
                      setNoteContent(updatedMarkdown);
                      triggerLocalSave({ content: updatedMarkdown });
                    }}
                    lang={lang}
                  />
                </div>
              )}

              {/* INFINITE CANVAS WHITEBOARD PORT */}
              {activeNoteType === 'whiteboard' && (
                <div className="w-full h-full p-5 bg-slate-100/40 flex flex-col overflow-hidden">
                  <WhiteboardEditor
                    content={noteContent}
                    onSave={(updatedCanvasJson) => {
                      setNoteContent(updatedCanvasJson);
                      triggerLocalSave({ content: updatedCanvasJson });
                    }}
                    lang={lang}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Landing viewport for empty selected note state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-5 bg-white select-none">
            <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-dashed border-gray-250 shadow-xs animate-pulse">
              <Sparkles className="w-7 h-7 text-indigo-505" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-widest">{t('emptySelectTitle')}</h3>
              <p className="text-[11px] text-gray-400 font-bold max-w-xs mt-1.5 leading-relaxed">
                {t('emptySelectSubtitle')}
              </p>
            </div>
            <div className="flex space-x-2.5 pt-3">
              <button
                {...bindTouchTap(() => handleCreateNote('markdown'))}
                className="px-5 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-md hover:shadow-lg cursor-pointer min-h-[44px]"
              >
                {t('btnNewMarkdown')}
              </button>
              <button
                {...bindTouchTap(() => handleCreateNote('mindmap'))}
                className="px-5 py-3.5 border-2 border-slate-900/10 text-slate-850 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer min-h-[44px]"
              >
                {t('btnNewMindmap')}
              </button>
            </div>
          </div>
        )}
      </main>
        </>
      ) : (
        <div className={`flex-1 w-full bg-slate-100 flex flex-col h-full ${activePanel === 'workspace' || activePanel === 'list' ? 'flex' : 'hidden lg:flex'}`}>
          <SyncDialog
            notes={notes}
            tags={tags}
            folders={folders}
            onSyncCompleted={loadDatabaseState}
            lang={lang}
            t={t}
            isInline={true}
          />
        </div>
      )}

      </div> {/* Close Columns Container Wrapper */}

      {/* 5. MOBILE BOTTOM NAVIGATION (only visible under lg: 1024px) */}
      <div className="lg:hidden h-[62px] bg-white border-t border-gray-150 flex items-center justify-around flex-shrink-0 z-20 px-3 pb-safe shadow-md">
        {/* Sidebar Trigger */}
        <button
          {...bindTouchTap(() => setActivePanel('sidebar'))}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer min-h-[44px] ${
            activePanel === 'sidebar' ? 'text-slate-950 font-black bg-slate-50' : 'text-slate-400 hover:text-slate-700 font-bold'
          }`}
        >
          <Sliders className="w-4.5 h-4.5" />
          <span className="text-[9.5px] uppercase tracking-wider font-extrabold">{t('filterMenu')}</span>
        </button>

        {/* Note List Trigger */}
        <button
          {...bindTouchTap(() => {
            setMainView('notes');
            setActivePanel('list');
          })}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer min-h-[44px] ${
            activePanel === 'list' && mainView === 'notes' ? 'text-slate-950 font-black bg-slate-50' : 'text-slate-400 hover:text-slate-700 font-bold'
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          <span className="text-[9.5px] uppercase tracking-wider font-extrabold">{t('notesListActive')}</span>
        </button>

        {/* Note Workspace Trigger */}
        <button
          {...bindTouchTap(() => {
            setMainView('notes');
            if (activeSelectedNoteInstance) {
              setActivePanel('workspace');
            } else {
              const nonDeleted = notes.filter(n => !n.isDeleted);
              if (nonDeleted.length > 0) {
                handleSelectNote(nonDeleted[0]);
              } else {
                handleCreateNote('markdown');
              }
            }
          })}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer min-h-[44px] ${
            activePanel === 'workspace' && mainView === 'notes' ? 'text-slate-950 font-black bg-slate-50' : 'text-slate-400 hover:text-slate-705 font-bold'
          }`}
        >
          <Edit3 className="w-4.5 h-4.5" />
          <span className="text-[9.5px] uppercase tracking-wider font-extrabold">{t('editorActive')}</span>
        </button>
      </div>

      {/* 4. MODALS CONTAINER */}
      {showChangelog && (
        <ChangelogDialog
          onClose={() => setShowChangelog(false)}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}
