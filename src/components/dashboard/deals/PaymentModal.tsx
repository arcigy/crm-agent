"use client";

import * as React from "react";
import {
  X,
  Banknote,
  CheckCircle2,
  CreditCard,
  Calendar,
  Wallet,
  ArrowRightLeft,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/types/project";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onConfirm: () => Promise<void>;
}

export function PaymentModal({
  isOpen,
  onClose,
  project,
  onConfirm,
}: PaymentModalProps) {
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      toast.error("Chyba pri spracovaní platby");
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

      <div className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b border-border bg-gradient-to-r from-emerald-600/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/20">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase italic">
                Spracovať <span className="text-emerald-500">Platbu</span>
              </h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Potvrďte prijatie finančných prostriedkov
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
        <div className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              Suma na prijatie
            </div>
            <div className="text-5xl font-black text-emerald-500 italic tracking-tighter tabular-nums">
              {new Intl.NumberFormat("sk-SK", {
                style: "currency",
                currency: "EUR",
              }).format(project.value || 0)}
            </div>
            <div className="text-xs font-bold text-muted-foreground opacity-60">
              Projekt: {project.name}
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
                Verifikácia
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm font-bold text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Pridanie do štatistík hotovosti
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Označenie projektu ako zaplatený
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-foreground/80">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Uzavretie finančného cyklu obchodu
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3">
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground opacity-50" />
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest">
              Táto akcia je nevratná a okamžite ovplyvní vaše finančné výkazy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border bg-muted/20 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-transparent text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:text-foreground transition-colors"
          >
            Neskôr
          </button>
          <button
            disabled={loading}
            onClick={handleConfirm}
            className="px-8 py-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Banknote className="w-4 h-4" />
            )}
            Potvrdiť Prijatie Platby
          </button>
        </div>
      </div>
    </div>
  );
}
