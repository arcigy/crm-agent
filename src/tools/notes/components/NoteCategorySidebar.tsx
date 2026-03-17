"use client";

import * as React from "react";
import { 
  Layers, 
  Lightbulb, 
  Briefcase, 
  User, 
  Link as LinkIcon,
  ChevronRight,
  Folder,
  PlusCircle,
  Trash2
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
  { id: "trash", name: "KÔŠ", icon: <Trash2 size={14} />, color: "violet" },
];

interface NoteCategorySidebarProps {
  notes: Note[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  customCategories: string[];
  onCreateCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

export function NoteCategorySidebar({
  notes,
  selectedCategory,
  onSelectCategory,
  customCategories,
  onCreateCategory,
  onDeleteCategory,
}: NoteCategorySidebarProps) {
  const [newCatName, setNewCatName] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);

  const getCount = (id: string) => {
    if (id === "trash") return notes.filter(n => n.deleted_at).length;
    
    // Non-trash counts only for active notes
    const activeNotes = notes.filter(n => !n.deleted_at);
    if (id === "all") return activeNotes.length;
    if (id === "linked") return activeNotes.filter(n => n.contact_id || n.project_id || n.deal_id).length;
    return activeNotes.filter(n => n.category === id).length;
  };

  return (
    <div className="w-72 min-w-[280px] shrink-0 flex flex-col gap-6 pr-4 border-r border-zinc-100 dark:border-zinc-800/50 h-full overflow-y-auto thin-scrollbar pb-10">
      <div className="space-y-3">
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
                    : "hover:bg-violet-500/10 dark:hover:bg-violet-500/10 text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? "text-white" : "text-violet-500/60"}`}>
                    {cat.icon}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-widest leading-none truncate">
                    {cat.name}
                  </span>
                </div>
                
                <span className={`
                  text-[9px] font-black px-2 py-0.5 rounded-lg transition-colors
                  ${isActive ? "bg-white/20 text-white" : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"}
                `}>
                  {getCount(cat.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
                VAŠE KATEGÓRIE
            </p>
            <button 
                onClick={() => setShowAdd(!showAdd)}
                className="text-violet-500 hover:text-violet-600 transition-colors"
            >
                <PlusCircle size={14} />
            </button>
        </div>

        {showAdd && (
            <div className="px-2 animate-in slide-in-from-top-1 duration-300">
                <input 
                    autoFocus
                    placeholder="Názov..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-violet-500/50"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCatName.trim()) {
                            onCreateCategory(newCatName);
                            setNewCatName("");
                            setShowAdd(false);
                        }
                    }}
                />
            </div>
        )}
        
        <div className="flex flex-col gap-1.5">
            {customCategories.map((name) => {
                const id = name.toLowerCase();
                const isActive = selectedCategory === id;
                return (
                    <button
                        key={id}
                        onClick={() => onSelectCategory(id)}
                        className={`
                        group flex items-center justify-between p-3 rounded-2xl transition-all duration-300
                        ${isActive 
                            ? "bg-violet-600 text-white shadow-xl shadow-violet-500/20" 
                            : "hover:bg-violet-500/10 dark:hover:bg-violet-500/10 text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400"
                        }
                        `}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className={`${isActive ? "text-white" : "text-violet-500/60"}`}>
                                <Folder size={14} />
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-widest leading-none truncate">
                                {name}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className={`
                            text-[9px] font-black px-2 py-0.5 rounded-lg transition-colors
                            ${isActive ? "bg-white/20 text-white" : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 group-hover:text-violet-500"}
                            `}>
                            {getCount(id)}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Naozaj chcete vymazať kategóriu ${name}?`)) {
                                        onDeleteCategory(name);
                                    }
                                }}
                                className={`p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                                    isActive ? "hover:bg-white/20 text-white/70 hover:text-white" : "hover:bg-red-500/10 text-zinc-400 hover:text-red-500"
                                }`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
}
