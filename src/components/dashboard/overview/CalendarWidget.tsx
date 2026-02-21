"use client";

import { format, startOfWeek, addDays, isSameDay, getISOWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

const SK_DAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function CalendarWidget({ events }: { events: any[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
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

  // Render nothing until component is mounted on the client
  if (!mounted) {
    return null;
  }

  return (
    <div className={`bg-indigo-50/30 dark:bg-indigo-950/20 backdrop-blur-2xl px-5 md:p-8 rounded-none md:rounded-[2.5rem] border-b md:border border-indigo-500/20 dark:border-indigo-500/20 md:dark:bg-indigo-950/10 md:border-indigo-500/10 md:dark:border-indigo-500/5 flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full py-5' : 'h-auto md:h-full py-4 md:py-8'}`}>
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20 transition-all duration-300 md:hidden" />
      
      {/* Header / Trigger */}
      {/* Header / Trigger */}
      <div 
        onClick={() => {
          if (window.innerWidth < 768) setIsExpanded(!isExpanded);
        }}
        className="flex items-center justify-between w-full md:cursor-default relative z-20 cursor-pointer md:cursor-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl md:bg-indigo-100 md:dark:bg-indigo-900/30 bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 md:border-indigo-500/20">
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
      </div>

      <div className={`flex-1 transition-all duration-500 ${isExpanded ? 'mt-6 opacity-100 block' : 'hidden md:block md:mt-6 opacity-0 md:opacity-100'}`}>
        <div className="md:hidden flex items-center justify-between mb-6 bg-white/30 dark:bg-zinc-800/20 p-2 rounded-2xl border border-black/5">
          <button onClick={() => changeWeek(-1)} className="p-2 text-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[10px] font-black uppercase text-foreground">{currentWeekNumber}. Týždeň</span>
          <button onClick={() => changeWeek(1)} className="p-2 text-foreground"><ChevronRight className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button key={i} onClick={() => setSelectedDate(day)} className="flex flex-col items-center group/day">
                <span className={`text-[9px] font-black mb-1.5 transition-colors tracking-widest ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover/day:text-zinc-600'}`}>{SK_DAYS[i]}</span>
                <div className={`w-9 h-9 flex items-center justify-center rounded-2xl text-[11px] font-black transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-110' : isToday ? 'border-2 border-indigo-600/30 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'bg-white/40 dark:bg-zinc-900/30 hover:bg-white text-zinc-600 border border-transparent hover:border-black/5'}`}>{format(day, "d")}</div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 overflow-y-auto thin-scrollbar pr-2 min-h-0 max-h-[300px]">
          {dailyEvents.length > 0 ? dailyEvents.map((event, i) => (
            <div key={i} className="group flex items-stretch gap-4 p-3 bg-white/60 dark:bg-zinc-900/40 rounded-[1.2rem] border border-white/40 dark:border-white/5 hover:bg-white hover:border-indigo-100 transition-all shadow-sm">
              <div className="flex flex-col items-center justify-center w-14 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                <span className="text-[12px] font-black text-indigo-900 dark:text-indigo-300 tracking-tight leading-none">{event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Celý deň"}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                <h4 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100 truncate leading-tight mb-1 group-hover:text-indigo-700 transition-colors">{cleanSummary(event.summary)}</h4>
                {event.description && <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate opacity-80">{cleanDescription(event.description)}</p>}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center text-center opacity-40 py-8">
               <div className="text-4xl mb-3 grayscale opacity-50">🎉</div>
               <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Voľný deň</p>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Žiadne plány</p>
            </div>
          )}
        </div>

        <a href="/dashboard/calendar" className="mt-4 text-center text-[10px] font-black text-indigo-400 hover:text-indigo-600 transition-colors uppercase italic tracking-widest relative z-10 flex items-center justify-center gap-2 group/link">
          Otvoriť Kalendár <ChevronRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
        </a>
      </div>
    </div>
  );
}
