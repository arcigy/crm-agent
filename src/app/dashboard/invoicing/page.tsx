"use client";

import React, { useState } from "react";
import { Receipt, Save, Building2, User, Globe, Mail, Phone, Hash, Landmark } from "lucide-react";
import { toast } from "sonner";

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
}

export default function InvoicingPage() {
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
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call to save user-specific custom settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Nastavenia fakturácie boli uložené");
  };

  const updateSetting = (key: keyof InvoicingSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 animate-in fade-in duration-500">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic leading-none">
              Fakturácia
            </h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Firemné údaje
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="Názov firmy / Meno" 
                icon={User} 
                value={settings.companyName}
                onChange={(v: string) => updateSetting('companyName', v)}
                placeholder="Moja Firma s.r.o."
              />
              <InputField 
                label="IČO" 
                icon={Hash} 
                value={settings.ico}
                onChange={(v: string) => updateSetting('ico', v)}
                placeholder="12345678"
              />
              <InputField 
                label="DIČ" 
                icon={Hash} 
                value={settings.dic}
                onChange={(v: string) => updateSetting('dic', v)}
                placeholder="2021234567"
              />
              <InputField 
                label="IČ DPH" 
                icon={Globe} 
                value={settings.icDph}
                onChange={(v: string) => updateSetting('icDph', v)}
                placeholder="SK2021234567"
              />
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block ml-1">Sídlo / Adresa</label>
                <textarea 
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px] text-zinc-900 dark:text-white"
                  value={settings.address}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  placeholder="Ulica 123, 811 01 Bratislava"
                />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-500" />
              Platobné a kontaktné údaje
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField 
                label="IBAN" 
                icon={Landmark} 
                value={settings.bankAccount}
                onChange={(v: string) => updateSetting('bankAccount', v)}
                placeholder="SK12 0200 0000 00..."
              />
              <InputField 
                label="E-mail pre faktúry" 
                icon={Mail} 
                value={settings.email}
                onChange={(v: string) => updateSetting('email', v)}
                placeholder="faktury@firma.sk"
              />
              <InputField 
                label="Telefón" 
                icon={Phone} 
                value={settings.phone}
                onChange={(v: string) => updateSetting('phone', v)}
                placeholder="+421 900 000 000"
              />
              <InputField 
                label="Prefix faktúr" 
                icon={Hash} 
                value={settings.invoicePrefix}
                onChange={(v: string) => updateSetting('invoicePrefix', v)}
                placeholder="FV"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Actions & Preview */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-600/20">
            <h3 className="font-black uppercase italic tracking-tighter text-xl mb-4">Uložiť zmeny</h3>
            <p className="text-blue-100 text-xs font-bold leading-relaxed mb-8">
              Vaše nastavenia budú okamžite aplikované na všetky novo vytvorené faktúry v tomto systéme.
            </p>
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-900 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : (
                <>
                  <Save className="w-4 h-4" />
                  Uložiť nastavenia
                </>
              )}
            </button>
          </div>

          <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white">
            <h3 className="font-black uppercase italic tracking-tighter text-xl mb-4">Custom Náhľad</h3>
            <div className="space-y-4 opacity-60">
              <div className="h-2 w-full bg-zinc-800 rounded-full" />
              <div className="h-2 w-3/4 bg-zinc-800 rounded-full" />
              <div className="h-2 w-1/2 bg-zinc-800 rounded-full" />
            </div>
            <div className="mt-8 pt-8 border-t border-zinc-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Pätka faktúry</p>
              <p className="text-xs font-bold italic text-zinc-400">&quot;{settings.invoiceFooter}&quot;</p>
            </div>
          </div>
        </div>
      </div>
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
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 opacity-50" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-zinc-900 dark:text-white"
        />
      </div>
    </div>
  );
}
