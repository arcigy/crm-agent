"use client";

import React from "react";
import { useTasks } from "@/hooks/useTasks";
import { TodoSmartInput } from "@/components/todo/TodoSmartInput";
import { TodoTimeline } from "@/components/todo/TodoTimeline";
import { TodoFloatingList } from "@/components/todo/TodoFloatingList";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TodoTool() {
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const { tasks, loading, add, toggle, remove } = useTasks(selectedDate);

  const changeDay = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (dateStr === today) return "Dnes";
    if (dateStr === tomorrowStr) return "Zajtra";
    return date.toLocaleDateString("sk-SK", { day: "numeric", month: "long" });
  };

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
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <NavButton
                  onClick={() => changeDay(-1)}
                  icon={<ChevronLeft size={20} />}
                />
                <div className="px-4 py-1 text-sm font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                  {formatDate(selectedDate)}
                </div>
                <NavButton
                  onClick={() => changeDay(1)}
                  icon={<ChevronRight size={20} />}
                />
              </div>
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

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        <div className="lg:col-span-7 h-[70vh] lg:h-auto">
          <TodoTimeline tasks={tasks} onToggle={toggle} />
        </div>
        <div className="lg:col-span-5 h-[70vh] lg:h-auto">
          <TodoFloatingList tasks={tasks} onToggle={toggle} onDelete={remove} />
        </div>
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

function NavButton({
  onClick,
  icon,
}: {
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all hover:shadow-sm"
    >
      {icon}
    </button>
  );
}
