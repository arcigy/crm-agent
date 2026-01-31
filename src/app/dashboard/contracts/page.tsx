"use client";

import React, { useState } from "react";
import { FileSignature, Save, User, FileText, Settings, ShieldCheck, PenTool } from "lucide-react";
import { toast } from "sonner";

export default function ContractsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [contractType, setContractType] = useState("SDA");
  const [customText, setCustomText] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Zmluva bola vygenerovaná");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 animate-in fade-in duration-500 text-zinc-900 dark:text-zinc-100">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-amber-600 rounded-2xl shadow-xl shadow-amber-600/20">
            <FileSignature className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic leading-none">
              Custom / <span className="text-amber-600">Zmluvy</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-1 opacity-70">
              Generovanie a správa klientskych zmlúv
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              Základné informácie
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Zmluvná strana (Klient)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 opacity-50" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Meno klienta / Firma"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Typ zmluvy</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all appearance-none"
                >
                  <option value="SDA">Zmluva o dielo (SDA)</option>
                  <option value="NDA">Dohoda o mlčanlivosti (NDA)</option>
                  <option value="SLO">Sprostredkovateľská zmluva</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Vlastné podmienky / Poznámky</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Doplňte špecifické dojednania pre túto zmluvu..."
                className="w-full p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all min-h-[200px]"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-600/20">
            <h3 className="font-black uppercase italic tracking-tighter text-xl mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Finalizácia
            </h3>
            <p className="text-amber-100 text-xs font-bold leading-relaxed mb-8">
              Zmluva bude vygenerovaná ako PDF dokument s vašimi preddefinovanými firemnými údajmi.
            </p>
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="w-full py-4 bg-white text-amber-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-900 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : (
                <>
                  <PenTool className="w-4 h-4" />
                  Vygenerovať zmluvu
                </>
              )}
            </button>
          </div>

          <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white">
            <h3 className="font-black uppercase italic tracking-tighter text-xl mb-4">Šablóna</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                <FileText className="w-4 h-4 text-amber-500" />
                Preddefinovaná hlavička
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                <FileText className="w-4 h-4 text-amber-500" />
                Právne klauzuly v1.4
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-400 opacity-30">
                <FileText className="w-4 h-4" />
                Digitálny podpis (čoskoro)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
