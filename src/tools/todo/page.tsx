"use client";

import React from "react";
import { useTasks } from "@/hooks/useTasks";
import { TodoSmartInput } from "@/components/todo/TodoSmartInput";
import { TodoThreeDayView } from "@/components/todo/TodoThreeDayView";

export default function TodoTool() {
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  // Load ALL tasks so we can filter them client-side for yesterday/today/tomorrow
  const { tasks, add, toggle, remove, update } = useTasks();

  return (
    <div className="w-full mx-auto h-full flex flex-col gap-4 p-2 md:p-4 animate-in fade-in duration-700">
      {/* Header & Input */}
      <div className="flex flex-col gap-4 relative z-50">
        <header className="flex items-end justify-between gap-6 mb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Úlohy
            </h1>
          </div>
          <div className="flex items-center gap-6 px-6 py-3 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            <Stat
              label="Hotovo"
              value={tasks.filter((t) => t.completed).length}
              color="text-emerald-500"
            />
            <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-800" />
            <Stat
              label="Zostáva"
              value={tasks.filter((t) => !t.completed).length}
              color="text-violet-500"
            />
          </div>
        </header>

        <TodoSmartInput
          initialSelectedDate={selectedDate}
          onAdd={(title, date, time) => {
            if (time) {
              const [year, month, day] = date.split("-").map(Number);
              const [hour, minute] = time.split(":").map(Number);
              const dateObj = new Date(year, month - 1, day, hour, minute);
              add(title, dateObj.toISOString());
            } else {
              add(title, date);
            }
          }}
        />
      </div>

      {/* Main View */}
      <div className="flex-1 min-h-0 relative z-10 pb-40">
        <TodoThreeDayView
          tasks={tasks}
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          onToggle={toggle}
          onDelete={remove}
          onUpdate={update}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-xl font-black tracking-tight ${color}`}>
        {value}
      </span>
      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">
        {label}
      </span>
    </div>
  );
}
