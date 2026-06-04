import React from 'react';
import { Sparkles, X, Shield, Smartphone, Laptop, CheckCircle, HelpCircle } from 'lucide-react';
import { bindTouchTap } from '../utils/touchUtils';

interface ChangelogDialogProps {
  onClose: () => void;
  lang: 'en' | 'zh';
  t: (key: string) => string;
}

export function ChangelogDialog({ onClose, lang, t }: ChangelogDialogProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-xl flex flex-col max-h-[85%] overflow-hidden transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Styled with soft accents */}
        <div className="p-6 border-b border-gray-150 bg-slate-55 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{t('aboutTitle')}</h3>
              <p className="text-[10.5px] font-mono text-indigo-600 font-extrabold tracking-wider uppercase mt-0.5">SovereignNote v1.4.1 (Stable)</p>
            </div>
          </div>
          <button
            {...bindTouchTap(onClose)}
            className="p-2.5 hover:bg-slate-100 border border-gray-150 text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center hover:shadow-sm"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area - Scrollable with thin scrollbar */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Mission philosophy banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex space-x-3.5">
            <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">{t('sovereignCoreConcept')}</p>
              <p className="text-[11.5px] leading-relaxed text-indigo-900/85 font-medium">{t('corePhilosophy')}</p>
            </div>
          </div>

          {/* v1.4.1 Feature Update */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-indigo-600">{lang === 'zh' ? 'v1.4.1 终端设备与三栏适配' : 'v1.4.1 Mobile View & Layout Fixes'}</span>
            </h4>
            
            <ul className="space-y-2.5 text-xs text-slate-700 font-bold list-none pl-1">
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '复古移动浏览器引擎优化 (.profile-android9)：针对老旧 Android WebView 进行 absolute 绝对定位精细重算，防止 flex 弹性抖动和卡机现象' : 'Retro CSS WebView Support: Restructured absolute positioning hooks for Android 9/older tablets, eliminating Flexbox layout bugs and rendering lag.'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '多层级多端切换稳定性：增加 wrapper-active 控制变量，实现单屏、侧栏、笔记列与编辑区间一键精准切换，全面防止交互穿透' : 'Dynamic Tri-Panel Isolation: Added state-active layout wraps to enforce clean absolute layering, preventing bottom overlays bleeding and touch event overlaps.'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '性能优化与内存防漏：完美清除老旧内存残留，提升本地持久化多设备同步的性能与数据承载上限' : 'Memory Leak Prevention & Database Stability: Safeguarded IndexedDB transaction lifetimes and garbage-collected idle objects, increasing overall sync performance.'}</span>
              </li>
            </ul>
          </div>

          <div className="w-full h-px bg-gray-150 my-2"></div>

          {/* v1.4.0 Feature Update */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-purple-600">{lang === 'zh' ? 'v1.4.0 核心能力跃迁' : 'v1.4.0 Core Enhancements'}</span>
            </h4>
            
            <ul className="space-y-2.5 text-xs text-slate-700 font-bold list-none pl-1">
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>{lang === 'zh' ? '无限触控手写白板 (Sovereign Whiteboard Studio)：新增自由绘图、色彩标注与全画裁切导出，并自动将其完全离线且所见即所得地融合进笔记宇宙' : 'Infinite Canvas Whiteboard: Introducing the Sovereign Whiteboard Studio, with direct pen-drawing, vector primitives, and local exports, dynamically folded into offline notes.'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>{lang === 'zh' ? '所见即所得富文本引擎 (WYSIWYG Markdown)：无缝双向跨界编译，实现格式栏一键视觉操作，后台静默保护级降维至 Markdown' : 'WYSIWYG Markdown Editor: Added explicit format bar bridging visual edits seamlessly backwards to pure markdown.'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>{lang === 'zh' ? '适老与护眼超大字号无极模式：全局字号和基础组件缩放 104%，突破设备底层锁定，关切数字阅读平权' : 'Large Font Accessibility Mode: One-click absolute font-scaling multiplier overriding OS UI restrictions for legibility.'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>{lang === 'zh' ? 'Android / PWA 后院储存壁垒穿透：面对 Android 内置 Web 包下载锁死 “找不到备份文件” 的现状，通过 Clipboard 脱壳直链，和新一代 HTML5 ShowSaveFilePicker，将选择权 100% 抢回手中' : 'Android OS File-System Export Overhaul: Implemented native clipboard snapshot fallback bypassing silent-kill Download restrictions in Cordova Android sandboxes.'}</span>
              </li>
            </ul>
          </div>

          <div className="w-full h-px bg-gray-150 my-2"></div>

          {/* v1.3.0 Feature Update */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-600">{lang === 'zh' ? 'v1.3.0 全新架构特性' : 'v1.3.0 Architecture Updates'}</span>
            </h4>
            
            <ul className="space-y-2.5 text-xs text-slate-700 font-bold list-none pl-1">
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{lang === 'zh' ? '独立设置与同步中心：将悬浮同步对话框重构为独立的左侧应用面板，彻底消除覆盖遮挡，多开编辑畅通无阻' : 'Standalone Settings Workspace: Converted the floating modal into a persistent side-panel layout, eliminating overlay blocking and enabling true side-by-side sync-editing'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{lang === 'zh' ? 'Windows 真正原生免安装构建：自动化引入 Electron-Builder Pipeline，将输出正统便携式 .exe 封装' : 'Native Windows Portable EXE: Introduced Electron-Builder pipeline in GitHub Actions to output a proper standalone .exe portable application'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{lang === 'zh' ? '全屏视野优化：更具桌面极客味道的全高面板设计与精细阴影' : 'Fullscreen vision optimization: Full-height side panels and refined shadow geometry for a true desktop hacker feel'}</span>
              </li>
            </ul>
          </div>

          {/* Tri-platform compile outputs */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5 pt-1">
              <Laptop className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '多平台自动化编译成果' : 'Tri-Platform Native Assets'}</span>
            </h4>
            
            <div className="grid gap-3">
              {/* PWA Single file */}
              <div className="p-4 rounded-2xl border border-gray-150 bg-slate-50/50 hover:bg-white transition-all flex space-x-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900">SovereignNote-PWA-SingleFile.html</span>
                  <p className="text-[11px] leading-relaxed text-gray-500 font-medium">{t('pwaSingleFileDesc')}</p>
                </div>
              </div>

              {/* Win32 Portable */}
              <div className="p-4 rounded-2xl border border-gray-150 bg-slate-50/50 hover:bg-white transition-all flex space-x-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-xs font-black text-slate-900">SovereignNote-Windows-Portable-x64.exe (64-bit)</span>
                    <span className="text-xs font-black text-emerald-600">SovereignNote-Windows-Portable-ia32.exe (32-bit / Win32)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-500 font-medium">{t('win32GreenDesc')}</p>
                </div>
              </div>

              {/* Android legacy */}
              <div className="p-4 rounded-2xl border border-gray-150 bg-slate-50/50 hover:bg-white transition-all flex space-x-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900">SovereignNote-Android5.0-Tablet.apk</span>
                  <p className="text-[11px] leading-relaxed text-gray-500 font-medium">{t('androidApkDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Touch Optimizations */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-1.5 pt-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '触控与设备体验优化' : 'Touchpad & Hardware Tweaks'}</span>
            </h4>
            
            <ul className="space-y-2.5 text-xs text-slate-700 font-bold list-none pl-1">
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '胖手指热区规范：所有按钮均扩充物理高度至不少于 44px' : 'Fat-finger rule: Min size of 44x44px ensures high target security'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '禁用页面双击缩放：彻底消除老旧 Android 平板和 Windows 300ms 触控延迟' : 'Disabled double-tap zooming: Completely eliminates browser 300ms touch delay'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '扩大标签树交互面积：树图标 padding 扩容，操作更游刃有余' : 'Expanded tree margin: Folder & tags expandable icons leverage double padded bounds'}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '禁用自带边缘橡皮筋与文本长按：防止多维拖动时冲突，操作流畅' : 'Locked rubber banding: Ideal scroll boundary containment prevents elastic context collision'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-150 bg-slate-50 flex items-center justify-end">
          <button
            {...bindTouchTap(onClose)}
            className="px-5 py-3 bg-slate-900 border border-slate-950 text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition active:scale-98 cursor-pointer min-h-[44px] flex items-center justify-center hover:shadow-md"
          >
            {t('closeBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
