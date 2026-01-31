"use client";

import * as React from "react";
import { Search, Filter, Banknote, FileText, X } from "lucide-react";
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
    <div className="p-6 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Hľadať projekt alebo kontakt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all placeholder:text-muted-foreground/30 text-foreground"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-1.5 shadow-sm">
          <Filter className="w-3.5 h-3.5 text-blue-500" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-foreground cursor-pointer"
          >
            <option value="all">Všetky štádiá</option>
            {PROJECT_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-1.5 shadow-sm">
          <Banknote className="w-3.5 h-3.5 text-emerald-500" />
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-foreground cursor-pointer"
          >
            <option value="all">Všetky ceny</option>
            <option value="zero">Bez ceny (0 €)</option>
            <option value="less_5">Lacnejšie (pod 5 €)</option>
            <option value="more_5">Drahšie (nad 5 €)</option>
            <option value="high">Premium (nad 1000 €)</option>
          </select>
        </div>

        <button
          onClick={() => setUninvoicedOnly(!uninvoicedOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
            uninvoicedOnly
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/10"
              : "bg-card border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Nevyfakturované
        </button>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all border border-transparent hover:border-red-500/20"
            title="Resetovať filtre"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
