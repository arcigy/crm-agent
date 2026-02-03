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
      // 1. Bulk update basic fields
      const updateData: any = {};
      if (formData.company) updateData.company = formData.company;
      if (formData.status) updateData.status = formData.status;
      if (formData.comments) updateData.comments = formData.comments;

      if (Object.keys(updateData).length > 0) {
        const res = await bulkUpdateContacts(selectedIds, updateData);
        if (!res.success) {
          toast.error("Nepodarilo sa aktualizovať základné údaje");
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

      toast.success(`Aktualizovaných ${selectedIds.length} kontaktov`);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-xl rounded-[3rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="bg-black p-8 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-blue-500">Hromadná Úprava</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
              {selectedIds.length} KONTAKTOV • REŽIM BATCH
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-2xl flex gap-3 text-blue-800 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              Zmeny sa aplikujú na VŠETKY označené kontakty. Prázdne polia zostanú pôvodné.
            </p>
          </div>

          <div className="space-y-4">
            {/* Labels Section */}
            <div>
              <label className="block text-[10px] font-black uppercase italic tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Tag className="w-3 h-3" /> Priradiť Labels
              </label>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {fetchingLabels ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Načítavam labels...
                  </div>
                ) : availableLabels.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Žiadne labels. Vytvorte prvý nižšie.</span>
                ) : (
                  availableLabels.map(label => (
                    <button
                      type="button"
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${
                        selectedLabelIds.includes(label.id)
                          ? "bg-blue-600 text-white border-blue-600 scale-105 shadow-lg shadow-blue-500/20"
                          : "bg-muted text-muted-foreground border-border hover:border-blue-500/50"
                      }`}
                    >
                      {label.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Názov nového labelu..."
                  className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-600"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateLabel())}
                />
                <button
                  type="button"
                  onClick={handleCreateLabel}
                  disabled={isCreatingLabel || !newLabelName.trim()}
                  className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                >
                  {isCreatingLabel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Vytvoriť
                </button>
              </div>
            </div>

            <div className="h-px bg-border my-6" />

            <div>
              <label className="block text-[10px] font-black uppercase italic tracking-widest text-muted-foreground mb-2">Firma / Account</label>
              <input
                type="text"
                placeholder="Ponechať pôvodné..."
                className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase italic tracking-widest text-muted-foreground mb-2">Status</label>
              <select
                className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none transition-all appearance-none"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="">Ponechať pôvodné...</option>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase italic tracking-widest text-muted-foreground mb-2">Poznámky (Prepíše pôvodné)</label>
              <textarea
                placeholder="Ponechať pôvodné..."
                className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none transition-all min-h-[120px]"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-muted text-foreground rounded-2xl font-black uppercase italic tracking-widest hover:bg-muted/80 transition-all"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase italic tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 "
            >
              {loading ? "Ukladám..." : <><Save className="w-5 h-5" /> Uložiť zmeny</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
