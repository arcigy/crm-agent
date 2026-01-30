"use client";

import React, { useState } from "react";
import {
  Plus,
  User,
  FolderKanban,
  Briefcase,
  Calendar,
  Hash,
} from "lucide-react";

interface TodoSmartInputProps {
  onAdd: (title: string, dueDate?: string) => void;
}

export function TodoSmartInput({ onAdd }: TodoSmartInputProps) {
  const [title, setTitle] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title);
      setTitle("");
    }
  };

  return (
    <div
      className={`relative transition-all duration-300 ${isFocused ? "scale-[1.02]" : ""}`}
    >
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Čo je dnes tvojou prioritou?..."
          className="w-full h-20 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2rem] px-8 pr-32 text-lg font-bold shadow-2xl shadow-zinc-200 dark:shadow-none focus:border-blue-500 outline-none transition-all placeholder:text-zinc-300"
        />

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <TagButton
            icon={<User size={14} />}
            color="text-blue-500"
            label="Kontakt"
          />
          <TagButton
            icon={<FolderKanban size={14} />}
            color="text-purple-500"
            label="Projekt"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 disabled:opacity-30 disabled:shadow-none transition-all hover:scale-110 active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>
      </form>

      {isFocused && (
        <div className="absolute top-24 left-0 right-0 p-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-2">
            Rýchle prepojenie (Smart Tags)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SmartAction
              icon={<User size={16} />}
              title="Kontakt"
              shortcut="@"
            />
            <SmartAction
              icon={<FolderKanban size={16} />}
              title="Projekt"
              shortcut="#"
            />
            <SmartAction
              icon={<Briefcase size={16} />}
              title="Obchod"
              shortcut="$"
            />
            <SmartAction
              icon={<Calendar size={16} />}
              title="Čas"
              shortcut="!"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TagButton({
  icon,
  color,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 ${color} hover:bg-white dark:hover:bg-zinc-700 border border-transparent hover:border-zinc-100 transition-all group relative`}
    >
      {icon}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function SmartAction({
  icon,
  title,
  shortcut,
}: {
  icon: React.ReactNode;
  title: string;
  shortcut: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
      <div className="text-zinc-400">{icon}</div>
      <div className="flex-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
        {title}
      </div>
      <div className="text-[10px] font-black text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
        {shortcut}
      </div>
    </div>
  );
}
