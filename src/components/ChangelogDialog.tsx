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
        className="bg-white rounded-3xl shadow-2xl border border-gray-150 w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Styled with soft accents */}
        <div className="p-6 border-b border-gray-150 bg-slate-55 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{t('aboutTitle')}</h3>
              <p className="text-[10.5px] font-mono text-indigo-600 font-extrabold tracking-wider uppercase mt-0.5">SovereignNote v1.2.0 (Stable)</p>
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
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex gap-3.5">
            <Shield className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">{t('sovereignCoreConcept')}</p>
              <p className="text-[11.5px] leading-relaxed text-indigo-900/85 font-medium">{t('corePhilosophy')}</p>
            </div>
          </div>

          {/* Tri-platform compile outputs */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 pt-1">
              <Laptop className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '多平台自动化编译成果' : 'Tri-Platform Native Assets'}</span>
            </h4>
            
            <div className="grid gap-3">
              {/* PWA Single file */}
              <div className="p-4 rounded-2xl border border-gray-150 bg-slate-50/50 hover:bg-white transition-all flex gap-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900">SovereignNote-PWA-SingleFile.html</span>
                  <p className="text-[11px] leading-relaxed text-gray-500 font-medium">{t('pwaSingleFileDesc')}</p>
                </div>
              </div>

              {/* Win32 Portable */}
              <div className="p-4 rounded-2xl border border-gray-150 bg-slate-50/50 hover:bg-white transition-all flex gap-3">
                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900">SovereignNote-Windows-Win32-Green.zip</span>
                  <p className="text-[11px] leading-relaxed text-gray-500 font-medium">{t('win32GreenDesc')}</p>
                </div>
              </div>

              {/* Android legacy */}
              <div className="p-4 rounded-2xl border border-gray-150 bg-slate-50/50 hover:bg-white transition-all flex gap-3">
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
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 pt-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '触控与设备体验优化' : 'Touchpad & Hardware Tweaks'}</span>
            </h4>
            
            <ul className="space-y-2.5 text-xs text-slate-700 font-bold list-none pl-1">
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '胖手指热区规范：所有按钮均扩充物理高度至不少于 44px' : 'Fat-finger rule: Min size of 44x44px ensures high target security'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '禁用页面双击缩放：彻底消除老旧 Android 平板和 Windows 300ms 触控延迟' : 'Disabled double-tap zooming: Completely eliminates browser 300ms touch delay'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{lang === 'zh' ? '扩大标签树交互面积：树图标 padding 扩容，操作更游刃有余' : 'Expanded tree margin: Folder & tags expandable icons leverage double padded bounds'}</span>
              </li>
              <li className="flex items-center gap-2.5">
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
