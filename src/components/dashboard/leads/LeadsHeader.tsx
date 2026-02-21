"use client";

import * as React from "react";
import { 
  Square, 
  RefreshCcw, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Search,
  RotateCcw
} from "lucide-react";

interface LeadsHeaderProps {
  isConnected: boolean;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onConnect: () => void;
  totalCount?: number;
}

export function LeadsHeader({
  isConnected,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onConnect,
  totalCount = 0,
}: LeadsHeaderProps) {
  return (
    <div className="px-6 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/40 dark:bg-zinc-950/80 backdrop-blur-xl relative z-20">
      {/* Left Actions */}
      <div className="flex items-center gap-1.5">
        <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all text-muted-foreground group">
          <Square className="w-4 h-4 group-hover:text-foreground transition-colors" />
        </button>
        <button 
          onClick={onRefresh}
          className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all text-muted-foreground group ${loading ? "animate-spin" : ""}`}
        >
          <RotateCcw className="w-4 h-4 group-hover:text-foreground transition-colors" />
        </button>
        <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all text-muted-foreground group">
          <MoreVertical className="w-4 h-4 group-hover:text-foreground transition-colors" />
        </button>

        {!isConnected && !loading && (
          <button
            onClick={onConnect}
            className="ml-6 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Prepojiť Gmail
          </button>
        )}
      </div>

      {/* Right Actions / Pagination */}
      <div className="flex items-center gap-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500/60">
          {totalCount > 0 ? `1 — ${Math.min(50, totalCount)} z ${totalCount.toLocaleString()}` : "0 z 0"}
        </div>
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
          <button className="p-1 px-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all disabled:opacity-20 text-muted-foreground" disabled>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1 px-3 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all text-indigo-500 dark:text-indigo-400 shadow-sm active:scale-90">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
