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
  Quote,
  Image,
  Sparkles
} from 'lucide-react';
import { bindTouchTap } from '../utils/touchUtils';
import { storage } from '../core/storage/storageManager';

interface RichTextEditorProps {
  value: string; // Markdown text
  onChange: (newValue: string) => void;
  lang: 'zh' | 'en';
  noteId?: string; // Associated note Id for local assets taxonomy
}

// 1. Convert simple Markdown text to pure HTML structure
function markdownToHtml(md: string, assetUrls: Record<string, string> = {}): string {
  if (!md) return '';
  let html = md;

  // Support ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
    let displayUrl = url;
    if (url.startsWith('local-asset://')) {
      const id = url.replace('local-asset://', '');
      displayUrl = assetUrls[id] || '';
    }
    return `<img src="${displayUrl}" alt="${alt}" data-asset-src="${url}" style="max-height: 240px; border-radius: 12px; margin: 10px 0; max-width: 100%; border: 1px solid #e2e8f0; display: block;" referrerPolicy="no-referrer" />`;
  });

  // Treat lines
  const lines = html.split('\n');
  const processedLines = lines.map((line) => {
    let trimmed = line.trim();
    // If it's already an <img> block from the regex replacement, return as is
    if (trimmed.startsWith('<img ')) {
      return trimmed;
    }
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
      return '<br/>';
    }
    return `<div>${trimmed}</div>`;
  });

  let inList = false;
  let listType = '';
  const finalHtml: string[] = [];

  processedLines.forEach((line) => {
    const isLi = line.startsWith('<li>') || line.startsWith('<li data-ordered="true">');
    const isOrdered = line.includes('data-ordered="true"');
    
    if (isLi && !inList) {
      inList = true;
      listType = isOrdered ? '<ol>' : '<ul>';
      finalHtml.push(listType);
    } else if (!isLi && inList) {
      inList = false;
      finalHtml.push(listType === '<ol>' ? '</ol>' : '</ul>');
    }
    finalHtml.push(line);
  });

  if (inList) {
    finalHtml.push(listType === '<ol>' ? '</ol>' : '</ul>');
  }

  return finalHtml.join('');
}

// 2. Convert DOM HTML back to simple Markdown text
function domToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

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
        const siblings = Array.from(parent?.children || []);
        const idx = siblings.indexOf(element) + 1;
        return `${idx}. ${childrenMarkdown}\n`;
      }
      return `- ${childrenMarkdown}\n`;
    case 'IMG':
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      const dataAsset = element.getAttribute('data-asset-src') || src;
      return `![${alt}](${dataAsset})`;
    case 'BR':
      return '\n';
    case 'DIV':
    case 'P':
      if (childrenMarkdown.trim() === '') return '\n';
      return `\n${childrenMarkdown}\n`;
    default:
      return childrenMarkdown;
  }
}

// Compact and normalize raw converted Markdown block
function sanitizeMarkdown(md: string): string {
  return md
    .replace(/\n{3,}/g, '\n\n') // Merge 3+ empty lines to 2
    .trim();
}

