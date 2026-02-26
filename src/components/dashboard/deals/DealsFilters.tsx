"use client";

import * as React from "react";
import { Search, Filter, Banknote, FileText, RotateCcw, ChevronDown } from "lucide-react";
import { PROJECT_STAGES } from "@/types/project";

interface DealsFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  stageFilter: string;
  setStageFilter: (val: string) => void;
  priceFilter: string;
  setPriceFilter: (val: string) => void;
  uninvoicedOnly: boolean;
  setUninvoicedOnly: (val: boolean) => void;
  onReset: () => void;
  onNewClick?: () => void;
}

export function DealsFilters({
  searchQuery,
  setSearchQuery,
  stageFilter,
  setStageFilter,
  priceFilter,
  setPriceFilter,
  uninvoicedOnly,
  setUninvoicedOnly,
  onReset,
}: DealsFiltersProps) {
  const hasActiveFilters =
    searchQuery ||
    stageFilter !== "all" ||
    priceFilter !== "all" ||
    uninvoicedOnly;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white/[0.02] border-b border-white/5 relative z-50">
      {/* Search Bar */}
      <div className="relative flex-1 group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within/input:text-violet-400 transition-colors" />
        <input
          type="text"
          placeholder="Hľadať v záznamoch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold text-white placeholder:text-zinc-600 focus:border-violet-500/30 outline-none transition-all"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-3 overflow-visible w-full md:w-auto">
        {/* Stage Filter - Custom Look to avoid browser select strips */}
        <div className="relative group shrink-0">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Filter className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="pl-10 pr-10 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-violet-500/30 outline-none transition-all cursor-pointer appearance-none min-w-[150px]"
          >
            <option value="all">Filtrovať Štádium</option>
            {PROJECT_STAGES.map((s) => (
              <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none group-hover:text-white transition-colors" />
        </div>

        {/* Price Filter - Custom Look */}
        <div className="relative group shrink-0">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="pl-10 pr-10 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-emerald-500/30 outline-none transition-all cursor-pointer appearance-none min-w-[150px]"
          >
            <option value="all">Filtrovať Sumu</option>
            <option value="zero" className="bg-zinc-900">0 € (Dohoda)</option>
            <option value="less_5" className="bg-zinc-900">Do 5 € (Mini)</option>
            <option value="more_5" className="bg-zinc-900">Nad 5 € (Standard)</option>
            <option value="high" className="bg-zinc-900">1000 €+ (Premium)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none group-hover:text-white transition-colors" />
        </div>

        <button
          onClick={() => setUninvoicedOnly(!uninvoicedOnly)}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest shrink-0 ${
            uninvoicedOnly
              ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
              : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Uninvoiced
        </button>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600 hover:text-white transition-all transform active:scale-95 shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
