"use client";

import * as React from "react";
import { FolderKanban, Clock, PlusCircle } from "lucide-react";
import { Lead } from "@/types/contact";

export function ContactProjects({ contact }: { contact: Lead }) {
  return (
    <section className="bg-slate-900 bg-opacity-50 backdrop-blur-lg border border-violet-900/30 rounded-2xl p-5 relative overflow-hidden group shadow-sm transition-all hover:bg-opacity-70">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 transition-transform">
                    <FolderKanban className="w-4 h-4" strokeWidth={2} />
                </div>
                <div>
                   <h3 className="text-sm font-bold text-white leading-none">Projekty</h3>
                   <p className="text-xs text-zinc-400 mt-1">Súvisiace s kontaktom</p>
                </div>
            </div>
            <button className="h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-[11px] font-semibold text-white transition-all flex items-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                <PlusCircle className="w-3.5 h-3.5" /> Nový
            </button>
        </div>

        {contact.projects && contact.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contact.projects.map((p, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-violet-900/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group/card shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-violet-400">
                      {p.project_type || "General"}
                    </span>
                    <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${p.stage === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-violet-500/10 text-violet-400"}`}>
                        {p.stage === "completed" ? "Dokončené" : "Aktívne"}
                    </div>
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1 truncate">
                    {p.name || `#${p.id}`}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                    <Clock className="w-3 h-3" />
                    {p.date_created && !isNaN(new Date(p.date_created).getTime())
                      ? new Date(p.date_created).toLocaleDateString("sk-SK")
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-xs font-medium text-zinc-500">
                Kontakt zatiaľ nemá žiadne projekty.
              </p>
            </div>
          )}
      </div>
    </section>
  );
}
