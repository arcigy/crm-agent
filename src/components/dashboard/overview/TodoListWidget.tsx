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

  const title = mode === "today" ? "Úlohy na dnes" : "Tento týždeň";
  const Icon = mode === "today" ? Clock : Calendar;
  const badgeStyle = "bg-white/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm";

  return (
    <div className={`bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-2xl px-5 md:p-8 rounded-none md:rounded-[2.5rem] border-b md:border border-indigo-500/10 dark:border-indigo-500/5 flex flex-col overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'h-full py-5' : 'h-auto md:h-full py-3 md:py-8'}`}>
      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-emerald-500/20 transition-all duration-300" />
      
      {/* Header / Trigger */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full md:cursor-default relative z-20"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
          </div>
          <div className="flex flex-col items-start text-left">
            <h3 className="text-base md:text-xl font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">{title}</h3>
            {!isExpanded && (
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest md:hidden opacity-50">Dnešný zoznam úloh a priorít</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-black uppercase italic px-2 py-1 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-black/5 dark:border-white/5 md:flex hidden`}>
            {filteredTasks.filter(t => !t.completed).length} ÚLOH
          </span>
          <div className={`w-5 h-5 flex items-center justify-center transition-all duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`}>
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </button>

      <div className={`flex-1 flex flex-col transition-all duration-500 ${isExpanded ? 'mt-6 opacity-100 block' : 'hidden md:block md:mt-6 opacity-0 md:opacity-100'}`}>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-hide relative z-10">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isDone = task.completed;
            const isCompleting = false; // Simplified animation logic
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
                onClick={() => {}} // Remove row click handler
              >
                {/* Full-Row Dopamine Fill */}
                {isCompleting && (
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                      <div className="h-full w-full bg-[#16a34a] animate-full-fill shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]" />
                  </div>
                )}

                <div className="flex-shrink-0 relative z-10">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 
                    ${isDone ? 'bg-[#16a34a]' : 'bg-zinc-300 dark:bg-zinc-700 group-hover/item:bg-[#16a34a] group-hover/item:scale-125'}
                  `} />
                </div>

                <div className="flex-1 min-w-0 relative z-10 flex items-baseline justify-between gap-3">
                  <div className={`transition-all duration-300 flex-1 truncate
                    ${isDone ? 'text-emerald-700 dark:text-emerald-400 line-through decoration-emerald-500/50 decoration-2' : 'text-foreground font-black'}
                    ${isCompleting ? 'text-white' : ''}
                  `}>
                    <SmartText text={task.title} className="text-[14px] md:text-[15px] tracking-tight leading-none truncate block" />
                  </div>
                  
                  {showTime && (
                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors flex-shrink-0
                      ${isCompleting ? 'text-white/70' : 'text-muted-foreground'}
                    `}>
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
                        ? 'bg-emerald-500 border-emerald-500 hover:bg-red-500 hover:border-red-500' // Green normally, Red on hover
                        : 'bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95'}
                      ${isCompleting ? 'scale-110 bg-emerald-500 border-emerald-500 text-white' : ''}
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

                <style jsx>{`
                  @keyframes fullFill {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0); }
                  }
                  .animate-full-fill {
                    animation: fullFill 0.5s cubic-bezier(.17,.67,.19,.98) forwards;
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
    </div>

      <a href="/dashboard/todo" className="mt-4 text-center text-[10px] font-black text-zinc-400 hover:text-emerald-600 uppercase italic transition-colors relative z-10">
        Pozrieť všetky úlohy
      </a>
    </div>
  );
}
