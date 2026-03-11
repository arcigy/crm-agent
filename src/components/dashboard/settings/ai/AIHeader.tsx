"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AIHeader() {
  return (
    <div className="flex items-center justify-between pb-8 border-b border-white/[0.03] mb-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic drop-shadow-[0_0_10px_rgba(228,228,231,0.2)]">
              Kontext <span className="text-zinc-100">Konzola</span>
            </h1>
        </div>
        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
          Architektúra a hĺbková parametrizácia AI jadra
        </p>
      </div>
      
      <Link href="/dashboard/settings">
        <button className="px-6 py-2.5 bg-violet-600/5 backdrop-blur-2xl border border-violet-500/20 rounded-2xl hover:bg-violet-600/15 hover:border-violet-400/40 transition-all flex items-center gap-2 group shadow-[0_0_15px_rgba(139,92,246,0.05)]">
          <ArrowLeft className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors" />
          <span className="text-[8px] font-black uppercase tracking-widest text-violet-400 group-hover:text-violet-300 transition-colors">Back System</span>
        </button>
      </Link>
    </div>
  );
}
