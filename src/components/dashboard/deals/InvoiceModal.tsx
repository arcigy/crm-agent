"use client";

import * as React from "react";
import {
  X,
  Receipt,
  Calendar,
  CheckCircle2,
  FileText,
  CreditCard,
  Mail,
  Download,
  ShieldCheck,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { sk } from "date-fns/locale";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl transition-all"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b border-border bg-gradient-to-r from-blue-600/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase italic">
                Generovať <span className="text-blue-500">Faktúru</span>
              </h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Príprava fakturačných údajov pre projekt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          {/* Project Summary */}
          <div className="bg-muted/30 border border-border p-6 rounded-3xl flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Projekt
              </span>
              <span className="text-lg font-black text-foreground italic uppercase tracking-tighter">
                {project.name}
              </span>
              <span className="text-xs font-bold text-blue-500 opacity-70">
                {project.project_type}
              </span>
            </div>
            <div className="text-right flex flex-col gap-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Suma
              </span>
              <span className="text-3xl font-black text-foreground italic tracking-tighter tabular-nums">
                {new Intl.NumberFormat("sk-SK", {
                  style: "currency",
                  currency: "EUR",
                }).format(project.value || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Dates */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Dátum vystavenia
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 opacity-50" />
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                  Dátum splatnosti
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 opacity-50" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Actions Preview */}
            <div className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-3xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-blue-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Automatické akcie
                  </span>
                </div>
                <div className="space-y-2 opacity-70">
                  <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Zápis fakturácie do systému
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Sledovanie splatnosti
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-foreground opacity-30">
                    <Mail className="w-3.5 h-3.5" />
                    Odoslanie faktúry e-mailom (čoskoro)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border bg-muted/20 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-transparent text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:text-foreground transition-colors"
          >
            Zrušiť
          </button>
          <button
            disabled={loading}
            onClick={handleConfirm}
            className="px-8 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Potvrdiť a Vyfakturovať
          </button>
        </div>
      </div>
    </div>
  );
}
