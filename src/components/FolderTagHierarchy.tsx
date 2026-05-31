/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Folder as FolderIcon, Tag as TagIcon, Plus, ChevronRight, ChevronDown, Trash, FolderPlus } from 'lucide-react';
import { Tag, Folder, Note } from '../types';
import { Language } from '../utils/i18n';
import { bindTouchTap } from '../utils/touchUtils';

interface FolderTagHierarchyProps {
  folders: Folder[];
  tags: Tag[];
  notes: Note[];
  selectedFolderId: string | null;
  selectedTagId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onCreateTag: (name: string, parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteTag: (id: string) => void;
  lang: Language;
  t: (key: any) => string;
}

export function FolderTagHierarchy({
  folders,
  tags,
  notes,
  selectedFolderId,
  selectedTagId,
  onSelectFolder,
  onSelectTag,
  onCreateFolder,
  onCreateTag,
  onDeleteFolder,
  onDeleteTag,
  lang,
  t,
}: FolderTagHierarchyProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedParentTagId, setSelectedParentTagId] = useState<string | null>(null);

  // Tree nodes state collapsed/expanded map
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  const toggleTagExpand = (tagId: string, e: any) => {
    e.stopPropagation();
    setExpandedTags({
      ...expandedTags,
      [tagId]: !expandedTags[tagId],
    });
  };

  // Safe non-deleted entries filters
  const activeFolders = folders.filter(f => !f.isDeleted);
  const activeTags = tags.filter(t => !t.isDeleted);

  // Compute stats: active note count associated with folders and tags
  const getFolderNoteCount = (folderId: string) => {
    return notes.filter(n => !n.isDeleted && n.folderId === folderId).length;
  };

  const getTagNoteCount = (tag: Tag) => {
    // Recursive count: matches own ID or any child subtags matching path prefix!
    return notes.filter((n) => {
      if (n.isDeleted) return false;
      return n.tagIds.some((assignedId) => {
        const assignedTag = activeTags.find(t => t.id === assignedId);
        if (!assignedTag) return false;
        // Same tag
        if (assignedTag.id === tag.id) return true;
        // Or contains prefix path
        return assignedTag.path.startsWith(tag.path + '/');
      });
    }).length;
  };

  // Helper to construct nested tag structures from flat tags
  interface TagNode {
    tag: Tag;
    children: TagNode[];
  }

