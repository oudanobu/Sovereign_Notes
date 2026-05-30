/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Trash2, 
  FileText,
  Sparkles,
  RefreshCw,
  Quote
} from 'lucide-react';
import { bindTouchTap } from '../utils/touchUtils';

interface RichTextEditorProps {
  value: string; // Markdown text
  onChange: (newValue: string) => void;
  lang: 'zh' | 'en';
}

// 1. Convert simple Markdown text to pure HTML structure
function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;

  // Treat lines
  const lines = html.split('\n');
  const processedLines = lines.map((line) => {
    let trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return `<h1>${trimmed.slice(2)}</h1>`;
    }
    if (trimmed.startsWith('## ')) {
      return `<h2>${trimmed.slice(3)}</h2>`;
    }
    if (trimmed.startsWith('### ')) {
      return `<h3>${trimmed.slice(4)}</h3>`;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return `<li>${trimmed.slice(2)}</li>`;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^\d+\.\s/);
      const prefixLength = match ? match[0].length : 3;
      return `<li data-ordered="true">${trimmed.slice(prefixLength)}</li>`;
    }
    if (trimmed.startsWith('> ')) {
      return `<blockquote>${trimmed.slice(2)}</blockquote>`;
    }
    if (trimmed === '') {
      return '<br>';
    }
    return `<div>${line}</div>`;
  });

  // Group multiple independent <li> into <ul> or <ol> block
  let groupedHtml = '';
  let inList = false;
  let listOrdered = false;

  processedLines.forEach((line) => {
    const isLi = line.startsWith('<li>');
    const isOli = line.startsWith('<li data-ordered="true">');

    if (isLi || isOli) {
      if (!inList) {
        inList = true;
        listOrdered = isOli;
        groupedHtml += listOrdered ? '<ol>' : '<ul>';
      }
      const cleanLi = line.replace(' data-ordered="true"', '');
      groupedHtml += cleanLi;
    } else {
      if (inList) {
        inList = false;
        groupedHtml += listOrdered ? '</ol>' : '</ul>';
      }
      groupedHtml += line;
    }
  });

  if (inList) {
    groupedHtml += listOrdered ? '</ol>' : '</ul>';
  }

  // Inline formatting replacements
  groupedHtml = groupedHtml
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/`(.*?)`/g, '<code>$1</code>');

  return groupedHtml;
}

// 2. Traverses and converts DOM node trees recursively from contentEditable to pristine Markdown
function domToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  // Child processing
  let childrenMarkdown = '';
  element.childNodes.forEach((child) => {
    childrenMarkdown += domToMarkdown(child);
  });

  switch (tagName) {
    case 'H1':
      return `\n# ${childrenMarkdown.trim()}\n`;
    case 'H2':
      return `\n## ${childrenMarkdown.trim()}\n`;
    case 'H3':
      return `\n### ${childrenMarkdown.trim()}\n`;
    case 'STRONG':
    case 'B':
      return `**${childrenMarkdown}**`;
    case 'EM':
    case 'I':
      return `*${childrenMarkdown}*`;
    case 'U':
    case 'INS':
      return `__${childrenMarkdown}__`;
    case 'CODE':
      return `\`${childrenMarkdown}\``;
    case 'BLOCKQUOTE':
      return `\n> ${childrenMarkdown.trim()}\n`;
    case 'UL':
      return `\n${childrenMarkdown}\n`;
    case 'OL':
      return `\n${childrenMarkdown}\n`;
    case 'LI':
      const parent = element.parentElement;
      const isOrdered = parent ? parent.tagName.toUpperCase() === 'OL' : false;
      if (isOrdered) {
        // Find index of LI under parent
        const siblings = Array.from(parent?.children || []);
        const idx = siblings.indexOf(element) + 1;
        return `${idx}. ${childrenMarkdown}\n`;
      }
      return `- ${childrenMarkdown}\n`;
    case 'BR':
      return '\n';
    case 'DIV':
    case 'P':
      // Ensure vertical spacing logic is smooth
      if (childrenMarkdown.trim() === '') return '\n';
      return `\n${childrenMarkdown}\n`;
    default:
      return childrenMarkdown;
  }
}

// Compact and normalize raw converted Markdown block (fixing double newlines safely)
function sanitizeMarkdown(md: string): string {
  return md
    .replace(/\n{3,}/g, '\n\n') // Merge 3+ empty lines to 2
    .trim();
}

