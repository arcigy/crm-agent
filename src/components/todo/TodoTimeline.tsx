"use client";

import React from "react";
import { Clock, CheckCircle2, Circle } from "lucide-react";

interface TodoTimelineProps {
  tasks: any[];
  onToggle: (id: string, completed: boolean) => void;
}

export function TodoTimeline({ tasks, onToggle }: TodoTimelineProps) {
  // Filter tasks that have a specific hour in due_date
  // Assuming due_date reflects a timestamp if hour is present
  const hourlyTasks = tasks.filter(
    (t) => t.due_date && t.due_date.includes("T"),
  );

  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 to 21:00

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-8 border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
          <Clock className="text-blue-500" size={20} />
          Denný / <span className="text-blue-600">Timeline</span>
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Dnes: {new Date().toLocaleDateString("sk-SK")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-2">
        {hours.map((hour) => {
          const tasksAtHour = hourlyTasks.filter((t) => {
            const date = new Date(t.due_date);
            return date.getHours() === hour;
          });

          return (
            <div key={hour} className="flex gap-4 group min-h-[4rem]">
              <div className="w-12 pt-1">
                <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 tabular-nums">
                  {hour.toString().padStart(2, "0")}:00
                </span>
              </div>

              <div className="flex-1 border-l-2 border-zinc-50 dark:border-zinc-800/50 pl-6 pb-6 relative">
                <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 group-hover:bg-blue-500 transition-colors" />

                <div className="space-y-2">
                  {tasksAtHour.length > 0 ? (
                    tasksAtHour.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onToggle(task.id, task.completed)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border ${task.completed ? "bg-zinc-50 dark:bg-zinc-800/50 border-transparent opacity-50" : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 hover:scale-[1.02] shadow-sm"}`}
                      >
                        <div className="flex items-center gap-3">
                          {task.completed ? (
                            <CheckCircle2 size={14} className="text-zinc-400" />
                          ) : (
                            <Circle size={14} className="text-blue-500" />
                          )}
                          <span
                            className={`text-xs font-bold ${task.completed ? "line-through text-zinc-400" : "text-blue-900 dark:text-blue-200"}`}
                          >
                            {task.title}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-8 flex items-center">
                      <div className="w-full h-[1px] bg-zinc-50 dark:bg-zinc-800/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
