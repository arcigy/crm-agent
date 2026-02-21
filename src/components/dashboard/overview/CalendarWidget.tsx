"use client";

import { format, startOfWeek, addDays, isSameDay, getISOWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";

const SK_DAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function CalendarWidget({ events }: { events: any[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const currentWeekNumber = getISOWeek(selectedDate);

  // Filter events: Keep only real calendar events (exclude CRM tasks), for selected day
  const dailyEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (event.extendedProperties?.private?.type === 'task') return false;
        if (event.summary?.includes('📝 TODO:')) return false;

        const eventDate = event.start?.dateTime || event.start?.date;
        if (!eventDate) return false;
        return isSameDay(new Date(eventDate), selectedDate);
      })
      .sort((a, b) => {
        const aDate = a.start?.dateTime || a.start?.date;
        const bDate = b.start?.date || b.start?.dateTime; 
        return new Date(aDate).getTime() - new Date(bDate || 0).getTime();
      });
  }, [events, selectedDate]);

  const changeWeek = (amount: number) => {
    setSelectedDate(prev => addDays(prev, amount * 7));
  };

  const cleanSummary = (text: string) => {
    if (!text) return "Bez názvu";
    return text
      .replace(/<[^>]*>/g, '') 
      .replace(/^\[.*?\]\s*/g, '') 
      .replace(/^(TASK|TODO|ID|📝\s*TODO):\s*/i, '') 
      .replace(/📝/g, '') 
      .trim();
  };

  const cleanDescription = (text: string) => {
    if (!text) return "";
    return text
      .replace(/<[^>]*>/g, '') 
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  return (
    <div className={`bg-[#f8faff] dark:bg-zinc-950/40 backdrop-blur-2xl px-4 md:p-6 rounded-[2rem] m-3 md:m-0 border border-black/5 md:border-black/[0.08] dark:border-white/[0.05] md:dark:border-white/[0.08] md:bg-white md:dark:bg-zinc-900/60 md:backdrop-blur-xl flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full py-5' : 'h-auto md:h-full py-4 md:py-6'}`}>
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20 transition-all duration-300 md:hidden" />
      
      {/* Header / Trigger */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full md:cursor-default relative z-20"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:bg-indigo-100 md:dark:bg-indigo-900/30 bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 md:border-indigo-500/20">
            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex flex-col items-start text-left">
            <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">Kalendár</h3>
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest md:hidden opacity-60">Dnešné plány a udalosti</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* External Link only visible on desktop or when expanded */}
          <div className={`${isExpanded ? 'flex' : 'hidden'} md:flex items-center gap-3`}>
            <Link 
              href="/dashboard/calendar"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600/20 transition-colors md:hidden"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className={`w-5 h-5 flex items-center justify-center transition-all duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`}>
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        
        {/* Desktop Weekly Navigation */}
        <div className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-zinc-800/50 p-1 rounded-xl backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-sm">
          <button onClick={(e) => { e.stopPropagation(); changeWeek(-1); }} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-95 text-zinc-600 dark:text-zinc-400"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-black uppercase italic px-2 text-zinc-500 min-w-[70px] text-center tracking-tight">{currentWeekNumber}. Týždeň</span>
          <button onClick={(e) => { e.stopPropagation(); changeWeek(1); }} className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-95 text-zinc-600 dark:text-zinc-400"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      </button>

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ${isExpanded ? 'mt-6 opacity-100 flex' : 'hidden md:flex md:mt-6 opacity-0 md:opacity-100'}`}>
        <div className="md:hidden flex items-center justify-between mb-4 px-1">
          <div className="flex flex-col">
            <span className="text-xl font-black text-indigo-950 dark:text-white leading-none tracking-tight">
              {format(selectedDate, "d. MMMM", { locale: sk })}
            </span>
            <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em] mt-1 italic">
               {currentWeekNumber}. Týždeň
            </span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => changeWeek(-1)} className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-black/5 shadow-sm active:scale-90 transition-all"><ChevronLeft className="w-4 h-4 text-zinc-600" /></button>
            <button onClick={() => changeWeek(1)} className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-black/5 shadow-sm active:scale-90 transition-all"><ChevronRight className="w-4 h-4 text-zinc-600" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-6 flex-shrink-0 md:bg-white/50 md:dark:bg-zinc-900/30 md:p-1.5 md:rounded-2xl md:border md:border-black/5 md:dark:border-white/5">
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button key={i} onClick={() => setSelectedDate(day)} className="flex flex-col items-center group/day pt-1 pb-2">
                <span className={`text-[8px] md:text-[8px] font-black mb-1.5 transition-colors tracking-widest uppercase ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>{SK_DAYS[i]}</span>
                <div className={`w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded-xl text-sm md:text-[10px] font-black transition-all duration-300 ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : isToday ? 'text-indigo-600 font-bold border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-zinc-600 hover:bg-black/5'}`}>{format(day, "d")}</div>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar pr-1 md:pr-2 relative">
          <div className="space-y-5 md:space-y-1.5 pt-1">
          {dailyEvents.length > 0 ? dailyEvents.map((event, i) => (
            <div key={i} className="flex gap-4 md:gap-3 group items-start md:items-stretch">
              {/* Time Column - iOS Style */}
              <div className="flex flex-col items-end md:items-center justify-start pt-1.5 min-w-[45px] md:w-12 flex-shrink-0">
                <span className="text-sm md:text-[11px] font-black text-indigo-950 dark:text-zinc-100 md:text-indigo-900 md:dark:text-indigo-300 leading-none mb-0.5">
                  {event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "00:00"}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter md:hidden opacity-60">
                  {event.end?.dateTime ? format(new Date(event.end.dateTime), "HH:mm") : ""}
                </span>
              </div>

              {/* Event Card */}
              <div className="flex-1 bg-white dark:bg-zinc-900 md:bg-white dark:md:bg-zinc-900/40 p-4 md:p-2.5 rounded-[1.25rem] md:rounded-xl border border-black/[0.1] md:border-white/40 dark:border-white/[0.03] shadow-sm active:scale-[0.97] transition-all flex border-l-[6px] border-l-indigo-600 md:border-l">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] md:text-[12px] font-black text-zinc-900 dark:text-zinc-100 truncate leading-tight mb-1">{cleanSummary(event.summary)}</h4>
                  {event.description && <p className="text-[11px] md:text-[9px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1 opacity-80 italic lowercase">{cleanDescription(event.description)}</p>}
                </div>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center text-center opacity-40 py-6">
               <div className="text-4xl mb-3 grayscale opacity-50">🎉</div>
               <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Voľný deň</p>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Žiadne plány</p>
            </div>
          )}
        </div>
      </div>

        <a href="/dashboard/calendar" className="mt-4 text-center text-[10px] font-black text-indigo-400 hover:text-indigo-600 transition-colors uppercase italic tracking-widest relative z-10 flex items-center justify-center gap-2 group/link">
          Otvoriť Kalendár <ChevronRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
        </a>
      </div>
    </div>
  );
}
