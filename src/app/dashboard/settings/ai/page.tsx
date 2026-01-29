"use client";

import * as React from "react";
import {
  Building2,
  BrainCircuit,
  Target,
  Save,
  Sparkles,
  RefreshCcw,
  Zap,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getOnboardingSettings,
  updateOnboardingSettings,
} from "@/app/actions/onboarding";

export default function AISettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    company_name: "",
    industry: "",
    goals: "",
    tone: "",
    services: "",
    focus: "",
  });

  React.useEffect(() => {
    async function load() {
      const data = await getOnboardingSettings();
      if (data) {
        setFormData(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateOnboardingSettings(formData);
      if (res.success) {
        toast.success("Nastavenia AI a firmy boli úspešne uložené.");
      } else {
        toast.error(res.error || "Chyba pri ukladaní.");
      }
    } catch (error) {
      toast.error("Systémová chyba.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <RefreshCcw className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
            AI & <span className="text-indigo-500">Kontext Firmy</span>
          </h1>
        </div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1 opacity-60 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Ladí správanie agenta a analýzu dát
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Company Identity */}
        <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-foreground">
              Identita Firmy
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Názov Firmy
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Oblasť podnikania
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* AI Tuning */}
        <section className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Target className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-foreground">
              AI Parametre
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tón komunikácie
              </label>
              <input
                type="text"
                value={formData.tone}
                onChange={(e) =>
                  setFormData({ ...formData, tone: e.target.value })
                }
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Priorita pri analýze
              </label>
              <input
                type="text"
                value={formData.focus}
                onChange={(e) =>
                  setFormData({ ...formData, focus: e.target.value })
                }
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Full Width Textarea Sections */}
        <section className="md:col-span-2 bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Dlhodobé ciele CRM
                </label>
              </div>
              <textarea
                rows={4}
                value={formData.goals}
                onChange={(e) =>
                  setFormData({ ...formData, goals: e.target.value })
                }
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-emerald-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Popis Služieb / Produktov
                </label>
              </div>
              <textarea
                rows={4}
                value={formData.services}
                onChange={(e) =>
                  setFormData({ ...formData, services: e.target.value })
                }
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-amber-500 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Info Warning */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-[2rem] flex items-start gap-4">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-wider">
          Tieto zmeny okamžite predefinujú „mozog“ vášho CRM agenta. AI začne
          spracovávať vaše e-maily a komunikovať s klientmi na základe tohto
          nového kontextu.
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          disabled={saving}
          onClick={handleSave}
          className="px-10 py-4 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3 group"
        >
          {saving ? (
            <RefreshCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
          Uložiť Konfiguráciu AI
        </button>
      </div>
    </div>
  );
}
