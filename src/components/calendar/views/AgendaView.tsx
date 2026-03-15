"use client";

import {
  format,
  isSameDay,
  addDays,
  startOfDay,
  isAfter,
  isBefore,
  endOfDay,
} from "date-fns";
import { sk } from "date-fns/locale";
import { CalendarEvent } from "@/types/calendar";
import { MapPin, Clock } from "lucide-react";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function AgendaView({
  currentDate,
  events,
  onEventClick,
}: AgendaViewProps) {
  const startDate = startOfDay(currentDate);
  const endDate = addDays(startDate, 30);

  const relevantEvents = events
    .filter((e) => isAfter(e.start, startDate) || isSameDay(e.start, startDate))
    .filter((e) => isBefore(e.start, endDate))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const groupedEvents: Record<string, CalendarEvent[]> = {};
  relevantEvents.forEach((e) => {
    const key = format(e.start, "yyyy-MM-dd");
    if (!groupedEvents[key]) groupedEvents[key] = [];
    groupedEvents[key].push(e);
  });

  const days = Object.keys(groupedEvents).sort();

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-6">
        <div className="w-20 h-20 bg-violet-500/5 border border-violet-500/10 rounded-[2rem] flex items-center justify-center shadow-inner">
          <Clock size={40} className="text-violet-500/40" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] italic">
          Žiadne plánované udalosti.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#050507] p-10 scrollbar-hide scroll-smooth">
      <div className="max-w-3xl mx-auto space-y-16">
        {days.map((dayKey) => {
          const date = new Date(dayKey);
          const dayEvents = groupedEvents[dayKey];

          return (
            <div key={dayKey} className="flex gap-12 group">
              <div className="w-24 shrink-0 text-right pt-2">
                <div className="text-4xl font-black text-white leading-none italic">
                  {format(date, "d")}
                </div>
                <div className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] mt-3 italic">
                  {format(date, "EEEE", { locale: sk })}
                </div>
              </div>

              <div className="flex-1 space-y-6">
                {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="w-full flex items-center gap-8 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-[#7c3aed]/5 hover:border-[#7c3aed]/30 transition-all duration-500 text-left group/card relative overflow-hidden shadow-2xl"
                    >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    
                    <div className="w-20 shrink-0 text-right relative z-10">
                      <div className="text-[11px] font-black text-white italic tracking-widest">
                        {format(event.start, "HH:mm")}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-bold mt-1 tabular-nums">
                        {format(event.end, "HH:mm")}
                      </div>
                    </div>

                    <div
                      className={`w-1.5 h-12 rounded-full relative z-10 shadow-[0_0_15px_rgba(139,92,246,0.5)] ${
                        event.color || "bg-violet-600"
                      }`}
                    />

                    <div className="flex-1 min-w-0 relative z-10">
                      <h4 className="text-[13px] font-black text-zinc-100 mb-2 group-hover/card:text-white group-hover/card:italic transition-all truncate uppercase tracking-tight">
                        {event.title}
                      </h4>
                      {event.location && (
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          <MapPin size={12} className="text-violet-500" />
                          <span className="truncate italic">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

