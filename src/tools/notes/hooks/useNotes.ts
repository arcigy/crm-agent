"use client";

import * as React from "react";
import { toast } from "sonner";
import { Note } from "../types";

export function useNotes() {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const [categoryNoteId, setCategoryNoteId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest" | "title" | "title-desc">("newest");

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.success && Array.isArray(data.notes)) {
        // Filter out system notes
        const userNotes = data.notes.filter((n: any) => 
            n.title !== "CRM_NOTES_CATEGORIES" && 
            n.title !== "LEADS_INBOX_SETTINGS"
        );
        setNotes(userNotes);
      }
    } catch {
      toast.error("Nepodarilo sa načítať poznámky");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/notes?type=leads_settings"); // We'll reuse the same pattern but for categories
      // Actually let's create a dedicated one or just fetch a note with title 'CRM_NOTES_CATEGORIES'
      const res2 = await fetch("/api/notes");
      const data = await res2.json();
      if (data.success) {
          const catNote = data.notes.find((n: any) => n.title === "CRM_NOTES_CATEGORIES");
          if (catNote) {
              setCustomCategories(JSON.parse(catNote.content));
              setCategoryNoteId(catNote.id);
          }
      }
    } catch (e) {
        console.error("Failed to load categories", e);
    }
  };

  React.useEffect(() => {
    fetchNotes();
    fetchSettings();
  }, []);

  const createNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "<p></p>", category: selectedCategory !== "all" && selectedCategory !== "linked" ? selectedCategory : "idea" }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes([newNote, ...notes]);
        setSelectedNote(newNote);
      }
    } catch {
      toast.error("Chyba pri vytváraní");
    }
  };

  const saveNoteDebounced = React.useRef<NodeJS.Timeout | null>(null);

  const saveNote = async (updatedNote: Note) => {
    // 1. Immediate local state update (Functional)
    setNotes(prev => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    setSelectedNote(prev => prev?.id === updatedNote.id ? updatedNote : prev);

    // 2. Debounce the API call
    if (saveNoteDebounced.current) clearTimeout(saveNoteDebounced.current);
    
    saveNoteDebounced.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const res = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedNote),
        });

        if (!res.ok) throw new Error();
      } catch {
        toast.error("Chyba pri synchronizácii - zmeny sú len lokálne");
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1s debounce
  };

  const deleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    const isTrashMode = selectedCategory === "trash";

    if (isTrashMode) {
      // Permanent delete from trash
      const originalNotes = [...notes];
      setNotes(notes.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      try {
        const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("Poznámka natrvalo vymazaná");
      } catch {
        setNotes(originalNotes);
        toast.error("Chyba pri mazaní");
      }
    } else {
      // Soft delete to trash
      const deleted_at = new Date().toISOString();
      const updatedNote = { ...noteToDelete, deleted_at };
      setNotes(notes.map(n => n.id === id ? updatedNote : n));
      if (selectedNote?.id === id) setSelectedNote(null);
      try {
        const res = await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, deleted_at }),
        });
        if (res.ok) {
          toast.success("Poznámka presunutá do koša");
          if (selectedNote?.id === id) {
              setSelectedNote(updatedNote);
          }
          setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
        } else throw new Error();
      } catch {
        setNotes(notes.map(n => n.id === id ? noteToDelete : n));
        toast.error("Chyba pri presúvaní do koša");
      }
    }
  };

  const emptyTrash = async () => {
    const trashNotes = notes.filter(n => n.deleted_at);
    if (trashNotes.length === 0) return;

    if (!confirm(`Naozaj chcete vymazať všetkých ${trashNotes.length} poznámok z koša?`)) return;

    const originalNotes = [...notes];
    setNotes(notes.filter(n => !n.deleted_at));
    setSelectedNote(null);

    try {
      // In a real app we'd have a bulk delete endpoint, for now we do sequential
      await Promise.all(trashNotes.map(n => fetch(`/api/notes?id=${n.id}`, { method: "DELETE" })));
      toast.success("Kôš bol vyprázdnený");
    } catch {
      setNotes(originalNotes);
      toast.error("Chyba pri vyprázdňovaní koša");
    }
  };

  const createCategory = async (name: string) => {
    const newName = name.toUpperCase();
    if (customCategories.includes(newName)) return;
    
    const updated = [...customCategories, newName];
    setCustomCategories(updated);
    
    // Persist to the special note
    try {
        const method = categoryNoteId ? "PATCH" : "POST";
        const body = categoryNoteId 
            ? { id: categoryNoteId, title: "CRM_NOTES_CATEGORIES", content: JSON.stringify(updated) }
            : { title: "CRM_NOTES_CATEGORIES", content: JSON.stringify(updated) };

        const res = await fetch("/api/notes", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        
        if (res.ok && !categoryNoteId) {
            const data = await res.json();
            setCategoryNoteId(data.id);
        }
        
        toast.success(`Kategória ${name} vytvorená`);
    } catch (e) {
        toast.error("Nepodarilo sa uložiť kategóriu");
    }
  };

  const deleteCategory = async (name: string) => {
    const updated = customCategories.filter(c => c !== name);
    setCustomCategories(updated);
    
    if (categoryNoteId) {
        try {
            await fetch("/api/notes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: categoryNoteId, 
                    title: "CRM_NOTES_CATEGORIES", 
                    content: JSON.stringify(updated) 
                }),
            });
            toast.success(`Kategória ${name} vymazaná`);
            if (selectedCategory === name.toLowerCase()) {
                setSelectedCategory("all");
            }
        } catch (e) {
            toast.error("Chyba pri mazaní kategórie");
        }
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Trash isolation
    if (selectedCategory === "trash") {
        return !!n.deleted_at && matchesSearch;
    }
    
    // Regular categories should NOT show deleted notes
    if (n.deleted_at) return false;

    if (selectedCategory === "all") return matchesSearch;
    if (selectedCategory === "linked") return matchesSearch && (n.contact_id || n.project_id || n.deal_id);
    
    return matchesSearch && n.category === selectedCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.date_created).getTime() - new Date(b.date_created).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "newest":
      default:
        return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
    }
  });

  return {
    notes,
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
    customCategories,
    createCategory,
    deleteCategory,
    sortBy,
    setSortBy,
  };
}
