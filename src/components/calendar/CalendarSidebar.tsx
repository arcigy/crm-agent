"use client";

import { MiniCalendar } from "./MiniCalendar";
import { CalendarLayer } from "@/types/calendar";
import { Plus, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CalendarSidebarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  activeLayers: string[];
  onLayerToggle: (layerId: string) => void;
}

export function CalendarSidebar({
  currentDate,
  onDateSelect,
  activeLayers,
  onLayerToggle,
}: CalendarSidebarProps) {
  const [isMyCalendarsOpen, setIsMyCalendarsOpen] = useState(true);
  const [isOtherCalendarsOpen, setIsOtherCalendarsOpen] = useState(true);

  const myCalendars: { id: string; name: string; color: string }[] = [
    { id: "primary", name: "Arcigy Organization", color: "bg-blue-600" },
    { id: "birthdays", name: "Narodeniny", color: "bg-amber-500" },
    { id: "tasks", name: "Úlohy", color: "bg-indigo-600" },
  ];

  const otherCalendars: { id: string; name: string; color: string }[] = [
    { id: "holidays", name: "Sviatky na Slovensku", color: "bg-emerald-600" },
  ];

  return (
    <aside className="w-64 flex flex-col gap-8 pr-4">
      {/* Create Button Overlay (handled by page header usually, but Google Cal has it here) */}
      <div className="px-2">
        <button className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 active:scale-95">
          <Plus className="text-blue-600" size={20} />
          <span>Vytvoriť</span>
          <ChevronDown size={14} className="ml-2 text-gray-400" />
        </button>
      </div>

      <MiniCalendar currentDate={currentDate} onDateSelect={onDateSelect} />

      {/* People Search */}
      <div className="px-2">
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Hľadať ľudí"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
          />
        </div>
      </div>

      {/* My Calendars */}
      <div className="px-2">
        <button
          onClick={() => setIsMyCalendarsOpen(!isMyCalendarsOpen)}
          className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4 hover:text-gray-900 transition-colors"
        >
          <span>Moje kalendáre</span>
          {isMyCalendarsOpen ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        {isMyCalendarsOpen && (
          <div className="space-y-2">
            {myCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={activeLayers.includes(cal.id)}
                    onChange={() => onLayerToggle(cal.id)}
                    className="peer appearance-none w-4 h-4 rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  />
                  <svg
                    className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={4}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  {cal.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Other Calendars */}
      <div className="px-2">
        <button
          onClick={() => setIsOtherCalendarsOpen(!isOtherCalendarsOpen)}
          className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4 hover:text-gray-900 transition-colors"
        >
          <span>Ďalšie kalendáre</span>
          {isOtherCalendarsOpen ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        {isOtherCalendarsOpen && (
          <div className="space-y-2">
            {otherCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={activeLayers.includes(cal.id)}
                    onChange={() => onLayerToggle(cal.id)}
                    className="peer appearance-none w-4 h-4 rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  />
                  <svg
                    className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={4}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  {cal.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
