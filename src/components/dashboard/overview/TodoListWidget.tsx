import { SmartText } from "@/components/todo/SmartText";
import { CheckCircle2, Circle, Clock, Calendar, Check } from "lucide-react";
import { format, isToday, isThisWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { useState, useMemo } from "react";
import { toggleTaskStatus } from "@/app/actions/tasks";
import { toast } from "sonner";

interface TodoListWidgetProps {
  tasks: any[];
  mode?: "today" | "week";
}

export function TodoListWidget({ tasks: initialTasks, mode = "today" }: TodoListWidgetProps) {
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  // Synchronize when initialTasks change
  useMemo(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  const filteredTasks = localTasks.filter(t => {
    // Show both completed and active for "Today" widget now, to see them move
    if (!t.due_date) return mode === "today";
    const taskDate = new Date(t.due_date);
    if (mode === "today") {
      return isToday(taskDate);
    } else {
      const nextWeek = isThisWeek(taskDate, { weekStartsOn: 1 });
      return nextWeek && !isToday(taskDate);
    }
  }).sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const handleToggle = async (taskId: string, currentStatus: boolean) => {
    if (currentStatus) return; // Only allow "completing" from dashboard for now to avoid accidental clears

    setAnimatingId(taskId);
    
    // Play animation first, then update
    setTimeout(async () => {
        try {
            await toggleTaskStatus(taskId, !currentStatus);
            setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
            toast.success("Úloha splnená!");
        } catch (error) {
            toast.error("Nepodarilo sa aktualizovať úlohu");
        } finally {
            setAnimatingId(null);
        }
    }, 600);
  };

  const title = mode === "today" ? "Úlohy na dnes" : "Tento týždeň";
  const Icon = mode === "today" ? Clock : Calendar;
  const badgeColor = mode === "today" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div className="bg-card px-8 py-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-full max-h-[400px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          {title}
        </h3>
        <span className={`text-[10px] font-bold px-2 py-1 ${badgeColor} rounded-lg`}>
          {filteredTasks.filter(t => !t.completed).length} TODO
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div 
                key={task.id} 
                className={`flex items-start gap-3 p-2.5 rounded-2xl transition-all duration-500 relative overflow-hidden
                    ${task.completed ? 'opacity-40 grayscale-[0.5]' : 'hover:bg-muted/50'}
                    ${animatingId === task.id ? 'bg-emerald-500/5' : ''}
                `}
            >
              {/* Green Train Animation */}
              {animatingId === task.id && (
                <div className="absolute inset-0 bg-emerald-500/20 translate-x-[-100%] animate-[train_0.6s_ease-in-out_forwards]" />
              )}
              
              <div className="flex-1 min-w-0">
                <SmartText 
                    text={task.title} 
                    className={`text-sm font-bold text-foreground leading-tight truncate block transition-all duration-500
                        ${task.completed ? 'line-through text-muted-foreground' : ''}
                    `} 
                />
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-medium uppercase">
                  <Icon className="w-3 h-3" />
                  {task.due_date ? format(new Date(task.due_date), mode === "today" ? "HH:mm" : "eee HH:mm", { locale: sk }) : "Kedykoľvek"}
                </div>
              </div>

              {/* Complete Button */}
              {!task.completed && (
                <button
                    onClick={() => handleToggle(task.id, task.completed)}
                    disabled={animatingId === task.id}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all active:scale-90"
                >
                    <Check className="w-4 h-4" />
                </button>
              )}
              {task.completed && (
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-center opacity-40">
            <CheckCircle2 className="w-8 h-8 mb-1" />
            <p className="text-[10px] font-bold italic uppercase tracking-widest">Pohoda, nič tu nie je</p>
          </div>
        )}
      </div>
      
      <a href="/dashboard/todo" className="mt-4 text-center text-[10px] font-black text-zinc-400 hover:text-blue-600 uppercase italic transition-colors">
        Pozrieť všetky úlohy
      </a>

      <style jsx>{`
        @keyframes train {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
