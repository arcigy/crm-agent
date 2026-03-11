"use client";

import * as React from "react";
import { Save, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { getOnboardingSettings, updateOnboardingSettings } from "@/app/actions/onboarding";
import AIHeader from "@/components/dashboard/settings/ai/AIHeader";
import { AIIdentitySections } from "@/components/dashboard/settings/ai/AIIdentitySections";
import { AITuningSections } from "@/components/dashboard/settings/ai/AITuningSections";

export default function AISettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    company_name: "",
    industry: "",
    nickname: "",
    profession: "",
    about_me: "",
    goals: "",
    tone: "",
    services: "",
    focus: "",
    custom_instructions: "",
    signature: "",
    negative_keywords: "",
    availability: "",
  });

  React.useEffect(() => {
    async function load() {
      const data = await getOnboardingSettings();
      if (data) {
        setFormData(prev => ({ ...prev, ...(data as any) }));
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

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <RefreshCcw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-1000 pt-10 pb-20 px-4 md:px-0 relative">
      {/* ── Background Ambiance (Grey Neon) ── */}
      <div className="absolute top-[-100px] right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ── Settings Console Window ── */}
      <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.03] rounded-[3.5rem] p-10 md:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
        
        <AIHeader />

        <div className="space-y-0 divide-y divide-white/[0.03] relative z-10 w-full">
          <AIIdentitySections formData={formData} onChange={updateField} />
          <AITuningSections formData={formData} onChange={updateField} />
        </div>

        <div className="mt-16 pt-10 border-t border-white/[0.03] flex items-center justify-end">
           <button
              disabled={saving}
              onClick={handleSave}
              className="group relative px-14 py-5 bg-zinc-100 text-zinc-950 font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl shadow-[0_15px_40px_rgba(255,255,255,0.05)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all flex items-center gap-4 border border-white/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-all" />
              
              {saving ? (
                <RefreshCcw className="w-5 h-5 animate-spin text-zinc-950" />
              ) : (
                <Save className="w-5 h-5 group-hover:scale-110 transition-transform duration-500 text-zinc-950" />
              )}
              <span className="relative z-10 drop-shadow-sm">Deploy_Configuration</span>
            </button>
        </div>
      </div>
    </div>
  );
}





