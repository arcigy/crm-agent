"use client";

import { format, startOfWeek, endOfWeek, addDays, isSameDay, isWithinInterval } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

export function CalendarWidget({ events }: { events: any[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
        const bDate = b.start?.dateTime || b.start?.date;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
  }, [events, selectedDate]);

  const changeWeek = (amount: number) => {
    setSelectedDate(prev => addDays(prev, amount * 7));
  };

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Tento týždeň</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => changeWeek(-1)}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => changeWeek(1)}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-between mb-8 flex-shrink-0">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <button 
              key={i} 
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center group"
            >
              <span className={`text-[9px] uppercase font-black mb-2 transition-colors ${isSelected ? 'text-blue-500' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {format(day, "ee", { locale: sk })}
              </span>
              <div className={`
                w-9 h-9 flex items-center justify-center rounded-2xl text-xs font-black transition-all
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                  : isToday 
                    ? 'border-2 border-blue-600/30 text-blue-600' 
                    : 'hover:bg-muted text-foreground'
                }
              `}>
                {format(day, "d")}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto thin-scrollbar pr-2">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
          {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
        </div>
        
        {dailyEvents.map((event, i) => (
          <div key={i} className="relative pl-4 border-l-4 border-indigo-500 py-2 hover:bg-muted/30 transition-colors rounded-r-lg group">
            <p className="text-xs font-bold text-foreground leading-tight">{event.summary}</p>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[9px] font-black text-indigo-500 uppercase italic tracking-tighter bg-indigo-500/5 px-1.5 py-0.5 rounded">
                {event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Celý deň"}
              </span>
              {event.location && (
                <span className="text-[9px] text-muted-foreground truncate max-w-[150px] italic">
                  • {event.location}
                </span>
              )}
            </div>
          </div>
        ))}
        
        {dailyEvents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-6">
            <CalendarIcon className="w-8 h-8 mb-2" />
            <p className="text-[10px] font-bold italic uppercase tracking-widest">Žiadne udalosti</p>
          </div>
        )}
      </div>

      <a href="/dashboard/calendar" className="mt-4 text-center text-[10px] font-black text-indigo-600 uppercase italic hover:underline">
        Otvoriť kalendár
      </a>
    </div>
  );
}
