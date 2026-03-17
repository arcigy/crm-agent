"use client";

import React from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export function InvoicingHeader({ 
  onSave, 
  isSaveDisabled, 
  isSaving 
}: { 
  onSave: () => void; 
  isSaveDisabled: boolean; 
  isSaving: boolean; 
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-3 px-2 md:px-0 mt-2">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-violet-600 transition-colors mb-2 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Návrat na Nástenku
        </Link>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-3 italic uppercase leading-none">
            Fakturácia
            <span className="text-sm font-bold bg-zinc-100 dark:bg-white/5 text-zinc-500 px-3 py-1 rounded-full uppercase tracking-widest border border-black/5 dark:border-white/5">
              Profil
            </span>
          </h2>
        </div>
      </div>
      
      <div className="flex gap-3 items-center self-end md:self-auto">
        <button
          disabled={isSaveDisabled}
          onClick={onSave}
          className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 rounded-[1.2rem] font-bold uppercase tracking-wide text-[11px] flex items-center gap-2 transition-all shadow-xl shadow-violet-600/20 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Uložiť Zmeny</span>
        </button>
      </div>
    </div>
  );
}
