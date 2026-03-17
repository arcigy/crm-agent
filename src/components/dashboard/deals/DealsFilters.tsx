"use client";

import * as React from "react";
import { Search, Filter, Banknote, FileText, RotateCcw, ChevronDown, Check } from "lucide-react";
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
  invoicedOnly: boolean;
  setInvoicedOnly: (val: boolean) => void;
  onReset: () => void;
  onNewClick?: () => void;
}

const PRICE_OPTIONS = [
  { value: "all", label: "Filtrovať Sumu" },
  { value: "zero", label: "0 € (Dohoda)" },
  { value: "less_5", label: "Do 5 € (Mini)" },
  { value: "more_5", label: "Nad 5 € (Standard)" },
  { value: "high", label: "1000 €+ (Premium)" },
];

export function DealsFilters({
  searchQuery,
  setSearchQuery,
  stageFilter,
  setStageFilter,
  priceFilter,
  setPriceFilter,
  uninvoicedOnly,
  setUninvoicedOnly,
  invoicedOnly,
  setInvoicedOnly,
  onReset,
}: DealsFiltersProps) {
  const [isStageOpen, setIsStageOpen] = React.useState(false);
  const [isPriceOpen, setIsPriceOpen] = React.useState(false);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const priceRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stageRef.current && !stageRef.current.contains(event.target as Node)) {
        setIsStageOpen(false);
      }
      if (priceRef.current && !priceRef.current.contains(event.target as Node)) {
        setIsPriceOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters =
    searchQuery ||
    stageFilter !== "all" ||
    priceFilter !== "all";

  const currentStageLabel = stageFilter === "all" 
    ? "Filtrovať Štádium" 
    : PROJECT_STAGES.find(s => s.value === stageFilter)?.label || stageFilter;

  const currentPriceLabel = PRICE_OPTIONS.find(o => o.value === priceFilter)?.label || "Filtrovať Sumu";

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
        
        {/* Stage Filter - Custom Dropdown */}
        <div className="relative" ref={stageRef}>
          <button
            onClick={() => {
              setIsStageOpen(!isStageOpen);
              setIsPriceOpen(false);
            }}
            className="flex items-center gap-3 pl-4 pr-10 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-violet-500/30 transition-all min-w-[180px] relative group"
          >
            <Filter className={`w-3.5 h-3.5 transition-colors ${stageFilter !== 'all' ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
            <span className="truncate">{currentStageLabel}</span>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 transition-transform duration-300 ${isStageOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {isStageOpen && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => { setStageFilter("all"); setIsStageOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${stageFilter === 'all' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              >
                Všetky Štádiá
                {stageFilter === 'all' && <Check className="w-3 h-3" />}
              </button>
              <div className="h-px bg-white/5 my-1" />
              {PROJECT_STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setStageFilter(s.value); setIsStageOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${stageFilter === s.value ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                  {s.label}
                  {stageFilter === s.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price Filter - Custom Dropdown */}
        <div className="relative" ref={priceRef}>
          <button
            onClick={() => {
              setIsPriceOpen(!isPriceOpen);
              setIsStageOpen(false);
            }}
            className="flex items-center gap-3 pl-4 pr-10 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-emerald-500/30 transition-all min-w-[180px] relative group"
          >
            <Banknote className={`w-3.5 h-3.5 transition-colors ${priceFilter !== 'all' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
            <span className="truncate">{currentPriceLabel}</span>
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 transition-transform duration-300 ${isPriceOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {isPriceOpen && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-200">
              {PRICE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setPriceFilter(o.value); setIsPriceOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${priceFilter === o.value ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                  {o.label}
                  {priceFilter === o.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Uninvoiced Filter */}
        <button
          onClick={() => {
            const next = !uninvoicedOnly;
            setUninvoicedOnly(next);
            if (next) setInvoicedOnly(false);
          }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all duration-500 text-[10px] font-black uppercase tracking-widest shrink-0 active:scale-95 group/uninvoiced ${
            uninvoicedOnly
              ? "bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-[1.02]"
              : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
          }`}
        >
          <FileText className="w-3.5 h-3.5 transition-transform duration-500" />
          Nefakturované
        </button>

        {/* Invoiced Filter */}
        <button
          onClick={() => {
            const next = !invoicedOnly;
            setInvoicedOnly(next);
            if (next) setUninvoicedOnly(false);
          }}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all duration-500 text-[10px] font-black uppercase tracking-widest shrink-0 active:scale-95 group/invoiced ${
            invoicedOnly
              ? "bg-violet-500/10 border-violet-500/40 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.2)] scale-[1.02]"
              : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
          }`}
        >
          <Check className="w-3.5 h-3.5 transition-transform duration-500" />
          Vyfakturované
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
