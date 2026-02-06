"use client";

import { SmartText } from "@/components/todo/SmartText";
import { CheckCircle2, Clock, Calendar, Check, Undo2 } from "lucide-react";
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
    // Basic check: if it contains 'T' and isn't midnight exactly (common default for date-only)
    // Or check if the original string was likely a datetime
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
      // 1. Completion status
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      
      // 2. Tasks with time first
      const timeA = hasTime(a.due_date);
      const timeB = hasTime(b.due_date);
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;
      
      // 3. Chronological
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (animatingIds.some(a => a.id === id)) return;
    
    const type = currentStatus ? 'uncomplete' : 'complete';
    setAnimatingIds(prev => [...prev, { id, type }]);
    
    // Animation duration logic
    const waitTime = type === 'complete' ? 800 : 300;

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
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full w-full transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
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
            const showTime = hasTime(task.due_date);

            return (
              <div 
                key={task.id} 
                className={`flex items-start gap-4 p-3 rounded-2xl transition-all relative overflow-hidden group
                  ${isDone ? 'opacity-50 grayscale-[0.5] bg-emerald-500/5' : 'hover:bg-muted/30'}
                `}
              >
                {/* 1. Classic Dot (Left) */}
                <div className="mt-[7px] flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full transition-all duration-500 
                    ${isDone ? 'bg-emerald-500 scale-110' : 'bg-muted-foreground/30 group-hover:bg-blue-500/50'}
                  `} />
                </div>

                {/* 2. Content (Center) */}
                <div className="flex-1 min-w-0 relative z-10">
                  {/* Green Fill Animation Background */}
                  {isCompleting && (
                    <div className="absolute inset-0 -m-3 z-0 pointer-events-none overflow-hidden rounded-2xl">
                       <div className="h-full w-full bg-emerald-500/20 animate-bg-fill" />
                    </div>
                  )}

                  <div className={`transition-all duration-300 ${isDone ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}`}>
                    <SmartText text={task.title} className="text-sm font-bold leading-tight truncate block" />
                  </div>
                  
                  {showTime && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-medium uppercase">
                      <Icon className="w-3 h-3" />
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
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500/0 hover:border-emerald-500/40 hover:text-emerald-500/60 hover:bg-emerald-500/10'}
                  `}
                >
                  {isDone ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
                </button>

                <style jsx>{`
                  @keyframes bgFill {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0); }
                  }
                  .animate-bg-fill {
                    animation: bgFill 0.6s ease-out forwards;
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
