"use client";
import * as React from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Palette,
  Type,
  Link as LinkIcon,
  Sparkles,
  Search
} from "lucide-react";
import { ColorDropdown, SizeDropdown } from "./Dropdowns";

interface MenuBarProps {
  editor: Editor | null;
  onLinkOpen: () => void;
}

export const MenuBar = ({ editor, onLinkOpen }: MenuBarProps) => {
  const [activeMenu, setActiveMenu] = React.useState<'color' | 'highlight' | 'size' | null>(null);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white/5 dark:bg-black/20 backdrop-blur-xl border-b border-violet-500/10 rounded-t-[2.5rem] transition-colors relative z-50">
      <div className="flex items-center gap-1.5 px-2">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={<Bold size={14} strokeWidth={3} />}
          title="Tučné (Ctrl+B)"
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={<Italic size={14} strokeWidth={3} />}
          title="Kurzíva (Ctrl+I)"
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          icon={<UnderlineIcon size={14} strokeWidth={3} />}
          title="Podčiarknuté (Ctrl+U)"
        />
        
        <div className="w-[1px] h-4 bg-violet-500/20 mx-1" />
        
        <ColorDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <SizeDropdown editor={editor} activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      </div>

      <div className="w-px h-8 bg-violet-500/10 mx-2 self-center" />

      <button
        onClick={onLinkOpen}
        className={`px-4 py-2 rounded-xl text-violet-400 group-hover:text-violet-300 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest`}
        title="Prepojiť (Kontakt, Projekt...)"
      >
        <LinkIcon className="w-3.5 h-3.5" />
        <span>Prepojiť</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-violet-400/30 italic">
        <Sparkles className="w-3 h-3" />
        Premium Composer
      </div>
    </div>
  );
};

function ToolbarBtn({
  onClick,
  isActive,
  icon,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`p-2 rounded-xl transition-all ${
        isActive
          ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20 scale-105"
          : "hover:bg-white/5 text-violet-400/60 hover:text-violet-300"
      }`}
    >
      {icon}
    </button>
  );
}
