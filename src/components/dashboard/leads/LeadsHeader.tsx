"use client";

import * as React from "react";
import { Search, RefreshCcw, Sparkles } from "lucide-react";

interface LeadsHeaderProps {
  isConnected: boolean;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onConnect: () => void;
}

export function LeadsHeader({
  isConnected,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onConnect,
}: LeadsHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/30">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-black text-foreground tracking-tight">
          Doručená pošta
        </h1>
        {!isConnected && !loading && (
          <button
            onClick={onConnect}
            className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
          >
            <Sparkles className="w-3 h-3" /> Povoliť Gmail
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Hľadať správu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-foreground"
          />
        </div>
        <button
          onClick={onRefresh}
          className={`p-2.5 rounded-xl bg-card text-foreground/70 border border-border hover:bg-muted transition-all ${
            loading ? "animate-spin" : ""
          }`}
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
