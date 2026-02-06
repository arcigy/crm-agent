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
    
    // Dopamine delay - let the animation shine
    const waitTime = type === 'complete' ? 1000 : 300;

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
  
  // Nice gray badge style for ÚLOH
  const badgeStyle = "bg-[#f4f4f5] dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50";

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          {title}
        </h3>
        <span className={`text-[9px] font-black px-2.5 py-1.5 ${badgeStyle} rounded-xl tracking-[0.1em]`}>
          {filteredTasks.filter(t => !t.completed).length} ÚLOH
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
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
                className={`flex items-start gap-4 p-3.5 rounded-2xl transition-all relative overflow-hidden group border
                  ${isDone 
                    ? 'opacity-40 grayscale-[0.5] bg-emerald-500/10 border-emerald-500/20' 
                    : 'bg-white dark:bg-zinc-900/50 border-black/15 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 shadow-sm'}
                  ${isCompleting ? 'scale-[1.02] shadow-xl z-30' : 'z-10'}
                `}
              >
                {/* 1. Classic Dot (Left) with pulse on hover */}
                <div className="mt-[7px] flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 
                    ${isDone ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-700 group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]'}
                  `} />
                </div>

                {/* 2. Content (Center) */}
                <div className="flex-1 min-w-0 relative">
                  {/* Dopamine Green Fill Animation */}
                  {isCompleting && (
                    <div className="absolute inset-0 -m-4 z-0 pointer-events-none overflow-hidden rounded-2xl">
                       <div className="h-full w-full bg-[#10b981] animate-dopamine-fill shadow-[inset_0_0_30px_rgba(0,0,0,0.1)]" />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Sparkles className="w-5 h-5 text-white animate-bounce" />
                       </div>
                    </div>
                  )}

                  <div className={`transition-all duration-500 relative z-10 
                    ${isDone ? 'text-emerald-900 dark:text-emerald-100 italic' : 'text-foreground font-bold'}
                    ${isCompleting ? 'text-white translate-x-1' : ''}
                  `}>
                    <SmartText text={task.title} className="text-sm tracking-tight leading-tight truncate block" />
                  </div>
                  
                  {showTime && (
                    <div className={`flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors
                      ${isCompleting ? 'text-white/80' : 'text-muted-foreground'}
                    `}>
                      <Icon className="w-3 h-3" />
                      {format(new Date(task.due_date), mode === "today" ? "HH:mm" : "eee HH:mm", { locale: sk })}
                    </div>
                  )}
                </div>

                {/* 3. Toggle Button (Right) */}
                <button
                  onClick={() => handleToggle(task.id, !!isDone)}
                  disabled={isAnimating}
                  className={`flex-shrink-0 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all mt-0.5 z-20 
                    ${isDone 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-transparent hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/5'}
                    ${isCompleting ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}
                  `}
                >
                  {isDone ? <Undo2 className="w-4 h-4" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                </button>

                <style jsx>{`
                  @keyframes dopamineFill {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(0); opacity: 1; }
                  }
                  .animate-dopamine-fill {
                    animation: dopamineFill 0.7s cubic-bezier(.17,.67,.19,.98) forwards;
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
