"use client";

import { format, startOfWeek, endOfWeek, addDays, isSameDay, isWithinInterval } from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

export function CalendarWidget({ events }: { events: any[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter events strictly for this week
  const weekEvents = events
    .filter((event) => {
      const eventDate = event.start?.dateTime || event.start?.date;
      if (!eventDate) return false;
      return isWithinInterval(new Date(eventDate), { start: weekStart, end: weekEnd });
    })
    .sort((a, b) => {
      const aDate = a.start?.dateTime || a.start?.date;
      const bDate = b.start?.dateTime || b.start?.date;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Tento týždeň</h3>
        <CalendarIcon className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="flex justify-between mb-8">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-black text-muted-foreground mb-2">
                {format(day, "ee", { locale: sk })}
              </span>
              <div className={`w-10 h-10 flex items-center justify-center rounded-2xl text-xs font-black transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : 'hover:bg-muted text-foreground'}`}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 space-y-4 overflow-auto thin-scrollbar pr-2">
        {weekEvents.slice(0, 5).map((event, i) => (
          <div key={i} className="relative pl-4 border-l-4 border-indigo-500 py-1 hover:bg-muted/30 transition-colors rounded-r-lg">
            <p className="text-xs font-black text-foreground truncate">{event.summary}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase italic tracking-widest mt-0.5">
              {event.start?.dateTime ? format(new Date(event.start.dateTime), "HH:mm") : "Celý deň"} 
              {event.start?.dateTime && ` • ${format(new Date(event.start.dateTime), "eeee", { locale: sk })}`}
            </p>
          </div>
        ))}
        {weekEvents.length === 0 && (
          <p className="text-center text-xs text-muted-foreground italic py-10">Žiadne udalosti tento týždeň</p>
        )}
      </div>

      <a href="/dashboard/calendar" className="mt-4 text-center text-xs font-black text-indigo-600 uppercase italic hover:underline">
        Otvoriť kalendár
      </a>
    </div>
  );
}
