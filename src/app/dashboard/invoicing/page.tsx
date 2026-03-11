"use client";

import React, { useState } from "react";
import { Save, Building2, User, Globe, Mail, Phone, Hash, Landmark, QrCode, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { useCurrentCRMUser } from "@/hooks/useCurrentCRMUser";

interface InvoicingSettings {
  companyName: string;
  ico: string;
  dic: string;
  icDph: string;
  address: string;
  bankAccount: string;
  email: string;
  phone: string;
  invoicePrefix: string;
  invoiceFooter: string;
  isVatPayer: boolean;
  primaryColor: string;
}

export default function InvoicingPage() {
  const { user, isLoaded } = useCurrentCRMUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<InvoicingSettings>({
    companyName: "",
    ico: "",
    dic: "",
    icDph: "",
    address: "",
    bankAccount: "",
    email: "",
    phone: "",
    invoicePrefix: "FV",
    invoiceFooter: "Ďakujeme za prejavenú dôveru.",
    isVatPayer: false,
    primaryColor: "#8b5cf6"
  });

  React.useEffect(() => {
    async function fetchSettings() {
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        // If user is loaded but no email, stop loading
        if (isLoaded) setIsLoading(false);
        return;
      }
      
      try {
        const response = await directus.request(
          readItems("crm_invoicing_settings" as any, {
            filter: { user_email: { _eq: user.emailAddresses[0].emailAddress.toLowerCase() } },
            limit: 1
          })
        ) as any[];

        if (response && response.length > 0) {
          setSettings(response[0]);
        }
      } catch (error) {
        console.error("Failed to fetch invoicing settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [user, isLoaded]);

  const handleSave = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      toast.error("Používateľ nie je prihlásený");
      return;
    }

    setIsSaving(true);
    try {
      const userEmail = user.emailAddresses[0].emailAddress.toLowerCase();
      
      // Check if settings already exist
      const existing = await directus.request(
        readItems("crm_invoicing_settings" as any, {
          filter: { user_email: { _eq: userEmail } },
          limit: 1
        })
      ) as any[];

      if (existing && existing.length > 0) {
        await directus.request(
          updateItem("crm_invoicing_settings" as any, existing[0].id, {
            ...settings,
            user_email: userEmail
          })
        );
      } else {
        await directus.request(
          createItem("crm_invoicing_settings" as any, {
            ...settings,
            user_email: userEmail
          })
        );
      }
      
      toast.success("Nastavenia fakturácie boli uložené");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Nepodarilo sa uložiť nastavenia");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof InvoicingSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const hasIssues = !settings.bankAccount || settings.companyName.length < 5;

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen flex flex-col p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-y-auto thin-scrollbar">
      <header className="mb-8 flex items-center justify-between gap-6 shrink-0">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic leading-none flex items-center gap-3">
              Fakturácia
              <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-violet-500 animate-pulse" />
                <span className="text-[8px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">AI Profile Active</span>
              </div>
            </h1>
        </div>
        
        <button
          disabled={isSaving || isLoading}
          onClick={handleSave}
          className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-900 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-violet-500/20 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Uložiť zmeny
        </button>
      </header>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Načítavam finančné profily...</p>
        </div>
      ) : (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Core Data (Combined) */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-500" />
                Konfigurácia Profilu
              </h2>
              {hasIssues && (
                <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                  Vyžaduje pozornosť
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Názov firmy" icon={User} value={settings.companyName} onChange={(v) => updateSetting('companyName', v)} placeholder="Názov firmy" />
                <InputField label="IBAN" icon={Landmark} value={settings.bankAccount} onChange={(v) => updateSetting('bankAccount', v)} placeholder="SK12 0200..." />
                <InputField label="IČO" icon={Hash} value={settings.ico} onChange={(v) => updateSetting('ico', v)} placeholder="12345678" />
                <InputField label="E-mail" icon={Mail} value={settings.email} onChange={(v) => updateSetting('email', v)} placeholder="faktury@firma.sk" />
                <InputField label="DIČ" icon={Hash} value={settings.dic} onChange={(v) => updateSetting('dic', v)} placeholder="2021234567" />
                <InputField label="Telefón" icon={Phone} value={settings.phone} onChange={(v) => updateSetting('phone', v)} placeholder="+421..." />
                <InputField label="IČ DPH" icon={Globe} value={settings.icDph} onChange={(v) => updateSetting('icDph', v)} placeholder="SK2021..." />
                <InputField label="Prefix" icon={Hash} value={settings.invoicePrefix} onChange={(v) => updateSetting('invoicePrefix', v)} placeholder="FV" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-5 bg-violet-500/5 border border-violet-500/10 rounded-3xl">
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase text-foreground">Platca DPH</p>
                      <p className="text-[10px] text-zinc-500 font-bold leading-tight">Aktivujte pre automatické výpočty dane na dokumentoch.</p>
                    </div>
                    <button 
                      onClick={() => updateSetting('isVatPayer', !settings.isVatPayer)}
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.isVatPayer ? 'bg-violet-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isVatPayer ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">Pätka dokumentov</label>
                    <input 
                      type="text"
                      className="w-full bg-transparent font-bold text-sm outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                      value={settings.invoiceFooter}
                      onChange={(e) => updateSetting('invoiceFooter', e.target.value)}
                      placeholder="Poďakovanie klientovi..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">Sídlo / Adresa spoločnosti</label>
                  <textarea 
                    className="w-full p-5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl font-bold text-sm focus:ring-4 focus:ring-violet-500/10 outline-none transition-all min-h-[140px] text-zinc-900 dark:text-white placeholder:text-zinc-400 leading-relaxed"
                    value={settings.address}
                    onChange={(e) => updateSetting('address', e.target.value)}
                    placeholder="Ulica 123, 811 01 Bratislava"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI & QR & Preview */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
          {/* AI Audit - Compact */}
          <section className="bg-zinc-900 p-6 rounded-[2rem] text-white flex flex-col shrink-0">
            <h3 className="font-black uppercase italic tracking-tighter text-sm mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              AI Biznis Audit
            </h3>
            <div className="space-y-3">
              {!settings.bankAccount ? (
                <div className="flex items-center gap-3 text-[10px] font-bold text-amber-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Chýba IBAN pre platby.</span>
                </div>
              ) : settings.companyName.length < 5 ? (
                <div className="flex items-center gap-3 text-[10px] font-bold text-violet-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span>Zadajte plný názov firmy.</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-[10px] font-bold text-green-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  <span>Profil je v top stave.</span>
                </div>
              )}
            </div>
          </section>

          {/* QR Compact */}
          <section className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 rounded-[2rem] text-white relative overflow-hidden shrink-0">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="font-black uppercase italic tracking-tighter text-sm mb-1 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  QR Platby
                </h3>
                <p className="text-[9px] text-violet-100 font-bold uppercase tracking-widest">Aktivované na faktúry</p>
              </div>
              <div className="bg-white/20 p-2 rounded-xl">
                 <QrCode className="w-6 h-6" />
              </div>
            </div>
          </section>

          {/* Document Preview - Interactive */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm p-8 overflow-hidden flex flex-col min-h-[300px] border-t-8 border-t-violet-500 group">
             <div className="flex items-center justify-between mb-6 shrink-0">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Live Preview</h3>
               <button 
                onClick={() => toast.info("Generujem PDF náhľad...", { description: "Tento dokument bude čoskoro dostupný na stiahnutie." })}
                className="p-2 bg-violet-50 rounded-xl text-violet-600 hover:bg-violet-600 hover:text-white transition-all transform group-hover:scale-110"
               >
                 <Sparkles className="w-4 h-4" />
               </button>
             </div>
             
             <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-6 flex flex-col gap-6 opacity-60 select-none overflow-hidden relative">
                <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-700 pb-6">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-violet-200 dark:bg-violet-900/30 rounded-lg animate-pulse" />
                    <div className="h-2 w-48 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                  </div>
                  <div className="h-10 w-10 bg-violet-100 dark:bg-violet-900/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-violet-500" />
                  </div>
                </div>
                <div className="flex-1 space-y-4 pt-4">
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                  <div className="h-2 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                </div>
                <div className="mt-auto pt-8 border-t border-dashed border-zinc-200 dark:border-zinc-700 text-center">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">Pätka dokumentu</p>
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 italic truncate drop-shadow-sm">
                    {settings.invoiceFooter || 'Doplniť poďakovanie v nastaveniach...'}
                  </p>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-zinc-50/10 to-transparent pointer-events-none" />
             </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

function InputField({ label, icon: Icon, value, onChange, placeholder }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 opacity-50" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
}
