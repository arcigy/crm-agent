"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  FileText,
  Search,
  Loader2,
  X,
  Link as LinkIcon,
  HardDrive,
  User,
  FolderKanban,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/dashboard/editor/RichTextEditor";

interface Note {
  id: string;
  title: string;
  content: string;
  date_created: string;
  contact_id?: number;
  project_id?: number;
  task_id?: number;
  file_link?: string;
}

export default function NotesTool() {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Linking States
  const [showLinkMenu, setShowLinkMenu] = React.useState(false);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.success && Array.isArray(data.notes)) {
        setNotes(data.notes);
      } else if (Array.isArray(data)) {
        // Fallback for old format if somehow still hits it
        setNotes(data);
      }
    } catch {
      toast.error("Nepodarilo sa načítať poznámky");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotes();
  }, []);

  const createNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "<p></p>" }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes([newNote, ...notes]);
        setSelectedNote(newNote);
        // Focus the title input after creation if possible, but for now just having it empty is better
      }
    } catch {
      toast.error("Chyba pri vytváraní");
    }
  };

  const saveNote = async (updatedNote: Note) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updatedNote.id,
          title: updatedNote.title,
          content: updatedNote.content,
          contact_id: updatedNote.contact_id,
          project_id: updatedNote.project_id,
          task_id: updatedNote.task_id,
          file_link: updatedNote.file_link,
        }),
      });

      if (res.ok) {
        setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
      }
    } catch {
      toast.error("Chyba pri ukladaní");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotes(notes.filter((n) => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);

    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      fetchNotes();
      toast.error("Chyba pri mazaní");
    }
  };

  const updateLink = (
    type: "contact" | "project" | "task" | "file",
    value: number | string | null,
  ) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote };
    if (type === "contact") updated.contact_id = value as number;
    if (type === "project") updated.project_id = value as number;
    if (type === "task") updated.task_id = value as number;
    if (type === "file") updated.file_link = value as string;

    setSelectedNote(updated);
    saveNote(updated);
    setShowLinkMenu(false);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-[1600px] mx-auto w-full h-[calc(100vh-140px)] flex flex-col space-y-6 p-4 animate-in fade-in duration-700 overflow-hidden">
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
            className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nový záznam
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
        {/* sidebar */}
        <div className="w-80 overflow-y-auto pr-2 custom-scrollbar shrink-0 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                    selectedNote?.id === note.id 
                      ? "bg-indigo-500 text-white border-indigo-400 shadow-xl shadow-indigo-500/20 scale-[1.02] z-10" 
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
                    onClick={(e) => deleteNote(e, note.id)}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                      selectedNote?.id === note.id ? "hover:bg-white/20 text-white" : "hover:bg-red-50 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor Content */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[3rem] border border-border p-10 flex flex-col relative group min-w-0 transition-all shadow-xl shadow-black/5 dark:shadow-none">
          {selectedNote ? (
            <>
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100/50 dark:border-indigo-800/30">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      Editor Poznámky
                    </span>
                  </div>
                  {isSaving && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Ukladám...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLinkMenu(!showLinkMenu)}
                    className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showLinkMenu ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-50 hover:border-indigo-100 text-gray-400 hover:text-indigo-600"}`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    Prepojiť
                  </button>
                </div>
              </div>

              {showLinkMenu && (
                <div className="absolute top-24 right-10 z-50 bg-white dark:bg-zinc-800 shadow-2xl border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-6 w-72 animate-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Quick Connect
                      </span>
                      <button
                        onClick={() => {
                          const id = prompt("Vložte ID kontaktu:");
                          if (id) updateLink("contact", parseInt(id));
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group"
                      >
                        <User className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                        <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-900">
                          Kontakt
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const id = prompt("Vložte ID projektu:");
                          if (id) updateLink("project", parseInt(id));
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all group"
                      >
                        <FolderKanban className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600" />
                        <span className="text-xs font-bold text-gray-600 group-hover:text-emerald-900">
                          Projekt
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const link = prompt("Vložte link na súbor z Drive:");
                          if (link) updateLink("file", link);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all group"
                      >
                        <HardDrive className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                        <span className="text-xs font-bold text-gray-600 group-hover:text-blue-900">
                          Súbor
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <input
                className="text-4xl font-bold tracking-tighter text-foreground mb-8 outline-none placeholder:text-muted-foreground/30 shrink-0 bg-transparent border-none focus:ring-0 leading-tight italic"
                value={selectedNote.title}
                onChange={(e) => {
                  const newNote = { ...selectedNote, title: e.target.value };
                  setSelectedNote(newNote);
                  saveNote(newNote);
                }}
                placeholder="Sem napíšte názov..."
              />

              <div className="flex gap-4 mb-8 shrink-0 flex-wrap">
                {selectedNote.contact_id && (
                  <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl flex items-center gap-2 group animate-in slide-in-from-left-2">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase text-indigo-600">
                      Kontakt #{selectedNote.contact_id}
                    </span>
                    <button
                      onClick={() => updateLink("contact", null)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {selectedNote.project_id && (
                  <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2 group animate-in slide-in-from-left-2">
                    <FolderKanban className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase text-emerald-600">
                      Projekt #{selectedNote.project_id}
                    </span>
                    <button
                      onClick={() => updateLink("project", null)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {selectedNote.file_link && (
                  <a
                    href={selectedNote.file_link}
                    target="_blank"
                    className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl flex items-center gap-2 group animate-in slide-in-from-left-2 hover:bg-blue-100 transition-all"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-blue-600">
                      Externý Súbor
                    </span>
                    <LinkIcon className="w-3 h-3 opacity-30" />
                  </a>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-2 min-h-0">
                <RichTextEditor
                  content={selectedNote.content}
                  onChange={(newContent) => {
                    const updated = { ...selectedNote, content: newContent };
                    setSelectedNote(updated);
                    saveNote(updated);
                  }}
                  placeholder="Píšte svoje myšlienky, využívajte formátovanie..."
                />
              </div>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
