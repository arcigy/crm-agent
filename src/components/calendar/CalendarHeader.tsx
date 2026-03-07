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
  Plus,
  RefreshCw,
} from "lucide-react";
import { CalendarView } from "@/types/calendar";
import { useState, useRef, useEffect } from "react";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreateClick?: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showWeekends: boolean;
  onWeekendsToggle: () => void;
  showDeclined: boolean;
  onDeclinedToggle: () => void;
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onCreateClick,
  searchTerm,
  onSearchChange,
  showWeekends,
  onWeekendsToggle,
  showDeclined,
  onDeclinedToggle,
  onSettingsClick,
  onSyncClick,
}: CalendarHeaderProps) {
  const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const viewSelectorRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const views: { id: CalendarView; label: string; shortcut: string }[] = [
    { id: "day", label: "Deň", shortcut: "D" },
    { id: "week", label: "Týždeň", shortcut: "W" },
    { id: "month", label: "Mesiac", shortcut: "M" },
    { id: "year", label: "Rok", shortcut: "Y" },
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
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeViewLabel = views.find((v) => v.id === view)?.label || "Mesiac";

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-[#050507] backdrop-blur-xl border-b border-white/[0.03] shrink-0 relative z-50">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
              Kalendár
            </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={onToday}
              className="px-4 py-2 hover:bg-white/5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white active:scale-95"
            >
              Dnes
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              onClick={onPrev}
              className="p-2.5 hover:bg-violet-500/10 rounded-xl transition-all text-zinc-400 hover:text-violet-400 active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              className="p-2.5 hover:bg-violet-500/10 rounded-xl transition-all text-zinc-400 hover:text-violet-400 active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h2 className="text-xl font-black text-zinc-100 uppercase italic tracking-tight">
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

      <div className="flex items-center gap-4">
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-[#7c3aed]/10 text-violet-400 border border-[#7c3aed]/30 rounded-2xl hover:bg-[#7c3aed] hover:text-white hover:border-transparent hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-all active:scale-95 group overflow-hidden relative shadow-[0_0_15px_rgba(124,58,237,0.1)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus size={16} className="relative z-10 group-hover:scale-110 group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic relative z-10 whitespace-nowrap">Poznámka</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/search:text-violet-500 transition-colors pointer-events-none" />
            <input 
              type="text"
              placeholder="Hľadať..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-white focus:bg-white/10 focus:border-violet-500/20 outline-none w-48 transition-all italic placeholder:text-zinc-700"
            />
          </div>
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-3 rounded-2xl transition-all text-zinc-500 hover:text-white group ${isSettingsOpen ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
            >
              <Settings size={20} className={`group-hover:rotate-45 transition-transform duration-500 ${isSettingsOpen ? 'rotate-45' : ''}`} />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] py-2 p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-white/5 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Konfigurácia</p>
                </div>
                <button 
                  onClick={() => {
                    onSettingsClick?.();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left"
                >
                  <Settings size={14} className="opacity-40" />
                  Globálne nastavenia
                </button>
                <button 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left group/sync"
                  onClick={() => {
                    onSyncClick?.();
                    setIsSettingsOpen(false);
                  }}
                >
                  <RefreshCw size={14} className="opacity-40 group-hover/sync:rotate-180 transition-transform duration-700" />
                  Synchronizovať dáta
                </button>
                <div className="h-px bg-white/5 my-2 mx-2" />
                <div className="px-4 py-2">
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest italic">Arcigy CRM v2.4</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={viewSelectorRef}>
          <button
            onClick={() => setIsViewSelectorOpen(!isViewSelectorOpen)}
            className="flex items-center gap-4 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10 rounded-2xl transition-all text-violet-400 min-w-[140px] justify-between shadow-[0_0_20px_rgba(139,92,246,0.05)]"
          >
            <span>{activeViewLabel}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isViewSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {isViewSelectorOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] py-2 p-2 animate-in fade-in zoom-in-95 duration-200">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onViewChange(v.id);
                    setIsViewSelectorOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    view === v.id
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{v.label}</span>
                  <span className={`text-[9px] opacity-40 ${view === v.id ? 'text-white' : 'text-zinc-500'}`}>
                    {v.shortcut}
                  </span>
                </button>
              ))}
              <div className="h-px bg-white/5 my-2 mx-2" />
              <div className="px-2 py-2 space-y-1">
                <button 
                    onClick={onWeekendsToggle}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all text-left"
                >
                  <div className={`w-4 h-4 rounded border border-white/10 flex items-center justify-center transition-colors ${showWeekends ? 'bg-violet-500 border-violet-500' : ''}`}>
                    {showWeekends && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}
                  </div>
                  Zobrazovať víkendy
                </button>
                 <button 
                    onClick={onDeclinedToggle}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all text-left"
                >
                  <div className={`w-4 h-4 rounded border border-white/10 flex items-center justify-center transition-colors ${showDeclined ? 'bg-violet-500 border-violet-500' : ''}`}>
                    {showDeclined && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}
                  </div>
                  Odmietnuté udalosti
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
