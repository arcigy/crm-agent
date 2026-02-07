"use client";

import * as React from "react";
import { Edit, Trash2, X, CheckSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteContacts } from "@/app/actions/contacts";

interface BulkActionsProps {
  selectedIds: (string | number)[];
  onClear: () => void;
  onEdit: () => void;
  onSelectAllVisible: () => void;
  isAllVisibleSelected: boolean;
  onAddToSmartLead: () => void;
}

export function BulkActions({
  selectedIds,
  onClear,
  onEdit,
  onSelectAllVisible,
  isAllVisibleSelected,
  onAddToSmartLead,
}: BulkActionsProps) {
  if (selectedIds.length === 0) return null;

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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-black text-white px-6 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3 pr-6 border-r border-white/20">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
            {selectedIds.length}
          </div>
          <span className="text-sm font-bold uppercase italic tracking-widest">Vybrané</span>
        </div>

        <div className="flex items-center gap-2">
          {!isAllVisibleSelected ? (
            <button
              onClick={onSelectAllVisible}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-2xl transition-colors text-xs font-black uppercase italic"
            >
              <CheckSquare className="w-4 h-4" />
              Označiť všetky
            </button>
          ) : (
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-2xl transition-colors text-xs font-black uppercase italic text-blue-400"
            >
              <X className="w-4 h-4" />
              Odznačiť všetky
            </button>
          )}

          <button
            onClick={onAddToSmartLead}
            className="flex items-center gap-2 px-4 py-2 hover:bg-purple-500/20 text-purple-300 rounded-2xl transition-colors text-xs font-black uppercase italic"
          >
            <Send className="w-4 h-4" />
            SmartLead
          </button>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-2xl transition-colors text-xs font-black uppercase italic"
          >
            <Edit className="w-4 h-4" />
            Upraviť
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 text-red-400 rounded-2xl transition-colors text-xs font-black uppercase italic"
          >
            <Trash2 className="w-4 h-4" />
            Vymazať
          </button>
        </div>

        <button
          onClick={onClear}
          className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
