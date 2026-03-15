"use client";

import { MiniCalendar } from "./MiniCalendar";
import { Search, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useState } from "react";

interface CalendarSidebarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  activeLayers: string[];
  onLayerToggle: (layerId: string) => void;
  onCreateClick: () => void;
  isConnected?: boolean;
  onConnect?: () => void;
  onDateDoubleClick?: (date: Date) => void;
  lastSyncTime?: Date | null;
  syncCounts?: { google: number; crm: number };
}

export function CalendarSidebar({
  currentDate,
  onDateSelect,
  activeLayers,
  onLayerToggle,
  onCreateClick,
  isConnected = true,
  onConnect,
  onDateDoubleClick,
  lastSyncTime,
  syncCounts = { google: 0, crm: 0 },
}: CalendarSidebarProps) {
  const [isMyCalendarsOpen, setIsMyCalendarsOpen] = useState(false);
  const [isOtherCalendarsOpen, setIsOtherCalendarsOpen] = useState(false);

  const myCalendars: { id: string; name: string; color: string }[] = [
    { id: "primary", name: "Arcigy Organization", color: "bg-violet-600" },
    { id: "tasks", name: "Podujatia & Úlohy", color: "bg-fuchsia-600" },
  ];

  const otherCalendars: { id: string; name: string; color: string }[] = [
    { id: "holidays", name: "Sviatky (SK)", color: "bg-emerald-600" },
  ];

  return (
    <aside className="w-full h-full flex flex-col gap-4">
      {/* Mini Calendar */}
      <div>
        <MiniCalendar currentDate={currentDate} onDateSelect={onDateSelect} onDateDoubleClick={onDateDoubleClick} />
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
          Moje kalendáre
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
          Externé zdroje
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
      {/* Sync Status Hub */}
      <div className="mt-auto p-5 rounded-[2rem] bg-[#0a0a0c] border border-white/5 space-y-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 italic">
                {isConnected ? 'Prepojené' : 'Offline'}
              </span>
            </div>
            <button 
              onClick={() => onLayerToggle('sync')}
              disabled={activeLayers.includes('syncing')}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-zinc-600 hover:text-white disabled:opacity-50"
              title="Vynútiť synchronizáciu"
            >
              <RefreshCw size={14} className={`${activeLayers.includes('syncing') ? 'animate-spin text-violet-500' : ''}`} />
            </button>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex flex-col gap-1.5 px-1">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">Posledná synchronizácia</span>
              <p className="text-[11px] font-bold text-zinc-200 tabular-nums">
                {lastSyncTime ? format(lastSyncTime, 'HH:mm:ss', { locale: sk }) : 'Nikdy'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl group/item cursor-help transition-all hover:bg-white/[0.04]">
                 <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest block text-center mb-1">CRM DATA</span>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-[14px] font-black italic text-violet-400 leading-none">{syncCounts.crm}</span>
                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                 </div>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl group/item cursor-help transition-all hover:bg-white/[0.04]">
                 <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest block text-center mb-1">GOOGLE CAL</span>
                 <div className="flex flex-col items-center gap-1">
                    <span className="text-[14px] font-black italic text-fuchsia-400 leading-none">{syncCounts.google}</span>
                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                 </div>
              </div>
            </div>
          </div>

          {!isConnected && (
            <button 
              onClick={onConnect}
              className="w-full py-3 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white border border-violet-500/20 hover:border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic active:scale-95 relative z-10"
            >
              Aktivovať Sync
            </button>
          )}
      </div>
    </aside>
  );
}
