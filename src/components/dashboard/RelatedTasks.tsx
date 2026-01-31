"use client";

import React, { useEffect, useState } from "react";
import { getTasksForEntity, Task } from "@/app/actions/tasks";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import { SmartText } from "@/components/todo/SmartText";

interface RelatedTasksProps {
  entityId: string | number;
  type: "contact" | "project";
}

export function RelatedTasks({ entityId, type }: RelatedTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getTasksForEntity(entityId, type);
      if (res.success && res.data) {
        setTasks(res.data);
      }
      setLoading(false);
    };
    load();
  }, [entityId, type]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Hľadám prepojené úlohy...
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-zinc-400 opacity-40">
        <CheckCircle2 className="w-12 h-12 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest">
          Žiadne prepojené úlohy
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="group bg-white dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 hover:border-blue-500/30 transition-all shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SmartText
                text={task.title}
                className={`text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${task.completed ? "line-through opacity-50" : ""}`}
              />
              {task.due_date && (
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  <Clock className="w-3 h-3" />
                  {new Date(task.due_date).toLocaleDateString("sk-SK")}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
