"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTodoRelations,
  ContactRelation,
  ProjectRelation,
} from "@/app/actions/todo-relations";
import { Editor } from "@tiptap/react";

export interface Suggestion {
  id: number;
  label: string;
  sub?: string;
  type: "contact" | "project";
}

export function useAutocomplete() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [relations, setRelations] = useState<{
    contacts: ContactRelation[];
    projects: ProjectRelation[];
  }>({
    contacts: [],
    projects: [],
  });

  // Load relations
  useEffect(() => {
    const load = async () => {
      const res = await getTodoRelations();
      if (res.success) {
        setRelations(res.data);
      }
    };
    load();
  }, []);

  const checkAutocomplete = useCallback((editor: Editor) => {
    if (!editor) return;
    const { selection } = editor.state;
    const { $from } = selection;
    const textBefore =
      ($from.nodeBefore as { text?: string } | null)?.text || "";
    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || "";

    if (lastWord.length >= 3) {
      setQuery(lastWord);
      const coords = editor.view.coordsAtPos(selection.from);
      if (coords) {
        setPosition({
          top: coords.bottom + 5,
          left: coords.left,
        });
      }
    } else {
      setQuery("");
      setSuggestions([]);
      setSelectedIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
      if (suggestions.length > 0) {
        setSuggestions([]);
        setSelectedIndex(0);
      }
      return;
    }

    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      const contacts: Suggestion[] = relations.contacts
        .filter((c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q),
        )
        .map((c) => ({
          id: c.id,
          label: `${c.first_name} ${c.last_name}`,
          sub: c.company,
          type: "contact",
        }));

      const projects: Suggestion[] = relations.projects
        .filter((p) => p.project_type.toLowerCase().includes(q))
        .map((p) => ({
          id: p.id,
          label: p.project_type,
          sub: p.stage,
          type: "project",
        }));

      setSuggestions([...contacts, ...projects].slice(0, 5));
      setSelectedIndex(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, relations]);

  const selectSuggestion = useCallback(
    (suggestion: Suggestion, editor: Editor | null) => {
      if (!editor) return;

      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 20),
        $from.parentOffset,
        undefined,
        "\ufffc",
      );

      const match = textBefore.match(/(\S+)$/);
      if (!match) return;

      const word = match[0];
      const from = $from.pos - word.length;
      const to = $from.pos;

      const marks = state.storedMarks || $from.marks();

      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: "mentionComponent",
          attrs: {
            id: suggestion.id,
            label: suggestion.label,
            type: suggestion.type,
          },
        })
        .insertContent(" ")
        .focus()
        .setStoredMarks(marks)
        .run();

      setQuery("");
      setSuggestions([]);
      setSelectedIndex(0);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, editor: Editor | null): boolean => {
      if (suggestions.length === 0) return false;

      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        event.preventDefault();
        return true;
      }

      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
        event.preventDefault();
        return true;
      }

      if (event.key === "Enter") {
        selectSuggestion(suggestions[selectedIndex], editor);
        event.preventDefault();
        return true;
      }

      if (event.key === "Escape") {
        setSuggestions([]);
        return true;
      }

      return false;
    },
    [suggestions, selectedIndex, selectSuggestion],
  );

  return {
    suggestions,
    position,
    selectedIndex,
    checkAutocomplete,
    selectSuggestion,
    handleKeyDown,
  };
}
