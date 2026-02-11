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
    <div className="flex flex-wrap gap-1 p-2 bg-muted border-b border-border rounded-t-[2.5rem] transition-colors relative z-50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("bold") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Tučné písmo"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("italic") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Kurzíva"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("underline") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Podčiarknuté"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <ColorDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <HighlightDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <SizeDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${editor.isActive("heading", { level: 1 }) ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Nadpis 1 (Veľký)"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${editor.isActive("heading", { level: 2 }) ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Nadpis 2 (Stredný)"
      >
        H2
      </button>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("bulletList") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Odrážkový zoznam"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("orderedList") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Číslovaný zoznam"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-xl transition-all ${editor.isActive("blockquote") ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border"}`}
        title="Citácia"
      >
        <Quote className="w-4 h-4" />
      </button>

      <div className="w-px h-8 bg-border/50 mx-1 self-center" />

      <button
        onClick={onLinkOpen}
        className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 font-bold text-xs`}
        title="Prepojiť (Kontakt, Projekt...)"
      >
        <LinkIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Prepojiť</span>
      </button>

      <div className="flex-1" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground transition-all disabled:opacity-20"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground transition-all disabled:opacity-20"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};
