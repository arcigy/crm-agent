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
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Removed animatingIds for rapid toggling support

  useEffect(() => {
    // Only update if tasks prop changes (deep comparison would be better but this is a start)
    // We want to avoid overwriting local optimistic state unnecessarily
    if (JSON.stringify(tasks) !== JSON.stringify(localTasks)) {
        setLocalTasks(tasks);
    }
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
    // Optimistic update immediately - allow rapid toggling
    setLocalTasks(prev => 
      prev.map(t => t.id === id ? { ...t, completed: !currentStatus } : t)
    );
    
    try {
      // Fire and forget - if it fails, we revert
      const res = await toggleTaskStatus(id, !currentStatus);
      if (!res.success) {
        // Revert on error
        setLocalTasks(prev => 
          prev.map(t => t.id === id ? { ...t, completed: currentStatus } : t)
        );
        toast.error("Chyba synchronizácie");
      }
    } catch (e) {
      // Revert on error
      setLocalTasks(prev => 
        prev.map(t => t.id === id ? { ...t, completed: currentStatus } : t)
      );
      toast.error("Chyba pripojenia");
    }
  };

  if (!mounted) return null;

  const title = mode === "today" ? "Úlohy na dnes" : "Tento týždeň";
  const Icon = mode === "today" ? Clock : Calendar;
  const badgeStyle = "bg-white/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm";

  return (
    <div className={`bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl px-5 md:px-8 pt-2 md:pt-3 pb-4 md:pb-6 rounded-none md:rounded-[2.5rem] border-b md:border border-emerald-500/20 dark:border-emerald-500/20 flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full' : 'h-auto md:h-full shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1.5'}`}>
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/30 transition-all duration-300" />
      
      {/* Header / Trigger */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full md:cursor-default relative z-20 cursor-pointer md:cursor-auto mb-2 md:mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl md:bg-emerald-500/10 bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 md:border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
          </div>
          <div className="flex flex-col items-start text-left">
            <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">{title}</h3>
            <span className="text-[7px] text-zinc-500 font-black uppercase tracking-widest md:hidden opacity-60">Dnešný zoznam úloh</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`${isExpanded ? 'flex' : 'hidden'} md:flex items-center gap-3`}>
            <span className={`text-[8px] font-black uppercase italic px-2 py-0.5 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-black/5 dark:border-white/5 text-zinc-500`}>
              {filteredTasks.filter(t => !t.completed).length} ÚLOH
            </span>
          </div>
          <div className={`w-5 h-5 flex items-center justify-center transition-all duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`}>
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ${isExpanded ? 'opacity-100 block' : 'hidden md:block opacity-0 md:opacity-100'}`}>
        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 thin-scrollbar relative z-10">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isDone = task.completed;
              const isCompleting = false; 
              const showTime = hasTime(task.due_date);

              return (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-4 p-3 rounded-2xl transition-all relative overflow-hidden group/item border shadow-none
                    ${isDone 
                      ? 'bg-emerald-500/10 border-emerald-500/20' 
                      : 'bg-white/60 dark:bg-zinc-900/40 border-black/10 dark:border-white/5 hover:bg-[#16a34a]/10 hover:border-[#16a34a]/30 cursor-pointer'}
                    ${isCompleting ? 'scale-[1.01] z-30' : 'z-10'}
                  `}
                >
                  <div className="flex-shrink-0 relative z-10">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 
                      ${isDone ? 'bg-[#16a34a]' : 'bg-zinc-300 dark:bg-zinc-700 group-hover/item:bg-[#16a34a] group-hover/item:scale-125'}
                    `} />
                  </div>

                  <div className="flex-1 min-w-0 relative z-10 flex items-baseline justify-between gap-3">
                    <div className={`transition-all duration-300 flex-1 truncate
                      ${isDone ? 'text-emerald-700 dark:text-emerald-400 line-through decoration-emerald-500/50 decoration-2' : 'text-foreground font-black'}
                    `}>
                      <SmartText text={task.title} className="text-[14px] md:text-[15px] tracking-tight leading-none truncate block" />
                    </div>
                    
                    {showTime && (
                      <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors flex-shrink-0 text-muted-foreground`}>
                        <Icon className="w-2.5 h-2.5" />
                        {format(new Date(task.due_date), mode === "today" ? "HH:mm" : "eee HH:mm", { locale: sk })}
                      </div>
                    )}
                  </div>

                  <div className="relative z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(task.id, !!isDone);
                      }}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 group/btn
                        ${isDone 
                          ? 'bg-emerald-500 border-emerald-500 hover:bg-red-500 hover:border-red-500'
                          : 'bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95'}
                      `}
                    >
                      {isDone ? (
                        <div className="relative w-3.5 h-3.5">
                          <Check className="absolute inset-0 w-3.5 h-3.5 text-white scale-100 group-hover/btn:scale-0 transition-transform" strokeWidth={3} />
                          <Undo2 className="absolute inset-0 w-3.5 h-3.5 text-white scale-0 group-hover/btn:scale-100 transition-transform" />
                        </div>
                      ) : (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      )}
                    </button>
                  </div>
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
        
        <a href="/dashboard/todo" className="mt-4 text-center text-[10px] font-black text-zinc-400 hover:text-emerald-600 uppercase italic transition-colors relative z-10">
          Pozrieť všetky úlohy
        </a>
      </div>
    </div>
  );
}
