"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { useNotes } from "./hooks/useNotes";
import { NoteCategorySidebar } from "./components/NoteCategorySidebar";
import { NoteSidebar } from "./components/NoteSidebar";
import { NoteEditor } from "./components/NoteEditor";

export default function NotesTool() {
  const {
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedNote,
    setSelectedNote,
    isSaving,
    createNote,
    saveNote,
    deleteNote,
    filteredNotes,
    notes,
  } = useNotes();

  return (
    <div className="w-full mx-auto h-full flex flex-col gap-6 p-4 md:p-8 animate-in fade-in duration-700 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-foreground tracking-tighter uppercase leading-none">
            Poznámky
          </h1>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] px-1">
            KNOWLEDGE BASE & NOTES
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-8 px-8 py-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <Stat label="CELKOVO" value={notes.length} color="text-zinc-900 dark:text-white" />
            <div className="w-[1px] h-6 bg-zinc-100 dark:bg-zinc-800" />
            <Stat label="DNES" value={notes.filter(n => new Date(n.date_created || "").toDateString() === new Date().toDateString()).length} color="text-violet-500" />
          </div>

          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="VYHĽADAŤ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-14 pr-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-violet-500/10 transition-all text-foreground"
            />
          </div>

          <button
            onClick={createNote}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-violet-600 dark:hover:bg-violet-500 hover:text-white transition-all shadow-xl shadow-zinc-900/10"
          >
            <Plus size={16} /> 
            NOVÝ ZÁZNAM
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex gap-8 overflow-hidden min-h-0 pt-2">
        <NoteCategorySidebar
          notes={notes}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <NoteSidebar
          loading={loading}
          filteredNotes={filteredNotes}
          selectedNote={selectedNote}
          onSelectNote={setSelectedNote}
          onDeleteNote={deleteNote}
        />
        <div className="flex-1 h-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl overflow-y-auto thin-scrollbar relative group/editor">
          <NoteEditor
            selectedNote={selectedNote}
            isSaving={isSaving}
            onUpdateNote={saveNote}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-xl font-black tracking-tight ${color}`}>{value}</span>
      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{label}</span>
    </div>
  );
}
