"use client";

import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";

interface MemoryHeaderProps {
  onAddClick: () => void;
}

export default function MemoryHeader({ onAddClick }: MemoryHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-8 border-b border-white/[0.03] mb-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              AI <span className="text-zinc-100">Memory</span> Console
            </h1>
            <div className="px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700/30">
                <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Knowledge_Base</span>
            </div>
        </div>
        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">
          Archivácia a behaviorálna analýza naučených faktov
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
            <button className="px-6 py-2.5 bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl hover:bg-zinc-800 transition-all flex items-center gap-2 group">
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-200 transition-colors">Back_System</span>
            </button>
        </Link>
        <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-10 py-3 bg-zinc-100 text-zinc-950 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_10px_30px_rgba(255,255,255,0.05)] active:scale-95 border border-white/20"
        >
            <PlusCircle className="w-3.5 h-3.5" />
            Append_Registry
        </button>
      </div>
    </div>
  );
}