export function RichTextEditor({ value, onChange, lang }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // Initial conversion on mount/load
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      const currentTextInEditor = sanitizeMarkdown(domToMarkdown(editor));
      const sourceMd = sanitizeMarkdown(value);
      
      // If code edits are actually divergent, perform full update
      if (currentTextInEditor !== sourceMd) {
        editor.innerHTML = markdownToHtml(value);
      }
    }
  }, [value]);

  // Command wrapper for native browser formats
  const executeCommand = (command: string, arg: string = '') => {
    // Focus back to editor
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    triggerEditorChange();
  };

  const triggerEditorChange = () => {
    if (!editorRef.current) return;
    const rawMd = domToMarkdown(editorRef.current);
    const cleanMd = sanitizeMarkdown(rawMd);
    onChange(cleanMd);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs">
      
      {/* RICH TEXT FORMATTING UTILITY BAR */}
      <div className="bg-slate-50 border-b border-gray-200 px-3.5 py-2.5 flex flex-wrap items-center gap-1.5 select-none shrink-0">
        
        {/* Paragraph & Headings */}
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('formatBlock', '<h1>'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '大标题 (H1)' : 'Large Heading'}
        >
          <Heading1 className="w-4 h-4 text-slate-800" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('formatBlock', '<h2>'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '副标题 (H2)' : 'Sub Heading'}
        >
          <Heading2 className="w-4 h-4 text-slate-800" />
        </button>

        <span className="w-px h-5 bg-gray-200 mx-1"></span>

        {/* Font Weight, Styles & Inline */}
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('bold'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '加粗 (Bold)' : 'Bold text'}
        >
          <Bold className="w-4 h-4 text-slate-800" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('italic'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '斜体 (Italic)' : 'Italic text'}
        >
          <Italic className="w-4 h-4 text-slate-800" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('underline'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '下划线' : 'Underline text'}
        >
          <Underline className="w-4 h-4 text-slate-800" />
        </button>

        <span className="w-px h-5 bg-gray-200 mx-1"></span>

        {/* Lists & Block quotes */}
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('insertUnorderedList'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '无序列表' : 'Bullet List'}
        >
          <List className="w-4 h-4 text-slate-800" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('insertOrderedList'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '有序列表' : 'Numbered List'}
        >
          <ListOrdered className="w-4 h-4 text-slate-800" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('formatBlock', '<blockquote>'))}
          className="p-2 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition duration-150 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-white border border-gray-150"
          title={lang === 'zh' ? '段落引用' : 'Insert Quote'}
        >
          <Quote className="w-4 h-4 text-slate-800" />
        </button>

        <span className="w-px h-5 bg-gray-200 mx-1"></span>

        {/* Basic Alignments */}
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('justifyLeft'))}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-800"
          title={lang === 'zh' ? '左对齐' : 'Align Left'}
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('justifyCenter'))}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-800"
          title={lang === 'zh' ? '居中对齐' : 'Align Center'}
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('justifyRight'))}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-800"
          title={lang === 'zh' ? '右对齐' : 'Align Right'}
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        {/* Clear formatting entirely */}
        <button
          type="button"
          {...bindTouchTap(() => executeCommand('removeFormat'))}
          className="ml-auto p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-150 rounded-xl transition duration-150 text-xs font-black uppercase tracking-wider flex items-center justify-center min-h-[36px] px-3.5"
          title={lang === 'zh' ? '清除格式' : 'Clear Style'}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          <span>{lang === 'zh' ? '洗板' : 'Clean'}</span>
        </button>
      </div>

      {/* RICH EDITABLE WRAPPER */}
      <div className="flex-1 p-5 overflow-y-auto bg-white min-h-[280px]">
        <div
          ref={editorRef}
          contentEditable
          onInput={triggerEditorChange}
          onBlur={triggerEditorChange}
          className="prose prose-slate max-w-none focus:outline-none min-h-full font-serif text-slate-880 leading-relaxed text-sm whitespace-normal"
          placeholder={lang === 'zh' ? '请在此直接利用上方富文本工具栏可视化书写。格式将在后台自动安全序列转换回纯 Markdown 文件...' : 'Start printing. Use Rich-text toolbar at the top. The output compiles safely to markdown in real-time...'}
          style={{ minHeight: '100%' }}
        />
      </div>

      {/* FOOTER METRICS */}
      <div className="bg-slate-50 border-t border-gray-150 px-4 py-2 flex items-center justify-between text-[10px] text-gray-400 font-extrabold uppercase tracking-widest shrink-0">
        <div className="flex items-center space-x-1.5 text-indigo-600">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'zh' ? '所见即所得富文本引擎' : 'WYSWYG RichText Engine'}</span>
        </div>
        <span>{lang === 'zh' ? '已自动映射为 MARKDOWN 树' : 'Auto synced as markdown'}</span>
      </div>
    </div>
  );
}
