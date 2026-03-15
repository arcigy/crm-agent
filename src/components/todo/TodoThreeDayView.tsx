"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { sk } from "date-fns/locale";
import { DayColumn } from "./DayColumn";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { TaskItem } from "./TaskItem";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
}

interface TodoThreeDayViewProps {
  tasks: Task[];
  currentDate: string;
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
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const current = new Date(currentDate);
  const yesterday = subDays(current, 1);
  const tomorrow = addDays(current, 1);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const activeTask = tasks.find(t => t.id === active.id);
      if (activeTask && over.id.toString().startsWith("col-")) {
        const newDate = over.id.toString().replace("col-", "");
        // Keep the time if exists
        const timePart = activeTask.due_date?.includes("T") 
          ? activeTask.due_date.split("T")[1] 
          : null;
        const newDueDate = timePart ? `${newDate}T${timePart}` : newDate;
        
        onUpdate(activeTask.id, { due_date: newDueDate });
      }
    }
  };

  const getRelativeDateLabel = (date: Date) => {
    const today = new Date();
    const dStr = format(date, "yyyy-MM-dd");
    const tStr = format(today, "yyyy-MM-dd");
    if (dStr === tStr) return "Dnes";
    if (dStr === format(subDays(today, 1), "yyyy-MM-dd")) return "Včera";
    if (dStr === format(addDays(today, 1), "yyyy-MM-dd")) return "Zajtra";
    return format(date, "EEEE", { locale: sk });
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasks.filter((t) => {
      // If no due_date, only show in current "Today" column relative to system time
      if (!t.due_date) {
        return getRelativeDateLabel(date) === "Dnes";
      }
      
      const taskDateStr = t.due_date.split("T")[0];
      return taskDateStr === dateStr;
    }).sort((a, b) => {
      const aTime = a.due_date?.includes("T") ? a.due_date.split("T")[1].substring(0, 5) : "99:99";
      const bTime = b.due_date?.includes("T") ? b.due_date.split("T")[1].substring(0, 5) : "99:99";
      return aTime.localeCompare(bTime);
    });
  };

  return (
    <div className="flex flex-col h-full gap-4 select-none relative">
      <div className="flex items-center justify-between px-4 mb-4">
        <NavButton date={yesterday} label={getRelativeDateLabel(yesterday)} onClick={onDateChange} icon={<ChevronLeft size={18} />} />
        <div className="flex flex-col items-center relative gap-1">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter italic uppercase leading-none">{format(current, "EEEE", { locale: sk })}</h2>
            <div className="bg-violet-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 italic">
              {getRelativeDateLabel(current) === "Dnes" ? "Dnes" : format(current, "d. MMMM", { locale: sk })}
            </div>
          </div>
          <div className="relative group flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-widest transition-all group-hover:text-violet-500 tabular-nums">{format(current, "dd. MM. yyyy")}</span>
            <PremiumDatePicker 
              value={currentDate} 
              onChange={onDateChange} 
              align="right"
              customTrigger={
                <div className="relative cursor-pointer p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full group/cal">
                  <CalendarIcon size={16} className="text-zinc-400 group-hover/cal:text-violet-500" />
                </div>
              }
            />
          </div>
        </div>
        <NavButton date={tomorrow} label={getRelativeDateLabel(tomorrow)} onClick={onDateChange} icon={<ChevronRight size={18} />} isRight />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto items-center overflow-visible mt-6">
          <DayWrapper id={`col-${format(yesterday, "yyyy-MM-dd")}`} label={getRelativeDateLabel(yesterday)} date={yesterday} tasks={getTasksForDate(yesterday)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} variant="side" onClick={() => onDateChange(format(yesterday, "yyyy-MM-dd"))} />
          <DayWrapper id={`col-${format(current, "yyyy-MM-dd")}`} label={getRelativeDateLabel(current)} date={current} tasks={getTasksForDate(current)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} variant="center" />
          <DayWrapper id={`col-${format(tomorrow, "yyyy-MM-dd")}`} label={getRelativeDateLabel(tomorrow)} date={tomorrow} tasks={getTasksForDate(tomorrow)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} variant="side" onClick={() => onDateChange(format(tomorrow, "yyyy-MM-dd"))} />
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
          {activeTask ? (
            <div className="w-[300px] pointer-events-none rotate-2">
               <TaskItem 
                task={activeTask} 
                onToggle={() => {}} 
                onDelete={() => {}} 
                onUpdate={() => {}} 
                isCenter={true} 
                columnDate={""} 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function NavButton({ date, label, onClick, icon, isRight = false }: { date: Date, label: string, onClick: (d: string) => void, icon: React.ReactNode, isRight?: boolean }) {
  return (
    <button onClick={() => onClick(format(date, "yyyy-MM-dd"))} className={`group/nav text-xs font-black text-zinc-400 uppercase tracking-widest hover:text-violet-500 flex items-center gap-2 transition-all active:scale-95 ${isRight ? 'text-right' : ''}`}>
      {!isRight && <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover/nav:bg-violet-50 dark:group-hover/nav:bg-violet-900/30 transition-all">{icon}</div>}
      <span className="hidden sm:inline">{label}</span>
      {isRight && <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover/nav:bg-violet-50 dark:group-hover/nav:bg-violet-900/30 transition-all">{icon}</div>}
    </button>
  );
}

function DayWrapper(props: any) {
  return (
    <div className={`hidden lg:flex h-full flex-1 ${props.variant === 'center' ? '!flex' : ''}`}>
      <DayColumn {...props} title={props.label} />
    </div>
  );
}