  const buildTagTree = (): TagNode[] => {
    const nodeMap: Record<string, TagNode> = {};
    const roots: TagNode[] = [];

    // Initialize map
    activeTags.forEach((t) => {
      nodeMap[t.id] = { tag: t, children: [] };
    });

    // Populate hierarchy
    activeTags.forEach((t) => {
      const node = nodeMap[t.id];
      if (t.parentId && nodeMap[t.parentId]) {
        nodeMap[t.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort alphabetically at each level
    const sortTree = (nodes: TagNode[]) => {
      nodes.sort((a, b) => a.tag.name.localeCompare(b.tag.name));
      nodes.forEach(n => sortTree(n.children));
    };

    sortTree(roots);
    return roots;
  };

  const tagTree = buildTagTree();

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const handleCreateTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim(), selectedParentTagId);
      setNewTagName('');
      setSelectedParentTagId(null);
      setShowTagModal(false);
    }
  };

  // Recursive tag tree renderer supporting up to 6 levels natively
  const renderTagNode = (node: TagNode): React.JSX.Element => {
    const { tag, children } = node;
    const isSelected = selectedTagId === tag.id;
    const isExpanded = !!expandedTags[tag.id];
    const hasChildren = children.length > 0;
    const noteCount = getTagNoteCount(tag);

    // Indent padding corresponding to level (lvl 0 -> pl-1, lvl 5 -> pl-11)
    const indentStyles = [
      'pl-1',    // Level 0 (Root)
      'pl-3.5',  // Level 1
      'pl-6',    // Level 2
      'pl-8.5',  // Level 3
      'pl-11',   // Level 4
      'pl-13.5'  // Level 5 (Max sub-tag level, ie 6th level index)
    ];
    const indentClass = indentStyles[tag.level] || 'pl-2';

    return (
      <div key={tag.id} className="w-full">
        <div
          {...bindTouchTap(() => {
            onSelectFolder(null); // Clear folder filter
            onSelectTag(isSelected ? null : tag.id);
          })}
          className={`flex items-center justify-between py-1 pr-2 rounded-xl cursor-pointer group transition-colors text-xs font-sans font-semibold min-h-[44px] ${indentClass} ${
            isSelected
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950'
          }`}
        >
          <div className="flex items-center space-x-1 min-w-0 flex-1">
            {hasChildren ? (
              <button
                {...bindTouchTap((e) => toggleTagExpand(tag.id, e))}
                className="p-2.5 rounded-xl hover:bg-gray-200 text-gray-450 group-hover:text-gray-700 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-[44px] h-[44px] flex-shrink-0"></span>
            )}
            <TagIcon className={`w-3.5 h-3.5 flex-shrink-0 mr-1.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
            <span className="truncate pr-1.5" title={tag.path}>{tag.name}</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-gray-150 text-gray-700'}`}>
              {noteCount}
            </span>
            
            {/* Quick Actions (optimised for immediate tap control) */}
            <div className="flex items-center space-x-0.5">
              {tag.level < 5 && (
                <button
                  {...bindTouchTap((e) => {
                    e.stopPropagation();
                    setSelectedParentTagId(tag.id);
                    setShowTagModal(true);
                  })}
                  className={`p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                    isSelected ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-gray-200 text-slate-500'
                  }`}
                  title={t('createNestedSubtag')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                {...bindTouchTap((e) => {
                  e.stopPropagation();
                  const confirmMsg = t('deleteTagConfirm').replace('{name}', tag.name);
                  // Bypassed confirm for Android WebView
                  onDeleteTag(tag.id);
                })}
                className={`p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                  isSelected ? 'hover:bg-slate-800 text-red-300' : 'hover:bg-red-50 text-red-500'
                }`}
                title={t('trashBtn')}
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Child Subtree rendering if expanded */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5 border-l border-dashed border-gray-200/60 ml-5">
            {children.map(child => renderTagNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Folder Directories Block */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center space-x-1.5">
            <FolderIcon className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">{t('categoriesHeader')}</h3>
          </div>
          <button
            {...bindTouchTap(() => setShowFolderModal(true))}
            className="p-2.5 hover:bg-gray-100 rounded-xl text-slate-500 hover:text-slate-900 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t('createFolderTitle')}
          >
            <FolderPlus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-1">
          {/* Default Uncategorized Filter */}
          <div
            {...bindTouchTap(() => {
              onSelectTag(null); // Clear tag filtering
              onSelectFolder(selectedFolderId === 'null' ? null : 'null');
            })}
            className={`flex items-center justify-between py-1 px-3 rounded-xl text-xs font-bold cursor-pointer transition min-h-[44px] ${
              selectedFolderId === 'null'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FolderIcon className={`w-3.5 h-3.5 ${selectedFolderId === 'null' ? 'text-white' : 'text-slate-400'}`} />
              <span>{t('uncategorized')}</span>
            </div>
            <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${selectedFolderId === 'null' ? 'bg-slate-800 text-slate-300' : 'bg-gray-150 text-gray-700'}`}>
              {notes.filter(n => !n.isDeleted && n.folderId === null).length}
            </span>
          </div>

          {activeFolders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const count = getFolderNoteCount(folder.id);
            return (
              <div
                key={folder.id}
                {...bindTouchTap(() => {
                  onSelectTag(null); // Clear tag filtering
                  onSelectFolder(isSelected ? null : folder.id);
                })}
                className={`flex items-center justify-between py-1 px-3 rounded-xl text-xs font-bold cursor-pointer group transition-colors min-h-[44px] ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center space-x-2 truncate pr-1 flex-1">
                  <FolderIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[10px] py-0.5 px-2 rounded-full ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-gray-150 text-gray-750'}`}>
                    {count}
                  </span>
                  <button
                    {...bindTouchTap((e) => {
                      e.stopPropagation();
                      const confirmMsg = t('deleteCategoryConfirm').replace('{name}', folder.name);
                      // Bypassed confirm for Android WebView
                      onDeleteFolder(folder.id);
                    })}
                    className={`p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
                      isSelected ? 'hover:bg-slate-800 text-red-300' : 'hover:bg-red-50 text-red-500'
                    }`}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {activeFolders.length === 0 && (
            <p className="text-[10.5px] italic text-gray-400 pl-3 py-2">{t('noCategories')}</p>
          )}
        </div>
      </div>

      {/* 2. Hierarchical Tags Block */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center space-x-1.5">
            <TagIcon className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">{t('sovereignTagsHeader')}</h3>
          </div>
          <button
            {...bindTouchTap(() => {
              setSelectedParentTagId(null);
              setShowTagModal(true);
            })}
            className="p-2.5 hover:bg-gray-100 rounded-xl text-slate-500 hover:text-slate-900 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t('createRootTag')}
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Tree Container */}
        <div className="space-y-1">
          {tagTree.map(node => renderTagNode(node))}
          {activeTags.length === 0 && (
            <p className="text-[10.5px] italic text-gray-400 pl-3 py-2">{t('noTags')}</p>
          )}
        </div>
      </div>

      {/* Add Folder Modal Dialog */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">{t('createFolderTitle')}</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{t('folderNameLabel')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Work, Technical Guides"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2 text-xs">
                <button
                  type="button"
                  {...bindTouchTap(() => setShowFolderModal(false))}
                  className="px-4 py-2.5 text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 min-h-[44px] flex items-center justify-center cursor-pointer font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tag Modal Dialog */}
      {showTagModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-1">
              {selectedParentTagId ? t('createNestedSubtag') : t('createRootTag')}
            </h3>
            {selectedParentTagId && (
              <p className="text-[10.5px] text-gray-400 mb-3 truncate">
                {t('parentPathLabel')}{' '}
                <span className="font-mono bg-slate-50 px-1 py-0.5 rounded">{activeTags.find(t => t.id === selectedParentTagId)?.path}</span>
              </p>
            )}
            <form onSubmit={handleCreateTagSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{t('tagNameLabel')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder={selectedParentTagId ? t('tagNameSubtagPlaceholder') : t('tagNamePlaceholder')}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  autoFocus
                />
                {!selectedParentTagId && (
                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    {t('proTipSlashes')}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 text-xs">
                <button
                  type="button"
                  {...bindTouchTap(() => {
                    setShowTagModal(false);
                    setSelectedParentTagId(null);
                  })}
                  className="px-4 py-2.5 text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 min-h-[44px] flex items-center justify-center cursor-pointer font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  {t('addTag')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
