"use client";

import { SmartText } from "@/components/todo/SmartText";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

export function TodoListWidget({ tasks }: { tasks: any[] }) {
  const todayTasks = tasks.filter(t => !t.completed).slice(0, 5);

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black uppercase italic tracking-tighter">Úlohy na dnes</h3>
        <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
          {todayTasks.length} TODO
        </span>
      </div>

      <div className="flex-1 space-y-4">
        {todayTasks.length > 0 ? (
          todayTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors group">
              <Circle className="w-5 h-5 text-muted-foreground mt-0.5 group-hover:text-blue-500 transition-colors" />
              <div className="flex-1">
                <SmartText text={task.title} className="text-sm font-bold text-foreground leading-tight" />
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-medium">
                  <Clock className="w-3 h-3" />
                  {task.due_date ? format(new Date(task.due_date), "HH:mm", { locale: sk }) : "Kedykoľvek"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
            <CheckCircle2 className="w-12 h-12 mb-2" />
            <p className="text-sm font-bold italic uppercase tracking-widest">Všetko hotové!</p>
          </div>
        )}
      </div>
      
      <a href="/dashboard/todo" className="mt-4 text-center text-xs font-black text-blue-600 uppercase italic hover:underline">
        Pozrieť všetky úlohy
      </a>
    </div>
  );
}
