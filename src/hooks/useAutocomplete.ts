"use client";

import { useState, useEffect, useCallback } from "react";
import { getTodoRelations } from "@/app/actions/todo-relations";

export interface Suggestion {
  id: number;
  label: string;
  sub?: string;
  type: "contact" | "project";
}

export function useAutocomplete(editor: any) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [relations, setRelations] = useState<{
    contacts: any[];
    projects: any[];
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

  const checkAutocomplete = useCallback((editor: any) => {
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
    }
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      const contacts: Suggestion[] = relations.contacts
        .filter((c: any) =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q),
        )
        .map((c: any) => ({
          id: c.id,
          label: `${c.first_name} ${c.last_name}`,
          sub: c.company,
          type: "contact",
        }));

      const projects: Suggestion[] = relations.projects
        .filter((p: any) => p.project_type.toLowerCase().includes(q))
        .map((p: any) => ({
          id: p.id,
          label: p.project_type,
          sub: p.stage,
          type: "project",
        }));

      setSuggestions([...contacts, ...projects].slice(0, 5));
    }, 500);

    return () => clearTimeout(timer);
  }, [query, relations]);

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (!editor) return;

      const { selection } = editor.state;
      const { $from } = selection;

      // Extract current formatting marks to preserve them after insertion
      const marks = editor.state.storedMarks || $from.marks();

      // Calculate the start of the word safely within the current paragraph
      // We use parentOffset to stay strictly within the current block structure
      const parentText = $from.parent.textContent;
      const parentOffset = $from.parentOffset;
      let wordStart = parentOffset;

      // Scan backwards for the start of the word (space or start of text)
      while (wordStart > 0 && !/\s/.test(parentText[wordStart - 1])) {
        wordStart--;
      }

      // Convert local parent offset to absolute document position
      const from = $from.pos - (parentOffset - wordStart);

      editor
        .chain()
        .focus()
        .deleteRange({ from, to: $from.pos })
        .insertContent({
          type: "mentionComponent",
          attrs: {
            id: suggestion.id,
            label: suggestion.label,
            type: suggestion.type,
          },
        })
        .insertContent(" ")
        // Restore focus and marks so the user can continue typing with the same style
        .focus()
        .setStoredMarks(marks)
        .run();

      setQuery("");
      setSuggestions([]);
    },
    [editor],
  );

  return {
    suggestions,
    position,
    checkAutocomplete,
    selectSuggestion,
  };
}
