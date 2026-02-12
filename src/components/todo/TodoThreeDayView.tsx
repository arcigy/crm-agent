"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
} from "lucide-react";
import { SmartText } from "./SmartText";
import { format, addDays, subDays, parseISO } from "date-fns";
import { sk } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
}

interface TodoThreeDayViewProps {
  tasks: Task[];
  currentDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
}

export function TodoThreeDayView({
  tasks,
  currentDate,
  onDateChange,
  onToggle,
  onDelete,
  onUpdate,
}: TodoThreeDayViewProps) {
  const current = new Date(currentDate);
  const yesterday = subDays(current, 1);
  const tomorrow = addDays(current, 1);

  // Helper for relative labels
  const getRelativeDateLabel = (date: Date) => {
    const today = new Date();
    const dStr = format(date, "yyyy-MM-dd");
    const tStr = format(today, "yyyy-MM-dd");
    const yStr = format(subDays(today, 1), "yyyy-MM-dd");
    const tmStr = format(addDays(today, 1), "yyyy-MM-dd");

    if (dStr === tStr) return "Dnes";
    if (dStr === yStr) return "Včera";
    if (dStr === tmStr) return "Zajtra";
    return format(date, "EEEE", { locale: sk });
  };

  // Filter tasks
  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks
      .filter((t) => {
        if (!t.due_date) return false;
        return t.due_date.startsWith(dateStr);
      })
      .sort((a, b) => {
        // Sort by time if available, otherwise push to bottom ("00:00" is start, so we use "99:99" for end)
        const aTime = a.due_date?.includes("T")
          ? a.due_date.split("T")[1].substring(0, 5)
          : "99:99";
        const bTime = b.due_date?.includes("T")
          ? b.due_date.split("T")[1].substring(0, 5)
          : "99:99";
        return aTime.localeCompare(bTime);
      });
  };

  const yesterdayTasks = getTasksForDate(yesterday);
  const todayTasks = getTasksForDate(current);
  const tomorrowTasks = getTasksForDate(tomorrow);

  return (
    <div className="flex flex-col h-full gap-4 select-none relative">
      <style jsx global>{`
        @keyframes fullFill {
          0% { transform: scaleX(0); opacity: 0; }
          15% { transform: scaleX(1); opacity: 1; }
          85% { transform: scaleX(1); opacity: 0.8; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .animate-full-fill {
          animation: fullFill 0.8s cubic-bezier(.17,.67,.19,.98) forwards;
          transform-origin: left;
        }
      `}</style>

      {/* Navigation Header - Centered for Today */}
      <div className="flex items-center justify-between px-4 mb-4">
        <button
          onClick={() => onDateChange(format(yesterday, "yyyy-MM-dd"))}
          className="group/nav text-xs font-black text-zinc-400 uppercase tracking-widest hover:text-blue-500 flex items-center gap-2 transition-all active:scale-95 select-none"
        >
          <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover/nav:bg-blue-50 dark:group-hover/nav:bg-blue-900/30 group-hover/nav:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
            <ChevronLeft size={18} />
          </div>
          <span className="hidden sm:inline">{getRelativeDateLabel(yesterday)}</span>
        </button>

        <div className="flex flex-col items-center relative gap-1 select-none">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter italic">
              {format(current, "EEEE", { locale: sk })}
            </h2>
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight shadow-lg shadow-blue-500/20">
              {getRelativeDateLabel(current) === "Dnes" ? "Dnes" : format(current, "d. MMMM", { locale: sk })}
            </div>
          </div>

          <div className="relative group flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest transition-all group-hover:text-blue-500 whitespace-nowrap">
              {format(current, "dd. MM. yyyy")}
            </span>
            <div className="relative cursor-pointer p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors group/cal">
              <CalendarIcon
                size={16}
                className="text-zinc-400 group-hover/cal:text-blue-500 transition-colors"
              />
              <input
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => onDateChange(format(tomorrow, "yyyy-MM-dd"))}
          className="group/nav text-xs font-black text-zinc-400 uppercase tracking-widest hover:text-blue-500 flex items-center gap-2 transition-all active:scale-95 select-none text-right"
        >
          <span className="hidden sm:inline">{getRelativeDateLabel(tomorrow)}</span>
          <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover/nav:bg-blue-50 dark:group-hover/nav:bg-blue-900/30 group-hover/nav:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
            <ChevronRight size={18} />
          </div>
        </button>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* YESTERDAY */}
        <DayColumn
          title={getRelativeDateLabel(yesterday)}
          date={yesterday}
          tasks={yesterdayTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
          variant="side"
          onClick={() => onDateChange(format(yesterday, "yyyy-MM-dd"))}
        />

        {/* TODAY */}
        <DayColumn
          title={getRelativeDateLabel(current)}
          date={current}
          tasks={todayTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
          variant="center"
        />

        {/* TOMORROW */}
        <DayColumn
          title={getRelativeDateLabel(tomorrow)}
          date={tomorrow}
          tasks={tomorrowTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
          variant="side"
          onClick={() => onDateChange(format(tomorrow, "yyyy-MM-dd"))}
        />
      </div>
    </div>
  );
}

interface DayColumnProps {
  title: string;
  date: Date;
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  variant: "center" | "side";
  onClick?: () => void;
}

function DayColumn({
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

  return (
    <div
      onClick={onClick}
      className={`
        flex flex-col h-full rounded-[2.5rem] overflow-hidden transition-all duration-300 border
        ${
          isCenter
            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm scale-100 z-10"
            : "bg-zinc-50 dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-900 hover:scale-[1.02] cursor-pointer scale-95"
        }
      `}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          isCenter
            ? "border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900"
            : "border-transparent"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`font-black uppercase tracking-widest ${
              isCenter ? "text-sm text-blue-600" : "text-xs text-zinc-400"
            }`}
          >
            {title}
          </span>
          {isCenter && (
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
              {tasks.length} úloh
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`font-black tracking-tight ${
              isCenter
                ? "text-3xl text-zinc-900 dark:text-white"
                : "text-xl text-zinc-500"
            }`}
          >
            {format(date, "d.")}
          </span>
          <span
            className={`font-bold uppercase tracking-wider ${
              isCenter ? "text-sm text-zinc-400" : "text-[10px] text-zinc-300"
            }`}
          >
            {format(date, "MMMM", { locale: sk })}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
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
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Prázdno
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
  isCenter,
  columnDate,
}: {
  task: Task;
  onToggle: (id: string, s: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  isCenter: boolean;
  columnDate: string;
}) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(task.title);

  // Extract time if exists in due_date (YYYY-MM-DDTHH:mm:ss)
  const time =
    task.due_date && task.due_date.includes("T")
      ? format(parseISO(task.due_date), "HH:mm")
      : null;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 800);
    }
    onToggle(task.id, task.completed);
  };

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!task.completed) {
          setIsEditing(true);
        }
      }}
      className={`group relative p-3 rounded-2xl transition-all duration-300 border overflow-hidden ${
        task.completed
          ? "bg-zinc-50/50 dark:bg-zinc-800/20 border-transparent opacity-50"
          : isCenter
            ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-blue-400/50 dark:hover:border-blue-500/30"
            : "bg-white/40 dark:bg-zinc-900/40 border-transparent hover:bg-white hover:border-zinc-200"
      }`}
    >
      <style jsx>{`
        @keyframes neonFlash {
          0% { transform: scaleX(0); opacity: 0; background: #22c55e; }
          15% { transform: scaleX(1); opacity: 1; background: #4ade80; box-shadow: 0 0 30px #22c55e; }
          85% { transform: scaleX(1); opacity: 0.8; background: #22c55e; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .animate-neon-flash {
          animation: neonFlash 0.8s cubic-bezier(.17,.67,.19,.98) forwards;
          transform-origin: left;
        }
      `}</style>
      
      {isAnimating && (
        <div className="absolute inset-0 bg-[#22c55e]/30 animate-neon-flash z-0" />
      )}

      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={handleToggle}
          className={`flex-shrink-0 transition-all duration-300 transform active:scale-75 ${
            task.completed
              ? "text-[#22c55e]"
              : "text-zinc-300 hover:text-blue-500"
          }`}
        >
          {task.completed ? (
            <CheckCircle2 size={isCenter ? 22 : 18} strokeWidth={3} className="drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
          ) : (
            <Circle size={isCenter ? 22 : 18} strokeWidth={2.5} />
          )}
        </button>

        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center justify-between gap-3">
            {isEditing ? (
              <input
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-sm font-black text-zinc-900 dark:text-white p-0 m-0 w-full placeholder-zinc-400 italic"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex-1 truncate">
                <SmartText
                  text={task.title}
                  className={`text-sm font-black tracking-tight leading-none ${
                    task.completed
                      ? "line-through text-zinc-400 italic"
                      : "text-zinc-800 dark:text-zinc-100"
                  }`}
                />
              </div>
            )}
            
            {!isEditing && (
              <div 
                className="relative flex-shrink-0 group/timepicker"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`
                   flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all duration-300 border
                   ${time 
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50 shadow-sm" 
                      : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-dashed border-zinc-200 dark:border-zinc-700 opacity-60 group-hover/timepicker:opacity-100 group-hover/timepicker:border-blue-400/50 group-hover/timepicker:text-blue-500"}
                `}>
                  <Clock size={11} className={time ? "text-blue-500" : ""} />
                  <span className="whitespace-nowrap">{time || "Čas"}</span>
                </div>
                <input
                  type="time"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                  value={time || ""}
                  title="Zmeniť čas"
                  onChange={(e) => {
                    const newTime = e.target.value;
                    if (!newTime) return;
                    const datePart = task.due_date?.split("T")[0] || columnDate;
                    const newDueDate = `${datePart}T${newTime}:00`;
                    onUpdate(task.id, { due_date: newDueDate });
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Delete (visible on task hover but not during edit) */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 flex-shrink-0"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
