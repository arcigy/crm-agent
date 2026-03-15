"use client";

import * as React from "react";
import { Plus, Search, Maximize2, Minimize2, Sparkles, Loader2 } from "lucide-react";
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
    emptyTrash,
    filteredNotes,
    notes,
    customCategories,
    createCategory,
    deleteCategory,
  } = useNotes();
  const [focusMode, setFocusMode] = React.useState(false);
  const [showAiPrompt, setShowAiPrompt] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/notes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        // We need to refresh the list. Ideally useNotes should have a refresh method.
        // For now let's manually update or just window.location.reload() if lazy
        // but better to add fetchNotes to useNotes return.
        window.location.reload(); 
      }
    } catch (e) {
      console.error("AI Generation failed", e);
    } finally {
      setIsGenerating(false);
      setShowAiPrompt(false);
      setAiPrompt("");
    }
  };

  return (
    <div className="w-full mx-auto h-full flex flex-col gap-3 p-3 md:p-4 animate-in fade-in duration-700 overflow-hidden">
      {/* Compact Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 px-1">
        <h1 className="text-xl font-black text-foreground tracking-tighter uppercase leading-none">
          Poznámky
        </h1>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <Stat label="CELKOVO" value={notes.length} color="text-zinc-900 dark:text-white" />
            <div className="w-[1px] h-4 bg-zinc-100 dark:bg-zinc-800" />
            <Stat label="DNES" value={notes.filter(n => new Date(n.date_created || "").toDateString() === new Date().toDateString()).length} color="text-violet-500" />
          </div>

          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="VYHĽADAŤ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-violet-500/10 transition-all text-foreground"
            />
          </div>

          <button
            onClick={() => setShowAiPrompt(!showAiPrompt)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
              showAiPrompt 
                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20" 
                : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10"
            }`}
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span className="hidden xs:inline">AI POZNÁMKA</span>
          </button>

          <button
            onClick={createNote}
            className="flex-1 sm:flex-none bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-violet-600 dark:hover:bg-violet-500 hover:text-white transition-all shadow-lg shadow-zinc-900/10"
          >
            <Plus size={14} /> 
            <span className="hidden xs:inline">NOVÝ ZÁZNAM</span>
          </button>

          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-2 rounded-xl border transition-all ${focusMode ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-violet-500 hover:border-violet-500/30'}`}
            title={focusMode ? "Ukončiť režim sústredenia" : "Režim sústredenia"}
          >
            {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {showAiPrompt && (
        <div className="flex items-center gap-3 animate-in slide-in-from-top-4 duration-500 p-2 bg-violet-500/5 border border-violet-500/10 rounded-2xl">
            <input 
                autoFocus
                placeholder="NAPÍŠTE TÉMU PRE AI POZNÁMKU (napr. 'Zápis zo stretnutia o AI agentovi')..."
                className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest text-violet-600 placeholder:text-violet-300 dark:text-violet-400 px-4 py-2"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAiGenerate();
                    if (e.key === 'Escape') setShowAiPrompt(false);
                }}
            />
            <button 
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all disabled:opacity-50"
            >
                {isGenerating ? "GENEROVANIE..." : "GENEROVAŤ"}
            </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {!focusMode && (
          <>
            <NoteCategorySidebar
              notes={notes}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              customCategories={customCategories}
              onCreateCategory={createCategory}
              onDeleteCategory={deleteCategory}
            />
            <NoteSidebar
              loading={loading}
              filteredNotes={filteredNotes}
              selectedNote={selectedNote}
              onSelectNote={setSelectedNote}
              onDeleteNote={deleteNote}
              selectedCategory={selectedCategory}
              onEmptyTrash={emptyTrash}
            />
          </>
        )}
        <div className={`flex-1 h-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl overflow-hidden relative group/editor transition-all duration-500 ${focusMode ? 'mx-0' : ''}`}>
          <NoteEditor
            selectedNote={selectedNote}
            isSaving={isSaving}
            onUpdateNote={saveNote}
            customCategories={customCategories}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode(!focusMode)}
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
