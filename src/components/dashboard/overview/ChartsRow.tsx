"use client";

import { useMemo } from "react";

export function ChartsRow({ deals, projects }: { deals: any[]; projects: any[] }) {
  // Simple visualization of deals value over last 7 entries
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Revenue Mini Chart */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black uppercase italic tracking-tighter">Posledné Obchody</h3>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">LIVE DATA</span>
        </div>
        
        <div className="flex-1 flex items-end justify-between gap-4 mt-4">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div 
                className="w-full bg-gradient-to-t from-zinc-900 to-zinc-500 rounded-2xl transition-all duration-500 group-hover:from-zinc-800 group-hover:to-zinc-400 group-hover:scale-105 shadow-lg shadow-black/10"
                style={{ height: `${d.height}%` }}
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                  {d.value} €
                </div>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground mt-4 truncate w-full text-center">
                {d.name}
              </span>
            </div>
          ))}
          {chartData.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground italic font-medium">
              Zatiaľ žiadne obchody na zobrazenie
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[350px]">
        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8">Pipeline Projektov</h3>
        
        <div className="space-y-6 flex-1 overflow-auto thin-scrollbar">
          {pipelineStages.map((stage, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="uppercase tracking-widest text-[11px] text-muted-foreground">{stage.label}</span>
                <span>{stage.count}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                   className="h-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
