"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { sk } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onDateDoubleClick?: (date: Date) => void;
}

export function MiniCalendar({ currentDate, onDateSelect, onDateDoubleClick }: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState(currentDate);
  
  // Sync with parent date changes (e.g. clicking "Today" in header)
  useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setViewDate(addMonths(viewDate, 1));
  const prevMonth = () => setViewDate(subMonths(viewDate, 1));

  return (
    <div className="w-full bg-[#050507] p-4 rounded-[1.8rem] border border-white/[0.03] shadow-2xl relative overflow-hidden group">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 w-[120%] h-[120%] bg-violet-600/5 blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <div className="flex items-center justify-between mb-4 px-1 relative z-10">
        <span className="text-[11px] font-black uppercase italic tracking-[0.25em] text-white/70">
          {format(viewDate, "LLLL yyyy", { locale: sk })}
        </span>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-white/5 rounded-xl transition-all text-zinc-600 hover:text-zinc-300 active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/5 rounded-xl transition-all text-zinc-600 hover:text-zinc-300 active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day Labels - FLEX for robustness */}
      <div className="flex items-center justify-between mb-4 px-2 relative z-10">
        {["P", "U", "S", "Š", "P", "S", "N"].map((day, index) => (
          <div
            key={`mini-lbl-${index}`}
            className="w-[calc(100%/7)] text-center text-[10px] font-black text-zinc-600 uppercase italic tracking-widest"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 text-center gap-y-2 gap-x-1.5 relative z-10 px-1">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              onDoubleClick={() => onDateDoubleClick?.(day)}
              className={`
                                aspect-square flex items-center justify-center text-[10px] font-mono font-bold rounded-[0.7rem] transition-all duration-300 relative group/day
                                ${isSelected ? "bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] z-10 scale-[1.05]" : ""}
                                ${!isSelected && isDayToday ? "text-violet-400 border border-violet-500/30 bg-violet-500/5" : ""}
                                ${!isSelected && !isDayToday && isCurrentMonth ? "text-zinc-400 hover:text-white" : ""}
                                ${!isSelected && !isCurrentMonth ? "text-zinc-800 opacity-30" : ""}
                            `}
            >
              {!isSelected && isCurrentMonth && (
                  <div className="absolute inset-0 bg-white/5 scale-50 opacity-0 group-hover/day:scale-100 group-hover/day:opacity-100 rounded-[0.9rem] transition-all duration-300" />
              )}
              <span className="relative z-10">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
