"use client";

import { History, Sparkles, BrainCircuit } from "lucide-react";

interface MemoryStatsProps {
  total: number;
  auto: number;
  manual: number;
}

function MiniStat({ label, value, icon: Icon, glowColor }: any) {
  return (
    <div className="flex items-center gap-5 py-5 px-8 bg-zinc-900/40 border border-white/[0.03] rounded-2xl group hover:border-zinc-700/30 transition-all relative">
       <div className="relative w-11 h-11 rounded-xl flex items-center justify-center bg-black/40 border border-white/5 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:rotate-[-4deg]">
          {/* Subtle Neon Glow behind icon - Now Centered */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${glowColor} opacity-0 group-hover:opacity-10 blur-[50px] transition-all duration-1000 pointer-events-none -z-10`} />
          <Icon className="w-4.5 h-4.5 text-zinc-400 group-hover:text-zinc-100 transition-colors" strokeWidth={2.5} />
       </div>
       <div className="flex flex-col gap-1 relative z-10">
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] leading-none">{label}</span>
          <span className="text-2xl font-black text-zinc-100 italic tracking-tighter leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{value}</span>
       </div>
    </div>
  );
}


export default function MemoryStats({ total, auto, manual }: MemoryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <MiniStat
        label="Total_Records"
        value={total}
        icon={History}
        glowColor="bg-blue-500"
      />
      <MiniStat
        label="Autopiloted"
        value={auto}
        icon={Sparkles}
        glowColor="bg-violet-500"
      />
      <MiniStat
        label="Hand_Crafted"
        value={manual}
        icon={BrainCircuit}
        glowColor="bg-emerald-500"
      />
    </div>
  );
}
