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
    <div className="h-full overflow-y-auto p-8 bg-white custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 max-w-7xl mx-auto">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
          const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          return (
            <div key={month.toString()} className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-900 capitalize px-2">
                {format(month, "LLLL", { locale: sk })}
              </h3>

              <div className="grid grid-cols-7 text-center">
                {["p", "u", "s", "š", "p", "s", "n"].map((d) => (
                  <div
                    key={d}
                    className="text-[10px] font-bold text-gray-400 uppercase py-1"
                  >
                    {d}
                  </div>
                ))}
                {days.map((day) => (
                  <div
                    key={day.toString()}
                    className={`
                                            aspect-square flex items-center justify-center text-[10px] rounded-full
                                            ${!isSameMonth(day, month) ? "text-gray-300" : "text-gray-700"}
                                            ${isSameDay(day, new Date()) ? "bg-blue-600 text-white font-bold" : ""}
                                        `}
                  >
                    {format(day, "d")}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
