"use client";

import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

const SK_DAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function CalendarWidget({ events }: { events: any[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
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
    <div className="bg-card p-6 md:p-7 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full overflow-hidden">
      {/* Header aligned same as others */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Kalendár</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => changeWeek(-1)}
            className="p-1.5 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button 
            onClick={() => changeWeek(1)}
            className="p-1.5 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Days strip - smaller & with custom labels */}
      <div className="grid grid-cols-7 gap-1 mb-6 flex-shrink-0">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <button 
              key={i} 
              onClick={() => setSelectedDate(day)}
              className="flex flex-col items-center group relative"
            >
              <span className={`text-[9px] font-black mb-1.5 transition-colors ${isSelected ? 'text-blue-500' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {SK_DAYS[i]}
              </span>
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-xl text-[11px] font-black transition-all
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
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

      {/* Events list - optimized for more content */}
      <div className="flex-1 space-y-2 overflow-y-auto thin-scrollbar pr-2 min-h-0">
        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1 opacity-80">
          📍 {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
        </div>
        
        {dailyEvents.map((event, i) => (
          <div key={i} className="relative pl-3 border-l-4 border-indigo-500/50 py-1.5 hover:bg-muted/30 transition-colors rounded-r-xl group flex flex-col gap-0.5">
            <p className="text-[11px] font-black text-foreground leading-tight">{event.summary}</p>
            <div className="flex items-center gap-1.5">
               <span className="text-[8px] font-black text-indigo-500 uppercase italic tracking-tighter bg-indigo-500/5 px-1 py-0.5 rounded leading-none">
                {event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Celý deň"}
              </span>
              {event.location && (
                <span className="text-[8px] text-muted-foreground truncate max-w-[120px] font-medium">
                  {event.location}
                </span>
              )}
            </div>
          </div>
        ))}
        
        {dailyEvents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-4">
            <CalendarIcon className="w-6 h-6 mb-1.5" />
            <p className="text-[9px] font-bold italic uppercase tracking-widest leading-none">Žiadne udalosti</p>
          </div>
        )}
      </div>

      <a href="/dashboard/calendar" className="mt-4 text-center text-[9px] font-black text-indigo-600/60 uppercase italic hover:text-indigo-600 transition-colors">
        Otvoriť celý kalendár
      </a>
    </div>
  );
}
