"use client";

import * as React from "react";
import {
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import { sk } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PremiumDatePickerProps {
  value: string; // format "yyyy-MM-dd"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  customTrigger?: React.ReactNode;
  align?: "left" | "right" | "center";
}

export function PremiumDatePicker({
  value,
  onChange,
  placeholder = "Vybrať dátum",
  className,
  customTrigger,
  align = "center",
}: PremiumDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Internal view date for navigation
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    if (value && value.length === 10) {
      try {
        return parseISO(value);
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  });

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update view date if value changes from outside (optional but good)
  React.useEffect(() => {
    if (value && value.length === 10) {
      try {
        const parsed = parseISO(value);
        if (!isNaN(parsed.getTime())) {
             setViewDate(parsed);
        }
      } catch (e) {}
    }
  }, [value]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const handleDateSelect = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    onChange(formattedDate);
    setIsOpen(false);
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(subMonths(viewDate, 1));
  };

  const displayValue = React.useMemo(() => {
    if (!value) return placeholder;
    try {
      return format(parseISO(value), "d. M. yyyy", { locale: sk });
    } catch (e) {
      return placeholder;
    }
  }, [value, placeholder]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {customTrigger ? (
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {customTrigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 bg-white/5 border border-white/10 rounded-2xl px-4 flex items-center justify-between text-sm font-mono font-medium text-violet-100 hover:bg-white/10 hover:border-violet-500/20 focus:border-violet-500/30 outline-none transition-all group"
        >
          <span className={!value ? "text-zinc-700" : ""}>{displayValue}</span>
          <CalendarIcon
            size={16}
            className={`transition-colors ${isOpen ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"}`}
          />
        </button>
      )}

      {isOpen && (
        <div 
          className={`absolute top-full mt-2 w-60 bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[300] p-2.5 animate-in fade-in zoom-in-95 duration-200
            ${align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}
          `}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 italic">
              {format(viewDate, "LLLL yyyy", { locale: sk })}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
              <div
                key={`day-header-${d}`}
                className="text-[9px] font-bold text-zinc-600 text-center uppercase py-1 tracking-widest"
              >
                {d}
              </div>
            ))}
            
            {/* Days Numbers Grid */}
            {calendarDays.map((day) => {
              const dateIso = format(day, "yyyy-MM-dd");
              const isSelected = value === dateIso;
              const isCurMonth = isSameMonth(day, monthStart);
              const isTodayDay = isToday(day);

              return (
                <button
                  key={`day-btn-${day.getTime()}`}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`aspect-square rounded-2xl text-[11px] font-mono font-bold transition-all flex items-center justify-center relative group/day
                    ${isSelected ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] scale-110 z-10" : 
                      isCurMonth ? "text-white hover:bg-white/5 hover:scale-105" : "text-zinc-800 opacity-20 pointer-events-none"}
                    ${!isSelected && isTodayDay ? "text-violet-400 border border-violet-500/20 shadow-[0_0_10px_rgba(124,58,237,0.1)]" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors"
            >
              Vymazať
            </button>
            <button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-violet-400 hover:text-white transition-colors"
            >
              Dnes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
