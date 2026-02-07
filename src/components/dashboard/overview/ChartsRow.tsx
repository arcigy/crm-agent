"use client";

import { useMemo } from "react";

export function ChartsRow({ deals, projects }: { deals: any[]; projects: any[] }) {
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
    return stages.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: projects.filter(p => p.stage === s).length,
      percentage: projects.length > 0 ? (projects.filter(p => p.stage === s).length / projects.length) * 100 : 0
    }));
  }, [projects]);

  return (
    <div className="bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-indigo-500/10 dark:border-indigo-500/5 flex flex-col h-full overflow-hidden relative group transition-all duration-500">
      {/* 1. Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} 
      />

      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-zinc-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-zinc-500/20 transition-all duration-700" />
      
      <h3 className="text-xl font-black uppercase italic tracking-tighter mb-6 flex-shrink-0 relative z-10">Pipeline Projektov</h3>
      
      <div className="space-y-3.5 flex-1 overflow-auto thin-scrollbar pr-2 relative z-10">
        {pipelineStages.map((stage, i) => (
          <div key={i} className="bg-white/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-md">
            <div className="flex justify-between text-[11px] font-black mb-1.5 transition-all">
              <span className="uppercase tracking-[0.2em] text-muted-foreground opacity-60 font-black italic">{stage.label}</span>
              <span className="text-foreground font-black italic">{stage.count}</span>
            </div>
            <div className="h-2.5 bg-muted/60 dark:bg-zinc-800/60 rounded-full overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
              <div 
                  className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.2)]"
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
  );
}
