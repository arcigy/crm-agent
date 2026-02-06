"use client";

import { SmartText } from "@/components/todo/SmartText";
import { CheckCircle2, Circle, Clock, Calendar } from "lucide-react";
import { format, isToday, isThisWeek, addDays } from "date-fns";
import { sk } from "date-fns/locale";

interface TodoListWidgetProps {
  tasks: any[];
  mode?: "today" | "week";
}

export function TodoListWidget({ tasks, mode = "today" }: TodoListWidgetProps) {
  const filteredTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (!t.due_date) return mode === "today"; // Show undated in today
    
    const taskDate = new Date(t.due_date);
    if (mode === "today") {
      return isToday(taskDate);
    } else {
      // Show tasks for the next 7 days, excluding today
      const nextWeek = isThisWeek(taskDate, { weekStartsOn: 1 });
      return nextWeek && !isToday(taskDate);
    }
  });

  const title = mode === "today" ? "Úlohy na dnes" : "Tento týždeň";
  const Icon = mode === "today" ? Clock : Calendar;
  const badgeColor = mode === "today" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div className="bg-card px-8 py-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full max-h-[400px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          {title}
        </h3>
        <span className={`text-[10px] font-bold px-2 py-1 ${badgeColor} rounded-lg`}>
          {filteredTasks.length} TODO
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-muted/50 transition-colors group">
              <Circle className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-blue-500 transition-colors" />
              <div className="flex-1 min-w-0">
                <SmartText text={task.title} className="text-sm font-bold text-foreground leading-tight truncate block" />
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-medium uppercase">
                  <Icon className="w-3 h-3" />
                  {task.due_date ? format(new Date(task.due_date), mode === "today" ? "HH:mm" : "eee HH:mm", { locale: sk }) : "Kedykoľvek"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center opacity-40">
            <CheckCircle2 className="w-8 h-8 mb-1" />
            <p className="text-[10px] font-bold italic uppercase tracking-widest">Pohoda, nič tu nie je</p>
          </div>
        )}
      </div>
      
      <a href="/dashboard/todo" className="mt-4 text-center text-[10px] font-black text-zinc-400 hover:text-blue-600 uppercase italic transition-colors">
        Pozrieť všetky úlohy
      </a>
    </div>
  );
}
