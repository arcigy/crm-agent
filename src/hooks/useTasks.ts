"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTasks,
  createTask,
  toggleTaskStatus,
  removeTask,
} from "@/app/actions/tasks";
import { toast } from "sonner";

export function useTasks(date?: string) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    const res = await getTasks(date);
    if (res.success && res.data) {
      setTasks(res.data);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const add = async (title: string, dueDate?: string) => {
    const res = await createTask(title, dueDate);
    if (res.success) {
      setTasks((prev) => [...prev, res.data]);
      toast.success("Úloha pridaná");
      return true;
    }
    toast.error("Chyba pri pridávaní úlohy");
    return false;
  };

  const toggle = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !currentStatus } : t)),
    );

    const res = await toggleTaskStatus(id, !currentStatus);
    if (!res.success) {
      // Revert if failed
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentStatus } : t)),
      );
      toast.error("Chyba pri zmene stavu");
    }
  };

  const remove = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const res = await removeTask(id);
    if (res.success) {
      toast.success("Úloha vymazaná");
    } else {
      refreshTasks();
      toast.error("Chyba pri mazaní");
    }
  };

  return { tasks, loading, add, toggle, remove, refreshTasks };
}
