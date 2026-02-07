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

  // Filter events for the selected day
  const dailyEvents = useMemo(() => {
    return events
      .filter((event) => {
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

  // Helper to clean "code-like" prefixes
  const cleanSummary = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^\[TODO\]\s*/i, "")
      .replace(/^TASK:\s*/i, "")
      .replace(/ID:\s*[a-z0-9-]+\s*\|\s*/i, "")
      .trim();
  };

  return (
    <div className="bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-2xl p-6 md:p-7 rounded-[2.5rem] border border-indigo-500/10 dark:border-indigo-500/5 flex flex-col h-full w-full overflow-hidden relative group transition-all duration-500">
      {/* 1. Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} 
      />

      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 relative z-10">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Kalendár</h3>
        <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-800/50 p-1 rounded-xl backdrop-blur-sm border border-black/5 dark:border-white/5">
          <button 
            onClick={() => changeWeek(-1)}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-[10px] font-black uppercase italic px-2 text-muted-foreground min-w-[70px] text-center tracking-tight">
            {currentWeekNumber}. Týždeň
          </span>
          <button 
            onClick={() => changeWeek(1)}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
              <span className={`text-[9px] font-black mb-1.5 transition-colors tracking-widest ${isSelected ? 'text-blue-500' : 'text-muted-foreground group-hover/day:text-foreground'}`}>
                {SK_DAYS[i]}
              </span>
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-xl text-[11px] font-black transition-all
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400/20' 
                  : isToday 
                    ? 'border-2 border-blue-600/30 text-blue-600 bg-blue-500/5' 
                    : 'bg-white/60 dark:bg-zinc-900/40 hover:bg-muted text-foreground border border-black/5 dark:border-white/5'
                }
              `}>
                {format(day, "d")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Events list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto thin-scrollbar pr-2 min-h-0 relative z-10">
        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 px-1 opacity-70">
          {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
        </div>
        
        {dailyEvents.map((event, i) => {
          const summary = cleanSummary(event.summary);
          const time = event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Udalosť";

          return (
            <div key={i} className="relative pl-3 border-l-4 border-indigo-500/50 py-2 bg-white/40 dark:bg-zinc-900/30 hover:bg-white/70 dark:hover:bg-zinc-800/60 transition-all rounded-r-2xl group/event mb-1.5 border border-black/5 dark:border-white/5 group flex items-baseline gap-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase italic tracking-tighter bg-indigo-500/10 px-1.5 py-0.5 rounded leading-none flex-shrink-0">
                {time}
              </span>
              <span className="text-zinc-400 text-[10px] font-black leading-none opacity-40">:</span>
              <div className="text-[13px] font-black text-foreground leading-none tracking-tight truncate flex-1">
                 <SmartText text={summary} />
              </div>
            </div>
          );
        })}
        
        {dailyEvents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-8">
            <CalendarIcon className="w-8 h-8 mb-3 text-muted-foreground" />
            <p className="text-[10px] font-black italic uppercase tracking-widest leading-none">Žiadne udalosti</p>
          </div>
        )}
      </div>

      <a href="/dashboard/calendar" className="mt-4 text-center text-[10px] font-black text-indigo-600/50 hover:text-blue-500 transition-colors uppercase italic tracking-widest relative z-10">
        Kalendár →
      </a>
    </div>
  );
}
