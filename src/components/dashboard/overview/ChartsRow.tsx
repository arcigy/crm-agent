"use client";

import { useMemo, useState } from "react";
import { ChevronDown, BarChart3 } from "lucide-react";

export function ChartsRow({ deals, projects }: { deals: any[]; projects: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Simple visualization of deals value over last 7 entries (Preserved but hidden)
  const chartData = useMemo(() => {
    const last7 = [...deals].slice(0, 7).reverse();
    const max = Math.max(...last7.map((d) => d.value || 0), 1000);
    return last7.map((d) => ({
      value: d.value || 0,
      height: ((d.value || 0) / max) * 100,
      name: d.name?.substring(0, 10),
    }));
  }, [deals]);

  const pipelineStages = useMemo(() => {
    const stages = ["lead", "planning", "active", "completed", "archived"];
    const colors: Record<string, string> = {
      lead: "bg-purple-500",
      planning: "bg-blue-500",
      active: "bg-emerald-500",
      completed: "bg-teal-500",
      archived: "bg-gray-500"
    };
    return stages.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: projects.filter(p => p.stage === s).length,
      percentage: projects.length > 0 ? (projects.filter(p => p.stage === s).length / projects.length) * 100 : 0,
      color: colors[s] || "bg-zinc-900"
    }));
  }, [projects]);

  return (
    <div className={`bg-indigo-50/30 dark:bg-indigo-950/20 backdrop-blur-2xl px-5 md:p-6 rounded-none md:rounded-[2rem] border-b md:border border-indigo-500/20 dark:border-indigo-500/20 md:bg-white md:dark:bg-zinc-900/60 md:backdrop-blur-xl md:border-black/[0.08] md:dark:border-white/[0.08] flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full py-5' : 'h-auto md:h-full py-4 md:py-6'}`}>
      {/* 2. Soft Radial Glows - Only on Mobile */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-zinc-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-zinc-500/20 transition-all duration-300 md:hidden" />
      
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full md:cursor-default relative z-20"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:bg-zinc-500/10 bg-zinc-500/20 flex items-center justify-center border border-zinc-500/30 md:border-zinc-500/20">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-zinc-500" />
          </div>
          <div className="flex flex-col items-start text-left">
            <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">Pipeline Projektov</h3>
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest md:hidden opacity-60">Stavy aktívnych projektov</span>
          </div>
        </div>
        <div className={`w-5 h-5 flex items-center justify-center transition-all duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`}>
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>
      
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ${isExpanded ? 'mt-6 opacity-100 flex' : 'hidden md:flex md:mt-6 opacity-0 md:opacity-100'}`}>
        <div className="space-y-2.5 overflow-y-auto thin-scrollbar pr-2 relative z-10 flex-1 min-h-0">
          {pipelineStages.map((stage, i) => (
            <div key={i} className="bg-white/60 dark:bg-zinc-900/40 py-1 px-3.5 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-md">
              <div className="flex justify-between text-[9px] font-black mb-1 transition-all">
                <span className="uppercase tracking-[0.2em] text-muted-foreground opacity-60 font-black italic">{stage.label}</span>
                <span className="text-foreground font-black italic">{stage.count}</span>
              </div>
              <div className="h-1 bg-muted/60 dark:bg-zinc-800/60 rounded-full overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                <div 
                  className={`h-full ${stage.color} transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* VISUALLY REMOVED ITEMS (Preserved functionality) */}
        <div className="hidden">
          <div className="flex-1 flex items-end justify-between gap-4 mt-4">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group/chart relative">
                <div 
                  className="w-full bg-gradient-to-t from-zinc-900 to-zinc-500 rounded-2xl transition-all duration-500 group-hover/chart:from-zinc-800 group-hover/chart:to-zinc-400 group-hover/chart:scale-105 shadow-lg shadow-black/10"
                  style={{ height: `${d.height}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/chart:opacity-100 transition-opacity whitespace-nowrap z-20">
                    {d.value} €
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground mt-4 truncate w-full text-center">
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
