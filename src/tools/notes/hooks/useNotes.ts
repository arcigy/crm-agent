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

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.success && Array.isArray(data.notes)) {
        setNotes(data.notes);
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

  const saveNote = async (updatedNote: Note) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedNote),
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
    const originalNotes = [...notes];
    setNotes(notes.filter((n) => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);

    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setNotes(originalNotes);
      toast.error("Chyba pri mazaní");
    }
  };

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === "all") return matchesSearch;
    if (selectedCategory === "linked") return matchesSearch && (n.contact_id || n.project_id || n.deal_id);
    
    return matchesSearch && n.category === selectedCategory;
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
    filteredNotes,
  };
}
