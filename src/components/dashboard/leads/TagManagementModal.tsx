"use client";

import * as React from "react";
import { X, Plus, Tag, Trash2, Check, Loader2, Pencil, RefreshCw } from "lucide-react";
import { GmailMessage } from "@/types/gmail";
import { syncAllLabelsWithGmail } from "@/app/actions/labels";
import { toast } from "sonner";

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
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Synchronizujem štítky s Gmailom...");
    try {
      const res = await syncAllLabelsWithGmail();
      if (res.success) {
        toast.success(`Synchronizácia úspešná: ${(res as any).synced} synchronizovaných, ${(res as any).failed} zlyhalo`, { id: toastId });
      } else {
        toast.error(`Synchronizácia zlyhala: ${(res as any).error}`, { id: toastId });
      }
    } catch (err) {
      toast.error("Nepodarilo sa spustiť synchronizáciu", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const COLORS = [
    // Reds/Pinks
    { name: "Neon Red", value: "#ff0000" },
    { name: "Plasma Red", value: "#ef4444" },
    { name: "Crimson", value: "#dc2626" },
    { name: "Radical Rose", value: "#f43f5e" },
    { name: "Hot Pink", value: "#ff007f" },
    { name: "Deep Rose", value: "#be123c" },
    { name: "Wild Blush", value: "#fda4af" },
    // Violets/Purples
    { name: "Cyber Purple", value: "#d946ef" },
    { name: "Deep Fuchsia", value: "#c026d3" },
    { name: "Neon Violet", value: "#a855f7" },
    { name: "Deep Violet", value: "#7c3aed" },
    { name: "Electric Indigo", value: "#6366f1" },
    { name: "Deep Indigo", value: "#4338ca" },
    { name: "Soft Lavender", value: "#ddd6fe" },
    // Blues/Cyans
    { name: "Royal Blue", value: "#312e81" },
    { name: "Neon Blue", value: "#3b82f6" },
    { name: "Electric Cyan", value: "#00f2ff" },
    { name: "Ice Teal", value: "#2dd4bf" },
    { name: "Sky Blue", value: "#0ea5e9" },
    { name: "Marine Blue", value: "#1e40af" },
    { name: "Deep Ocean", value: "#1e3a8a" },
    // Teals/Greens
    { name: "Cyan Spark", value: "#22d3ee" },
    { name: "Deep Teal", value: "#134e4a" },
    { name: "Mint Neon", value: "#00ff9f" },
    { name: "Neon Green", value: "#39ff14" },
    { name: "Lime Shock", value: "#ccff00" },
    { name: "Forest Green", value: "#166534" },
    { name: "Emerald Dream", value: "#10b981" },
    // Yellows/Oranges
    { name: "Acid Green", value: "#84cc16" },
    { name: "Neon Yellow", value: "#fff200" },
    { name: "Amber Glint", value: "#fbbf24" },
    { name: "Electric Amber", value: "#f59e0b" },
    { name: "Safety Orange", value: "#ff9100" },
    { name: "Neon Orange", value: "#ff5e00" },
    { name: "Burnt Sunset", value: "#ea580c" },
    // Neutrals / Metals
    { name: "Pure White", value: "#ffffff" },
    { name: "Silver", value: "#e2e8f0" },
    { name: "Titanium", value: "#94a3b8" },
    { name: "Obsidian", value: "#0f172a" },
    { name: "Chrome", value: "#475569" },
    { name: "Gold", value: "#d4af37" },
  ];

  const [activePicker, setActivePicker] = React.useState<string | "new" | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 50);
    } else {
      setAnimate(false);
      setIsAdding(false);
      setNewTagName("");
      setActivePicker(null);
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
      setActivePicker(null);
    }
  };

  const handleSaveEdit = () => {
    if (editingTag && editValue.trim() && editingTag !== editValue.trim()) {
      onRenameTag(editingTag, editValue.trim());
    }
    setEditingTag(null);
    setEditValue("");
  };

  const currentColor = activePicker === 'new' ? selectedColor : (activePicker ? tagColors[activePicker] : null);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="relative scale-90 sm:scale-100 flex items-center justify-center">
        {/* Side Panel Color Picker (Left) - Absolute positioned to keep main modal centered */}
        <div 
          className={`absolute left-full ml-6 w-[230px] h-full bg-white/95 dark:bg-[#0b0c10]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col transition-all duration-500 transform ${activePicker ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12 pointer-events-none'}`}
          style={{
            boxShadow: activePicker ? `0 0 30px -10px ${currentColor}30, 0 20px 40px -12px rgba(0,0,0,0.5)` : 'none'
          }}
        >
          <div className="p-5 border-b border-violet-500/10 flex items-center justify-between">
            <div className="w-6" /> {/* Spacer to center title */}
            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em] text-center">
              Farebná Paleta
            </h3>
            <button 
              onClick={() => setActivePicker(null)}
              className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-all text-slate-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto thin-scrollbar flex flex-col items-center justify-center">
            <div className="grid grid-cols-5 gap-3 mx-auto">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    if (activePicker === 'new') setSelectedColor(c.value);
                    else if (activePicker) onUpdateTagColor(activePicker, c.value);
                  }}
                  className={`w-6 h-6 rounded-full transition-all duration-300 hover:scale-125 shadow-sm border-2 relative group flex-shrink-0 ${currentColor === c.value ? 'border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-transparent'}`}
                  style={{ 
                    backgroundColor: c.value,
                    boxShadow: currentColor === c.value ? `0 0 15px -2px ${c.value}` : 'none'
                  }}
                  title={c.name}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6 pt-2 mt-auto flex flex-col gap-6 bg-gradient-to-t from-white/80 dark:from-black/40 to-transparent">
            {/* Custom Color Mixer - Positioned Lower and Refined */}
            <div className="pt-4 border-t border-violet-500/10">
              <div className="flex flex-col gap-3">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Vlastná Farba (Mixér)</span>
                <div className="flex items-center gap-3 justify-center">
                  <div className="relative group/picker">
                    <input 
                      type="color" 
                      value={currentColor || "#8b5cf6"}
                      onChange={(e) => {
                        if (activePicker === 'new') setSelectedColor(e.target.value);
                        else if (activePicker) onUpdateTagColor(activePicker, e.target.value);
                      }}
                      className="w-10 h-10 rounded-2xl cursor-pointer bg-transparent border-none appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-2xl [&::-webkit-color-swatch]:border-none shadow-xl hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 pointer-events-none group-hover/picker:ring-white/40 transition-all" />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <input 
                        type="text"
                        value={currentColor || ""}
                        onChange={(e) => {
                          if (activePicker === 'new') setSelectedColor(e.target.value);
                          else if (activePicker) onUpdateTagColor(activePicker, e.target.value);
                        }}
                        placeholder="#HEX"
                        className="w-24 h-9 px-3 bg-slate-50 dark:bg-zinc-800/80 rounded-xl text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none border border-violet-500/10 focus:border-violet-500/40 transition-all text-center tracking-wider"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setActivePicker(null)}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all shadow-xl shadow-violet-600/20 active:scale-95 border border-white/10 group"
            >
              <span className="group-hover:tracking-[0.3em] transition-all">Potvrdiť Výber</span>
            </button>
          </div>
        </div>

        {/* Main Modal */}
        <div 
          className={`relative w-full max-w-sm bg-white dark:bg-[#0b0c10] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
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
                <div className="flex items-center gap-2">
                   <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest opacity-60">
                     {email ? "Spravovať štítky pre mail" : "Globálne nastavenia systému"}
                   </p>
                   <button 
                     onClick={handleSync}
                     disabled={isSyncing}
                     title="Synchronizovať s Gmailom"
                     className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider disabled:opacity-50"
                   >
                     {isSyncing ? (
                       <Loader2 className="w-2.5 h-2.5 animate-spin" />
                     ) : (
                       <RefreshCw className="w-2.5 h-2.5" />
                     )}
                     Sync
                   </button>
                </div>
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
          <div className="p-8 overflow-y-auto max-h-[60vh] thin-scrollbar">
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
                const isPicking = activePicker === tag;

                return (
                  <div 
                    key={tag}
                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                      email && !isEditing ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isActive 
                        ? 'shadow-lg' 
                        : 'bg-slate-50 dark:bg-zinc-800/50 border-transparent hover:border-violet-500/30'
                    } ${isPicking ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950/20 shadow-xl' : ''}`}
                    style={isActive ? {
                      backgroundColor: tagColor,
                      borderColor: tagColor,
                      boxShadow: `0 10px 15px -3px ${tagColor}40`
                    } : {}}
                    onClick={() => !isEditing && email && onToggleTag(email.id, tag)}
                    onDoubleClick={() => {
                      if (!isEditing && email) {
                        if (!isActive) onToggleTag(email.id, tag);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div 
                          className={`w-4 h-4 rounded-full border-2 border-white/20 transition-transform hover:scale-125 cursor-pointer shadow-sm`}
                          style={{ backgroundColor: tagColor }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePicker(isPicking ? null : tag);
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
                        if (e.key === 'Escape') {
                          setIsAdding(false);
                          setActivePicker(null);
                        }
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
                        onClick={() => {
                          setIsAdding(false);
                          setActivePicker(null);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setActivePicker(activePicker === 'new' ? null : 'new')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${activePicker === 'new' ? 'bg-violet-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                    >
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: selectedColor }} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Zmeniť farbu
                      </span>
                    </button>
                  </div>

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mt-1">
                    Kliknite navrchu a stlačte Enter pre uloženie
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
                Kliknutím priradíte, dvojklikom priradíte a zavriete
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
