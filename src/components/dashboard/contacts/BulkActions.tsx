"use client";

import * as React from "react";
import { Edit, Trash2, X, CheckSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteContacts } from "@/app/actions/contacts";

interface BulkActionsProps {
  selectedIds: (string | number)[];
  selectedNames?: string[];
  onClear: () => void;
  onEdit: () => void;
  onSelectAllVisible: () => void;
  isAllVisibleSelected: boolean;
  onAddToSmartLead: () => void;
}

export function BulkActions({
  selectedIds,
  selectedNames = [],
  onClear,
  onEdit,
  onSelectAllVisible,
  isAllVisibleSelected,
  onAddToSmartLead,
}: BulkActionsProps) {
  if (selectedIds.length === 0) return null;

  const displayName = selectedIds.length === 1 && selectedNames[0] 
    ? selectedNames[0] 
    : "Kontakty";

  const handleDelete = async () => {
    if (!confirm(`Naozaj chcete vymazať ${selectedIds.length} kontaktov?`)) return;
    
    const promise = bulkDeleteContacts(selectedIds);
    toast.promise(promise, {
      loading: "Mažem kontakty...",
      success: "Kontakty boli vymazané",
      error: "Nepodarilo sa vymazať kontakty",
    });

    const res = await promise;
    if (res.success) {
      onClear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="bg-[#0a0a0c]/80 backdrop-blur-3xl px-6 py-3.5 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),0_0_20px_rgba(139,92,246,0.1)] flex items-center gap-5 border border-white/10 relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-violet-600/5 opacity-50 pointer-events-none" />
        
        <div className="flex items-center gap-4 pr-8 border-r border-white/5 relative z-10">
          <div className="bg-violet-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-[900] text-base italic shadow-[0_0_20px_rgba(139,92,246,0.5)] transform -rotate-3 group-hover:rotate-0 transition-transform">
            {selectedIds.length}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 opacity-60 leading-none mb-1">Vybrané</span>
            <span className="text-sm font-[900] uppercase italic tracking-tighter text-white leading-none max-w-[150px] truncate">{displayName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {!isAllVisibleSelected ? (
            <button
              onClick={onSelectAllVisible}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white text-white hover:text-black rounded-xl transition-all text-[11px] font-[900] uppercase tracking-widest border border-white/5"
            >
              <CheckSquare className="w-4 h-4" />
              Všetky
            </button>
          ) : (
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all text-[11px] font-[900] uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            >
              <X className="w-4 h-4" />
              Odznačiť
            </button>
          )}

          <div className="w-px h-6 bg-white/5 mx-1" />

          <button
            onClick={onAddToSmartLead}
            className="flex items-center gap-2 px-5 py-2.5 hover:bg-white/5 text-violet-400 hover:text-violet-300 rounded-xl transition-all text-[11px] font-[900] uppercase tracking-widest group/btn"
          >
            <Send className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
            SmartLead
          </button>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2.5 hover:bg-white/5 text-white/60 hover:text-white rounded-xl transition-all text-[11px] font-[900] uppercase tracking-widest group/btn"
          >
            <Edit className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
            Upraviť
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2.5 hover:bg-rose-500/10 text-rose-500/60 hover:text-rose-400 rounded-xl transition-all text-[11px] font-[900] uppercase tracking-widest group/btn"
          >
            <Trash2 className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
            Vymazať
          </button>
        </div>

        <button
          onClick={onClear}
          className="ml-4 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all text-white/30 hover:text-white relative z-10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
