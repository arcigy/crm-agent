"use client";

import { SmartText } from "@/components/todo/SmartText";
import { CheckCircle2, Circle, Clock, Calendar, Check, Undo2 } from "lucide-react";
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

  const filteredTasks = localTasks
    .filter(t => {
      if (!t.due_date) return mode === "today";
      const taskDate = new Date(t.due_date);
      if (mode === "today") return isToday(taskDate);
      const nextWeek = isThisWeek(taskDate, { weekStartsOn: 1 });
      return nextWeek && !isToday(taskDate);
    })
    .sort((a, b) => {
      // Uncompleted first, then by date
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (animatingIds.some(a => a.id === id)) return;
    
    const type = currentStatus ? 'uncomplete' : 'complete';
    setAnimatingIds(prev => [...prev, { id, type }]);
    
    // Animation duration logic
    const waitTime = type === 'complete' ? 1000 : 400; // Longer for the "train" animation

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
  const badgeColor = mode === "today" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";

  return (
    <div className="bg-card px-8 py-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          {title}
        </h3>
        <span className={`text-[10px] font-bold px-2 py-1 ${badgeColor} rounded-lg`}>
          {filteredTasks.filter(t => !t.completed).length} TODO
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const animation = animatingIds.find(a => a.id === task.id);
            const isAnimating = !!animation;
            const isDone = task.completed;
            const isCompleting = animation?.type === 'complete';

            return (
              <div 
                key={task.id} 
                className={`flex items-start gap-3 p-3 rounded-2xl transition-all relative overflow-hidden group
                  ${isDone ? 'opacity-50 grayscale-[0.5]' : 'hover:bg-muted/30'}
                  ${isCompleting ? 'bg-emerald-500/20' : ''}
                `}
              >
                {/* Toggle Button */}
                <button
                  onClick={() => handleToggle(task.id, !!isDone)}
                  disabled={isAnimating}
                  className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all mt-0.5 z-20
                    ${isDone 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500/0 hover:border-emerald-500/40 hover:text-emerald-500/60 hover:bg-emerald-500/10'}
                  `}
                >
                  {isDone ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
                </button>

                <div className="flex-1 min-w-0 relative z-10">
                  {/* Task Strike-through Animation (Train + Line) */}
                  {(isCompleting || (isDone && !isAnimating)) && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                       <div className={`h-[1px] bg-zinc-400 dark:bg-zinc-500 absolute top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(156,163,175,0.6)]
                         ${isCompleting ? 'animate-strike-train' : 'w-full'}
                       `} />
                    </div>
                  )}

                  <div className={`transition-all duration-300 ${isDone && !isCompleting ? 'text-zinc-400 dark:text-zinc-500' : ''}`}>
                    <SmartText text={task.title} className="text-sm font-bold leading-tight truncate block" />
                  </div>
                  
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-medium uppercase">
                    <Icon className="w-3 h-3" />
                    {task.due_date ? format(new Date(task.due_date), mode === "today" ? "HH:mm" : "eee HH:mm", { locale: sk }) : "Kedykoľvek"}
                  </div>
                </div>

                <style jsx>{`
                  @keyframes strikeTrain {
                    0% { left: -100%; width: 0%; opacity: 0.5; }
                    40% { left: 0%; width: 100%; opacity: 1; }
                    100% { left: 0%; width: 100%; opacity: 1; }
                  }
                  .animate-strike-train {
                    animation: strikeTrain 0.6s cubic-bezier(.17,.67,.83,.67) forwards;
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
