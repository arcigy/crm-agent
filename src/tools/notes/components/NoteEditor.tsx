"use client";

import * as React from "react";
import { FileText, Sparkles } from "lucide-react";
import { Note } from "../types";
import RichTextEditor from "@/components/dashboard/editor/RichTextEditor";

interface NoteEditorProps {
  selectedNote: Note | null;
  isSaving: boolean;
  onUpdateNote: (note: Note) => void;
}

export function NoteEditor({
  selectedNote,
  isSaving,
  onUpdateNote,
}: NoteEditorProps) {
  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 select-none animate-in fade-in zoom-in duration-500">
        <div className="max-w-md w-full bg-muted/30 border border-border/50 rounded-[3rem] p-12 flex flex-col items-center text-center space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
            <FileText className="w-24 h-24 text-foreground/10 relative" />
            <Sparkles className="w-8 h-8 text-blue-500/20 absolute -top-4 -right-4 animate-pulse" />
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-foreground/20 ml-[0.8em]">
              Creative Lab Engine
            </p>
            <p className="text-sm font-bold text-muted-foreground italic max-w-[200px] mx-auto leading-relaxed">
              Vyberte poznámku pre detailnú editáciu a začnite tvoriť
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[3rem] border border-border p-10 flex flex-col relative group min-w-0 transition-all shadow-xl shadow-black/5 dark:shadow-none">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          {isSaving && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 animate-pulse">
              <div className="w-1 h-1 bg-indigo-500 rounded-full" />
              <span>Automatické ukladanie...</span>
            </div>
          )}
        </div>
      </div>

      <input
        className="text-4xl font-bold tracking-tighter text-foreground mb-8 outline-none placeholder:text-muted-foreground/30 shrink-0 bg-transparent border-none focus:ring-0 leading-tight italic"
        value={selectedNote.title}
        onChange={(e) => onUpdateNote({ ...selectedNote, title: e.target.value })}
        placeholder="Sem napíšte názov..."
      />

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        <RichTextEditor
          content={selectedNote.content}
          onChange={(content) => onUpdateNote({ ...selectedNote, content })}
          placeholder="Píšte svoje myšlienky, využívajte formátovanie..."
        />
      </div>
    </div>
  );
}
