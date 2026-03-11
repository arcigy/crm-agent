"use client";

import { UserCircle, Briefcase, Building2, Factory, ShieldCheck } from "lucide-react";

interface AIIdentitySectionsProps {
  formData: any;
  onChange: (key: string, value: string) => void;
}

function SettingRow({ label, description, children, icon: Icon, glowColor }: any) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-8 gap-6 group relative">
      <div className="flex items-start gap-4 flex-1 relative z-10">
        <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-zinc-500/30 group-hover:scale-105`}>
          {/* Dynamic Neon Glow on Hover - Now Centered on Icon */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 ${glowColor} opacity-0 group-hover:opacity-[0.16] blur-[70px] transition-all duration-1000 pointer-events-none -z-10`} />
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


export function AIIdentitySections({ formData, onChange }: AIIdentitySectionsProps) {
  return (
    <div className="space-y-0">
      <div className="px-10 divide-y divide-white/[0.03]">
        <SettingRow 
          label="Osobný Profil" 
          description="Alias a Vaše zameranie pre personalizovanú interakciu."
          icon={UserCircle}
          glowColor="bg-blue-500"
        >

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => onChange("nickname", e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all placeholder:text-[8px] placeholder:uppercase placeholder:text-zinc-800 shadow-inner"
              placeholder="Alias_ID"
            />
            <input
              type="text"
              value={formData.profession}
              onChange={(e) => onChange("profession", e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all placeholder:text-[8px] placeholder:uppercase placeholder:text-zinc-800 shadow-inner"
              placeholder="Role_Class"
            />
          </div>
        </SettingRow>

        <SettingRow 
          label="Firemný Kontext" 
          description="Názov a odvetvie Vašej spoločnosti."
          icon={Building2}
          glowColor="bg-violet-500"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => onChange("company_name", e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all placeholder:text-[8px] placeholder:uppercase placeholder:text-zinc-800 shadow-inner"
              placeholder="Entity_Name"
            />
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => onChange("industry", e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-xs font-black text-zinc-200 focus:border-zinc-500/50 outline-none transition-all placeholder:text-[8px] placeholder:uppercase placeholder:text-zinc-800 shadow-inner"
              placeholder="Sector_Array"
            />
          </div>
        </SettingRow>

        <SettingRow 
          label="Core Values" 
          description="Hlavné hodnoty a tón komunikácie pre AI logiku."
          icon={ShieldCheck}
          glowColor="bg-emerald-500"
        >
          <textarea
            rows={3}
            value={formData.about_me}
            onChange={(e) => onChange("about_me", e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-xs font-black text-zinc-200 italic focus:border-zinc-500/50 outline-none transition-all resize-none shadow-inner leading-relaxed"
            placeholder="System_Values_Override..."
          />
        </SettingRow>
      </div>
    </div>
  );
}
