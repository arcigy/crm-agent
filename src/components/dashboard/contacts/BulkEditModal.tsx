"use client";

import * as React from "react";
import { X, Save, AlertCircle, Tag, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateContacts } from "@/app/actions/contacts";
import { getLabels, createLabel, addLabelToContact, removeLabelFromContact } from "@/app/actions/labels";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: (string | number)[];
  onSuccess: () => void;
}

export function BulkEditModal({
  isOpen,
  onClose,
  selectedIds,
  onSuccess,
}: BulkEditModalProps) {
  const [formData, setFormData] = React.useState({
    company: "",
    status: "",
    comments: "",
  });

  const [availableLabels, setAvailableLabels] = React.useState<any[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = React.useState<(string | number)[]>([]);
  const [newLabelName, setNewLabelName] = React.useState("");
  const [isCreatingLabel, setIsCreatingLabel] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fetchingLabels, setFetchingLabels] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen]);

  const fetchLabels = async () => {
    setFetchingLabels(true);
    const res = await getLabels();
    if (res.success) {
      setAvailableLabels(res.data || []);
    }
    setFetchingLabels(false);
  };

  if (!isOpen) return null;

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setIsCreatingLabel(true);
    const res = await createLabel(newLabelName.trim());
    if (res.success) {
      toast.success("Label vytvorený");
      setNewLabelName("");
      fetchLabels();
    } else {
      toast.error("Chyba pri vytváraní labelu");
    }
    setIsCreatingLabel(false);
  };

  const toggleLabel = (id: string | number) => {
    setSelectedLabelIds(prev => 
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // 1. Bulk update status if selected
      if (formData.status) {
        const res = await bulkUpdateContacts(selectedIds, { status: formData.status });
        if (!res.success) {
          toast.error("Nepodarilo sa aktualizovať status");
        }
      }

      // 2. Assign labels to each selected contact
      if (selectedLabelIds.length > 0) {
         for (const contactId of selectedIds) {
           for (const labelId of selectedLabelIds) {
              await addLabelToContact(contactId, labelId);
           }
         }
      }

      toast.success(`Úspešne upravených ${selectedIds.length} kontaktov`);
      onSuccess();
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Chyba pri hromadnej úprave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-[#0a0a0e] w-full max-w-lg rounded-[2.5rem] border border-violet-900/30 shadow-[0_0_50px_rgba(139,92,246,0.1)] overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col relative max-h-[80vh]">
        <div className="px-10 py-8 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[24px] font-[900] uppercase italic tracking-tighter text-white leading-tight">Batch Update</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">
                {selectedIds.length} KONTAKTOV SELECTED
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white hover:text-black border border-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto thin-scrollbar">
          <div className="space-y-8">
            {/* Status Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase italic tracking-[0.3em] text-white/40">Zmeniť Status Na</label>
              <div className="relative">
                <select
                  className="w-full bg-white/5 border border-white/5 hover:border-violet-500/30 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:ring-1 focus:ring-violet-500/60 outline-none transition-all appearance-none"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="" className="bg-[#0a0a0e]">Ponechať nezmenené...</option>
                  <option value="lead" className="bg-[#0a0a0e]">Lead / Záujemca</option>
                  <option value="active" className="bg-[#0a0a0e]">Aktívny Klient</option>
                  <option value="archived" className="bg-[#0a0a0e]">Archivované</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                  <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,1)]" />
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Labels Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase italic tracking-[0.3em] text-white/40 flex items-center gap-2">
                 Priradiť Štítky (Batch)
              </label>
              
              <div className="flex flex-wrap gap-2">
                {fetchingLabels ? (
                  <div className="flex items-center gap-2 text-xs text-white/30 animate-pulse font-bold uppercase tracking-widest">
                    <Loader2 className="w-4 h-4 animate-spin" /> Načítavam...
                  </div>
                ) : (
                  availableLabels.map(label => (
                    <button
                      type="button"
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        selectedLabelIds.includes(label.id)
                          ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                          : "bg-white/5 text-white/40 border-white/5 hover:border-violet-500/30 hover:text-white"
                      }`}
                    >
                      {label.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-xl group focus-within:border-violet-500/30 transition-all">
                <input
                  type="text"
                  placeholder="Nový štítok..."
                  className="flex-1 bg-transparent border-none px-4 py-2 text-xs font-bold text-white placeholder:text-white/10 outline-none"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateLabel())}
                />
                <button
                  type="button"
                  onClick={handleCreateLabel}
                  disabled={isCreatingLabel || !newLabelName.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                >
                  {isCreatingLabel ? <Loader2 className="w-3 animate-spin" /> : "Pridať"}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] relative px-6 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Potvrdiť Batch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
