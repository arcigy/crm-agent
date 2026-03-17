"use client";

import React from "react";
import { Sparkles, QrCode, Building2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { InvoicingSettings } from "../types";

export function InvoicingRightColumn({ settings }: { settings: InvoicingSettings }) {
  const accountHealth = !settings.bankAccount ? 40 : (settings.companyName?.length || 0) < 5 ? 70 : 100;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* ── Status Identity (EXACT DASHBOARD STATCARD) ── */}
      <section className={`
        relative overflow-hidden flex flex-col items-center justify-center text-center
        bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl
        rounded-none md:rounded-[2rem]
        border border-violet-500/20 dark:border-opacity-40
        shadow-sm hover:shadow-xl
        transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:scale-[1.02]
        px-4 py-6
        group isolate
      `}>
        {/* EXACT NEON GLOW */}
        <div className="absolute -top-4 -left-4 w-16 h-16 bg-violet-500 opacity-40 rounded-full blur-[28px] transition-all duration-300 group-hover:opacity-70 group-hover:w-20 group-hover:h-20 pointer-events-none" />

        <div className="relative z-10 w-8 h-8 rounded-2xl flex items-center justify-center mb-1.5 bg-violet-500 shadow-lg shadow-violet-500/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
          <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>

        <span className="relative z-10 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] leading-none mb-1.5">
          Identita
        </span>

        <h3 className="relative z-10 text-xl md:text-2xl font-black tracking-tighter leading-none text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform duration-300 origin-center uppercase italic">
          Scoring {accountHealth}%
        </h3>

        <div className="relative z-10 mt-3 text-[7px] font-black uppercase text-emerald-500 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
          <TrendingUp className="w-2 h-2" />
          {accountHealth === 100 ? 'AKTÍVNY' : 'CAUTION'}
        </div>
      </section>

      {/* ── QR Pay Access ── */}
      <section 
        onClick={() => toast.info("QR Brána aktívna")}
        className="bg-gradient-to-br from-violet-600 to-indigo-700 px-6 py-5 rounded-[2rem] text-white relative overflow-hidden flex items-center justify-between shadow-lg shadow-violet-600/10 group cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group border border-white/10"
      >
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(#fff_1px,transparent_1px)] opacity-[0.05] [background-size:4px_4px]" />
        <div className="relative z-10">
          <h3 className="font-black uppercase italic tracking-tighter text-lg flex items-center gap-2 mb-1">
            <QrCode className="w-5 h-5" /> QR PAY
          </h3>
          <p className="text-[9px] text-violet-100 font-black uppercase tracking-widest opacity-60">Fakturačný prístup</p>
        </div>
        <div className="relative z-10 p-3 bg-white/10 rounded-2xl border border-white/20 group-hover:rotate-12 transition-all duration-300 backdrop-blur-md shadow-2xl">
           <QrCode className="w-6 h-6" />
        </div>
      </section>

      {/* ── Render Engine (EXACT DASHBOARD WIDGET STYLE) ── */}
      <div className="flex-1 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl px-4 md:px-6 pt-2 md:pt-3 pb-3 md:pb-4 rounded-none md:rounded-[2.5rem] border-b md:border border-indigo-500/20 flex flex-col overflow-hidden relative group transition-all duration-300 h-full shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 isolate">
         {/* EXACT BUBBLE */}
         <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-300" />
         
         <div className="flex items-center justify-between w-full relative z-20 mb-3 transition-transform hover:scale-[1.02] origin-left group/header">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex flex-col items-start text-left">
                <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100">Live Render</h3>
              </div>
           </div>
           <button onClick={() => toast.info("Generujem PDF...")} className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-md group-hover:scale-110">
             <Sparkles className="w-4 h-4" />
           </button>
         </div>
         
         <div className="flex-1 bg-white/60 dark:bg-zinc-900/40 rounded-2xl p-5 flex flex-col gap-6 opacity-40 group-hover:opacity-100 transition-all duration-700 border border-black/5 dark:border-white/5 overflow-hidden backdrop-blur-md relative z-10">
            <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-4">
              <div className="space-y-2">
                <div className="h-3 w-32 bg-zinc-200 dark:bg-white/10 rounded-full" />
                <div className="h-1.5 w-48 bg-zinc-100 dark:bg-white/5 rounded-full" />
              </div>
              <Building2 className="w-6 h-6 text-zinc-300 dark:text-white/20" />
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full" />
              <div className="h-2 w-3/4 bg-zinc-100 dark:bg-white/5 rounded-full opacity-60" />
            </div>

            <div className="mt-auto text-center border-t border-dashed border-black/5 dark:border-white/5 pt-4">
               <p className="text-xl font-black text-indigo-950 dark:text-indigo-100 italic tracking-tighter leading-none line-clamp-2">
                 "{settings.invoiceFooter || 'Pätka dokumentu...'}"
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
