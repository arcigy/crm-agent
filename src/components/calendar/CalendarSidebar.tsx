"use client";

import { MiniCalendar } from "./MiniCalendar";
import { Plus, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CalendarSidebarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  activeLayers: string[];
  onLayerToggle: (layerId: string) => void;
  onCreateClick: () => void;
  isConnected?: boolean;
  onConnect?: () => void;
}

export function CalendarSidebar({
  currentDate,
  onDateSelect,
  activeLayers,
  onLayerToggle,
  onCreateClick,
  isConnected = true,
  onConnect,
}: CalendarSidebarProps) {
  const [isMyCalendarsOpen, setIsMyCalendarsOpen] = useState(true);
  const [isOtherCalendarsOpen, setIsOtherCalendarsOpen] = useState(false);

  const myCalendars: { id: string; name: string; color: string }[] = [
    { id: "primary", name: "Arcigy Organization", color: "bg-violet-600" },
    { id: "tasks", name: "Podujatia & Úlohy", color: "bg-fuchsia-600" },
  ];

  const otherCalendars: { id: string; name: string; color: string }[] = [
    { id: "holidays", name: "Sviatky (SK)", color: "bg-emerald-600" },
  ];

  return (
    <aside className="w-full h-full flex flex-col gap-6">
      {/* Create Button Overlay */}
      <div className="pt-6">
        <MiniCalendar currentDate={currentDate} onDateSelect={onDateSelect} />
      </div>

      {/* People Search */}
      <div className="px-1">
        <div className="relative group/search">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/search:text-[#7c3aed] transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Hľadať v tíme"
            className="w-full pl-12 pr-4 py-2.5 bg-white/[0.02] border border-white/[0.04] focus:bg-white/[0.04] focus:border-[#7c3aed]/30 focus:shadow-[0_0_15px_rgba(124,58,237,0.1)] rounded-[1.2rem] text-[12px] font-bold tracking-wide transition-all outline-none placeholder:text-zinc-600/70 text-zinc-200"
          />
        </div>
      </div>

      {/* My Calendars */}
      <div className="px-1 space-y-6">
        <button
          onClick={() => setIsMyCalendarsOpen(!isMyCalendarsOpen)}
          className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-white transition-colors italic"
        >
          <span>Moje kalendáre</span>
          {isMyCalendarsOpen ? (
            <ChevronUp size={14} className="opacity-40" />
          ) : (
            <ChevronDown size={14} className="opacity-40" />
          )}
        </button>

        {isMyCalendarsOpen && (
          <div className="space-y-4 px-1">
            {myCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center justify-between cursor-pointer group/label"
              >
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={activeLayers.includes(cal.id)}
                        onChange={() => onLayerToggle(cal.id)}
                        className={`peer appearance-none w-5 h-5 rounded-lg border border-white/10 checked:border-violet-500 transition-all cursor-pointer ${cal.color} bg-opacity-10 checked:bg-opacity-100`}
                    />
                    <svg
                        className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 pointer-events-none"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                    >
                        <path d="M5 13l4 4L19 7" />
                    </svg>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400 group-hover/label:text-white transition-colors tracking-tight">
                    {cal.name}
                    </span>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${cal.color.replace('bg-', 'bg-')} shadow-[0_0_8px_rgba(139,92,246,0.3)]`} />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Other Calendars */}
      <div className="px-1 space-y-6">
        <button
          onClick={() => setIsOtherCalendarsOpen(!isOtherCalendarsOpen)}
          className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-white transition-colors italic"
        >
          <span>Externé zdroje</span>
          {isOtherCalendarsOpen ? (
            <ChevronUp size={14} className="opacity-40" />
          ) : (
            <ChevronDown size={14} className="opacity-40" />
          )}
        </button>

        {isOtherCalendarsOpen && (
          <div className="space-y-4 px-1">
            {otherCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center justify-between cursor-pointer group/label"
              >
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={activeLayers.includes(cal.id)}
                        onChange={() => onLayerToggle(cal.id)}
                        className={`peer appearance-none w-5 h-5 rounded-lg border border-white/10 checked:border-emerald-500 transition-all cursor-pointer ${cal.color} bg-opacity-10 checked:bg-opacity-100`}
                    />
                    <svg
                        className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 pointer-events-none"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                    >
                        <path d="M5 13l4 4L19 7" />
                    </svg>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400 group-hover/label:text-white transition-colors tracking-tight">
                    {cal.name}
                    </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
      {/* Connection Status */}
      {!isConnected && (
          <div className="mt-auto px-4 py-6 rounded-[1.8rem] bg-violet-600/5 border border-violet-500/10 space-y-4">
              <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Demo Režim</span>
              </div>
              <p className="text-[9px] font-bold text-zinc-600 leading-relaxed uppercase italic tracking-tight">
                  Pre ukladanie reálnych poznámok do Google Kalendára musíte prepojiť účet.
              </p>
              <button 
                onClick={onConnect}
                className="w-full py-3 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white border border-violet-500/20 hover:border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic active:scale-95"
              >
                Pripojiť Google
              </button>
          </div>
      )}
    </aside>
  );
}
