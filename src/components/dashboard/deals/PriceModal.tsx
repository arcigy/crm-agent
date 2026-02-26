"use client";

import * as React from "react";
import { X, DollarSign, Euro, Banknote, Sparkles } from "lucide-react";

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue: number;
  onConfirm: (value: number) => Promise<void>;
  projectName: string;
}

export function PriceModal({
  isOpen,
  onClose,
  initialValue,
  onConfirm,
  projectName,
}: PriceModalProps) {
  const [value, setValue] = React.useState(initialValue.toString());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    
    setIsSubmitting(true);
    await onConfirm(numValue);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[80px] -z-10" />
        
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Upraviť Hodnotu</h3>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{projectName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <span className="text-xl font-black text-emerald-400">€</span>
              </div>
              <input
                autoFocus
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-14 pr-6 text-3xl font-black text-white outline-none focus:border-emerald-500/30 focus:bg-white/[0.07] transition-all tabular-nums"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] px-6 py-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <>Uložiť Zmenu</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
