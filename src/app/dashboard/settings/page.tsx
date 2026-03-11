"use client";

import * as React from "react";
import {
  BrainCircuit,
  History,
  Sparkles,
  RefreshCcw,
  ShieldCheck,
  ArrowRight,
  Bot,
  Receipt,
} from "lucide-react";
import Link from "next/link";

const settingsCategories = [
  {
    title: "AI Kontext & Personalizácia",
    description:
      "Nastavenie tónu komunikácie, biznis cieľov a vlastných pokynov pre agenta.",
    href: "/dashboard/settings/ai",
    icon: BrainCircuit,
    color: "text-zinc-400",
    bg: "bg-zinc-800/50",
  },
  {
    title: "Pamäť AI",
    description:
      "Prehlád a správa informácií, ktoré si o Vás AI zapamätalo v priebehu času.",
    href: "/dashboard/settings/memory",
    icon: History,
    color: "text-zinc-500",
    bg: "bg-zinc-800/40",
  },
  {
    title: "Synchronizácia & Integrácie",
    description:
      "Prepojenie s Google Calendar, Gmail a ďalšími externými nástrojmi.",
    href: "/dashboard/settings/sync",
    icon: RefreshCcw,
    color: "text-zinc-400",
    bg: "bg-zinc-800/50",
  },
  {
    title: "Dátová Bezpečnosť",
    description:
      "Správa prístupov, audit logy a nastavenia súkromia dát v CRM.",
    href: "#",
    icon: ShieldCheck,
    color: "text-zinc-600",
    bg: "bg-zinc-900/40",
    comingSoon: true,
  },
  {
    title: "ArciGy AI Agent",
    description:
      "Váš virtuálny biznis partner – trénujte ho, delegujte úlohy a sledujte výsledky.",
    href: "/dashboard/settings/agent",
    icon: Bot,
    color: "text-zinc-300",
    bg: "bg-zinc-800/60",
  },
  {
    title: "Prispôsobenie Rozhrania",
    description:
      "Nastavenie farieb, neónových efektov a dynamického správania ArciGy Cloud systému.",
    href: "#",
    icon: Sparkles,
    color: "text-zinc-400",
    bg: "bg-zinc-800/40",
    comingSoon: true,
  },
  {
    title: "Billing & Subscription",
    description:
      "Správa Vášho predplatného a fakturačných údajov cez zabezpečený Stripe portál.",
    href: "/dashboard/settings/billing",
    icon: Receipt,
    color: "text-zinc-500",
    bg: "bg-zinc-900/40",
  },
];

export default function SettingsHub() {
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col justify-center animate-in fade-in duration-1000 relative px-4 md:px-0">
      {/* ── Background Ambiance (Grey Tech) ── */}
      <div className="absolute top-[-100px] left-[-5%] w-[40%] h-[40%] bg-white/[0.01] rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl w-full mx-auto relative z-10">
        <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.03] rounded-[3rem] p-8 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
          
          {/* Header - Console Style */}
          <div className="flex flex-col gap-1 mb-6 pb-6 border-b border-white/[0.03]">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                System <span className="text-zinc-100">Registry</span> Console
              </h1>
            </div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
              Konfigurácia systémových jadier a behaviorálnych modelov
            </p>
          </div>

          {/* Categories - Console Rows */}
          <div className="space-y-0 divide-y divide-white/[0.03]">
            {settingsCategories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className={`
                  group flex flex-col md:flex-row md:items-center justify-between py-5 gap-6
                  transition-all duration-300 ease-out relative
                  ${cat.comingSoon ? "opacity-30 cursor-not-allowed" : "hover:px-6 cursor-pointer hover:bg-white/[0.01]"}
                `}
              >
                {/* Info Block */}
                <div className="flex items-start gap-6 flex-1 relative z-10">
                  <div className={`
                    w-10 h-10 rounded-2xl flex items-center justify-center shrink-0
                    bg-zinc-900 border border-white/5 shadow-2xl
                  `}>
                    <cat.icon className={`w-4 h-4 ${cat.color} group-hover:text-zinc-100 transition-colors`} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex flex-col gap-1 pt-1">
                    <h3 className="text-[13px] font-black tracking-widest text-zinc-200 uppercase italic drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
                      {cat.title}
                    </h3>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none max-w-md">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-6 relative z-10">
                  {cat.comingSoon ? (
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] px-4 py-2 bg-zinc-900/40 rounded-xl text-zinc-700 border border-white/5">
                      Dev_Mode
                    </span>
                  ) : (
                    <div className="flex items-center gap-6 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-white/20 flex items-center justify-center text-zinc-950 shadow-[0_10px_20px_rgba(255,255,255,0.1)] group-hover:bg-white transition-all">
                           <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
