"use client";

import * as React from "react";
import { 
  Layers, 
  Lightbulb, 
  Briefcase, 
  User, 
  Link as LinkIcon,
  ChevronRight
} from "lucide-react";
import { Note } from "../types";

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: "all", name: "VŠETKY POZNÁMKY", icon: <Layers size={14} />, color: "violet" },
  { id: "idea", name: "STRATÉGIA A NÁPADY", icon: <Lightbulb size={14} />, color: "violet" },
  { id: "work", name: "PROJEKTOVÉ ÚLOHY", icon: <Briefcase size={14} />, color: "violet" },
  { id: "personal", name: "SÚKROMNÉ", icon: <User size={14} />, color: "violet" },
  { id: "linked", name: "PREPOJENÉ DÁTA", icon: <LinkIcon size={14} />, color: "violet" },
];

interface NoteCategorySidebarProps {
  notes: Note[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export function NoteCategorySidebar({
  notes,
  selectedCategory,
  onSelectCategory,
}: NoteCategorySidebarProps) {
  const getCount = (id: string) => {
    if (id === "all") return notes.length;
    if (id === "linked") return notes.filter(n => n.contact_id || n.project_id || n.deal_id).length;
    return notes.filter(n => n.category === id).length;
  };

  return (
    <div className="w-64 shrink-0 flex flex-col gap-10 pr-6 border-r border-zinc-100 dark:border-zinc-800/50 h-full overflow-y-auto thin-scrollbar">
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 px-2">
          ORGANIZÁCIA
        </p>
        
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`
                  group flex items-center justify-between p-3 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? "bg-violet-600 text-white shadow-xl shadow-violet-500/20" 
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? "text-white" : "text-violet-500/60"}`}>
                    {cat.icon}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                    {cat.name}
                  </span>
                </div>
                
                <span className={`
                  text-[9px] font-black px-2 py-0.5 rounded-lg
                  ${isActive ? "bg-white/20 text-white" : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400"}
                `}>
                  {getCount(cat.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pb-6">
        <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
            STAV PAMÄTE
          </p>
          <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 w-[65%]" />
          </div>
          <p className="text-[9px] font-bold text-zinc-500 mt-2 italic">
            Použité 2.4 GB z 5 GB
          </p>
        </div>
      </div>
    </div>
  );
}
