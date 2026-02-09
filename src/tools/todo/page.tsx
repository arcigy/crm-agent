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
  const { tasks, add, toggle, remove } = useTasks();

  return (
    <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-120px)] flex flex-col gap-6 p-4 animate-in fade-in duration-700">
      {/* Header & Input */}
      <div className="flex flex-col gap-4">
        <header className="flex items-end justify-between gap-6 mb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Úlohy
            </h1>
          </div>
          <div className="flex items-center gap-6 px-5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
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
            if (time) {
              const [year, month, day] = selectedDate.split("-").map(Number);
              const [hour, minute] = time.split(":").map(Number);
              const dateObj = new Date(year, month - 1, day, hour, minute);
              add(title, dateObj.toISOString());
            } else {
              // Just the date part. Directus timestamp fields accept YYYY-MM-DD.
              // This helps the UI know there is no specific time.
              add(title, selectedDate);
            }
          }}
        />
      </div>

      {/* Main View */}
      <div className="flex-1 min-h-0 overflow-hidden">
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
