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
  const { tasks, loading, add, toggle, remove } = useTasks();

  return (
    <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col gap-8 p-4 sm:p-8 animate-in fade-in duration-700">
      {/* Header & Input */}
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic leading-none">
                Daily / <span className="text-blue-600">Planner</span>
              </h1>
            </div>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] pl-1 opacity-70">
              High-performance flow state manager
            </p>
          </div>
          <div className="flex items-center gap-6 px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <Stat
              label="Hotovo"
              value={tasks.filter((t) => t.completed).length}
              color="text-emerald-500"
            />
            <div className="w-[1px] h-6 bg-zinc-200 dark:bg-zinc-800" />
            <Stat
              label="Zostáva"
              value={tasks.filter((t) => !t.completed).length}
              color="text-blue-500"
            />
          </div>
        </header>

        <TodoSmartInput
          onAdd={(title, time) => {
            let finalDate = selectedDate;
            if (time) {
              finalDate = `${selectedDate}T${time}:00`;
            }
            add(title, finalDate);
          }}
        />
      </div>

      {/* Main View */}
      <div className="flex-1 min-h-0">
        <TodoThreeDayView
          tasks={tasks}
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          onToggle={toggle}
          onDelete={remove}
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
