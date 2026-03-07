"use client";

import * as React from "react";
import { Briefcase, Plus, StickyNote, Loader2, Zap } from "lucide-react";
import { Lead } from "@/types/contact";
import { updateContactComments } from "@/app/actions/contacts";
import { toast } from "sonner";

export function ContactDealsNotes({ contact }: { contact: Lead }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!textareaRef.current) return;
    const val = textareaRef.current.value;
    if (val === contact.comments) return;

    setIsSaving(true);
    try {
      const res = await updateContactComments(Number(contact.id), val);
      if (res.success) {
        toast.success("Poznámka bola uložená");
      } else {
        toast.error(res.error || "Chyba pri ukladaní");
      }
    } catch (error) {
      console.error("Save note failed:", error);
      toast.error("Nepodarilo sa uložiť poznámku");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Deals Section - Minimalistic */}
      <section className="bg-slate-900 bg-opacity-50 backdrop-blur-lg border border-violet-900/30 rounded-2xl p-5 relative overflow-hidden group shadow-sm transition-all hover:bg-opacity-70">
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">Dealy</h3>
                    </div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {contact.deals?.slice(0, 3).map((d, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/10 transition-all group/deal cursor-pointer shadow-sm"
                    >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-7 h-7 rounded-lg bg-orange-500/5 flex items-center justify-center text-orange-400/70 transition-colors group-hover/deal:text-orange-400 shrink-0">
                                <Briefcase className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-sm font-semibold text-white group-hover/deal:text-orange-400 transition-colors truncate">{d.name}</p>
                                <p className={`text-[10px] font-medium mt-0.5 ${d.paid ? "text-emerald-400" : "text-amber-500"}`}>
                                    {d.paid ? "Uhradené" : "Čaká na úhradu"}
                                </p>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-white shrink-0">
                            {new Intl.NumberFormat('sk-SK').format(d.value || 0)} €
                        </span>
                    </div>
                ))}
            </div>

            <button className="w-full h-8 border border-dashed border-white/10 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                + Pridať Nový Deal
            </button>
        </div>
      </section>

      {/* Internal Notes Section - Minimalistic */}
      <section className="bg-slate-900 bg-opacity-50 backdrop-blur-lg border border-violet-900/30 rounded-2xl p-5 relative overflow-hidden group shadow-sm transition-all hover:bg-opacity-70">
        <div className="relative z-10">
            <h3 className="text-[13px] font-bold text-violet-400 mb-3 flex items-center gap-2 leading-none px-1">
                <StickyNote className="w-3.5 h-3.5" /> Poznámka
            </h3>
            <textarea
                ref={textareaRef}
                className="w-full bg-black/20 border border-violet-900/30 rounded-xl p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all resize-none thin-scrollbar mb-3 min-h-[80px]"
                placeholder="Interné poznámky..."
                defaultValue={contact.comments || ""}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSave();
                    }
                }}
            />
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-[11px] uppercase transition-all active:scale-95 shadow-[0_0_15px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Uložiť Zmeny
            </button>
        </div>
      </section>
    </div>
  );
}
