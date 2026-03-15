"use client";

import * as React from "react";
import { Trash2, Loader2, Lightbulb, Briefcase, User, FileText, List, AlignLeft } from "lucide-react";
import { Note } from "../types";

interface NoteSidebarProps {
  loading: boolean;
  filteredNotes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (e: React.MouseEvent, id: string) => void;
  selectedCategory: string;
  onEmptyTrash: () => void;
}

export function NoteSidebar({
  loading,
  filteredNotes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  selectedCategory,
  onEmptyTrash,
}: NoteSidebarProps) {
  const [showPreviews, setShowPreviews] = React.useState(true);
  
  const stripHtml = (html: string) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || "";
    text = text.replace(/\s+/g, ' ').trim();
    
    // Smart JSON extraction for meaningful previews
    if (text.startsWith('{') && text.includes('"')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.customTags) return `TAGY: ${parsed.customTags.join(', ')}`;
        if (parsed.intent) return `ZÁMER: ${parsed.intent}`;
        return Object.keys(parsed).slice(0, 3).map(k => `${k}: ${String(parsed[k]).slice(0, 20)}`).join(' | ');
      } catch { /* proceed to text */ }
    }
    return text;
  };

  if (loading) {
    return (
      <div className="lg:w-80 w-64 shrink-0 flex flex-col gap-10 pr-6 border-r border-zinc-100 dark:border-zinc-800/50 h-full overflow-y-auto thin-scrollbar">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin relative" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 animate-pulse italic">
          Syncing Creative Lab...
        </span>
      </div>
    );
  }

  return (
    <div className="lg:w-96 w-80 overflow-y-auto pr-2 thin-scrollbar shrink-0 flex flex-col gap-2">
      <div className="flex items-center justify-between px-2 mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
            ZOZNAM
        </p>
        <div className="flex items-center gap-1">
            {selectedCategory === "trash" && filteredNotes.length > 0 && (
                <button 
                    onClick={onEmptyTrash}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                >
                    <Trash2 size={12} />
                    VYPRÁZDNIŤ
                </button>
            )}
            <button 
                onClick={() => setShowPreviews(!showPreviews)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-violet-500 transition-all"
                title={showPreviews ? "Super kompaktný režim" : "Zobraziť náhľady"}
            >
                {showPreviews ? <AlignLeft size={14} /> : <List size={14} />}
            </button>
        </div>
      </div>

      <div className="space-y-2 pb-24">
        {filteredNotes.map((note) => {
          const isSelected = selectedNote?.id === note.id;
          const previewText = stripHtml(note.content);
          
          const getCategoryIcon = (cat: string | null | undefined) => {
            switch(cat) {
              case 'idea': return <Lightbulb size={14} className="text-amber-400" />;
              case 'work': return <Briefcase size={14} className="text-blue-400" />;
              case 'personal': return <User size={14} className="text-emerald-400" />;
              default: return <FileText size={14} className="text-violet-400" />;
            }
          };

          const displayTitle = note.title 
            ? note.title.toUpperCase() 
            : (previewText.length > 2 ? previewText.split(' ').slice(0, 3).join(' ').toUpperCase() + "..." : "NOVÁ MYŠLIENKA");

          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group relative flex flex-col gap-1 ${
                isSelected
                  ? "bg-zinc-900 text-white border-zinc-800 shadow-2xl z-20 scale-[1.01]"
                  : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-violet-500/30"
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <h3 className={`text-[11px] font-black tracking-widest leading-none truncate flex-1 uppercase ${isSelected ? "text-violet-400" : "text-zinc-800 dark:text-zinc-100"}`}>
                  {displayTitle}
                </h3>
                <span className={`text-[8px] font-bold uppercase tracking-widest shrink-0 opacity-40 ${isSelected ? "text-white" : "text-zinc-400"}`}>
                  {note.date_created ? new Date(note.date_created).toLocaleDateString("sk-SK") : "NOW"}
                </span>
              </div>

              {showPreviews && (
                <p
                    className={`text-[10px] font-medium leading-relaxed line-clamp-1 transition-colors ${
                    isSelected ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                >
                    {previewText || "Prázdny záznam..."}
                </p>
              )}

              {(note.contact_id || note.project_id) && !isSelected && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1 h-1 rounded-full bg-violet-500" />
                  <span className="text-[9px] font-black text-violet-500/50 uppercase tracking-widest">Linked Data</span>
                </div>
              )}

              <button
                onClick={(e) => onDeleteNote(e, note.id)}
                className={`absolute top-2 right-2 p-2.5 rounded-xl transition-all ${
                  isSelected 
                    ? "hover:bg-red-500/20 text-red-100 opacity-60 hover:opacity-100" 
                    : "text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                }`}
                title={selectedCategory === "trash" ? "Vymazať natrvalo" : "Presunúť do koša"}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
