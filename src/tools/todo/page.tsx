'use client';

import * as React from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Loader2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
    id: string;
    title: string;
    completed: boolean;
    date_created: string;
}

export default function TodoTool() {
    const [tasks, setTasks] = React.useState<Task[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [newTaskTitle, setNewTaskTitle] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/todo');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTasks(data);
            }
        } catch (error) {
            toast.error('Nepodarilo sa načítať úlohy');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchTasks();
    }, []);

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        setIsAdding(true);
        try {
            const res = await fetch('/api/todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTaskTitle })
            });

            if (res.ok) {
                const newTask = await res.json();
                setTasks([newTask, ...tasks]);
                setNewTaskTitle('');
            }
        } catch (error) {
            toast.error('Nepodarilo sa pridať úlohu');
        } finally {
            setIsAdding(false);
        }
    };

    const toggleTask = async (task: Task) => {
        const originalStatus = task.completed;
        // Optimistic update
        setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));

        try {
            const res = await fetch('/api/todo', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: task.id, completed: !task.completed })
            });

            if (!res.ok) throw new Error();
        } catch (error) {
            // Rollback
            setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: originalStatus } : t));
            toast.error('Chyba pri aktualizácii');
        }
    };

    const deleteTask = async (id: string) => {
        // Optimistic update
        setTasks(tasks.filter(t => t.id !== id));

        try {
            const res = await fetch(`/api/todo?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast.success('Úloha vymazaná');
        } catch (error) {
            // Refetch to ensure data consistency
            fetchTasks();
            toast.error('Chyba pri mazaní');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                        To Do / <span className="text-blue-600">Tasks</span>
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 opacity-60">Focus on what matters</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                    <ListChecks className="w-6 h-6" />
                </div>
            </div>

            {/* Quick Add */}
            <form onSubmit={addTask} className="relative group">
                <input
                    type="text"
                    placeholder="Pridať novú úlohu..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    disabled={isAdding}
                    className="w-full bg-white border border-gray-100 rounded-[2rem] px-8 py-6 text-lg font-bold text-gray-900 shadow-[0_20px_50px_rgba(0,0,0,0.04)] focus:shadow-[0_20px_50px_rgba(59,130,246,0.1)] focus:border-blue-200 outline-none transition-all placeholder:text-gray-300"
                />
                <button
                    type="submit"
                    disabled={isAdding || !newTaskTitle.trim()}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>
            </form>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inicializujem zoznam...</p>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="py-32 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 italic opacity-40 text-3xl">📝</div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Všetko hotové!</h3>
                        <p className="text-gray-400 text-sm font-medium">Oddýchnite si, alebo si zapíšte niečo nové.</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`group flex items-center gap-4 p-6 bg-white rounded-3xl border transition-all hover:shadow-xl hover:shadow-gray-100/50 border-gray-100 ${task.completed ? 'opacity-60 grayscale' : ''}`}
                        >
                            <button
                                onClick={() => toggleTask(task)}
                                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${task.completed ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-300 hover:text-blue-600'}`}
                            >
                                {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                            </button>

                            <span className={`flex-1 text-base font-black tracking-tight leading-none ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {task.title}
                            </span>

                            <button
                                onClick={() => deleteTask(task.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Stats */}
            {!loading && tasks.length > 0 && (
                <div className="flex items-center justify-between px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-6">
                        <span>Total: {tasks.length}</span>
                        <span className="text-gray-200">|</span>
                        <span>Hotovo: {tasks.filter(t => t.completed).length}</span>
                    </div>
                    <span>{tasks.every(t => t.completed) ? 'Level Complete' : 'Grinding...'}</span>
                </div>
            )}
        </div>
    );
}
