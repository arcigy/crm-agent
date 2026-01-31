"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { User, FolderKanban } from "lucide-react";
import { Suggestion } from "@/hooks/useAutocomplete";

interface AutocompleteDropdownProps {
  suggestions: Suggestion[];
  position: { top: number; left: number } | null;
  onSelect: (suggestion: Suggestion) => void;
  selectedIndex?: number;
}

export function AutocompleteDropdown({
  suggestions,
  position,
  onSelect,
  selectedIndex = 0,
}: AutocompleteDropdownProps) {
  if (suggestions.length === 0 || !position || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed bg-white dark:bg-zinc-800 border-2 border-blue-100 dark:border-zinc-700 rounded-2xl shadow-2xl p-2 z-[99999] min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.id}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(suggestion);
          }}
          className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all group ${
            index === selectedIndex
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
              : "hover:bg-blue-50 dark:hover:bg-zinc-700"
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${
              index === selectedIndex
                ? "bg-white/20 text-white"
                : suggestion.type === "contact"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
            }`}
          >
            {suggestion.type === "contact" ? (
              <User size={14} strokeWidth={3} />
            ) : (
              <FolderKanban size={14} strokeWidth={3} />
            )}
          </div>
          <div className="flex flex-col">
            <span
              className={`text-sm font-bold ${
                index === selectedIndex
                  ? "text-white"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {suggestion.label}
            </span>
            {suggestion.sub && (
              <span
                className={`text-[10px] uppercase font-bold ${
                  index === selectedIndex ? "text-white/70" : "text-zinc-400"
                }`}
              >
                {suggestion.sub}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
