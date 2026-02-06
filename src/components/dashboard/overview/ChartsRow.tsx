import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { format, isToday, isThisWeek } from "date-fns";
import { sk } from "date-fns/locale";

export function ChartsRow({ deals, projects, tasks = [] }: { deals: any[]; projects: any[]; tasks?: any[] }) {
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

  const tasksToday = useMemo(() => tasks.filter(t => !t.completed && t.due_date && isToday(new Date(t.due_date))), [tasks]);
  const tasksWeek = useMemo(() => tasks.filter(t => !t.completed && t.due_date && isThisWeek(new Date(t.due_date), { weekStartsOn: 1 })), [tasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* 1. Tasks Summary (Replaces Posledné Obchody) */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[400px]">
        <div className="space-y-8">
          {/* Section: Today */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">Úlohy na dnes</h3>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full uppercase">Aktuálne</span>
            </div>
            <div className="space-y-3">
              {tasksToday.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-xl transition-all">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-sm font-bold text-foreground truncate flex-1">{task.title}</span>
                  <span className="text-[9px] font-bold text-muted-foreground">{task.due_date ? format(new Date(task.due_date), "HH:mm") : ""}</span>
                </div>
              ))}
              {tasksToday.length === 0 && <p className="text-xs text-muted-foreground italic ml-5">Žiadne úlohy na dnes</p>}
            </div>
          </div>

          {/* Section: This Week */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">Tento týždeň</h3>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full uppercase">Nasledujúce</span>
            </div>
            <div className="space-y-3">
              {tasksWeek.filter(t => !isToday(new Date(t.due_date))).slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-2 rounded-xl transition-all">
                  <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-sm font-bold text-foreground truncate flex-1 opacity-70 group-hover:opacity-100">{task.title}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">{task.due_date ? format(new Date(task.due_date), "eee", { locale: sk }) : ""}</span>
                </div>
              ))}
              {tasksWeek.length === 0 && <p className="text-xs text-muted-foreground italic ml-5">Tento týždeň bez plánov</p>}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border">
          <a href="/dashboard/todo" className="flex items-center justify-center gap-2 text-[10px] font-black uppercase italic text-zinc-500 hover:text-indigo-500 transition-colors">
            Spravovať všetky úlohy <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 2. Pipeline Status (Unchanged positions) */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[400px]">
        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8">Pipeline Projektov</h3>
        
        <div className="space-y-6 flex-1 overflow-auto thin-scrollbar">
          {pipelineStages.map((stage, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="uppercase tracking-widest text-[11px] text-muted-foreground">{stage.label}</span>
                <span>{stage.count}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                   className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${stage.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VISUALLY REMOVED ITEMS (Preserved functionality) */}
      <div className="hidden">
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
        </div>
      </div>
    </div>
  );
}
