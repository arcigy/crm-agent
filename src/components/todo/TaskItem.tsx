"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { SmartText } from "./SmartText";
import { ModernTimePicker } from "./ModernTimePicker";
import { format, parseISO } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, s: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  isCenter: boolean;
  columnDate: string;
}

export function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
  isCenter,
  columnDate,
}: TaskItemProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(task.title);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isEditing,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const time =
    task.due_date && task.due_date.includes("T")
      ? format(parseISO(task.due_date), "HH:mm")
      : "";

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
      ref={setNodeRef}
      style={style}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!task.completed) setIsEditing(true);
      }}
      className={`group relative p-[14px] rounded-[1.2rem] transition-all duration-200 border overflow-visible ${
        isDragging ? "opacity-30 z-50 pointer-events-none shadow-2xl scale-105" : "z-10"
      } ${
        task.completed
          ? "bg-zinc-50/50 dark:bg-zinc-800/20 border-transparent opacity-50"
          : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-violet-400/50 dark:hover:border-violet-500/30"
      }`}
    >
      <style jsx>{`
        @keyframes neonFlash {
          0% { transform: scaleX(0); opacity: 0; background: #8b5cf6; }
          15% { transform: scaleX(1); opacity: 1; background: #a78bfa; box-shadow: 0 0 40px #8b5cf6, 0 0 20px #a78bfa; }
          85% { transform: scaleX(1); opacity: 0.8; background: #8b5cf6; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .animate-neon-flash {
          animation: neonFlash 0.8s cubic-bezier(.17,.67,.19,.98) forwards;
          transform-origin: left;
        }
      `}</style>
      
      {isAnimating && (
        <div className="absolute inset-0 bg-violet-500/40 animate-neon-flash z-0 rounded-2xl" />
      )}

      <div className="flex items-center gap-3 relative z-10 w-full">
        <div 
          className="flex items-center py-1 transition-all"
          {...attributes}
          {...listeners}
        >
          <button
            onClick={handleToggle}
            className={`flex-shrink-0 transition-all duration-300 transform active:scale-75 cursor-grab active:cursor-grabbing hover:scale-110 ${
              task.completed ? "text-violet-500" : "text-zinc-300 hover:text-violet-500"
            }`}
          >
            {task.completed ? (
              <CheckCircle2 size={isCenter ? 22 : 18} strokeWidth={3} className="drop-shadow-[0_0_12px_rgba(139,92,246,0.8)] text-violet-500" />
            ) : (
              <Circle size={isCenter ? 22 : 18} strokeWidth={2.5} className="group-hover:text-violet-500 transition-colors" />
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between gap-3 h-full">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                autoFocus
                className="w-full bg-transparent border-none outline-none text-[14px] font-black text-zinc-900 dark:text-white p-0 m-0 placeholder-zinc-400 leading-none italic"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <SmartText
                text={task.title}
                className={`text-[14px] font-black tracking-tight leading-snug truncate block ${
                  task.completed ? "line-through text-zinc-400 italic" : "text-zinc-800 dark:text-zinc-100"
                }`}
              />
            )}
          </div>
          
          <ModernTimePicker 
            variant="item"
            value={time}
            onChange={(newTime) => {
              const datePart = task.due_date?.split("T")[0] || columnDate;
              const newDueDate = newTime ? `${datePart}T${newTime}:00` : null;
              onUpdate(task.id, { due_date: newDueDate });
            }}
          />
        </div>

        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
