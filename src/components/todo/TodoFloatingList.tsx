"use client";

import React from "react";
import { ListChecks, Trash2, CheckCircle2, Circle } from "lucide-react";
import { SmartText } from "./SmartText";

interface TodoFloatingListProps {
  tasks: any[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TodoFloatingList({
  tasks,
  onToggle,
  onDelete,
}: TodoFloatingListProps) {
  // Filter tasks that don't have an hour portion (floating tasks)
  const floatingTasks = tasks.filter(
    (t) => !t.due_date || !t.due_date.includes("T"),
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
          <ListChecks className="text-emerald-500" size={20} />
          Voľné / <span className="text-emerald-600">Úlohy</span>
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {floatingTasks.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-3">
        {floatingTasks.length > 0 ? (
          floatingTasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${task.completed ? "bg-zinc-50 dark:bg-zinc-800/30 border-transparent opacity-50 grayscale" : "bg-white dark:bg-zinc-800 border-zinc-50 dark:border-zinc-700 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-100 dark:hover:border-emerald-900"}`}
            >
              <button
                onClick={() => onToggle(task.id, task.completed)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${task.completed ? "bg-emerald-500 text-white" : "text-zinc-200 border-2 border-zinc-100 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-500"}`}
              >
                {task.completed ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Circle size={16} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <SmartText
                  text={task.title}
                  className={`block font-bold text-sm leading-tight truncate ${task.completed ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-200"}`}
                />
                {task.due_date && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-60 mt-1 block">
                    Dnes
                  </span>
                )}
              </div>

              <button
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
            <ListChecks size={48} className="mb-4" />
            <p className="text-xs font-bold">Žiadne voľné úlohy</p>
          </div>
        )}
      </div>
    </div>
  );
}
