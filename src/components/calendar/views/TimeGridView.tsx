"use client";

import {
  format,
  isSameDay,
  isToday,
} from "date-fns";
import { sk } from "date-fns/locale";
import { CalendarEvent } from "@/types/calendar";
import { useState, useEffect, useRef } from "react";

interface TimeGridViewProps {
  days: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function TimeGridView({
  days,
  events,
  onEventClick,
}: TimeGridViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    // Auto-scroll to current time (e.g. 8 AM or current hour)
    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours();
      const scrollPos = Math.max(0, (currentHour - 2) * 80); // Scroll to 2 hours before current
      scrollContainerRef.current.scrollTop = scrollPos;
    }

    return () => clearInterval(timer);
  }, []);

  const getTimeLinePosition = () => {
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    return (h + m / 60) * 80;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#09090b]">
      {/* Header */}
      <div className="flex bg-white dark:bg-[#09090b] border-b border-gray-200 dark:border-white/10 shrink-0 pr-4">
        <div className="w-16 sm:w-20 border-r border-gray-200 dark:border-white/10 shrink-0" />
        {days.map((day) => (
          <div
            key={day.toString()}
            className="flex-1 py-4 text-center border-r border-gray-100 dark:border-white/5 last:border-r-0"
          >
            <div
              className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                isToday(day) ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-zinc-500"
              }`}
            >
              {format(day, "EEE", { locale: sk })}
            </div>
            <div
              className={`text-2xl font-black inline-flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                isToday(day) ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "text-gray-700 dark:text-white"
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto relative scrollbar-hide"
        ref={scrollContainerRef}
      >
        <div className="flex min-h-fit">
          {/* Time labels */}
          <div className="w-16 sm:w-20 bg-white dark:bg-[#09090b] border-r border-gray-200 dark:border-white/10 shrink-0">
            {hours.map((hour) => (
              <div key={hour} className="h-20 relative">
                <span className="absolute -top-2 right-2 text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase">
                  {hour > 0 ? `${hour} ${hour >= 12 ? "PM" : "AM"}` : ""}
                </span>
                <div className="absolute top-0 right-0 w-2 h-[1px] bg-gray-200 dark:bg-white/10" />
              </div>
            ))}
          </div>

          {/* Columns */}
          <div className="flex-1 flex relative">
            {days.map((day) => (
              <div
                key={day.toString()}
                className={`flex-1 border-r border-gray-100 dark:border-white/5 last:border-r-0 relative min-h-[1920px] ${
                  isToday(day) ? "bg-purple-50/30 dark:bg-purple-900/5" : ""
                }`}
              >
                {/* Horizontal grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 border-b border-gray-100 dark:border-white/5 last:border-b-0"
                  />
                ))}

                {/* Current time indicator */}
                {isToday(day) && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                    style={{ top: `${getTimeLinePosition()}px` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-purple-500 -ml-1.5 shadow-sm" />
                    <div className="flex-1 h-[2px] bg-purple-500" />
                  </div>
                )}

                {/* Events */}
                {events
                  .filter((e) => isSameDay(e.start, day) && !e.allDay)
                  .map((event) => {
                    const startHour = event.start.getHours();
                    const startMin = event.start.getMinutes();
                    const durationHrs =
                      (event.end.getTime() - event.start.getTime()) /
                      (1000 * 60 * 60);

                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`absolute left-1 right-1 border rounded-xl p-3 text-xs shadow-sm overflow-hidden z-20 transition-all text-left flex flex-col gap-1 hover:shadow-lg hover:z-40 active:scale-[0.98] ${
                          !event.color || !event.color.startsWith("bg-")
                            ? "bg-purple-600/90 border-purple-400 text-white"
                            : event.color
                        }`}
                        style={{
                          top: `${(startHour + startMin / 60) * 80 + 2}px`,
                          height: `${Math.max(durationHrs * 80 - 4, 28)}px`,
                          backgroundColor:
                            event.color && !event.color.startsWith("bg-")
                              ? event.color
                              : undefined,
                        }}
                      >
                        <div className="font-black truncate text-[12px] leading-tight">
                          {event.title}
                        </div>
                        {durationHrs > 0.4 && (
                          <div className="text-[10px] opacity-90 font-bold tracking-tight">
                            {format(event.start, "HH:mm")} -{" "}
                            {format(event.end, "HH:mm")}
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
