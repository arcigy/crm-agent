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

  // Extract helper function outside or use it inside render
  const cleanSummary = (text: string) => {
    return text || "Bez názvu";
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
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20 transition-all duration-700" />
      
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
        
        {dailyEvents.length > 0 ? (
          dailyEvents.map((event, i) => {
            const summary = cleanSummary(event.summary);
            const startTime = event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Celý deň";

            return (
              <div key={i} className="group flex items-center gap-3 p-3 bg-white/60 dark:bg-zinc-900/40 rounded-2xl border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
                    {startTime.split(':')[0]}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-300 leading-none">
                    {startTime.split(':')[1] || '00'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate leading-tight mb-0.5 group-hover:text-indigo-600 transition-colors">
                    {summary}
                  </h4>
                  <p className="text-[10px] font-medium text-muted-foreground truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/50 inline-block" />
                    {event.description || "Udalosť z kalendára"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-8 space-y-3">
             <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
             </div>
             <div>
               <p className="text-sm font-bold text-foreground">Žiadne plány</p>
               <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Užívajte si voľno</p>
             </div>
          </div>
        )}
      </div>

      <a href="/dashboard/calendar" className="mt-4 text-center text-[10px] font-black text-indigo-600/50 hover:text-blue-500 transition-colors uppercase italic tracking-widest relative z-10">
        Kalendár →
      </a>
    </div>
  );
}
