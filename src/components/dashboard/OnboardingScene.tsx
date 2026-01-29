"use client";

import * as React from "react";
import {
  Building2,
  Rocket,
  BrainCircuit,
  MessageSquare,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { saveOnboardingData } from "@/app/actions/onboarding";
import { useRouter } from "next/navigation";

export function OnboardingScene() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    company_name: "",
    industry: "",
    goals: "",
    tone: "",
    services: "",
    focus: "",
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (!formData.company_name || !formData.industry) {
      toast.error("Prosím vyplňte základné údaje o firme.");
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await saveOnboardingData(formData);
      if (res.success) {
        toast.success("Nastavenie dokončené! Vitajte v CRM.");
        // Force a hard reload to clear the onboarding gate in the layout
        window.location.href = "/dashboard";
      } else {
        toast.error(res.error || "Chyba pri ukladaní.");
      }
    } catch (error) {
      toast.error("Systémová chyba.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#020617] text-white flex items-center justify-center overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative w-full max-w-4xl px-6 h-full lg:h-auto flex flex-col justify-center gap-12 py-12">
        {/* Progress Bar */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-700 ${s <= step ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-gray-800"}`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-blue-600 w-fit rounded-2xl shadow-xl shadow-blue-600/20">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic italic">
                  Základy <span className="text-blue-500">Vášho Biznisu</span>
                </h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  KROK 01 / IDENTITA FIRMY
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Názov Firmy
                  </label>
                  <input
                    type="text"
                    placeholder="Napr. ArciGy s.r.o."
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Oblasť podnikania
                  </label>
                  <input
                    type="text"
                    placeholder="Napr. Automatizácia, Realitný trh..."
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-indigo-600 w-fit rounded-2xl shadow-xl shadow-indigo-600/20">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic italic">
                  Ciele a <span className="text-indigo-500">Stratégia</span>
                </h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  KROK 02 / PREČO STE TU?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Váš hlavný cieľ
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Čo chcete pomocou CRM dosiahnuť? (napr. ušetriť čas, viac predajov...)"
                    value={formData.goals}
                    onChange={(e) =>
                      setFormData({ ...formData, goals: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Kľúčové služby
                  </label>
                  <textarea
                    rows={3}
                    placeholder="V skratke popíšte váš produkt alebo služby..."
                    value={formData.services}
                    onChange={(e) =>
                      setFormData({ ...formData, services: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-emerald-600 w-fit rounded-2xl shadow-xl shadow-emerald-600/20">
                  <BrainCircuit className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic italic">
                  AI <span className="text-emerald-500">Personalizácia</span>
                </h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  KROK 03 / NALADENIE AGENTA
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Tón komunikácie
                  </label>
                  <input
                    type="text"
                    placeholder="Napr. Profesionálny a vecný, alebo Kamarátsky..."
                    value={formData.tone}
                    onChange={(e) =>
                      setFormData({ ...formData, tone: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Na čo má AI pri inboxe dávať pozor?
                  </label>
                  <input
                    type="text"
                    placeholder="Napr. urgencia termínov, konkrétne mená..."
                    value={formData.focus}
                    onChange={(e) =>
                      setFormData({ ...formData, focus: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl flex items-center gap-4">
                <Zap className="w-6 h-6 text-emerald-500 animate-bounce" />
                <p className="text-xs font-bold text-gray-300 leading-relaxed uppercase tracking-widest">
                  TIETO INFORMÁCIE BUDÚ ULOŽENÉ DO{" "}
                  <span className="text-white">AI MEMORY</span>, ABY AGENT
                  PRESNE ROZUMEL KONTEXTU VAŠEJ PRÁCE.
                </p>
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-white/10">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-8 py-4 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
              >
                Späť
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-4">
              {step < 3 ? (
                <button
                  onClick={nextStep}
                  className="px-10 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-full shadow-2xl hover:bg-blue-500 hover:text-white active:scale-95 transition-all flex items-center gap-3 group"
                >
                  Ďalej
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  disabled={loading}
                  onClick={handleSubmit}
                  className="px-10 py-4 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-full shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3 group"
                >
                  {loading ? "Spracúvam..." : "DOKONČIŤ NASTAVENIE"}
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
