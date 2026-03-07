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
  onDateClick?: (date: Date) => void;
}

export function TimeGridView({
  days,
  events,
  onEventClick,
  onDateClick,
}: TimeGridViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    if (scrollContainerRef.current) {
      const currentHour = new Date().getHours();
      const scrollPos = Math.max(0, (currentHour - 2) * 80);
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
    <div className="flex flex-col h-full overflow-hidden bg-[#050507]">
      {/* Header */}
      <div className="flex bg-[#050507] backdrop-blur-xl border-b border-white/[0.03] shrink-0 pr-[6px]">
        <div className="w-16 sm:w-24 border-r border-white/[0.03] shrink-0" />
        {days.map((day) => (
          <div
            key={day.toString()}
            className="flex-1 py-6 text-center border-r border-white/[0.03] last:border-r-0"
          >
            <div
              className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 italic ${
                isToday(day) ? "text-[#7c3aed]" : "text-zinc-500"
              }`}
            >
              {format(day, "EEEE", { locale: sk })}
            </div>
            <div
              className={`text-[18px] font-black inline-flex items-center justify-center w-12 h-12 rounded-full transition-all duration-500 leading-none ${
                isToday(day) 
                  ? "bg-[#7c3aed] text-white shadow-[0_0_25px_rgba(124,58,237,0.8)] scale-110" 
                  : "text-zinc-200 hover:text-white"
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto relative thin-scrollbar"
        ref={scrollContainerRef}
      >
        <div className="flex min-h-fit">
          {/* Time labels */}
          <div className="w-16 sm:w-24 bg-[#050507] border-r border-white/[0.03] shrink-0 z-20">
            {hours.map((hour) => (
              <div key={hour} className="h-20 relative">
                <span className="absolute top-0 right-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">
                  {hour > 0 ? `${hour}:00` : ""}
                </span>
                <div className="absolute top-0 right-0 w-3 h-[1px] bg-white/5" />
              </div>
            ))}
          </div>

          {/* Columns */}
          <div className="flex-1 flex relative">
            {days.map((day) => (
              <div
                key={day.toString()}
                className={`flex-1 border-r border-white/[0.03] last:border-r-0 relative min-h-[1920px] transition-colors duration-500 cursor-pointer ${
                  isToday(day) ? "bg-violet-500/[0.02]" : "hover:bg-white/[0.01]"
                }`}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const hour = Math.floor(y / 80);
                    const clickedDate = new Date(day);
                    clickedDate.setHours(hour, 0, 0, 0);
                    onDateClick?.(clickedDate);
                  }
                }}
              >
                {/* Horizontal grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 border-b border-white/[0.03] last:border-b-0"
                  />
                ))}

                {/* Current time indicator */}
                {isToday(day) && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                    style={{ top: `${getTimeLinePosition()}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500 -ml-[5px] shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
                    <div className="flex-1 h-[1px] bg-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]" />
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
                        className={`absolute left-1 right-1 rounded-xl p-3 text-[10px] sm:text-[11px] overflow-hidden z-20 transition-all text-left flex flex-col gap-1.5 hover:z-40 group/event shadow-[0_4px_15px_rgba(0,0,0,0.15)] border backdrop-blur-md bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20 hover:border-zinc-500/30 hover:text-zinc-200 hover:translate-y-[-1px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]`}
                        style={{
                          top: `${(startHour + startMin / 60) * 80 + 2}px`,
                          height: `${Math.max(durationHrs * 80 - 4, 30)}px`,
                        }}
                      >
                        <div className="font-black uppercase tracking-wider truncate drop-shadow-sm transition-all">
                          {event.title}
                        </div>
                        {durationHrs > 0.5 && (
                          <div className="text-[9px] font-black opacity-60 uppercase tracking-widest italic flex items-center gap-2">
                            <span>{format(event.start, "HH:mm")}</span>
                            <div className="w-1 h-1 rounded-full bg-current opacity-30" />
                            <span>{format(event.end, "HH:mm")}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/event:opacity-100 transition-opacity" />
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
