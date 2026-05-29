/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { Note } from '../types';
import { Language } from '../utils/i18n';
import { bindTouchTap } from '../utils/touchUtils';

interface CalendarPanelProps {
  notes: Note[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  lang: Language;
  t: (key: any) => string;
}

export function CalendarPanel({ notes, selectedDate, onSelectDate, lang, t }: CalendarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // First day of week index (0 = Sunday, 1 = Monday...)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Highlight days possessing active notes
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

  // Month translatable keys mappings
  const monthKeys: any[] = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];

  // Calendar render loops - Target 44x44px sizes for touch points
  const blankDays: React.JSX.Element[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    blankDays.push(
      <div key={`blank-${i}`} className="h-11 w-11" />
    );
  }

  const activeDays: React.JSX.Element[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayNotes = notesOnDays(day);
    const hasNotes = dayNotes.length > 0;
    
    const isSelected = selectedDate !== null &&
      selectedDate.getFullYear() === currentYear &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getDate() === day;

    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

    let dayClass = "h-11 w-11 text-xs font-sans font-semibold flex items-center justify-center rounded-xl cursor-pointer transition-all relative ";
    if (isSelected) {
      dayClass += "bg-slate-900 text-white font-extrabold shadow-md scale-102 ";
    } else if (isToday) {
      dayClass += "border-2 border-slate-950 text-slate-950 bg-slate-50 font-bold ";
    } else if (hasNotes) {
      dayClass += "bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 ";
    } else {
      dayClass += "text-gray-650 hover:bg-gray-100 ";
    }

    activeDays.push(
      <button
        key={`day-${day}`}
        {...bindTouchTap(() => {
          if (isSelected) {
            onSelectDate(null); // Clear toggle
          } else {
            onSelectDate(new Date(currentYear, currentMonth, day));
          }
        })}
        className={dayClass}
        title={hasNotes ? `${dayNotes.length} Note(s)` : undefined}
      >
        <span>{day}</span>
        {hasNotes && !isSelected && (
          <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        )}
      </button>
    );
  }

  const totalDays = [...blankDays, ...activeDays];
  const weekdayShort = [
    t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm font-sans">
      <div className="flex justify-between items-center mb-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">{t('calendarHeader')}</h3>
        </div>
        {selectedDate && (
          <button
            {...bindTouchTap(() => onSelectDate(null))}
            className="text-[10px] uppercase font-bold bg-slate-55 text-slate-500 px-3 py-1.5 rounded-xl border border-gray-150 hover:text-slate-900 hover:bg-slate-100 transition duration-150 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            {t('clearFilter')}
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mb-3 px-1">
        <button
          {...bindTouchTap(handlePrevMonth)}
          className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-550 hover:text-gray-900 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-slate-705" />
        </button>
        <span className="text-xs font-bold text-slate-800">
          {t(monthKeys[currentMonth])} {currentYear}
        </span>
        <button
          {...bindTouchTap(handleNextMonth)}
          className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-550 hover:text-gray-900 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 text-slate-705" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {weekdayShort.map((day) => (
          <div key={`weekday-${day}`} className="text-[10px] font-bold text-gray-400 font-sans uppercase">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center justify-items-center">
        {totalDays}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
          <span>{lang === 'zh' ? '有笔记' : 'Has Notes'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-slate-900"></span>
          <span>{lang === 'zh' ? '已选中' : 'Selected'}</span>
        </div>
      </div>
    </div>
  );
}
