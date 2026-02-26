"use client";

import * as React from "react";
import {
  X,
  Receipt,
  Calendar,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { Project } from "@/types/project";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onConfirm: (data: {
    invoice_date: string;
    due_date: string;
  }) => Promise<void>;
}

export function InvoiceModal({
  isOpen,
  onClose,
  project,
  onConfirm,
}: InvoiceModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [invoiceDate, setInvoiceDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = React.useState(
    addDays(new Date(), 14).toISOString().split("T")[0],
  );

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({
        invoice_date: new Date(invoiceDate).toISOString(),
        due_date: new Date(dueDate).toISOString(),
      });
      onClose();
    } catch (error) {
      toast.error("Chyba pri generovaní faktúry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">
                Generovať Faktúru
              </h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Príprava dokumentu pre klienta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Projekt</span>
              <span className="text-sm font-bold text-white uppercase italic">{project.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Suma</span>
              <span className="text-lg font-black text-white tabular-nums">
                {new Intl.NumberFormat("sk-SK", {
                  style: "currency",
                  currency: "EUR",
                }).format(project.value || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Dátum vystavenia</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-white focus:border-violet-500/30 outline-none transition-all"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Termín splatnosti</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-white focus:border-violet-500/30 outline-none transition-all"
                    />
                </div>
            </div>
          </div>

          <div className="bg-violet-600/5 border border-violet-500/10 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-violet-400 mt-0.5" />
              <div className="space-y-1">
                  <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Systémová automatizácia</p>
                  <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-medium">Po potvrdení sa vygeneruje záznam v účtovnom systéme a projekt sa označí ako vyfakturovaný.</p>
              </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
          >
            Zrušiť
          </button>
          <button
            disabled={loading}
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-violet-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            Potvrdiť Fakturáciu
          </button>
        </div>
      </div>
    </div>
  );
}
