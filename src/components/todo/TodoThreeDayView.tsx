"use client";

import React, { useState } from "react";
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
}

export function TodoThreeDayView({
  tasks,
  currentDate,
  onDateChange,
  onToggle,
  onDelete,
}: TodoThreeDayViewProps) {
  const current = new Date(currentDate);
  const yesterday = subDays(current, 1);
  const tomorrow = addDays(current, 1);

  // Filter tasks
  const getTasksForDate = (date: Date, includeFloating = false) => {
    const dateStr = date.toISOString().split("T")[0];
    return tasks
      .filter((t) => {
        if (!t.due_date) return includeFloating; // Floating tasks only in "Today" usually
        return t.due_date.startsWith(dateStr);
      })
      .sort((a, b) => {
        // Sort by time if available, otherwise push to bottom
        const aTime = a.due_date?.includes("T")
          ? a.due_date.split("T")[1]
          : "99:99";
        const bTime = b.due_date?.includes("T")
          ? b.due_date.split("T")[1]
          : "99:99";
        return aTime.localeCompare(bTime);
      });
  };

  const yesterdayTasks = getTasksForDate(yesterday);
  const todayTasks = getTasksForDate(current, true); // Include floating tasks in Today
  const tomorrowTasks = getTasksForDate(tomorrow);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Navigation Header - Centered for Today */}
      <div className="flex items-center justify-between px-4">
        <button
          onClick={() => onDateChange(format(yesterday, "yyyy-MM-dd"))}
          className="text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Včera
        </button>

        <div className="flex flex-col items-center relative group">
          <div className="flex items-center gap-2 cursor-pointer">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
              {format(current, "EEEE", { locale: sk })}
            </h2>
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <CalendarIcon size={12} />
              {format(current, "d. MMMM", { locale: sk })}
            </div>
          </div>

          {/* Invisible Date Picker Overlay */}
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer text-center w-full h-full z-10"
            value={currentDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
          <span className="text-[10px] text-zinc-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 whitespace-nowrap">
            Klikni pre zmenu dátumu
          </span>
        </div>

        <button
          onClick={() => onDateChange(format(tomorrow, "yyyy-MM-dd"))}
          className="text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 flex items-center gap-1"
        >
          Zajtra <ChevronRight size={16} />
        </button>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* YESTERDAY */}
        <DayColumn
          title="Včera"
          date={yesterday}
          tasks={yesterdayTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          variant="side"
          onClick={() => onDateChange(format(yesterday, "yyyy-MM-dd"))}
        />

        {/* TODAY */}
        <DayColumn
          title="Dnes"
          date={current}
          tasks={todayTasks}
          onToggle={onToggle}
          onDelete={onDelete}
          variant="center"
        />

        {/* TOMORROW */}
        <DayColumn
          title="Zajtra"
          date={tomorrow}
          tasks={tomorrowTasks}
          onToggle={onToggle}
          onDelete={onDelete}
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
  variant: "center" | "side";
  onClick?: () => void;
}

function DayColumn({
  title,
  date,
  tasks,
  onToggle,
  onDelete,
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
            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl ring-4 ring-zinc-50 dark:ring-zinc-800/50 scale-100 z-10"
            : "bg-zinc-50 dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-800/50 opacity-70 hover:opacity-100 hover:scale-[1.02] cursor-pointer scale-95 grayscale-[0.5] hover:grayscale-0"
        }
      `}
    >
      {/* Header */}
      <div
        className={`p-6 border-b ${
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              isCenter={isCenter}
              onDelete={onDelete}
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
  isCenter,
}: {
  task: Task;
  onToggle: (id: string, s: boolean) => void;
  onDelete: (id: string) => void;
  isCenter: boolean;
}) {
  // Extract time if exists in due_date (YYYY-MM-DDTHH:mm:ss)
  const time =
    task.due_date && task.due_date.includes("T")
      ? format(parseISO(task.due_date), "HH:mm")
      : null;

  return (
    <div
      className={`group relative p-3 rounded-2xl transition-all border ${
        task.completed
          ? "bg-zinc-50 dark:bg-zinc-800/30 border-transparent opacity-60"
          : isCenter
            ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-900"
            : "bg-white/50 dark:bg-zinc-900/50 border-transparent hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id, task.completed);
          }}
          className={`mt-0.5 transition-colors ${
            task.completed
              ? "text-emerald-400"
              : "text-zinc-300 hover:text-blue-500"
          }`}
        >
          {task.completed ? (
            <CheckCircle2 size={isCenter ? 20 : 16} strokeWidth={3} />
          ) : (
            <Circle size={isCenter ? 20 : 16} strokeWidth={3} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <SmartText
              text={task.title}
              className={`text-sm font-bold leading-tight ${
                task.completed
                  ? "line-through text-zinc-400"
                  : "text-zinc-700 dark:text-zinc-200"
              }`}
            />
            {time && (
              <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock size={8} /> {time}
              </span>
            )}
          </div>
        </div>

        {/* Delete Action (visible on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className={`opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all absolute right-2 top-2 lg:static`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
