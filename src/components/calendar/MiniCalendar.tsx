"use client";

import { useState } from "react";
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
}

export function MiniCalendar({ currentDate, onDateSelect }: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState(currentDate);

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
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-sm font-medium text-gray-700">
          {format(viewDate, "LLLL yyyy", { locale: sk })}
        </span>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center mb-1">
        {["p", "u", "s", "š", "p", "s", "n"].map((day) => (
          <div
            key={day}
            className="text-[10px] font-bold text-gray-400 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 text-center">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, currentDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={`
                                aspect-square flex items-center justify-center text-[11px] rounded-full transition-all
                                ${isSelected ? "bg-blue-600 text-white font-bold" : ""}
                                ${!isSelected && isDayToday ? "text-blue-600 font-bold bg-blue-50" : ""}
                                ${!isSelected && !isDayToday && isCurrentMonth ? "text-gray-700 hover:bg-gray-100" : ""}
                                ${!isSelected && !isCurrentMonth ? "text-gray-300" : ""}
                            `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
