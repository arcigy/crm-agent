"use client";

import * as React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Note } from "../types";

interface NoteSidebarProps {
  loading: boolean;
  filteredNotes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (e: React.MouseEvent, id: string) => void;
}

export function NoteSidebar({
  loading,
  filteredNotes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
}: NoteSidebarProps) {
  if (loading) {
    return (
      <div className="w-80 flex justify-center p-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-80 overflow-y-auto pr-2 custom-scrollbar shrink-0 flex flex-col gap-3">
      <div className="space-y-4">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            onClick={() => onSelectNote(note)}
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
              selectedNote?.id === note.id
                ? "bg-indigo-500 text-white border-indigo-400 scale-[1.02] z-10"
                : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-white/5 text-foreground hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:shadow-md"
            }`}
          >
            <h3 className={`text-lg font-bold tracking-tight mb-1 truncate ${selectedNote?.id === note.id ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
              {note.title || "Bez názvu"}
            </h3>
            <p
              className={`text-[11px] font-medium leading-relaxed line-clamp-2 transition-colors ${
                selectedNote?.id === note.id ? "text-white/80" : "text-muted-foreground"
              }`}
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
            <button
              onClick={(e) => onDeleteNote(e, note.id)}
              className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                selectedNote?.id === note.id ? "hover:bg-white/20 text-white" : "hover:bg-red-50 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
