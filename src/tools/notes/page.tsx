"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { useNotes } from "./hooks/useNotes";
import { NoteSidebar } from "./components/NoteSidebar";
import { NoteEditor } from "./components/NoteEditor";

export default function NotesTool() {
  const {
    loading,
    searchQuery,
    setSearchQuery,
    selectedNote,
    setSelectedNote,
    isSaving,
    createNote,
    saveNote,
    deleteNote,
    filteredNotes,
  } = useNotes();

  return (
    <div className="w-full mx-auto h-full flex flex-col space-y-4 p-2 md:p-4 animate-in fade-in duration-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
            Notes
          </h1>
        </div>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Hľadať..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all text-foreground"
            />
          </div>
          <button
            onClick={createNote}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Nový záznam
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
        <NoteSidebar
          loading={loading}
          filteredNotes={filteredNotes}
          selectedNote={selectedNote}
          onSelectNote={setSelectedNote}
          onDeleteNote={deleteNote}
        />
        <NoteEditor
          selectedNote={selectedNote}
          isSaving={isSaving}
          onUpdateNote={saveNote}
        />
      </div>
    </div>
  );
}
