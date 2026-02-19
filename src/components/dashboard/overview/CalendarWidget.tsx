"use client";

import { format, startOfWeek, addDays, isSameDay, getISOWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { SmartText } from "@/components/todo/SmartText";

const SK_DAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function CalendarWidget({ events }: { events: any[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const currentWeekNumber = getISOWeek(selectedDate);

  // Filter events: Keep only real calendar events (exclude CRM tasks), for selected day
  const dailyEvents = useMemo(() => {
    return events
      .filter((event) => {
        // Filter out tasks from Todo list
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

  // Robust text cleaning using Regex (works on server & client)
  const cleanSummary = (text: string) => {
    if (!text) return "Bez názvu";
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/^\[.*?\]\s*/g, '') // Remove [Tags]
      .replace(/^(TASK|TODO|ID|📝\s*TODO):\s*/i, '') // Remove prefixes and emojis
      .replace(/📝/g, '') // Remove standalone emoji
      .trim();
  };

  const cleanDescription = (text: string) => {
    if (!text) return "";
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  return (
    <div className="bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-2xl p-4 md:p-7 rounded-[2.5rem] border border-indigo-500/10 dark:border-indigo-500/5 flex flex-col h-full w-full overflow-hidden relative group transition-all duration-300">
      {/* 1. Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} 
      />

      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20 transition-all duration-300" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0 relative z-10">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-indigo-950 dark:text-indigo-100">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          Kalendár
        </h3>
        <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-800/50 p-1 rounded-xl backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-sm">
          <button 
            onClick={() => changeWeek(-1)}
            className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <span className="text-[10px] font-black uppercase italic px-2 text-zinc-500 min-w-[70px] text-center tracking-tight">
            {currentWeekNumber}. Týždeň
          </span>
          <button 
            onClick={() => changeWeek(1)}
            className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-95"
          >
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Days strip */}
      <div className="grid grid-cols-7 gap-1.5 mb-6 flex-shrink-0 relative z-10">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <button 
              key={i} 
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center group/day relative"
            >
              <span className={`text-[9px] font-black mb-1.5 transition-colors tracking-widest ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 group-hover/day:text-zinc-600'}`}>
                {SK_DAYS[i]}
              </span>
              <div className={`
                w-9 h-9 flex items-center justify-center rounded-2xl text-[11px] font-black transition-all duration-200
                ${isSelected 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-110' 
                  : isToday 
                    ? 'border-2 border-indigo-600/30 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' 
                    : 'bg-white/40 dark:bg-zinc-900/30 hover:bg-white text-zinc-600 border border-transparent hover:border-black/5'
                }
              `}>
                {format(day, "d")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Events list */}
      <div className="flex-1 space-y-2 overflow-y-auto thin-scrollbar pr-2 min-h-0 relative z-10">
        <div className="flex items-center gap-3 mb-4 px-1 opacity-70">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
            {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
        </div>
        
        {dailyEvents.length > 0 ? (
          dailyEvents.map((event, i) => {
            const summary = cleanSummary(event.summary);
            const description = cleanDescription(event.description);
            const startTime = event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Celý deň";

            return (
              <div key={i} className="group flex items-stretch gap-4 p-3 bg-white/60 dark:bg-zinc-900/40 rounded-[1.2rem] border border-white/40 dark:border-white/5 hover:bg-white hover:border-indigo-100 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                {/* Time Column */}
                <div className="flex flex-col items-center justify-center w-14 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                  <span className="text-[12px] font-black text-indigo-900 dark:text-indigo-300 tracking-tight leading-none">
                    {startTime}
                  </span>
                </div>
                
                {/* Content Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                  <h4 className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100 truncate leading-tight mb-1 group-hover:text-indigo-700 transition-colors">
                    {summary}
                  </h4>
                  {description && (
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate opacity-80 group-hover:opacity-100 transition-opacity">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-8 min-h-[150px]">
             <div className="text-4xl mb-3 grayscale opacity-50">🎉</div>
             <div>
               <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Voľný deň</p>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Žiadne plány v kalendári</p>
             </div>
          </div>
        )}
      </div>

      <a href="/dashboard/calendar" className="mt-4 text-center text-[10px] font-black text-indigo-400 hover:text-indigo-600 transition-colors uppercase italic tracking-widest relative z-10 flex items-center justify-center gap-2 group/link">
        Otvoriť Kalendár <ChevronRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
      </a>
    </div>
  );
}