export function RichTextEditor({ value, onChange, lang, noteId }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assetObjectUrls, setAssetObjectUrls] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  // Scan markdown for local assets and resolve them asynchronously to browser Blob URLs
  useEffect(() => {
    const matches = Array.from(value.matchAll(/local-asset:\/\/([A-Za-z0-9_-]+)/g));
    const uniqueIds: string[] = Array.from(new Set(matches.map(m => m[1] as string)));
    
    let hasNew = false;
    const currentMap = { ...assetObjectUrls } as Record<string, string>;

    // Evict old urls not found anymore to prevent memory leak
    Object.keys(currentMap).forEach((id: string) => {
      if (!uniqueIds.includes(id)) {
        URL.revokeObjectURL(currentMap[id]);
        delete currentMap[id];
        hasNew = true;
      }
    });

    const loadNew = async () => {
      for (const id of uniqueIds) {
        if (!currentMap[id]) {
          try {
            const asset = await storage.getAsset(id);
            if (asset && asset.data) {
              const blob = asset.data instanceof Blob ? asset.data : new Blob([asset.data], { type: asset.mimeType });
              currentMap[id] = URL.createObjectURL(blob);
              hasNew = true;
            }
          } catch (err) {
            console.error(`Asset pre-resolve fail for id ${id}:`, err);
          }
        }
      }
      if (hasNew) {
        setAssetObjectUrls(currentMap);
      }
    };

    loadNew();
  }, [value]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      Object.values(assetObjectUrls).forEach((url) => URL.revokeObjectURL(url as string));
    };
  }, []);

  // Synchronize incoming value into editor HTML
  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      const currentTextInEditor = sanitizeMarkdown(domToMarkdown(editor));
      const sourceMd = sanitizeMarkdown(value);
      
      // Update inside the editor only if sync diverged
      if (currentTextInEditor !== sourceMd) {
        editor.innerHTML = markdownToHtml(value, assetObjectUrls);
      } else {
        // Double check if any img src is holding empty URL but has a resolved objectUrl ready
        const imgs = editor.querySelectorAll('img[data-asset-src^="local-asset://"]');
        imgs.forEach((img) => {
          const originalSrc = img.getAttribute('data-asset-src') || '';
          const id = originalSrc.replace('local-asset://', '');
          const currentSrc = img.getAttribute('src') || '';
          if (assetObjectUrls[id] && currentSrc !== assetObjectUrls[id]) {
            img.setAttribute('src', assetObjectUrls[id]);
          }
        });
      }
    }
  }, [value, assetObjectUrls]);

  // Command wrapper for native browser formats
  const executeCommand = (command: string, arg: string = '') => {
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

  // Safe file loader inserting img tags directly inside the cursor or end of editor
  const insertAssetIntoEditor = (assetId: string, fileName: string, objectUrl: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const imgHtml = ` <img src="${objectUrl}" alt="${fileName}" data-asset-src="local-asset://${assetId}" style="max-height: 240px; border-radius: 12px; margin: 10px 0; max-width: 100%; border: 1px solid #e2e8f0; display: block;" referrerPolicy="no-referrer" /> `;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const el = document.createElement('div');
        el.innerHTML = imgHtml;
        const frag = document.createDocumentFragment();
        let node;
        let lastNode;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        triggerEditorChange();
        return;
      }
    }

    editor.innerHTML += imgHtml;
    triggerEditorChange();
  };

  const handleUploadFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await storage.saveAsset({
          id,
          noteId: noteId || '',
          fileName: file.name,
          mimeType: file.type,
          data: file,
          createdAt: Date.now()
        });

        const url = URL.createObjectURL(file);
        setAssetObjectUrls(prev => ({
          ...prev,
          [id]: url
        }));

        insertAssetIntoEditor(id, file.name, url);
      } catch (err) {
        console.error('Local asset persistence fail:', err);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleUploadFiles(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleUploadFiles(files);
      e.target.value = ''; // Clean up files
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-xs">
      
      {/* Hidden input for local asset choosing */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* RICH TEXT FORMATTING UTILITY BAR */}
      <div className="bg-slate-50 border-b border-gray-200 px-3.5 py-2.5 flex flex-wrap items-center gap-1.5 select-none shrink-0">
        
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

        {/* Local Image Uploader button */}
        <button
          type="button"
          {...bindTouchTap(() => fileInputRef.current?.click())}
          className="p-2 hover:bg-sky-100 active:bg-sky-200 rounded-xl transition duration-110 text-slate-800 font-bold text-xs flex items-center justify-center min-w-[36px] min-h-[36px] bg-sky-50 border border-sky-200"
          title={lang === 'zh' ? '插入本地图片附件 (PNG/JPG)' : 'Insert Local Image'}
        >
          <Image className="w-4 h-4 text-sky-700 hover:scale-105 transition-transform" />
        </button>
 
        <span className="w-px h-5 bg-gray-200 mx-1"></span>
 
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
      </div>

      {/* EDITING AREA */}
      <div 
        className={`flex-1 overflow-y-auto p-4 md:p-6 bg-white transition-colors relative ${isDragging ? 'bg-sky-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm border-2 border-dashed border-sky-400 rounded-xl m-2 pointer-events-none">
            <div className="flex flex-col items-center space-y-2 text-sky-600 font-bold">
              <Image className="w-12 h-12 animate-bounce" />
              <span>{lang === 'zh' ? '松开以上传本地图片' : 'Drop to upload local image'}</span>
            </div>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={triggerEditorChange}
          onInput={triggerEditorChange}
          className="prose prose-sm md:prose-base prose-slate max-w-none focus:outline-none min-h-full pb-[20vh]
                     prose-h1:font-black prose-h1:text-gray-900 prose-h1:tracking-tight
                     prose-h2:font-extrabold prose-h2:text-gray-800
                     prose-h3:font-bold prose-h3:text-gray-800
                     prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                     prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic prose-blockquote:rounded-r-xl
                     prose-img:rounded-2xl prose-img:shadow-sm marker:text-indigo-500 font-sans"
        />
      </div>

      {/* FOOTER METRICS */}
      <div className="bg-slate-50 border-t border-gray-150 px-4 py-2 flex items-center justify-between text-[10px] text-gray-400 font-extrabold uppercase tracking-widest shrink-0">
        <div className="flex items-center space-x-1.5 text-indigo-600">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{lang === 'zh' ? '本地主权级富文本与图片引擎' : 'Local-first Sovereign Image & WYSIWYG'}</span>
        </div>
        <span>{lang === 'zh' ? '集成 IndexedDB 二进制流' : 'Direct blob-stream indexeddb container'}</span>
      </div>
    </div>
  );
}
