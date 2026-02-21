"use client";

import * as React from "react";
import { toast } from "sonner";
import { Note } from "../types";

export function useNotes() {
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
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
        body: JSON.stringify({ title: "", content: "<p></p>" }),
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

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return {
    notes,
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
  };
}
