/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLocalAsset } from '../utils/useLocalAsset';

export function LocalImage({ src, alt, className }: { src: string; alt?: string; className?: string; key?: React.Key }) {
  const isLocalAsset = src && src.startsWith('local-asset://');
  const assetId = isLocalAsset ? src.replace('local-asset://', '') : null;
  
  const { objectUrl, error, loading } = useLocalAsset(assetId);

  if (loading && isLocalAsset) {
    return (
      <span className="inline-flex items-center justify-center py-2 px-3 bg-gray-100 rounded-xl space-x-2 text-[11px] text-slate-500 font-bold max-w-full my-2 animate-pulse">
        <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        <span>读取本地储存资产...</span>
      </span>
    );
  }

  if (error && isLocalAsset) {
    return (
      <span className="inline-flex items-center justify-center py-1 px-2.5 bg-rose-50 border border-rose-150 rounded-xl text-rose-800 text-[11px] font-bold max-w-full my-2 space-x-1">
        <span>⚠️</span>
        <span>图片未找到 ({assetId})</span>
      </span>
    );
  }

  const finalSrc = isLocalAsset ? objectUrl : src;

  if (!finalSrc) return null;

  return (
    <img 
      src={finalSrc} 
      alt={alt || 'Local Note Image'} 
      className={className || "block max-w-full max-h-[380px] my-3.5 rounded-2xl border border-gray-200/80 shadow-xs object-contain bg-slate-50/50"} 
      referrerPolicy="no-referrer"
    />
  );
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return <p className="text-gray-400 italic">No content. Start typing Markdown...</p>;
  }

  const lines = content.split('\n');
  const renderedElements: React.JSX.Element[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${key}`} className="list-disc pl-6 mb-4 space-y-1 text-gray-700 font-sans leading-relaxed">
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  // Inline formatting helper (bold, italic, code)
  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let index = 0;
    let textBuffer = '';

    const flushBuffer = () => {
      if (textBuffer.length > 0) {
        parts.push(textBuffer);
        textBuffer = '';
      }
    };

    // Pattern matching loop for strong, elements, and local-assets.
    // Extremely efficient linear character parsing with text buffering to avoid React key issues
    while (currentText.length > 0) {
      const imageMatch = currentText.match(/^!\[(.*?)\]\((.*?)\)/);
      const boldMatch = currentText.match(/^\*\*(.*?)\*\*/);
      const italicMatch = currentText.match(/^\*(.*?)\*/);
      const inlineCodeMatch = currentText.match(/^`(.*?)`/);

      if (imageMatch) {
         flushBuffer();
         parts.push(<LocalImage key={`img-${index}`} src={imageMatch[2]} alt={imageMatch[1]} />);
         currentText = currentText.substring(imageMatch[0].length);
      } else if (boldMatch) {
         flushBuffer();
         parts.push(<strong key={`bold-${index}`} className="font-bold text-gray-900">{boldMatch[1]}</strong>);
         currentText = currentText.substring(boldMatch[0].length);
      } else if (italicMatch) {
         flushBuffer();
         parts.push(<em key={`italic-${index}`} className="italic text-gray-800">{italicMatch[1]}</em>);
         currentText = currentText.substring(italicMatch[0].length);
      } else if (inlineCodeMatch) {
         flushBuffer();
         parts.push(<code key={`code-${index}`} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 font-mono text-sm text-pink-600 rounded">{inlineCodeMatch[1]}</code>);
         currentText = currentText.substring(inlineCodeMatch[0].length);
      } else {
         textBuffer += currentText[0];
         currentText = currentText.substring(1);
      }
      index++;
    }
    flushBuffer();
    return parts;
  };

  lines.forEach((line, index) => {
    // 1. Code Block Handling
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        renderedElements.push(
          <pre key={`code-${index}`} className="p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto rounded-lg mb-4 shadow-inner border border-gray-800">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList(index);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // 2. Heading Levels
    if (line.match(/^#{1,6}\s/)) {
      flushList(index);
      const match = line.match(/^(#{1,6})\s(.*)/);
      if (match) {
        const level = match[1].length;
        const textStr = match[2];
        const headingStyles = [
          'text-3xl font-extrabold tracking-tight text-gray-900 font-sans mt-6 mb-3',
          'text-2xl font-bold tracking-tight text-gray-900 font-sans mt-5 mb-2.5',
          'text-xl font-semibold tracking-tight text-gray-800 font-sans mt-4.5 mb-2',
          'text-lg font-semibold tracking-tight text-gray-800 font-sans mt-4 mb-2',
          'text-base font-medium text-gray-950 font-sans mt-3.5 mb-1.5',
          'text-sm font-medium uppercase tracking-wider text-gray-500 font-sans mt-3 mb-1'
        ];
        const headingStyle = headingStyles[level - 1] || headingStyles[2];

        renderedElements.push(
          React.createElement(
            `h${level}`,
            { key: `h-${index}`, className: headingStyle },
            parseInline(textStr)
          )
        );
      }
      return;
    }

    // 3. Blockquote
    if (line.trim().startsWith('>')) {
      flushList(index);
      const text = line.substring(line.indexOf('>') + 1).trim();
      renderedElements.push(
        <blockquote key={`bq-${index}`} className="pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-600 dark:text-gray-400 font-sans py-1 mb-4 my-2 leading-relaxed">
          {parseInline(text)}
        </blockquote>
      );
      return;
    }

    // 4. Checklist/Tasklist (e.g. - [ ] or - [x])
    const checklistMatch = line.match(/^[-*]\s\[([ xX])\]\s(.*)/);
    if (checklistMatch) {
      flushList(index);
      const checked = checklistMatch[1].toLowerCase() === 'x';
      const text = checklistMatch[2];
      renderedElements.push(
        <div key={`check-${index}`} className="flex items-center space-x-3.5 mb-2 font-sans py-0.5">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="w-4.5 h-4.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
          />
          <span className={`text-gray-700 leading-normal ${checked ? 'line-through text-gray-400' : ''}`}>
            {parseInline(text)}
          </span>
        </div>
      );
      return;
    }

    // 5. Bullet List Items
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.replace(/^([-*])\s/, '');
      inList = true;
      listItems.push(text);
      return;
    } else {
      flushList(index);
    }

    // 6. Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      renderedElements.push(<hr key={`hr-${index}`} className="my-6 border-t-2 border-gray-100" />);
      return;
    }

    // 7. Standard Paragraph
    if (line.trim() === '') {
      renderedElements.push(<div key={`space-${index}`} className="h-2" />);
    } else {
      renderedElements.push(
        <p key={`p-${index}`} className="font-sans leading-relaxed text-gray-700 mb-4.5 text-[15px]">
          {parseInline(line)}
        </p>
      );
    }
  });

  // Flush any dangling list on EOF
  flushList(lines.length);

  return <div className="prose prose-slate max-w-none">{renderedElements}</div>;
}
