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
  // Show events for the next 30 days starting from currentDate
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
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center">
          <Clock size={32} />
        </div>
        <p className="text-sm font-medium">
          Žiadne naplánované udalosti v najbližších dňoch.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-12">
        {days.map((dayKey) => {
          const date = new Date(dayKey);
          const dayEvents = groupedEvents[dayKey];

          return (
            <div key={dayKey} className="flex gap-8">
              <div className="w-24 shrink-0 text-right">
                <div className="text-2xl font-medium text-gray-900 leading-none">
                  {format(date, "d")}
                </div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {format(date, "EEE", { locale: sk })}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full flex items-center gap-6 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 text-left group"
                  >
                    <div className="w-16 shrink-0 text-right">
                      <div className="text-xs font-bold text-gray-700">
                        {format(event.start, "HH:mm")}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {format(event.end, "HH:mm")}
                      </div>
                    </div>

                    <div
                      className="w-3 h-3 rounded-full border-2 border-white shadow-sm ring-2 ring-gray-100 shrink-0"
                      style={{
                        backgroundColor: event.color?.includes("bg-")
                          ? ""
                          : event.color || "#3B82F6",
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                        {event.title}
                      </h4>
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin size={12} />
                          <span className="truncate">{event.location}</span>
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
