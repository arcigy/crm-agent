"use client";

import * as React from "react";
import { X, Plus, Tag, Trash2, Check, Loader2, Pencil } from "lucide-react";
import { GmailMessage } from "@/types/gmail";

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: GmailMessage | null;
  customTags: string[];
  tagColors: Record<string, string>;
  messageTags: Record<string, string[]>;
  onAddTag: (tag: string, color?: string) => void;
  onToggleTag: (id: string, tag: string) => void;
  onRemoveCustomTag: (tag: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onUpdateTagColor: (tag: string, color: string) => void;
}

export function TagManagementModal({
  isOpen,
  onClose,
  email,
  customTags,
  tagColors,
  messageTags,
  onAddTag,
  onToggleTag,
  onRemoveCustomTag,
  onRenameTag,
  onUpdateTagColor,
}: TagManagementModalProps) {
  const [newTagName, setNewTagName] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState("#8b5cf6");
  const [animate, setAnimate] = React.useState(false);

  const COLORS = [
    { name: "Violet", value: "#8b5cf6" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Emerald", value: "#10b981" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Slate", value: "#64748b" },
  ];

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
    } else {
      setAnimate(false);
      setIsAdding(false);
      setNewTagName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentEmailTags = email ? (messageTags[email.id] || []) : [];

  const handleAddTag = () => {
    if (newTagName.trim()) {
      onAddTag(newTagName.trim(), selectedColor);
      setNewTagName("");
      setIsAdding(false);
      setSelectedColor("#8b5cf6");
    }
  };

  const handleSaveEdit = () => {
    if (editingTag && editValue.trim() && editingTag !== editValue.trim()) {
      onRenameTag(editingTag, editValue.trim());
    }
    setEditingTag(null);
    setEditValue("");
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div 
        className={`relative w-full max-w-md bg-white dark:bg-[#0b0c10] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        style={{
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.25)'
        }}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-violet-500/10 flex items-center justify-between bg-violet-50/30 dark:bg-violet-900/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-600 rounded-2xl shadow-lg shadow-violet-600/20">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {email ? "Priradiť štítky" : "Správa štítkov"}
              </h2>
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest opacity-60">
                {email ? "Spravovať štítky pre mail" : "Globálne nastavenia systému"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-xl transition-all text-slate-400 hover:text-violet-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {customTags.length === 0 && !isAdding && (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm italic font-medium">Zatiaľ žiadne štítky</p>
              </div>
            )}

            {customTags.map((tag) => {
              const isActive = currentEmailTags.includes(tag);
              const isEditing = editingTag === tag;
              const tagColor = tagColors[tag] || "#8b5cf6";

              return (
                <div 
                  key={tag}
                  className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                    email && !isEditing ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isActive 
                      ? 'shadow-lg' 
                      : 'bg-slate-50 dark:bg-zinc-800/50 border-transparent hover:border-violet-500/30'
                  }`}
                  style={isActive ? {
                    backgroundColor: tagColor,
                    borderColor: tagColor,
                    boxShadow: `0 10px 15px -3px ${tagColor}40`
                  } : {}}
                  onClick={() => !isEditing && email && onToggleTag(email.id, tag)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative group/color">
                      <div 
                        className={`w-4 h-4 rounded-full border-2 border-white/20 transition-transform hover:scale-125 cursor-pointer`}
                        style={{ backgroundColor: tagColor }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = COLORS.findIndex(c => c.value === tagColor);
                          const nextIndex = (currentIndex + 1) % COLORS.length;
                          onUpdateTagColor(tag, COLORS[nextIndex].value);
                        }}
                      />
                    </div>

                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') {
                            setEditingTag(null);
                            setEditValue("");
                          }
                        }}
                        className="bg-transparent border-b border-white/50 text-white outline-none w-full text-sm font-black"
                      />
                    ) : (
                      <span className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                        {tag}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isActive && !isEditing && <Check className="w-4 h-4 text-white" />}
                    {!isEditing && (
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTag(tag);
                            setEditValue(tag);
                          }}
                          className={`p-2 rounded-xl transition-all ${
                            isActive 
                              ? 'hover:bg-white/20 text-white/60 hover:text-white' 
                              : 'hover:bg-violet-100 text-slate-300 hover:text-violet-600'
                          }`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Naozaj chcete vymazať štítok "${tag}" zo systému?`)) {
                              onRemoveCustomTag(tag);
                            }
                          }}
                          className={`p-2 rounded-xl transition-all ${
                            isActive 
                              ? 'hover:bg-white/20 text-white/60 hover:text-white' 
                              : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* New Tag Input Area */}
          <div className="mt-8 transition-all duration-300">
            {isAdding ? (
              <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-300">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') setIsAdding(false);
                    }}
                    placeholder="Názov štítku..."
                    className="w-full h-14 px-5 bg-slate-50 dark:bg-zinc-800/50 border-2 border-violet-500 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-violet-500/10 placeholder:text-slate-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button 
                      onClick={handleAddTag}
                      className="p-2 text-white rounded-xl hover:opacity-90 transition-all shadow-md active:scale-90"
                      style={{ backgroundColor: selectedColor }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 px-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-6 h-6 rounded-full transition-all ${selectedColor === c.value ? 'scale-125 ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900' : 'opacity-40 hover:opacity-100 hover:scale-110'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>

                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mt-1">
                  Vyberte farbu a stlačte Enter
                </p>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-violet-500/20 hover:border-violet-500/50 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all group text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest text-[10px]"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                Vytvoriť nový štítok
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        {email && (
          <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 border-t border-violet-500/10 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kliknutím na štítok ho priradíte k mailu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
