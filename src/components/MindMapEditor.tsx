/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash, Edit, Check, X, HelpCircle } from 'lucide-react';
import { MindMapData, MindMapNode } from '../types';
import { Language } from '../utils/i18n';
import { bindTouchTap } from '../utils/touchUtils';

interface MindMapEditorProps {
  data?: MindMapData;
  onChange: (updatedData: MindMapData) => void;
  lang: Language;
  t: (key: any) => string;
}

export function MindMapEditor({ data, onChange, lang, t }: MindMapEditorProps) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Fallback initial data if none provided
  const mindmap = data || {
    format: 'node_tree',
    meta: { name: 'New Mindmap', author: 'User' },
    data: {
      id: 'root',
      topic: t('centralIdeaFallback'),
      children: [
        { id: 'sub-1', topic: t('mainBranchA'), direction: 'right', children: [] },
        { id: 'sub-2', topic: t('mainBranchB'), direction: 'left', children: [] }
      ]
    }
  };

  // Helper to generate IDs
  const generateId = () => 'node_' + Math.random().toString(36).substring(2, 9);

  // Deep clone helper
  const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  // Node operations using recursive tree walking
  const updateNodeText = (node: MindMapNode, id: string, newTopic: string): boolean => {
    if (node.id === id) {
      node.topic = newTopic;
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (updateNodeText(child, id, newTopic)) return true;
      }
    }
    return false;
  };

  const removeNode = (node: MindMapNode, targetId: string): boolean => {
    if (!node.children) return false;
    const initialLen = node.children.length;
    node.children = node.children.filter(child => child.id !== targetId);
    if (node.children.length < initialLen) return true;

    for (const child of node.children) {
      if (removeNode(child, targetId)) return true;
    }
    return false;
  };

  const addChildNode = (node: MindMapNode, parentId: string, item: MindMapNode): boolean => {
    if (node.id === parentId) {
      if (!node.children) node.children = [];
      // Inherit or switch alternate side if we branch from root
      if (parentId === 'root') {
        const rights = node.children.filter(c => c.direction === 'right');
        const lefts = node.children.filter(c => c.direction === 'left');
        item.direction = rights.length <= lefts.length ? 'right' : 'left';
      } else {
        item.direction = node.direction;
      }
      node.children.push(item);
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (addChildNode(child, parentId, item)) return true;
      }
    }
    return false;
  };

  const addSiblingNode = (node: MindMapNode, siblingId: string, item: MindMapNode): boolean => {
    if (node.children) {
      const idx = node.children.findIndex(child => child.id === siblingId);
      if (idx !== -1) {
        item.direction = node.children[idx].direction;
        node.children.splice(idx + 1, 0, item);
        return true;
      }
      for (const child of node.children) {
        if (addSiblingNode(child, siblingId, item)) return true;
      }
    }
    return false;
  };

  // State handlers to bubble up
  const handleEditSave = (id: string) => {
    if (!editValue.trim()) return;
    const copy = deepClone(mindmap);
    updateNodeText(copy.data, id, editValue.trim());
    onChange(copy);
    setEditingNodeId(null);
  };

  const handleAddChild = (parentId: string) => {
    const copy = deepClone(mindmap);
    const newId = generateId();
    const newNode: MindMapNode = {
      id: newId,
      topic: lang === 'zh' ? '新分支主题' : 'New sub-topic',
      children: []
    };
    addChildNode(copy.data, parentId, newNode);
    onChange(copy);
    setEditingNodeId(newId);
    setEditValue(lang === 'zh' ? '新分支主题' : 'New sub-topic');
  };

  const handleAddSibling = (siblingId: string) => {
    if (siblingId === 'root') return; // root cannot have siblings
    const copy = deepClone(mindmap);
    const newId = generateId();
    const newNode: MindMapNode = {
      id: newId,
      topic: lang === 'zh' ? '新同级主题' : 'New sibling topic',
      children: []
    };
    addSiblingNode(copy.data, siblingId, newNode);
    onChange(copy);
    setEditingNodeId(newId);
    setEditValue(lang === 'zh' ? '新同级主题' : 'New sibling topic');
  };

  const handleDelete = (id: string) => {
    if (id === 'root') return;
    const copy = deepClone(mindmap);
    removeNode(copy.data, id);
    onChange(copy);
    if (editingNodeId === id) setEditingNodeId(null);
  };

  // Simplified layout calculations for high-performance SVG drawing
  interface RenderNode {
    node: MindMapNode;
    x: number;
    y: number;
    parentId: string | null;
    parentX?: number;
    parentY?: number;
    direction: 'left' | 'right' | 'root';
  }

  const renderNodesList: RenderNode[] = [];

  // Depth-first traversal to compute rendering coordinates
  // Root in center, right children on positive X, left children on negative X
  const computeLayout = (
    node: MindMapNode,
    dir: 'left' | 'right' | 'root',
    x: number,
    y: number,
    parentId: string | null,
    px?: number,
    py?: number,
    heightDelta = 200
  ) => {
    renderNodesList.push({ node, x, y, parentId, parentX: px, parentY: py, direction: dir });

    const children = node.children || [];
    if (children.length === 0) return;

    if (node.id === 'root') {
      const rights = children.filter(c => c.direction === 'right');
      const lefts = children.filter(c => c.direction !== 'right');

      // Right Side layout
      const rTotalHeight = (rights.length - 1) * heightDelta;
      let rStartY = y - rTotalHeight / 2;
      rights.forEach((child) => {
        computeLayout(child, 'right', x + 210, rStartY, 'root', x, y, heightDelta * 0.7);
        rStartY += heightDelta;
      });

      // Left Side layout
      const lTotalHeight = (lefts.length - 1) * heightDelta;
      let lStartY = y - lTotalHeight / 2;
      lefts.forEach((child) => {
        computeLayout(child, 'left', x - 210, lStartY, 'root', x, y, heightDelta * 0.7);
        lStartY += heightDelta;
      });
    } else {
      // Branch layout extending outwards in same direction
      const totalH = (children.length - 1) * heightDelta;
      let startY = y - totalH / 2;
      children.forEach((child) => {
        const nextX = dir === 'right' ? x + 180 : x - 180;
        computeLayout(child, dir, nextX, startY, node.id, x, y, heightDelta * 0.82);
        startY += heightDelta;
      });
    }
  };

  // Run Layout calculations
  const CANVAS_WIDTH = 1100;
  const CANVAS_HEIGHT = 700;
  computeLayout(mindmap.data, 'root', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, null, undefined, undefined, 180);

  return (
    <div className="relative w-full h-[700px] bg-slate-50 border border-gray-200 rounded-2xl overflow-hidden shadow-inner select-none flex flex-col mindmap-canvas">
      {/* Header controls inside canvas */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-15 pointer-events-none">
        <div className="flex space-x-1.5 items-center bg-white/95 backdrop-blur-md border border-gray-150 rounded-xl py-2 px-4 shadow-sm pointer-events-auto">
          <span className="font-sans font-extrabold text-xs text-slate-800 uppercase tracking-wider">{t('mindmapBoardDefault')}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="flex space-x-2 pointer-events-auto">
          <button
            {...bindTouchTap(() => setShowHelp(!showHelp))}
            className="p-2.5 px-4 rounded-xl bg-white/95 border border-gray-150 text-xs font-bold text-slate-650 shadow-sm hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer touch-target-min"
          >
            <HelpCircle className="w-4 h-4" />
            {t('helpGuide')}
          </button>
        </div>
      </div>

      {/* Interactive Legend Box */}
      {showHelp && (
        <div className="absolute top-16 right-4 z-20 w-80 bg-white/98 backdrop-blur-md p-5 rounded-2xl border border-gray-250 shadow-2xl font-sans">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{t('shortcutsTitle')}</h4>
            <button {...bindTouchTap(() => setShowHelp(false))} className="p-1 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="text-xs text-gray-750 space-y-3 font-medium">
            <li className="flex items-start gap-2">
              <span className="p-1 px-2 bg-gray-100 text-gray-800 font-bold font-mono rounded-lg text-[10px] border border-gray-200 whitespace-nowrap">{t('doubleClickEdit')}</span>
              <span className="mt-0.5">{t('doubleClickDesc')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="p-1 px-2 bg-gray-100 text-gray-800 font-bold font-mono rounded-lg text-[10px] border border-gray-200 whitespace-nowrap">{t('addChildNode')}</span>
              <span className="mt-0.5">{t('addChildDesc')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="p-1 px-2 bg-gray-100 text-gray-800 font-bold font-mono rounded-lg text-[10px] border border-gray-200 whitespace-nowrap">{t('addSiblingNode')}</span>
              <span className="mt-0.5">{t('addSiblingDesc')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="p-1 px-3 bg-red-50 text-red-700 font-bold font-mono rounded-lg text-[10px] border border-red-100 whitespace-nowrap">{t('trashBtn')}</span>
              <span className="mt-0.5 text-red-650">{t('deleteNodeDesc')}</span>
            </li>
          </ul>
        </div>
      )}

      {/* SVG Container Stage */}
      <div
        {...bindTouchTap(() => setSelectedNodeId(null))}
        className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-auto scrollbar-thin"
      >
        <svg
          className="absolute inset-0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ minWidth: CANVAS_WIDTH, minHeight: CANVAS_HEIGHT }}
        >
          {/* Connector curves drawing */}
          <g>
            {renderNodesList.map(({ x, y, parentX, parentY, node, direction }) => {
              if (parentX === undefined || parentY === undefined) return null;

              // Smooth Bezier cubic line for curved connection lines
              let dPath = '';
              if (direction === 'right') {
                const controlX1 = parentX + 90;
                const controlX2 = x - 90;
                dPath = `M ${parentX} ${parentY} C ${controlX1} ${parentY}, ${controlX2} ${y}, ${x} ${y}`;
              } else {
                const controlX1 = parentX - 90;
                const controlX2 = x + 90;
                dPath = `M ${parentX} ${parentY} C ${controlX1} ${parentY}, ${controlX2} ${y}, ${x} ${y}`;
              }

              return (
                <path
                  key={`line-${node.id}`}
                  d={dPath}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="transition-all duration-300 opacity-80"
                />
              );
            })}
          </g>
        </svg>

        {/* DOM interactive overlay components for easy editing inputs & tooltips */}
        <div className="absolute inset-0" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, pointerEvents: 'none' }}>
          {renderNodesList.map(({ node, x, y, direction }) => {
            const isEditing = editingNodeId === node.id;
            const isRoot = node.id === 'root';

            return (
              <div
                key={`node-ui-${node.id}`}
                className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group pointer-events-auto transition-all duration-200"
                style={{ left: x, top: y }}
              >
                {isEditing ? (
                  <div className="bg-white border-2 border-emerald-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-1.5 z-30">
                    <input
                      type="text"
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 font-sans font-semibold w-44 text-slate-800"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(node.id);
                        if (e.key === 'Escape') setEditingNodeId(null);
                      }}
                      autoFocus
                    />
                    <button
                      {...bindTouchTap(() => handleEditSave(node.id))}
                      className="p-2.5 text-emerald-600 rounded-xl bg-emerald-50 hover:bg-emerald-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      {...bindTouchTap(() => setEditingNodeId(null))}
                      className="p-2.5 text-red-600 rounded-xl bg-red-50 hover:bg-red-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center select-none">
                    {/* Node Card - Large comfortable touch size (min-height 44px equivalent via py-3 px-5) */}
                    <div
                      {...bindTouchTap((e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      })}
                      onDoubleClick={() => {
                        setEditingNodeId(node.id);
                        setEditValue(node.topic);
                      }}
                      className={`px-5 py-3 rounded-2xl border font-sans text-xs font-bold shadow-sm text-center min-w-[140px] max-w-[220px] cursor-pointer transition-all ${
                        isRoot
                          ? 'bg-slate-900 border-slate-900 text-white font-extrabold shadow-md scale-102 min-h-[48px]'
                          : selectedNodeId === node.id
                            ? 'bg-emerald-50 border-emerald-550 text-emerald-950 font-extrabold scale-102 shadow-md min-h-[44px]'
                            : 'bg-white border-gray-205 hover:border-slate-500 text-slate-800 hover:shadow-md min-h-[44px]'
                      }`}
                    >
                      {node.topic}
                    </div>

                    {/* Node Toolbar with comfortable touch elements (at least 44x44px bounding box hover overlay) */}
                    <div className={`absolute top-11 transition-opacity duration-150 bg-white border border-gray-200 rounded-xl p-1 shadow-lg flex items-center divide-x divide-gray-150 gap-1 z-20 ${
                      selectedNodeId === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 hover:opacity-100'
                    }`}>
                      <div className="flex gap-0.5">
                        <button
                          {...bindTouchTap(() => {
                            setEditingNodeId(node.id);
                            setEditValue(node.topic);
                          })}
                          className="p-2 w-11 h-11 hover:bg-slate-50 text-slate-650 hover:text-slate-900 rounded-lg transition flex items-center justify-center cursor-pointer"
                          title={t('writeMode')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          {...bindTouchTap(() => handleAddChild(node.id))}
                          className="p-2 w-11 h-11 hover:bg-emerald-50 text-emerald-650 hover:text-emerald-800 rounded-lg transition flex items-center justify-center cursor-pointer"
                          title={t('addChildNode')}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {!isRoot && (
                        <div className="flex gap-0.5 pl-1">
                          <button
                            {...bindTouchTap(() => handleAddSibling(node.id))}
                            className="p-2 w-11 h-11 hover:bg-blue-50 text-blue-650 hover:text-blue-800 rounded-lg transition flex items-center justify-center cursor-pointer"
                            title={t('addSiblingNode')}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="8" y1="6" x2="21" y2="6"></line>
                              <line x1="8" y1="12" x2="21" y2="12"></line>
                              <line x1="8" y1="18" x2="21" y2="18"></line>
                              <line x1="3" y1="6" x2="3.01" y2="6"></line>
                              <line x1="3" y1="12" x2="3.01" y2="12"></line>
                              <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                          </button>
                          <button
                            {...bindTouchTap(() => handleDelete(node.id))}
                            className="p-2 w-11 h-11 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition flex items-center justify-center cursor-pointer"
                            title={t('trashBtn')}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
