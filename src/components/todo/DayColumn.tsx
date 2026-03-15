"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { TaskItem } from "./TaskItem";
import { useDroppable } from "@dnd-kit/core";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
}

interface DayColumnProps {
  id: string;
  title: string;
  date: Date;
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  variant: "center" | "side";
  onClick?: () => void;
}

export function DayColumn({
  id,
  title,
  date,
  tasks,
  onToggle,
  onDelete,
  onUpdate,
  variant,
  onClick,
}: DayColumnProps) {
  const isCenter = variant === "center";
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`
        relative flex flex-col h-[450px] md:h-[500px] rounded-[2.5rem] overflow-hidden flex-shrink-0 transition-all duration-500 border w-full
        ${isOver ? "bg-violet-500/5 ring-2 ring-violet-500/20" : "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl"}
        ${
          isCenter
            ? "border-violet-500/40 dark:border-violet-500/30 shadow-[0_40px_80px_rgba(0,0,0,0.3)] z-30 scale-[1.03]"
            : "border-zinc-200 dark:border-zinc-800 shadow-sm opacity-95 hover:opacity-100 cursor-pointer hover:shadow-md"
        }
      `}
    >
      {isCenter && (
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
      )}
      {/* Header */}
      <div className={`p-5 border-b ${isCenter ? "border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900" : "border-transparent"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`font-black uppercase tracking-[0.2em] italic text-xs ${isCenter ? "text-violet-500" : "text-zinc-400"}`}>
            {title}
          </span>
          <span className="text-[10px] font-black uppercase text-violet-500 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full italic tracking-widest">
            {tasks.length} {tasks.length === 1 ? 'úloha' : tasks.length < 5 ? 'úlohy' : 'úloh'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`font-black tracking-tighter italic text-4xl ${isCenter ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-300"}`}>
            {format(date, "d.")}
          </span>
          <span className="font-bold uppercase tracking-wider text-sm text-zinc-400">
            {format(date, "MMMM", { locale: sk })}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-4 space-y-3 scrollbar-hide">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              isCenter={isCenter}
              onDelete={onDelete}
              onUpdate={onUpdate}
              columnDate={format(date, "yyyy-MM-dd")}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2 py-12">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Prázdno</span>
          </div>
        )}
      </div>
    </div>
  );
}
