"use client";

import * as React from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { bulkUpdateContacts } from "@/app/actions/contacts";

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

  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only send fields that have a value
    const updateData: any = {};
    if (formData.company) updateData.company = formData.company;
    if (formData.status) updateData.status = formData.status;
    if (formData.comments) updateData.comments = formData.comments;

    if (Object.keys(updateData).length === 0) {
      toast.error("Nevybrali ste žiadne polia na úpravu");
      return;
    }

    setLoading(true);
    try {
      const res = await bulkUpdateContacts(selectedIds, updateData);
      if (res.success) {
        toast.success(`Aktualizovaných ${selectedIds.length} kontaktov`);
        onSuccess();
        onClose();
        window.location.reload();
      } else {
        toast.error("Nepodarilo sa aktualizovať kontakty");
      }
    } catch (err) {
      toast.error("Chyba pri hromadnej úprave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-xl rounded-[3rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-black p-8 text-white flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Hromadná Úprava</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
              Upravujete {selectedIds.length} kontaktov naraz
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-2xl flex gap-3 text-blue-800 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              Vyplňte iba tie polia, ktoré chcete zmeniť pre VŠETKY označené kontakty. Ostatné polia zostanú nezmenené.
            </p>
          </div>

          <div className="space-y-4">
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

          <div className="pt-4 flex gap-3">
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
