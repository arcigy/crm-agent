"use client";

import * as React from "react";
import { X, Plus, Tag, Trash2, Check, Loader2, Pencil, RefreshCw } from "lucide-react";
import { GmailMessage } from "@/types/gmail";
import { toast } from "sonner";
import { 
  createGmailLabel, 
  deleteGmailLabel, 
  renameGmailLabel, 
  updateGmailLabelColor 
} from "@/app/actions/gmail-labels";
import { updateLabel } from "@/app/actions/labels";
import { Sparkles, Save, Brain, ChevronDown, ChevronUp } from "lucide-react";

interface GmailLabelObj {
  id: string;
  name: string;
  color?: string;
  ai_enabled?: boolean;
  ai_prompt?: string;
  db_id?: string | number;
}

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: GmailMessage | null;
  gmailLabels: GmailLabelObj[];
  messageTags: Record<string, string[]>;
  onToggleTag: (id: string, tag: string) => void;
  onRefresh: () => void;
}


export function TagManagementModal({
  isOpen,
  onClose,
  email,
  gmailLabels = [],
  messageTags,
  onToggleTag,
  onRefresh,
}: TagManagementModalProps) {
  const [newTagName, setNewTagName] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState("#8b5cf6");
  const [animate, setAnimate] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [activePicker, setActivePicker] = React.useState<string | "new" | null>(null);
  const [expandingAi, setExpandingAi] = React.useState<string | null>(null);
  const [aiPrompts, setAiPrompts] = React.useState<Record<string, string>>({});
  const [aiEnabled, setAiEnabled] = React.useState<Record<string, boolean>>({});

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

  const handleCreateLabel = async () => {
    if (!newTagName.trim()) return;
    
    setIsSyncing(true);
    const res = await createGmailLabel(newTagName.trim(), selectedColor);
    if (res.success) {
      toast.success("Štítok vytvorený v Gmaile");
      setNewTagName("");
      setIsAdding(false);
      onRefresh();
    } else {
      toast.error(`Chyba: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleRenameLabel = async () => {
    if (editingTag && editValue.trim() && editingTag !== editValue.trim()) {
      setIsSyncing(true);
      const res = await renameGmailLabel(editingTag, editValue.trim());
      if (res.success) {
        toast.success("Štítok premenovaný");
        onRefresh();
      } else {
        toast.error(`Chyba: ${res.error}`);
      }
      setIsSyncing(false);
    }
    setEditingTag(null);
    setEditValue("");
  };

  const handleDeleteLabel = async (name: string) => {
    if (!confirm(`Naozaj chcete vymazať štítok "${name}" z Gmailu?`)) return;
    
    setIsSyncing(true);
    const res = await deleteGmailLabel(name);
    if (res.success) {
      toast.success("Štítok odstránený");
      onRefresh();
    } else {
      toast.error(`Chyba: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleUpdateColor = async (name: string, color: string) => {
    setIsSyncing(true);
    const res = await updateGmailLabelColor(name, color);
    if (res.success) {
      toast.success("Farba štítku aktualizovaná");
      onRefresh();
    } else {
      toast.error(`Chyba: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleUpdateAiSettings = async (label: GmailLabelObj) => {
    if (!label.db_id) {
        toast.error("Štítok nie je zosynchronizovaný s databázou");
        return;
    }
    
    setIsSyncing(true);
    const res = await updateLabel(
        label.db_id, 
        label.name, 
        label.color, 
        aiEnabled[label.id] ?? label.ai_enabled, 
        aiPrompts[label.id] ?? label.ai_prompt
    );
    
    if (res.success) {
        toast.success("AI nastavenia uložené");
        setExpandingAi(null);
        onRefresh();
    } else {
        toast.error(`Chyba: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const COLORS = [
    { name: "Neon Red", value: "#ff0000" },
    { name: "Plasma Red", value: "#ef4444" },
    { name: "Crimson", value: "#dc2626" },
    { name: "Cyber Purple", value: "#d946ef" },
    { name: "Deep Violet", value: "#7c3aed" },
    { name: "Electric Indigo", value: "#6366f1" },
    { name: "Neon Blue", value: "#3b82f6" },
    { name: "Electric Cyan", value: "#00f2ff" },
    { name: "Neon Green", value: "#39ff14" },
    { name: "Emerald Dream", value: "#10b981" },
    { name: "Neon Yellow", value: "#fff200" },
    { name: "Neon Orange", value: "#ff5e00" },
    { name: "Pure White", value: "#ffffff" },
    { name: "Gold", value: "#d4af37" },
  ];

  const currentColor = activePicker === 'new' ? selectedColor : (activePicker ? gmailLabels.find(l => l.name === activePicker)?.color : null);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="relative scale-90 sm:scale-100 flex items-center justify-center">
        {/* Side Panel Color Picker */}
        <div 
          className={`absolute left-full ml-6 w-[230px] h-full bg-white/95 dark:bg-[#0b0c10]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col transition-all duration-500 transform ${activePicker ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12 pointer-events-none'}`}
        >
          <div className="p-5 border-b border-violet-500/10 flex items-center justify-between">
            <div className="w-6" />
            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em] text-center">
              Farebná Paleta
            </h3>
            <button onClick={() => setActivePicker(null)} className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-all text-slate-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto thin-scrollbar">
            <div className="grid grid-cols-5 gap-3 mx-auto">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    if (activePicker === 'new') setSelectedColor(c.value);
                    else if (activePicker) handleUpdateColor(activePicker, c.value);
                  }}
                  className={`w-6 h-6 rounded-full transition-all duration-300 hover:scale-125 shadow-sm border-2 ${currentColor === c.value ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          
          <div className="p-6 mt-auto flex flex-col gap-4 bg-gradient-to-t from-white/80 dark:from-black/40 to-transparent">
             <div className="flex flex-col gap-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Vlastná Farba</span>
                <div className="flex items-center gap-2 justify-center">
                    <input 
                      type="color" 
                      value={currentColor || "#8b5cf6"}
                      onChange={(e) => {
                        if (activePicker === 'new') setSelectedColor(e.target.value);
                        else if (activePicker) handleUpdateColor(activePicker, e.target.value);
                      }}
                      className="w-10 h-10 rounded-2xl cursor-pointer bg-transparent border-none appearance-none"
                    />
                    <input 
                      type="text"
                      value={currentColor || ""}
                      onChange={(e) => {
                        if (activePicker === 'new') setSelectedColor(e.target.value);
                        else if (activePicker) handleUpdateColor(activePicker, e.target.value);
                      }}
                      placeholder="#HEX"
                      className="w-24 h-9 px-3 bg-slate-50 dark:bg-zinc-800/80 rounded-xl text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none border border-violet-500/10 text-center"
                    />
                </div>
             </div>
             <button onClick={() => setActivePicker(null)} className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all active:scale-95">
               Potvrdiť
             </button>
          </div>
        </div>

        {/* Main Modal */}
        <div className={`relative w-full max-w-sm bg-white dark:bg-[#0b0c10] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} style={{ border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          {/* Header */}
          <div className="px-8 py-6 border-b border-violet-500/10 flex items-center justify-between bg-violet-50/30 dark:bg-violet-900/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-600 rounded-2xl shadow-lg">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {email ? "Priradiť štítky" : "Správa štítkov"}
                </h2>
                <div className="flex items-center gap-2">
                   <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest opacity-60">
                     Gmail Štítky
                   </p>
                   {isSyncing && <Loader2 className="w-2.5 h-2.5 animate-spin text-violet-500" />}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-xl transition-all text-slate-400 hover:text-violet-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto max-h-[60vh] thin-scrollbar">
            <div className="space-y-3">
              {gmailLabels.length === 0 && !isAdding && (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm italic font-medium">Zatiaľ žiadne štítky</p>
                </div>
              )}

              {gmailLabels.map((l) => {
                const tag = l.name;
                const isActive = currentEmailTags.includes(tag);
                const isEditing = editingTag === tag;
                const tagColor = l.color || "#8b5cf6";
                const isPicking = activePicker === tag;

                return (
                  <div key={l.id} className="space-y-2">
                    <div 
                      className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${email && !isEditing ? 'cursor-pointer' : 'cursor-default'} ${isActive ? 'shadow-lg' : 'bg-slate-50 dark:bg-zinc-800/50 border-transparent hover:border-violet-500/30'} ${isPicking ? 'ring-2 ring-violet-500 shadow-xl' : ''}`}
                      style={isActive ? { backgroundColor: tagColor, borderColor: tagColor, boxShadow: `0 10px 15px -3px ${tagColor}40` } : {}}
                      onClick={() => !isEditing && email && onToggleTag(email.id, tag)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white/20 transition-transform hover:scale-125 cursor-pointer"
                          style={{ backgroundColor: tagColor }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePicker(isPicking ? null : tag);
                          }}
                        />
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleRenameLabel}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameLabel()}
                            className="bg-transparent border-b border-white/50 text-white outline-none w-full text-sm font-black"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                              {tag}
                            </span>
                            {l.ai_enabled && <Sparkles className={`w-3 h-3 ${isActive ? 'text-white' : 'text-amber-400'}`} />}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                         {isActive && !isEditing && <Check className="w-4 h-4 text-white p-0.5" />}
                         {!isEditing && (
                           <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                             <button 
                               onClick={(e) => { 
                                 e.stopPropagation(); 
                                 setExpandingAi(expandingAi === l.id ? null : l.id); 
                                 if (expandingAi !== l.id) {
                                   setAiEnabled(prev => ({ ...prev, [l.id]: l.ai_enabled || false }));
                                   setAiPrompts(prev => ({ ...prev, [l.id]: l.ai_prompt || "" }));
                                 }
                               }} 
                               className={`p-2 rounded-xl transition-all ${isActive ? 'hover:bg-white/20 text-white/60 hover:text-white' : 'hover:bg-violet-100 text-slate-300 hover:text-violet-600'}`}
                             >
                               {expandingAi === l.id ? <ChevronUp className="w-3.5 h-3.5" /> : <Sparkles className={`w-3.5 h-3.5 ${l.ai_enabled ? 'text-amber-400' : ''}`} />}
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditValue(tag); }} className={`p-2 rounded-xl transition-all ${isActive ? 'hover:bg-white/20 text-white/60 hover:text-white' : 'hover:bg-violet-100 text-slate-300 hover:text-violet-600'}`}>
                               <Pencil className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteLabel(tag); }} className={`p-2 rounded-xl transition-all ${isActive ? 'hover:bg-white/20 text-white/60 hover:text-white' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}>
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                         )}
                      </div>
                    </div>

                    {expandingAi === l.id && (
                      <div className="p-4 bg-violet-500/5 rounded-2xl border border-violet-500/20 animate-in slide-in-from-top-2 flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <Brain className="w-3 h-3 text-violet-400" />
                               <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">AI Kategorizácia</span>
                            </div>
                            <button 
                              onClick={() => setAiEnabled(prev => ({ ...prev, [l.id]: !prev[l.id] }))}
                              className={`w-8 h-4 rounded-full transition-all relative ${aiEnabled[l.id] ? 'bg-violet-500' : 'bg-slate-300'}`}
                            >
                               <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${aiEnabled[l.id] ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                         </div>
                         <textarea 
                           className="w-full h-24 p-3 bg-white dark:bg-zinc-900 border border-violet-500/10 rounded-xl text-[11px] font-medium text-slate-600 dark:text-zinc-300 outline-none focus:border-violet-500/40 transition-all resize-none"
                           placeholder="Opíš pravidlo pre tento štítok. Napr: 'Email s dopytom na fotovoltiku od klienta z Bratislavy'"
                           value={aiPrompts[l.id] ?? ""}
                           onChange={(e) => setAiPrompts(prev => ({ ...prev, [l.id]: e.target.value }))}
                         />
                         <button 
                           onClick={() => handleUpdateAiSettings(l)}
                           disabled={isSyncing}
                           className="w-full h-10 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-violet-500/20"
                         >
                            {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Uložiť AI Pravidlo
                         </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              {isAdding ? (
                <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                      placeholder="Názov nového štítku..."
                      className="w-full h-14 px-5 bg-slate-50 dark:bg-zinc-800/50 border-2 border-violet-500 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button onClick={handleCreateLabel} disabled={isSyncing} className="p-2 text-white rounded-xl bg-violet-600 hover:opacity-90 disabled:opacity-50">
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setIsAdding(false); setActivePicker(null); }} className="p-2 text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setActivePicker(activePicker === 'new' ? null : 'new')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${activePicker === 'new' ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'}`}
                    >
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: selectedColor }} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Zmeniť farbu</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsAdding(true)} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-violet-500/20 hover:border-violet-500/50 text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest text-[10px]">
                  <Plus className="w-4 h-4" />
                  Vytvoriť nový štítok
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
