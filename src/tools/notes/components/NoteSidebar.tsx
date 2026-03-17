"use client";

import * as React from "react";
import { Trash2, Loader2, Lightbulb, Briefcase, User, FileText, List, AlignLeft, Search } from "lucide-react";
import { Note } from "../types";

interface NoteSidebarProps {
  loading: boolean;
  filteredNotes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (e: React.MouseEvent, id: string) => void;
  selectedCategory: string;
  onEmptyTrash: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  sortBy: "newest" | "oldest" | "title" | "title-desc";
  onSortChange: (val: any) => void;
}

export function NoteSidebar({
  loading,
  filteredNotes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  selectedCategory,
  onEmptyTrash,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
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

  const getRelativeTime = (date: string) => {
    if (!date) return "NOW";
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "TERAZ";
    if (diffInSeconds < 3600) return `PRED ${Math.floor(diffInSeconds / 60)} MIN`;
    if (diffInSeconds < 86400) return `PRED ${Math.floor(diffInSeconds / 3600)} H`;
    return then.toLocaleDateString("sk-SK");
  };

  const getWordCount = (text: string) => {
    return text.split(/\s+/).filter(w => w.length > 0).length;
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
      <div className="flex flex-col gap-3 px-1 mb-4 sticky top-0 bg-transparent z-30 pt-1">
        <div className="relative group">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-violet-500 transition-colors" />
          <input 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="HĽADAŤ V POZNÁMKACH..."
            className="w-full pl-11 pr-4 py-3 bg-white/80 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-foreground shadow-sm backdrop-blur-xl"
          />
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">
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
                  title={showPreviews ? "Kompaktný režim" : "Zobraziť náhľady"}
              >
                  {showPreviews ? <AlignLeft size={14} /> : <List size={14} />}
              </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'newest', label: 'NAJNOVŠIE' },
            { id: 'oldest', label: 'NAJSTARŠIE' },
            { id: 'title', label: 'A-Z' },
            { id: 'title-desc', label: 'Z-A' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => onSortChange(s.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                sortBy === s.id 
                  ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20" 
                  : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-violet-500 hover:border-violet-500/30"
              }`}
            >
              {s.label}
            </button>
          ))}
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

          const wordCount = getWordCount(previewText);

          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group relative flex flex-col gap-1 overflow-hidden ${
                isSelected
                  ? "bg-zinc-900 text-white border-zinc-800 shadow-2xl z-20 scale-[1.01]"
                  : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-violet-500/30"
              }`}
            >
              {/* Category Dot/Bar Indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                note.category === 'idea' ? 'bg-amber-400' :
                note.category === 'work' ? 'bg-blue-400' :
                note.category === 'personal' ? 'bg-emerald-400' : 'bg-violet-500'
              } opacity-50`} />

              <div className="flex justify-between items-start gap-4 pr-8 relative">
                <h3 className={`text-[11px] font-black tracking-widest leading-none truncate flex-1 uppercase ${isSelected ? "text-violet-400" : "text-zinc-800 dark:text-zinc-100"}`}>
                  {displayTitle}
                </h3>
                <span className={`text-[8px] font-bold uppercase tracking-widest shrink-0 opacity-40 ${isSelected ? "text-white" : "text-zinc-400"}`}>
                  {getRelativeTime(note.date_created)}
                </span>
              </div>

              {showPreviews ? (
                <p
                    className={`text-[10px] font-medium leading-relaxed line-clamp-1 transition-colors ${
                    isSelected ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                >
                    {previewText || "Prázdny záznam..."}
                </p>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{wordCount} SLOV</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {note.contact_id && <User size={10} className="text-blue-500/50" />}
                    {note.project_id && <Briefcase size={10} className="text-violet-500/50" />}
                    {(note.contact_id || note.project_id) && (
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Linked</span>
                    )}
                  </div>
                </div>
              )}

              {showPreviews && (
                <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/30">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{wordCount} SLOV</span>
                  </div>
                  {(note.contact_id || note.project_id) && (
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
                      <span className="text-[9px] font-black text-violet-500/80 uppercase tracking-widest">PREPOJENÉ</span>
                    </div>
                  )}
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
