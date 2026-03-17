"use client";

import React from "react";
import { User, Landmark, Hash, Mail, Phone, Globe, Building2, FileText, CheckCircle2 } from "lucide-react";
import { InvoicingSettings } from "../types";

export function InvoicingProfileForm({ 
  settings, 
  updateSetting 
}: { 
  settings: InvoicingSettings; 
  updateSetting: (key: keyof InvoicingSettings, value: string | boolean) => void; 
}) {
  return (
    <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl px-4 md:px-6 pt-3 md:pt-4 pb-4 md:pb-6 rounded-none md:rounded-[2.5rem] border-b md:border border-violet-500/20 dark:border-violet-500/20 flex flex-col relative group transition-all duration-300 h-full overflow-hidden shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1.5 isolate">
      {/* ── EXACT DASHBOARD BUBBLE ── */}
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-violet-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-violet-500/30 transition-all duration-300" />
      
      <div className="flex items-center gap-3 relative z-20 mb-6 transition-transform hover:scale-[1.01] origin-left">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30 md:border-violet-500/20 shadow-none">
          <Building2 className="w-4 h-4 md:w-5 md:h-5 text-violet-500" />
        </div>
        <div className="flex flex-col items-start text-left">
          <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tighter text-indigo-950 dark:text-indigo-100 italic-bold">Firemná Identita</h3>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 thin-scrollbar overflow-x-hidden relative z-10 overscroll-contain pb-2">
        {/* Uniform Grid Blocks */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <InputField label="Firma" value={settings.companyName} onChange={v => updateSetting('companyName', v)} icon={User} color="violet" />
          <InputField label="IČO" value={settings.ico} onChange={v => updateSetting('ico', v)} icon={Hash} color="violet" />
          <InputField label="DIČ" value={settings.dic} onChange={v => updateSetting('dic', v)} icon={Hash} color="violet" />
          <InputField label="Kontakt" value={settings.phone} onChange={v => updateSetting('phone', v)} icon={Phone} color="violet" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <InputField label="IBAN" value={settings.bankAccount} onChange={v => updateSetting('bankAccount', v)} icon={Landmark} color="violet" />
          <InputField label="IČ DPH" value={settings.icDph} onChange={v => updateSetting('icDph', v)} icon={Globe} color="violet" />
          <InputField label="Prefix fa." value={settings.invoicePrefix} onChange={v => updateSetting('invoicePrefix', v)} icon={Hash} color="violet" />
          <InputField label="E-mail" value={settings.email} onChange={v => updateSetting('email', v)} icon={Mail} color="violet" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 border-t border-black/5 dark:border-white/5 shrink-0">
          <div className="lg:col-span-4 flex flex-col gap-4">
             <div className="bg-white/60 dark:bg-zinc-900/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-md flex items-center justify-between group/item hover:border-violet-500/40 transition-all shadow-none">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Platca DPH</span>
                <button 
                  onClick={() => updateSetting('isVatPayer', !settings.isVatPayer)}
                  className={`w-10 h-6 rounded-full relative transition-all ${settings.isVatPayer ? 'bg-violet-600 shadow-md shadow-violet-600/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isVatPayer ? 'left-5' : 'left-1'}`} />
                </button>
             </div>
             
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4 italic opacity-80">Sídlo Firmy</label>
                <textarea 
                  value={settings.address || ""} 
                  onChange={e => updateSetting('address', e.target.value)}
                  className="w-full p-4 bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm outline-none transition-all text-zinc-900 dark:text-white h-[95px] resize-none focus:border-violet-500/40 backdrop-blur-md" 
                  placeholder="Ulica, Mesto, PSČ"
                />
             </div>
          </div>

          <div className="lg:col-span-8">
             <div className="h-full bg-violet-600/5 dark:bg-violet-600/10 p-6 md:p-8 rounded-[2.5rem] border border-violet-500/20 relative overflow-hidden group/footer flex flex-col justify-center transition-all hover:bg-violet-600/10">
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-5 opacity-40">
                      <FileText className="w-4 h-4 text-violet-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Pätka dokumentu</h4>
                   </div>
                   <textarea 
                     className="w-full bg-transparent font-black italic text-xl md:text-3xl outline-none text-zinc-900 dark:text-white placeholder:text-zinc-500 leading-tight h-[80px] resize-none p-0 scrollbar-hide border-none ring-0 appearance-none overflow-hidden" 
                     value={settings.invoiceFooter || ""} 
                     onChange={e => updateSetting('invoiceFooter', e.target.value)}
                     placeholder="Napíšte pätku pre faktúry..."
                   />
                </div>
                {/* ── Dashboard Accessory Bubble ── */}
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-[30px] opacity-0 group-hover/footer:opacity-100 transition-opacity duration-700" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, icon: Icon, color }: any) {
  const colorClass = color === 'violet' ? 'text-violet-500' : 'text-blue-500';
  const borderClass = color === 'violet' ? 'hover:border-violet-500/40' : 'hover:border-blue-500/40';

  return (
    <div className="flex flex-col gap-2 group/field">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4 opacity-60 italic">{label}</label>
      <div className="relative">
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within/field:${colorClass} transition-colors`} />
        <input 
          type="text" 
          value={value || ""} 
          onChange={e => onChange(e.target.value)} 
          className={`w-full pl-10 pr-4 py-3 bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 rounded-2xl text-[13px] font-bold outline-none transition-all text-zinc-900 dark:text-white ${borderClass} h-11 backdrop-blur-md`}
        />
      </div>
    </div>
  );
}
