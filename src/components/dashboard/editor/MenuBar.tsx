"use client";
import * as React from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
} from "lucide-react";
import { ColorDropdown, HighlightDropdown, SizeDropdown } from "./Dropdowns";

interface MenuBarProps {
  editor: Editor | null;
  onLinkOpen: () => void;
}

export const MenuBar = ({ editor, onLinkOpen }: MenuBarProps) => {
  const [activeMenu, setActiveMenu] = React.useState<'color' | 'highlight' | 'size' | null>(null);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-muted border-b border-border rounded-t-[2.5rem] transition-colors relative z-50">
      <div className="flex items-center gap-1 px-2">
        <ColorDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <SizeDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      </div>

      <div className="w-px h-8 bg-border/50 mx-2 self-center" />

      <button
        onClick={onLinkOpen}
        className={`px-4 py-2 rounded-xl text-gray-500 hover:bg-card hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest`}
        title="Prepojiť (Kontakt, Projekt...)"
      >
        <LinkIcon className="w-3.5 h-3.5" />
        <span>Prepojiť</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">
        Minimal Editor Mode
      </div>
    </div>
  );
};
