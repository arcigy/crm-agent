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
    <div className="px-6 h-14 border-b border-[#f1f1f1] dark:border-white/5 flex items-center justify-between bg-transparent relative z-20">
      {/* Left Actions */}
      <div className="flex items-center gap-1.5">
        <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-[#444746] dark:text-zinc-400 group">
          <Square className="w-5 h-5 group-hover:text-[#1f1f1f] transition-colors" />
        </button>
        <button 
          onClick={onRefresh}
          className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-[#444746] dark:text-zinc-400 group ${loading ? "animate-spin" : ""}`}
        >
          <RotateCcw className="w-5 h-5 group-hover:text-[#1f1f1f] transition-colors" />
        </button>
        <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-[#444746] dark:text-zinc-400 group">
          <MoreVertical className="w-5 h-5 group-hover:text-[#1f1f1f] transition-colors" />
        </button>

        {!isConnected && !loading && (
          <button
            onClick={onConnect}
            className="ml-6 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            Prepojiť Gmail
          </button>
        )}
      </div>

      {/* Right Actions / Pagination */}
      <div className="flex items-center gap-4">
        <div className="text-[12px] font-normal text-[#444746] dark:text-zinc-400 mr-4">
          {totalCount > 0 ? `1 — ${Math.min(50, totalCount)} z ${totalCount.toLocaleString()}` : "0 z 0"}
        </div>
        <div className="flex items-center gap-0.5">
          <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all disabled:opacity-30 text-[#444746] dark:text-zinc-400" disabled>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-[#444746] dark:text-zinc-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
