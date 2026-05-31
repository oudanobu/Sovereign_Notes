/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Clock, Upload, Download } from 'lucide-react';
// @ts-ignore
import solarLunar from 'solarlunar';
import { Note, CalendarEvent } from '../types';
import { Language } from '../utils/i18n';
import { bindTouchTap } from '../utils/touchUtils';

interface CalendarPanelProps {
  notes: Note[];
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onImportEvents?: (events: CalendarEvent[]) => void;
  lang: Language;
  t: (key: any) => string;
}

export function CalendarPanel({
  notes,
  events = [],
  selectedDate,
  onSelectDate,
  onSaveEvent,
  onDeleteEvent,
  onImportEvents,
  lang,
  t
}: CalendarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Custom event creation states
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState('indigo'); // rose, indigo, emerald, amber

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Convert Date to YYYY-MM-DD Style
  const formatDateStyle = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // First day of week index (0 = Sunday, 1 = Monday...)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Find notes on specific day
  const notesOnDays = (dayNum: number): Note[] => {
    const checkDate = new Date(currentYear, currentMonth, dayNum);
    return notes.filter((note) => {
      if (note.isDeleted) return false;
      const noteDate = new Date(note.updatedAt);
      return (
        noteDate.getFullYear() === checkDate.getFullYear() &&
        noteDate.getMonth() === checkDate.getMonth() &&
        noteDate.getDate() === checkDate.getDate()
      );
    });
  };

  // Find custom events on specific day
  const eventsOnDays = (dayNum: number): CalendarEvent[] => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr && !e.isDeleted);
  };

  const monthKeys: any[] = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];

  // Calendar rendering
  const blankDays: React.JSX.Element[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    blankDays.push(
      <div key={`blank-${i}`} className="aspect-square w-full" />
    );
  }

  const activeDays: React.JSX.Element[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayNotes = notesOnDays(day);
    const dayEvents = eventsOnDays(day);
    const hasNotes = dayNotes.length > 0;
    const hasEvents = dayEvents.length > 0;
    
    const isSelected = selectedDate !== null &&
      selectedDate.getFullYear() === currentYear &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getDate() === day;

    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

    // Lunar conversion using solarLunar package
    let lunarText = '';
    let isTerm = false;
    try {
      const lunarInfo = solarLunar.solar2lunar(currentYear, currentMonth + 1, day);
      if (lunarInfo && typeof lunarInfo === 'object') {
        isTerm = !!(lunarInfo.isTerm && lunarInfo.term);
        lunarText = isTerm 
          ? lunarInfo.term 
          : (lunarInfo.lDay === 1 ? lunarInfo.monthCn : lunarInfo.dayCn);
      }
    } catch (err) {
      lunarText = '';
    }

    let dayClass = "aspect-square w-full text-xs font-sans font-semibold flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all relative py-1 focus:outline-none ";
    
    if (isSelected) {
      dayClass += "bg-slate-900 text-white font-extrabold shadow-sm scale-102 ";
    } else if (isToday) {
      dayClass += "border-2 border-slate-950 text-slate-1050 bg-slate-50 font-extrabold ";
    } else if (hasNotes) {
      dayClass += "bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 ";
    } else {
      dayClass += "text-slate-800 hover:bg-slate-50 ";
    }

    let lunarColorClass = isSelected ? "text-slate-350" : (isTerm ? "text-indigo-600 font-medium" : "text-gray-400 font-normal");

    activeDays.push(
      <button
        key={`day-${day}`}
        {...bindTouchTap(() => {
          if (isSelected) {
            onSelectDate(null);
          } else {
            onSelectDate(new Date(currentYear, currentMonth, day));
          }
        })}
        className={dayClass}
        title={`${dayNotes.length} Note(s), ${dayEvents.length} Event(s)`}
      >
        <span className="text-xs">{day}</span>
        {lunarText && (
          <span className={`text-[8px] tracking-tight truncate max-w-full scale-90 -mt-0.5 ${lunarColorClass}`}>
            {lunarText}
          </span>
        )}
        
        {/* Indicators Row */}
        <div className="absolute bottom-1 flex items-center justify-center space-x-0.5 w-full">
          {hasNotes && !isSelected && (
            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
          )}
          {hasEvents && (
            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>
          )}
        </div>
      </button>
    );
  }

  const totalDays = [...blankDays, ...activeDays];
  const weekdayShort = [
    t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')
  ];

  // Selected date events query
  const formattedSelectedDate = selectedDate ? formatDateStyle(selectedDate) : '';
  const selectedDayEvents = selectedDate 
    ? events.filter(e => e.date === formattedSelectedDate && !e.isDeleted)
    : [];

  const handleAddCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newEventTitle.trim()) return;

    const eventId = 'event_' + Math.random().toString(36).substring(2, 9);
    const newEvent: CalendarEvent = {
      id: eventId,
      date: formattedSelectedDate,
      title: newEventTitle.trim(),
      color: newEventColor,
      createdAt: Date.now(),
      isDeleted: false
    };

    onSaveEvent(newEvent);
    setNewEventTitle('');
  };

  const handleExportEvents = () => {
    const activeEvents = events.filter(e => !e.isDeleted);
    const blob = new Blob([JSON.stringify(activeEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-events-${formatDateStyle(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const handleImportEvents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && onImportEvents) {
          // simple validation
          const validEvents = parsed.filter(item => item.id && item.date && item.title);
          // deduplicate or just insert anew (overwrite by ID)
          if (validEvents.length > 0) {
            onImportEvents(validEvents);
          }
        }
      } catch (err) {
        console.error('Failed to parse calendar events file', err);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const colorMap: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  };

  return (
    <div className="space-y-4 font-sans">
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImportEvents} 
      />
      {/* 1. CALENDAR VIEW BLOCK */}
      <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              {lang === 'zh' ? '主权智能日历' : t('calendarHeader')}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              {...bindTouchTap(handleExportEvents)}
              className="text-gray-400 hover:text-slate-700 p-1 rounded transition flex items-center justify-center cursor-pointer"
              title={lang === 'zh' ? '导出纪念日' : 'Export Events'}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              {...bindTouchTap(() => fileInputRef.current?.click())}
              className="text-gray-400 hover:text-slate-700 p-1 rounded transition flex items-center justify-center cursor-pointer"
              title={lang === 'zh' ? '导入纪念日' : 'Import Events'}
            >
              <Upload className="w-4 h-4" />
            </button>
            {selectedDate && (
              <button
                {...bindTouchTap(() => onSelectDate(null))}
                className="text-[9.5px] uppercase font-black bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:text-slate-900 hover:bg-slate-150 transition duration-150 cursor-pointer flex items-center space-x-1 ml-2"
              >
                <span>{lang === 'zh' ? '清除筛选' : t('clearFilter')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 px-1">
          <button
            {...bindTouchTap(handlePrevMonth)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-550 hover:text-gray-900 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-gray-100 bg-slate-50/50"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs font-black text-slate-800">
            {t(monthKeys[currentMonth])} {currentYear}
          </span>
          <button
            {...bindTouchTap(handleNextMonth)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-550 hover:text-gray-900 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-gray-100 bg-slate-50/50"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {weekdayShort.map((day) => (
            <div key={`weekday-${day}`} className="text-[9px] font-black text-gray-400 font-sans uppercase">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
          {totalDays}
        </div>

        {/* Legend */}
        <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{lang === 'zh' ? '有笔记' : 'Notes'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>{lang === 'zh' ? '自定义日程' : 'Schedules'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded border border-slate-950 bg-slate-50"></span>
            <span>{lang === 'zh' ? '今天' : 'Today'}</span>
          </div>
        </div>
      </div>

      {/* 2. CUSTOM SCHEDULE EVENT MANAGER BLOCK (ONLY WHEN SELECTED) */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
                {lang === 'zh' ? '主权日程管家' : 'Custom Daily Calendar'}
              </span>
              <h4 className="text-xs font-bold text-slate-800 -mt-0.5">
                {formattedSelectedDate}
                {(() => {
                  try {
                    const l = solarLunar.solar2lunar(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate());
                    return <span className="ml-1.5 text-[10px] text-gray-400 font-bold">({l.monthCn}{l.dayCn})</span>;
                  } catch (e) {
                    return null;
                  }
                })()}
              </h4>
            </div>
          </div>

          {/* ACTIVE DISPATCHED EVENTS LIST */}
          <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((evt) => {
                const colors = colorMap[evt.color || 'indigo'] || colorMap.indigo;
                return (
                  <div
                    key={evt.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${colors.bg} ${colors.border} transition duration-150 group`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`}></span>
                      <p className={`text-xs font-bold truncate ${colors.text}`}>{evt.title}</p>
                    </div>
                    <button
                      {...bindTouchTap(() => onDeleteEvent(evt.id))}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white/80 transition cursor-pointer min-w-[30px] min-h-[30px] flex items-center justify-center"
                      title={lang === 'zh' ? '删除日程' : 'Delete event'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                <Clock className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                  {lang === 'zh' ? '今日无自定义日程安排' : 'No Custom Events Today'}
                </p>
              </div>
            )}
          </div>

          {/* INLINE ADD EVENT FORM */}
          <form onSubmit={handleAddCustomEvent} className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[9.5px] font-black uppercase text-slate-450 tracking-wider">
                {lang === 'zh' ? '新增自定义活动' : 'Add Custom Action'}
              </label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  required
                  placeholder={lang === 'zh' ? '日程标题 (如: 健身、开会...)' : 'Event Title...'}
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="flex-1 bg-slate-50 border border-gray-200 focus:border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="bg-slate-900 border border-slate-950 text-white font-black uppercase text-[10px] tracking-wider px-3.5 hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" />
                  {lang === 'zh' ? '添加' : 'Add'}
                </button>
              </div>
            </div>

            {/* COLOR BULLET PICKER */}
            <div className="flex items-center space-x-3 select-none">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {lang === 'zh' ? '标记颜色群:' : 'Color Category:'}
              </span>
              <div className="flex items-center space-x-2">
                {(['indigo', 'rose', 'emerald', 'amber'] as const).map((col) => {
                  const colors = colorMap[col];
                  const isActive = newEventColor === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      {...bindTouchTap(() => setNewEventColor(col))}
                      className={`w-5 h-5 rounded-full ${colors.dot} flex items-center justify-center transition border-2 cursor-pointer ${
                        isActive ? 'border-slate-950 ring-2 ring-indigo-100 ring-offset-1' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title={col}
                    >
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white font-bold"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
