"use client";

import { Trash2, Search, RefreshCcw, Bot, Calendar } from "lucide-react";

interface MemoryListProps {
  loading: boolean;
  memories: any[];
  search: string;
  setSearch: (val: string) => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export default function MemoryList({ loading, memories, search, setSearch, onRefresh, onDelete }: MemoryListProps) {
  return (
    <div className="space-y-6">
      {/* ── Console Search Bar ── */}
      <div className="bg-black/20 border border-white/5 rounded-2xl p-3 flex items-center gap-4 shadow-inner">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search_Entry_Database..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 pl-14 font-black text-xs text-zinc-300 placeholder:text-zinc-700 placeholder:font-black uppercase tracking-widest"
          />
        </div>
        <button
          onClick={onRefresh}
          className="p-3 hover:bg-white/5 rounded-xl transition-all group"
        >
          <RefreshCcw
            className={`w-3.5 h-3.5 text-zinc-500 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
          />
        </button>
      </div>

      {/* ── Entry Registry ── */}
      <div className="divide-y divide-white/[0.03] border border-white/[0.03] bg-black/10 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-zinc-950/20">
            <RefreshCcw className="w-8 h-8 text-zinc-500 animate-spin opacity-40" strokeWidth={3} />
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700">Sync_In_Progress...</span>
          </div>
        ) : memories.length > 0 ? (
          memories.map((m) => (
            <div
              key={m.id}
              className="group flex flex-col md:flex-row md:items-center justify-between py-6 px-10 gap-6 transition-all hover:bg-white/[0.01]"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${
                    m.category === "manual"
                      ? "bg-zinc-100/10 text-zinc-100 border-white/10"
                      : "bg-zinc-800/10 text-zinc-500 border-zinc-700/20"
                  }`}>
                    {m.category === "manual" ? "MANUAL_ENTRY" : "AUTOPILOT_MEM"}
                  </div>
                  <div className="flex items-center gap-2 text-[7px] font-black text-zinc-600 uppercase tracking-widest">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(m.date_created).toLocaleDateString("sk-SK")}
                  </div>
                </div>
                <p className="font-black text-sm text-zinc-200 uppercase italic tracking-tighter leading-tight pr-12 drop-shadow-[0_0_8px_rgba(255,255,255,0.05)]">
                  "{m.fact}"
                </p>
              </div>

              <div className="flex items-center gap-4">
                 <div className="hidden md:flex flex-col items-end">
                    <span className="text-[7px] font-black text-zinc-700 uppercase tracking-widest leading-none mb-1">Index_Verified</span>
                    <div className="h-0.5 w-8 bg-zinc-700 rounded-full" />
                 </div>
                 <button
                    onClick={() => onDelete(m.id)}
                    className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-zinc-950/10 flex flex-col items-center gap-4">
            <Bot size={32} className="text-zinc-800" />
            <p className="text-zinc-600 font-black uppercase tracking-[0.4em] text-[8px] italic">
              Registry_Empty: No_Memory_Found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
