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
      // Strip leading triggers like @, #, $, ! for filtering
      const q = query.replace(/^[@#$!]/, "").toLowerCase();

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
    (
      suggestion: Suggestion,
      editor: Editor | null,
      replaceWord: boolean = true,
    ) => {
      if (!editor) {
        console.error("selectSuggestion: Editor is null");
        return;
      }

      try {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        let from = $from.pos;
        let to = $from.pos;

        if (replaceWord) {
          // Scan backwards from cursor to find word start
          const textBefore = $from.parent.textBetween(
            Math.max(0, $from.parentOffset - 20),
            $from.parentOffset,
            undefined,
            "\ufffc",
          );

          console.log("Autocomplete text before:", textBefore);
          const match = textBefore.match(/(\S+)$/);
          if (match) {
            const word = match[0];
            from = $from.pos - word.length;
            to = $from.pos;
            console.log("Replacing word:", word, "at", { from, to });
          }
        } else {
          console.log("Direct insertion at:", from);
        }

        const marks = state.storedMarks || $from.marks();

        console.log("Inserting mention structure:", {
          id: suggestion.id,
          label: suggestion.label,
          type: suggestion.type,
        });

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

        console.log("Mention insertion successful");
      } catch (error) {
        console.error("selectSuggestion error:", error);
        import("sonner").then(({ toast }) =>
          toast.error("Chyba pri vkladaní tagu"),
        );
      }

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
