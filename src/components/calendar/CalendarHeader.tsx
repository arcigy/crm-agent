"use client";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  HelpCircle,
  Settings,
  ChevronDown,
} from "lucide-react";
import { CalendarView } from "@/types/calendar";
import { useState, useRef, useEffect } from "react";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
}: CalendarHeaderProps) {
  const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
  const viewSelectorRef = useRef<HTMLDivElement>(null);

  const views: { id: CalendarView; label: string; shortcut: string }[] = [
    { id: "day", label: "Deň", shortcut: "D" },
    { id: "week", label: "Týždeň", shortcut: "W" },
    { id: "month", label: "Mesiac", shortcut: "M" },
    { id: "year", label: "Rok", shortcut: "Y" },
    { id: "agenda", label: "Rozpis", shortcut: "A" },
    { id: "4days", label: "4 dni", shortcut: "X" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        viewSelectorRef.current &&
        !viewSelectorRef.current.contains(event.target as Node)
      ) {
        setIsViewSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeViewLabel = views.find((v) => v.id === view)?.label || "Mesiac";

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#09090b] border-b border-gray-200 dark:border-white/10 shrink-0">
      <div className="flex items-center gap-2 lg:gap-8">
        <div className="flex items-center gap-2">
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Kalendár
            </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <button
              onClick={onPrev}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={onNext}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="text-xl font-medium text-gray-700 capitalize">
            {format(
              currentDate,
              view === "month" || view === "year"
                ? "LLLL yyyy"
                : "d. MMMM yyyy",
              { locale: sk },
            )}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="flex items-center gap-1 hidden md:flex">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <Search size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <HelpCircle size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <Settings size={20} />
          </button>
        </div>

        <div className="relative" ref={viewSelectorRef}>
          <button
            onClick={() => setIsViewSelectorOpen(!isViewSelectorOpen)}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium border border-gray-300 hover:bg-gray-50 rounded-md transition-all text-gray-700 min-w-[100px] justify-between"
          >
            <span>{activeViewLabel}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {isViewSelectorOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] py-2">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onViewChange(v.id);
                    setIsViewSelectorOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    view === v.id
                      ? "text-blue-600 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  <span>{v.label}</span>
                  <span className="text-[10px] text-gray-400">
                    {v.shortcut}
                  </span>
                </button>
              ))}
              <div className="h-px bg-gray-100 my-1" />
              <div className="px-4 py-2 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">
                    Zobrazovať víkendy
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">
                    Zobrazovať odmietnuté udalosti
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
