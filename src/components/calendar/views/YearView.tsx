"use client";

import {
  format,
  startOfYear,
  eachMonthOfInterval,
  endOfYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { sk } from "date-fns/locale";
import { CalendarEvent } from "@/types/calendar";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function YearView({ currentDate }: YearViewProps) {
  const yearStart = startOfYear(currentDate);
  const months = eachMonthOfInterval({
    start: yearStart,
    end: endOfYear(yearStart),
  });

  return (
    <div className="h-full overflow-y-auto p-10 bg-[#050507] thin-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-16 max-w-7xl mx-auto">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
          const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          return (
            <div key={month.toString()} className="flex flex-col gap-6 group">
              <h3 className="text-[11px] font-black text-zinc-100 uppercase italic tracking-[0.2em] px-2 group-hover:text-[#7c3aed] transition-colors">
                {format(month, "LLLL", { locale: sk })}
              </h3>

              <div className="grid grid-cols-7 text-center border border-white/[0.03] p-4 rounded-3xl bg-black/20 group-hover:bg-black/40 transition-colors duration-500 shadow-inner">
                {["P", "U", "S", "Š", "P", "S", "N"].map((d, i) => (
                  <div
                    key={i}
                    className="text-[9px] font-black text-zinc-700 uppercase italic py-2"
                  >
                    {d}
                  </div>
                ))}
                {days.map((day) => {
                    const isTodayInMonth = isSameDay(day, new Date());
                    const currentMonth = isSameMonth(day, month);

                    return (
                        <div
                            key={day.toString()}
                            className={`
                                aspect-square flex items-center justify-center text-[10px] font-black transition-all duration-300
                                ${!currentMonth ? "text-zinc-800" : "text-zinc-500"}
                                ${isTodayInMonth ? "bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.8)] scale-125 z-10 rounded-full" : "hover:text-white hover:bg-white/[0.03] rounded-lg"}
                            `}
                        >
                            {format(day, "d")}
                        </div>
                    );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

