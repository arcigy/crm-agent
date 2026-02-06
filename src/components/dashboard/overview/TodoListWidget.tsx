"use client";

import { SmartText } from "@/components/todo/SmartText";
import { CheckCircle2, Clock, Calendar, Check, Undo2, Sparkles } from "lucide-react";
import { format, isToday, isThisWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { useState, useEffect } from "react";
import { toggleTaskStatus } from "@/app/actions/tasks";
import { toast } from "sonner";

interface TodoListWidgetProps {
  tasks: any[];
  mode?: "today" | "week";
}

export function TodoListWidget({ tasks, mode = "today" }: TodoListWidgetProps) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [animatingIds, setAnimatingIds] = useState<{ id: string, type: 'complete' | 'uncomplete' }[]>([]);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const hasTime = (dateStr?: string) => {
    if (!dateStr) return false;
    return dateStr.includes('T') && !dateStr.includes('00:00:00');
  };

  const filteredTasks = localTasks
    .filter(t => {
      if (!t.due_date) return mode === "today";
      const taskDate = new Date(t.due_date);
      if (mode === "today") return isToday(taskDate);
      const nextWeek = isThisWeek(taskDate, { weekStartsOn: 1 });
      return nextWeek && !isToday(taskDate);
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const timeA = hasTime(a.due_date);
      const timeB = hasTime(b.due_date);
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (animatingIds.some(a => a.id === id)) return;
    
    const type = currentStatus ? 'uncomplete' : 'complete';
    setAnimatingIds(prev => [...prev, { id, type }]);
    
    // Dopamine delay
    const waitTime = type === 'complete' ? 850 : 250;

    setTimeout(async () => {
      try {
        const res = await toggleTaskStatus(id, !currentStatus);
        if (res.success) {
          setLocalTasks(prev => 
            prev.map(t => t.id === id ? { ...t, completed: !currentStatus } : t)
          );
        } else {
          toast.error("Chyba synchronizácie");
        }
      } catch (e) {
        toast.error("Chyba pripojenia");
      } finally {
        setAnimatingIds(prev => prev.filter(item => item.id !== id));
      }
    }, waitTime);
  };

  const title = mode === "today" ? "Úlohy na dnes" : "Tento týždeň";
  const Icon = mode === "today" ? Clock : Calendar;
  
  // Clean gray badge style
  const badgeStyle = "bg-[#f4f4f5] dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50";

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          {title}
        </h3>
        {/* Same font as calendar week header */}
        <span className={`text-[10px] font-black uppercase italic px-3 py-1.5 ${badgeStyle} rounded-xl tracking-tight`}>
          {filteredTasks.filter(t => !t.completed).length} ÚLOH
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-hide">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const animation = animatingIds.find(a => a.id === task.id);
            const isAnimating = !!animation;
            const isDone = task.completed;
            const isCompleting = animation?.type === 'complete';
            const showTime = hasTime(task.due_date);

            return (
              <div 
                key={task.id} 
                className={`flex items-start gap-4 p-2.5 rounded-xl transition-all relative overflow-hidden group border
                  ${isDone 
                    ? 'opacity-40 grayscale-[0.8] bg-emerald-500/5 border-emerald-500/10' 
                    : 'bg-white dark:bg-zinc-900/50 border-black/10 dark:border-white/5 hover:border-black/30 dark:hover:border-white/30 hover:bg-muted/10'}
                  ${isCompleting ? 'scale-[1.01] shadow-lg z-30' : 'z-10'}
                `}
              >
                {/* 1. Classic Dot (Left) */}
                <div className="mt-[7px] flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full transition-all duration-500 
                    ${isDone ? 'bg-[#16a34a] shadow-[0_0_8px_rgba(22,163,74,0.4)]' : 'bg-zinc-300 dark:bg-zinc-700 group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]'}
                  `} />
                </div>

                {/* 2. Content (Center) */}
                <div className="flex-1 min-w-0 relative">
                  {/* Perfect Lawn Green Fill Animation */}
                  {isCompleting && (
                    <div className="absolute inset-0 -m-3 z-0 pointer-events-none overflow-hidden rounded-xl">
                       <div className="h-full w-full bg-[#16a34a] animate-lawn-fill shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]" />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Sparkles className="w-4 h-4 text-white animate-pulse" />
                       </div>
                    </div>
                  )}

                  <div className={`transition-all duration-500 relative z-10 
                    ${isDone ? 'text-[#15803d] dark:text-[#4ade80] italic' : 'text-foreground font-bold'}
                    ${isCompleting ? 'text-white' : ''}
                  `}>
                    <SmartText text={task.title} className="text-[13px] tracking-tight leading-tight truncate block" />
                  </div>
                  
                  {showTime && (
                    <div className={`flex items-center gap-1 mt-0.5 text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors
                      ${isCompleting ? 'text-white/70' : 'text-muted-foreground'}
                    `}>
                      <Icon className="w-2.5 h-2.5" />
                      {format(new Date(task.due_date), mode === "today" ? "HH:mm" : "eee HH:mm", { locale: sk })}
                    </div>
                  )}
                </div>

                {/* 3. Toggle Button (Right) */}
                <button
                  onClick={() => handleToggle(task.id, !!isDone)}
                  disabled={isAnimating}
                  className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all mt-0.5 z-20 
                    ${isDone 
                      ? 'bg-[#16a34a] border-[#22c55e] text-white shadow-md shadow-[#16a34a]/20' 
                      : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-transparent hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-emerald-500/5'}
                    ${isCompleting ? 'opacity-0' : 'opacity-100'}
                  `}
                >
                  {isDone ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </button>

                <style jsx>{`
                  @keyframes lawnFill {
                    0% { transform: translateX(-105%); }
                    100% { transform: translateX(0); }
                  }
                  .animate-lawn-fill {
                    animation: lawnFill 0.55s cubic-bezier(.17,.67,.19,.98) forwards;
                  }
                `}</style>
              </div>
            );
          })
        ) : (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center opacity-40">
            <CheckCircle2 className="w-8 h-8 mb-1" />
            <p className="text-[10px] font-bold italic uppercase tracking-widest">Pohoda, nič tu nie je</p>
          </div>
        )}
      </div>
      
      <a href="/dashboard/todo" className="mt-4 text-center text-[10px] font-black text-zinc-400 hover:text-emerald-600 uppercase italic transition-colors">
        Pozrieť všetky úlohy
      </a>
    </div>
  );
}
