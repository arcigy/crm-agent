"use client";

import * as React from "react";
import {
  BrainCircuit,
  History,
  Settings,
  Sparkles,
  RefreshCcw,
  ShieldCheck,
  User,
  Building2,
  Lock,
  ArrowRight,
  Database,
  Bot,
} from "lucide-react";
import Link from "next/link";

const settingsCategories = [
  {
    title: "AI Kontext & Personalizácia",
    description:
      "Nastavenie tónu komunikácie, biznis cieľov a vlastných pokynov pre agenta.",
    href: "/dashboard/settings/ai",
    icon: BrainCircuit,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    title: "Pamäť AI",
    description:
      "Prehľad a správa informácií, ktoré si o Vás AI zapamätalo v priebehu času.",
    href: "/dashboard/settings/memory",
    icon: History,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Synchronizácia & Integrácie",
    description:
      "Prepojenie s Google Calendar, Gmail a ďalšími externými nástrojmi.",
    href: "/dashboard/settings/sync",
    icon: RefreshCcw,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "Dátová Bezpečnosť",
    description:
      "Správa prístupov, audit logy a nastavenia súkromia dát v CRM.",
    href: "#",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    comingSoon: true,
  },
  {
    title: "ArciGy AI Agent",
    description:
      "Váš virtuálny biznis partner – trénujte ho, delegujte úlohy a sledujte výsledky.",
    href: "/dashboard/agent",
    icon: Bot,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

export default function SettingsHub() {
  return (
    <div className="h-full flex flex-col justify-between py-8 animate-in fade-in duration-500 overflow-hidden">
      <div className="max-w-7xl w-full mx-auto space-y-10">
        {/* Header - Balanced */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Nastavenia <span className="text-slate-500">& Systém</span>
            </h1>
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] opacity-60 flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3 text-slate-500" />
            Centrálna správa Vášho CRM rozhrania
          </p>
        </div>

        {/* Grid - Balanced 3 columns */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {settingsCategories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className={`group relative p-8 bg-card border border-border rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500 flex flex-col gap-6 ${cat.comingSoon ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`p-4 rounded-2xl ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                  >
                    <cat.icon className="w-6 h-6" />
                  </div>
                  {cat.comingSoon ? (
                    <span className="text-[8px] font-black uppercase tracking-widest bg-muted px-3 py-1.5 rounded-full text-muted-foreground">
                      Čoskoro
                    </span>
                  ) : (
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-2 transition-all" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight leading-tight">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-10 transition-opacity">
                  <cat.icon className="w-20 h-20 rotate-12" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info - Ultra Slim at bottom */}
      <div className="max-w-4xl w-full mx-auto px-8">
        <div className="bg-slate-500/5 border border-slate-500/10 py-2 px-10 rounded-full flex items-center justify-between gap-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 shrink-0">
            <Database className="w-4 h-4 text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              The Black Box
            </p>
          </div>
          <div className="h-px flex-1 bg-slate-500/20" />
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-right leading-none opacity-60">
            Všetky konfigurácie sú izolované pre každého AI agenta zvlášť.
          </p>
        </div>
      </div>
    </div>
  );
}
