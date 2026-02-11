"use client";
import * as React from "react";
import { Editor } from "@tiptap/react";
import { Baseline, Highlighter, Type, ChevronDown } from "lucide-react";

export const colors = [
  { name: 'Default', color: 'inherit' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Green', color: '#10b981' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Purple', color: '#8b5cf6' },
];

export const highlights = [
  { name: 'None', color: 'transparent' },
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Pink', color: '#fbcfe8' },
];

export const sizes = [
  { name: 'Small', value: '0.875rem' },
  { name: 'Normal', value: '1rem' },
  { name: 'Large', value: '1.25rem' },
  { name: 'Extra Large', value: '1.5rem' },
];

interface DropdownProps {
  editor: Editor;
  activeMenu: 'color' | 'highlight' | 'size' | null;
  setActiveMenu: (menu: 'color' | 'highlight' | 'size' | null) => void;
}

export const ColorDropdown = ({ editor, activeMenu, setActiveMenu }: DropdownProps) => {
  const currentColor = editor.getAttributes('textStyle').color || 'inherit';
  return (
    <div className="relative">
      <button
        onClick={() => setActiveMenu(activeMenu === 'color' ? null : 'color')}
        className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 ${activeMenu === 'color' ? 'bg-card border-border' : ''}`}
      >
        <Baseline className="w-4 h-4" style={{ color: currentColor !== 'inherit' ? currentColor : undefined }} />
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {activeMenu === 'color' && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
          <div className="absolute top-full left-0 mt-1 flex flex-col bg-card border border-border rounded-xl shadow-xl z-50 p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
            {colors.map((c) => (
              <button
                key={c.color}
                onClick={() => {
                  editor.chain().focus().setColor(c.color).run();
                  setActiveMenu(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:bg-muted rounded-lg transition-colors ${currentColor === c.color ? 'bg-muted text-indigo-600' : 'text-foreground'}`}
              >
                <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.color === 'inherit' ? 'currentColor' : c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const HighlightDropdown = ({ editor, activeMenu, setActiveMenu }: DropdownProps) => {
  const currentHighlight = editor.getAttributes('highlight').color || 'transparent';
  return (
    <div className="relative">
      <button
        onClick={() => setActiveMenu(activeMenu === 'highlight' ? null : 'highlight')}
        className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 ${activeMenu === 'highlight' ? 'bg-card border-border' : ''}`}
      >
        <Highlighter className="w-4 h-4" style={{ color: currentHighlight !== 'transparent' ? currentHighlight : undefined }} />
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {activeMenu === 'highlight' && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
          <div className="absolute top-full left-0 mt-1 flex flex-col bg-card border border-border rounded-xl shadow-xl z-50 p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
            {highlights.map((h) => (
              <button
                key={h.color}
                onClick={() => {
                  editor.chain().focus().setHighlight({ color: h.color }).run();
                  setActiveMenu(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:bg-muted rounded-lg transition-colors ${currentHighlight === h.color ? 'bg-muted text-indigo-600' : 'text-foreground'}`}
              >
                <div className="w-3 h-3 rounded border border-border" style={{ backgroundColor: h.color }} />
                {h.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const SizeDropdown = ({ editor, activeMenu, setActiveMenu }: DropdownProps) => {
  return (
    <div className="relative">
      <button
        onClick={() => setActiveMenu(activeMenu === 'size' ? null : 'size')}
        className={`p-2 rounded-xl text-gray-400 hover:bg-card hover:text-foreground border border-transparent hover:border-border transition-all flex items-center gap-1 ${activeMenu === 'size' ? 'bg-card border-border' : ''}`}
      >
        <Type className="w-4 h-4" />
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {activeMenu === 'size' && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
          <div className="absolute top-full left-0 mt-1 flex flex-col bg-card border border-border rounded-xl shadow-xl z-50 p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
            {sizes.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  editor.chain().focus().setFontSize(s.value).run();
                  setActiveMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:bg-muted rounded-lg transition-colors text-foreground"
              >
                <span style={{ fontSize: s.value }}>{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
