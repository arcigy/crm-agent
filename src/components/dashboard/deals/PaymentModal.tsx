"use client";

import * as React from "react";
import {
  X,
  Banknote,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Loader2,
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">
                Prijať Platbu
              </h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Potvrdenie úhrady</p>
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
        <div className="p-6 space-y-6 text-center">
            <div className="py-2">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block mb-2">Suma na zaúčtovanie</span>
                <div className="text-4xl font-black text-white tabular-nums tracking-tighter italic">
                    {new Intl.NumberFormat("sk-SK", {
                        style: "currency",
                        currency: "EUR",
                    }).format(project.value || 0)}
                </div>
                <div className="mt-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full inline-block">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{project.name}</span>
                </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Finančné overenie
                </div>
                <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Aktualizácia likvidity
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Ukončenie billing cyklu
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
          >
            Zrušiť
          </button>
          <button
            disabled={loading}
            onClick={handleConfirm}
            className="flex-1 py-3 bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Potvrdiť Prijatie
          </button>
        </div>
      </div>
    </div>
  );
}
