"use client";

import { useMemo, useState } from "react";
import { ChevronDown, BarChart3, TrendingUp } from "lucide-react";

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
    <div className={`bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl px-5 md:px-8 pt-2 md:pt-3 pb-4 md:pb-6 rounded-none md:rounded-[2.5rem] border-b md:border border-violet-500/20 dark:border-violet-500/20 flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full' : 'h-auto md:h-full shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1.5'}`}>
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-violet-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-violet-500/30 transition-all duration-300" />
      
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full md:cursor-default relative z-20 cursor-pointer md:cursor-auto mb-1 md:mb-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:bg-violet-500/10 bg-violet-500/20 flex items-center justify-center border border-violet-500/30 md:border-violet-500/20">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-violet-500" />
          </div>
          <div className="flex flex-col items-start text-left">
            <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">Pipeline Projektov</h3>
          </div>
        </div>
        <div className={`w-5 h-5 flex items-center justify-center transition-all duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`}>
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
      
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ${isExpanded ? 'opacity-100 block' : 'hidden md:block opacity-0 md:opacity-100'}`}>
        <div className="space-y-1 md:space-y-1.5 relative z-10 overflow-hidden">
          {pipelineStages.map((stage, i) => (
            <div key={i} className="bg-white/60 dark:bg-zinc-900/40 py-0.5 md:py-1 px-4 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-md">
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
