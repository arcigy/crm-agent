"use client";

import { TargetIcon, Sparkles, Target, MessageSquare, Goal, Zap, ShieldAlert, PenTool, Clock } from "lucide-react";

interface AITuningSectionsProps {
  formData: any;
  onChange: (key: string, value: string) => void;
}

function SettingRow({ label, description, children, icon: Icon, glowColor }: any) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-8 gap-6 group relative">
      <div className="flex items-start gap-4 flex-1 relative z-10">
        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-zinc-500/30 group-hover:scale-105`}>
          {/* Dynamic Neon Glow on Hover - Now Centered on Icon */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 ${glowColor} opacity-0 group-hover:opacity-[0.14] blur-[70px] transition-all duration-1000 pointer-events-none -z-10`} />
          <Icon className="w-4.5 h-4.5 text-zinc-400 group-hover:text-zinc-100 transition-colors" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            {label}
          </h4>
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider leading-relaxed max-w-sm">
            {description}
          </p>
        </div>
      </div>
      <div className="flex-1 max-w-md w-full relative z-10">
        {children}
      </div>
    </div>
  );
}


export function AITuningSections({ formData, onChange }: AITuningSectionsProps) {
  return (
    <div className="space-y-0 text-zinc-100">
      <div className="px-10 divide-y divide-white/[0.03]">
        <SettingRow 
          label="AI Tuning" 
          description="Ladienie tonality a analytického zamerania."
          icon={TargetIcon}
          glowColor="bg-indigo-500"
        >

          <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={formData.tone}
                onChange={(e) => onChange("tone", e.target.value)}
                className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all placeholder:text-[8px] placeholder:uppercase placeholder:text-zinc-800 shadow-inner"
                placeholder="Vibe_Protocol"
              />
              <input
                type="text"
                value={formData.focus}
                onChange={(e) => onChange("focus", e.target.value)}
                className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all placeholder:text-[8px] placeholder:uppercase placeholder:text-zinc-800 shadow-inner"
                placeholder="Focus_Target"
              />
          </div>
        </SettingRow>

        <SettingRow 
          label="System Prompt" 
          description="Hĺbkové inštrukcie pre internú logiku agenta."
          icon={MessageSquare}
          glowColor="bg-fuchsia-500"
        >
          <textarea
            rows={5}
            value={formData.custom_instructions}
            onChange={(e) => onChange("custom_instructions", e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-[10px] font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all resize-none shadow-inner leading-relaxed"
            placeholder="Behavioral_Prompt_Array..."
          />
        </SettingRow>

        <SettingRow 
          label="Biznis Kontext" 
          description="Ciele a portfólio služieb pre presnú analýzu."
          icon={Zap}
          glowColor="bg-amber-500"
        >
           <div className="space-y-4">
                <textarea
                    rows={2}
                    value={formData.goals}
                    onChange={(e) => onChange("goals", e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-black text-zinc-200 italic focus:border-zinc-500/50 outline-none transition-all resize-none shadow-inner"
                    placeholder="Entity_Goals..."
                />
                <textarea
                    rows={2}
                    value={formData.services}
                    onChange={(e) => onChange("services", e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-black text-zinc-200 italic focus:border-zinc-500/50 outline-none transition-all resize-none shadow-inner"
                    placeholder="Service_Portfolio..."
                />
           </div>
        </SettingRow>

        <SettingRow 
          label="Obchodné Obmedzenia" 
          description="Slová a témy, ktorým sa má AI vyhnúť (napr. zľavy)."
          icon={ShieldAlert}
          glowColor="bg-red-500"
        >
          <textarea
            rows={2}
            value={formData.negative_keywords}
            onChange={(e) => onChange("negative_keywords", e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all resize-none shadow-inner"
            placeholder="Negative_Keywords_Array (napr. zľava, barter...)"
          />
        </SettingRow>

        <SettingRow 
          label="Logistika & Podpis" 
          description="Váš automatický podpis a časová dostupnosť pre schôdzky."
          icon={PenTool}
          glowColor="bg-blue-400"
        >
           <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[7px] font-black text-zinc-700 uppercase tracking-widest ml-1">Signature_Template</label>
                  <textarea
                      rows={2}
                      value={formData.signature}
                      onChange={(e) => onChange("signature", e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-black text-zinc-300 focus:border-zinc-500/50 outline-none transition-all resize-none shadow-inner"
                      placeholder="napr. S úctou, Ján | CEO ArciGy"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[7px] font-black text-zinc-700 uppercase tracking-widest ml-1">Availability_Window</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                      type="text"
                      value={formData.availability}
                      onChange={(e) => onChange("availability", e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all shadow-inner"
                      placeholder="napr. Po-Pi 9:00 - 15:00"
                    />
                  </div>
                </div>
           </div>
        </SettingRow>
      </div>
    </div>
  );
}
