"use client";

import { format, isToday, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, setMonth, setYear } from "date-fns";
import { sk } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  HelpCircle,
  Settings,
  ChevronDown,
  Plus,
  RefreshCw,
  Target,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { CalendarView } from "@/types/calendar";
import { useState, useRef, useEffect, useMemo } from "react";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreateClick?: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onlyDeals: boolean;
  onOnlyDealsToggle: () => void;
  highlightFree: boolean;
  onHighlightFreeToggle: () => void;
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
  onDateSelect?: (date: Date) => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onCreateClick,
  searchTerm,
  onSearchChange,
  onlyDeals,
  onOnlyDealsToggle,
  highlightFree,
  onHighlightFreeToggle,
  onSettingsClick,
  onSyncClick,
  onDateSelect,
}: CalendarHeaderProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const monthSelectorRef = useRef<HTMLDivElement>(null);
  const yearSelectorRef = useRef<HTMLDivElement>(null);
  const viewSelectorRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [pickerDate, setPickerDate] = useState(currentDate);
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);

  const views: { id: CalendarView; label: string; shortcut: string }[] = [
    { id: "day", label: "Deň", shortcut: "D" },
    { id: "workweek", label: "prac týždeň", shortcut: "P" },
    { id: "month", label: "Mesiac", shortcut: "M" },
    { id: "year", label: "Rok", shortcut: "Y" },
    { id: "week", label: "Týždeň", shortcut: "W" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setIsDatePickerOpen(false);
      }
      if (
        monthSelectorRef.current &&
        !monthSelectorRef.current.contains(event.target as Node)
      ) {
        setIsMonthSelectorOpen(false);
      }
      if (
        yearSelectorRef.current &&
        !yearSelectorRef.current.contains(event.target as Node)
      ) {
        setIsYearSelectorOpen(false);
      }
      if (
        viewSelectorRef.current &&
        !viewSelectorRef.current.contains(event.target as Node)
      ) {
        setIsViewSelectorOpen(false);
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll to active year when opened
  useEffect(() => {
    if (isYearSelectorOpen && yearSelectorRef.current) {
      setTimeout(() => {
        const activeYear = yearSelectorRef.current?.querySelector('[data-active="true"]');
        activeYear?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }, 50);
    }
  }, [isYearSelectorOpen]);

  const activeViewLabel = views.find((v) => v.id === view)?.label || "Mesiac";

  const isCurrentViewToday = useMemo(() => {
    const today = new Date();
    if (view === "month") return isSameMonth(currentDate, today);
    if (view === "year") return currentDate.getFullYear() === today.getFullYear();
    return isSameDay(currentDate, today);
  }, [currentDate, view]);

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-[#050507] backdrop-blur-xl border-b border-white/[0.03] shrink-0 relative z-50">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
              Kalendár
            </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 relative">
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => {
                  setPickerDate(currentDate);
                  setIsDatePickerOpen(!isDatePickerOpen);
                }}
                className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${isDatePickerOpen ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
                title="Vybrať dátum"
              >
                <CalendarIcon size={18} />
              </button>

              {isDatePickerOpen && (
                <div className="absolute left-0 mt-3 w-80 bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* Selectors */}
                  <div className="flex items-center gap-2 mb-6 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 relative">
                    {/* Month Selector */}
                    <div className="flex-1 relative" ref={monthSelectorRef}>
                      <button 
                        onClick={() => setIsMonthSelectorOpen(!isMonthSelectorOpen)}
                        className="w-full flex items-center justify-between bg-transparent text-[11px] font-black uppercase italic tracking-widest text-violet-400 outline-none cursor-pointer pl-3 pr-2 py-2"
                      >
                        <span className="truncate">{format(pickerDate, 'LLLL', { locale: sk })}</span>
                        <ChevronDown size={14} className={`text-violet-500 transition-transform duration-300 ${isMonthSelectorOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isMonthSelectorOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-2xl z-[110] py-2 max-h-64 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-top-2">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <button
                              key={`month-opt-${i}`}
                              onClick={() => {
                                setPickerDate(setMonth(pickerDate, i));
                                setIsMonthSelectorOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase italic tracking-widest transition-all ${
                                pickerDate.getMonth() === i 
                                  ? "bg-violet-500 text-white" 
                                  : "text-zinc-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              {format(new Date(2000, i, 1), 'LLLL', { locale: sk })}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="w-px h-4 bg-white/10" />

                    {/* Year Selector */}
                    <div className="flex-[0.8] relative" ref={yearSelectorRef}>
                      <button 
                        onClick={() => setIsYearSelectorOpen(!isYearSelectorOpen)}
                        className="w-full flex items-center justify-between bg-transparent text-[11px] font-black italic text-violet-400 outline-none cursor-pointer pl-3 pr-2 py-2"
                      >
                        <span>{pickerDate.getFullYear()}</span>
                        <ChevronDown size={14} className={`text-violet-500 transition-transform duration-300 ${isYearSelectorOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isYearSelectorOpen && (
                        <div className="absolute top-full right-0 mt-2 w-32 bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-2xl z-[110] py-2 max-h-64 overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-top-2">
                          {Array.from({ length: 41 }).map((_, i) => {
                            const year = 2006 + i;
                            return (
                              <button
                                key={`year-opt-${year}`}
                                data-active={pickerDate.getFullYear() === year}
                                onClick={() => {
                                  setPickerDate(setYear(pickerDate, year));
                                  setIsYearSelectorOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-[10px] font-black italic transition-all ${
                                  pickerDate.getFullYear() === year 
                                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" 
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                }`}
                              >
                                {year}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="space-y-4">
                    {/* Day Names Row - FLEX for robustness */}
                    <div className="flex items-center justify-between w-full mb-1">
                      {['P', 'U', 'S', 'Š', 'P', 'S', 'N'].map((d, i) => (
                        <div key={`lbl-${i}`} className="w-[calc(100%/7)] text-[10px] font-black text-violet-500 text-center py-1 uppercase italic opacity-70">{d}</div>
                      ))}
                    </div>

                    {/* Days Numbers Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const start = startOfWeek(startOfMonth(pickerDate), { weekStartsOn: 1 });
                        const end = endOfWeek(endOfMonth(pickerDate), { weekStartsOn: 1 });
                        const days = eachDayOfInterval({ start, end });
                        
                        return days.map(day => {
                          const isSel = isSameDay(day, currentDate);
                          const isCurMonth = isSameMonth(day, pickerDate);
                          const dayKey = `d-${day.getTime()}`;
                          return (
                            <button
                              key={dayKey}
                              onClick={() => {
                                onDateSelect?.(day);
                                setIsDatePickerOpen(false);
                              }}
                              className={`aspect-square flex items-center justify-center text-[11px] font-black rounded-xl transition-all duration-300
                                ${isSel ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.6)] scale-110 z-10' : 
                                  isCurMonth ? 'text-white hover:bg-white/10 hover:scale-105' : 'text-zinc-800 opacity-30'}
                              `}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onToday}
              className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                isCurrentViewToday
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_15px_rgba(124,58,237,0.1)]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
              }`}
              title="Dnes"
            >
              <Target size={18} />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              onClick={onPrev}
              className="p-2.5 hover:bg-violet-500/10 rounded-xl transition-all text-zinc-400 hover:text-violet-400 active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="p-2.5 hover:bg-violet-500/10 rounded-xl transition-all text-zinc-400 hover:text-violet-400 active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-xl font-black text-zinc-100 uppercase italic tracking-tight">
            {format(
              currentDate,
              view === "month" || view === "year"
                ? "LLLL yyyy"
                : "d. MMMM yyyy",
              { locale: sk },
            )}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-[#7c3aed]/10 text-violet-400 border border-[#7c3aed]/30 rounded-2xl hover:bg-[#7c3aed] hover:text-white hover:border-transparent hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-all active:scale-95 group overflow-hidden relative shadow-[0_0_15px_rgba(124,58,237,0.1)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={16} className="relative z-10" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic relative z-10 whitespace-nowrap">Poznámka</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/search:text-violet-500 transition-colors pointer-events-none" />
            <input 
              type="text"
              placeholder="Hľadať..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-white focus:bg-white/10 focus:border-violet-500/20 outline-none w-48 transition-all italic placeholder:text-zinc-700"
            />
          </div>
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-3 rounded-2xl transition-all text-zinc-500 hover:text-white group ${isSettingsOpen ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
            >
              <Settings size={20} className={`group-hover:rotate-45 transition-transform duration-500 ${isSettingsOpen ? 'rotate-45' : ''}`} />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-[#0a0a0c] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] py-2 p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-white/5 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Konfigurácia</p>
                </div>
                <button 
                  onClick={() => {
                    onSettingsClick?.();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left"
                >
                  <Settings size={14} className="opacity-40" />
                  Globálne nastavenia
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left group/sync"
                  onClick={() => {
                    onSyncClick?.();
                    setIsSettingsOpen(false);
                  }}
                >
                  <RefreshCw size={14} className="opacity-40 group-hover/sync:rotate-180 transition-transform duration-700" />
                  Synchronizovať dáta
                </button>
                <div className="h-px bg-white/5 my-2 mx-2" />
                <div className="px-4 py-2">
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest italic">Arcigy CRM v2.4</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={viewSelectorRef}>
          <button
            onClick={() => setIsViewSelectorOpen(!isViewSelectorOpen)}
            className="flex items-center gap-4 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10 rounded-2xl transition-all text-violet-400 min-w-[140px] justify-between shadow-[0_0_20px_rgba(139,92,246,0.05)]"
          >
            <span>{activeViewLabel}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isViewSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {isViewSelectorOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-[#0a0a0c] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] py-2 p-2 animate-in fade-in zoom-in-95 duration-200">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onViewChange(v.id);
                    setIsViewSelectorOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    view === v.id
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{v.label}</span>
                  <span className={`text-[9px] opacity-40 ${view === v.id ? 'text-white' : 'text-zinc-500'}`}>
                    {v.shortcut}
                  </span>
                </button>
              ))}
              <div className="h-px bg-white/5 my-2 mx-2" />
              <div className="px-2 py-2 space-y-1">
                <button 
                    onClick={onOnlyDealsToggle}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      onlyDeals ? 'text-violet-400 bg-violet-400/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                >
                  <span>Zobraziť len deally</span>
                  {onlyDeals && <div className="w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />}
                </button>
                 <button 
                    onClick={onHighlightFreeToggle}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      highlightFree ? 'text-violet-400 bg-violet-400/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                >
                  <span>Voľné sloty</span>
                  {highlightFree && <div className="w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />}
                </button>

                <div className="mt-4 pt-4 border-t border-white/5 px-2">
                  <div className="flex items-start gap-3 opacity-50">
                    <HelpCircle size={14} className="text-violet-400 mt-0.5 shrink-0" />
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black uppercase tracking-wider text-zinc-300">Ako to funguje?</p>
                      <p className="text-[8px] font-medium leading-relaxed text-zinc-500">
                        Systém automaticky zobrazuje deally a projekty z vášho CRM. Ak chcete v Google Kalendári označiť vlastnú biznis udalosť, pridajte do jej názvu <span className="text-violet-400 font-bold">#biznis</span> alebo <span className="text-violet-400 font-bold">#deal</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
