"use client";

import * as React from "react";
import { CheckCircle2, Phone, MessageSquare, Mail, History } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactActivity({ contact }: { contact: Lead }) {
  return (
    <section className="bg-slate-900 bg-opacity-50 backdrop-blur-lg border border-violet-900/30 rounded-2xl p-5 relative overflow-hidden group shadow-sm transition-all hover:bg-opacity-70">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 transition-all">
                    <History className="w-4 h-4" />
                </div>
                <div>
                   <h3 className="text-sm font-bold text-white leading-none">Aktivita</h3>
                   <p className="text-xs text-zinc-400 mt-1">História interakcií</p>
                </div>
            </div>
            <div className="flex gap-3">
                <button className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white transition-all active:scale-95">
                    Logovať Aktivitu
                </button>
            </div>
        </div>

        <div className="space-y-4 relative pl-5">
            <div className="absolute left-[30px] top-4 bottom-4 w-[1px] bg-white/5" />

            {contact.activities && contact.activities.length > 0 ? (
                contact.activities.map((a, i) => (
                    <div key={i} className="flex gap-4 relative group/item transition-all">
                        <div
                            className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center z-10 border-2 border-slate-950 shadow-sm transition-all
                                ${
                                    a.type === "call"
                                        ? "bg-blue-600 text-white"
                                        : a.type === "sms"
                                            ? "bg-emerald-600 text-white"
                                            : "bg-pink-600 text-white"
                                }
                            `}
                        >
                            {a.type === "call" ? (
                                <Phone className="w-3.5 h-3.5" />
                            ) : a.type === "sms" ? (
                                <MessageSquare className="w-3.5 h-3.5" />
                            ) : (
                                <Mail className="w-3.5 h-3.5" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-bold text-white truncate">
                                    {a.subject || "Interakcia"}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-500">
                                    {a.date && !isNaN(new Date(a.date).getTime())
                                        ? new Date(a.date).toLocaleDateString("sk-SK")
                                        : "—"}
                                </span>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-3 rounded-xl group-hover/item:bg-white/10 transition-all">
                                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                                    {a.content || "Bez dodatočných poznámok."}
                                </p>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-6 text-center">
                    <p className="text-xs font-medium text-zinc-500">
                        Zatiaľ žiadna zaznamenaná aktivita.
                    </p>
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
