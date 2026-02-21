"use client";

import * as React from "react";
import { FileText, Sparkles, Link as LinkIcon, User, FolderKanban, Briefcase, X } from "lucide-react";
import { Note } from "../types";
import RichTextEditor from "@/components/dashboard/editor/RichTextEditor";
import { NoteLinkMenu } from "./NoteLinkMenu";

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
  const [showLinkMenu, setShowLinkMenu] = React.useState(false);

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

  const handleLink = (type: "contact" | "project" | "deal", id: number | null) => {
    const updated = { ...selectedNote };
    if (type === "contact") updated.contact_id = id;
    if (type === "project") updated.project_id = id;
    if (type === "deal") updated.deal_id = id;
    
    onUpdateNote(updated);
    setShowLinkMenu(false);
  };

  return (
    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[3rem] border border-border p-10 flex flex-col relative group min-w-0 transition-all shadow-xl shadow-black/5 dark:shadow-none">
      <div className="flex items-center justify-between mb-8 shrink-0 relative">
        <div className="flex items-center gap-4">
          {isSaving && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 animate-pulse">
              <div className="w-1 h-1 bg-indigo-500 rounded-full" />
              <span>Automatické ukladanie...</span>
            </div>
          )}
          
          {/* Linked Items Display */}
          <div className="flex items-center gap-2">
            {selectedNote.contact_id && (
              <LinkedBadge 
                icon={User} 
                label="Kontakt" 
                onRemove={() => handleLink("contact", null)} 
              />
            )}
            {selectedNote.project_id && (
              <LinkedBadge 
                icon={FolderKanban} 
                label="Projekt" 
                onRemove={() => handleLink("project", null)} 
              />
            )}
            {selectedNote.deal_id && (
              <LinkedBadge 
                icon={Briefcase} 
                label="Obchod" 
                onRemove={() => handleLink("deal", null)} 
              />
            )}
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowLinkMenu(!showLinkMenu)}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
              showLinkMenu ? "bg-indigo-600 text-white border-indigo-500" : "bg-card border-border text-muted-foreground hover:border-indigo-500/50"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Prepojiť</span>
          </button>

          <NoteLinkMenu 
            isOpen={showLinkMenu} 
            onClose={() => setShowLinkMenu(false)} 
            onLink={handleLink}
          />
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

function LinkedBadge({ icon: Icon, label, onRemove }: { icon: any, label: string, onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl animate-in slide-in-from-left-2 duration-300 group">
      <Icon className="w-3 h-3 text-indigo-500" />
      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{label}</span>
      <button 
        onClick={onRemove}
        className="p-0.5 hover:bg-white dark:hover:bg-indigo-800 rounded-md transition-all opacity-0 group-hover:opacity-100"
      >
        <X className="w-2.5 h-2.5 text-indigo-400" />
      </button>
    </div>
  );
}
