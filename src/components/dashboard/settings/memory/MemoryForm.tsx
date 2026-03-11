"use client";

import { PlusCircle, X, Check, BrainCircuit, Command } from "lucide-react";

interface MemoryFormProps {
  newFact: string;
  setNewFact: (val: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export default function MemoryForm({ newFact, setNewFact, onAdd, onCancel }: MemoryFormProps) {
  return (
    <div className="bg-zinc-900 border border-white/5 p-10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 relative overflow-hidden mb-12">
      {/* Background Accent (Grey Neon) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-zinc-100 rounded-[1.2rem] flex items-center justify-center shadow-[0_10px_25px_rgba(255,255,255,0.05)]">
              <Command className="w-5 h-5 text-zinc-950" strokeWidth={2.5} />
           </div>
           <div className="flex flex-col">
              <span className="text-[7px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-1">New_Interaction</span>
              <h3 className="text-xl font-black uppercase tracking-tighter text-zinc-100 italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                Zápis Do Pamäte
              </h3>
           </div>
        </div>
        <button
          onClick={onCancel}
          className="text-zinc-600 hover:text-zinc-200 p-3 hover:bg-white/5 rounded-full transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="space-y-3">
          <label className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1">
            Data_Input_String
          </label>
          <textarea
            rows={3}
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            placeholder="Vložte dôležitý fakt pre AI..."
            className="w-full bg-black/40 border border-white/5 rounded-2xl p-8 font-black text-sm italic text-zinc-200 focus:border-zinc-500/50 outline-none transition-all resize-none placeholder:text-zinc-800 shadow-inner"
          />
        </div>

        <div className="flex items-center justify-end gap-6">
          <button
            onClick={onCancel}
            className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-zinc-300 transition-all border-b border-transparent hover:border-zinc-800"
          >
            Abort_Action
          </button>
          <button
            onClick={onAdd}
            className="px-10 py-5 bg-zinc-100 text-zinc-950 rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] shadow-xl shadow-white/5 active:scale-95 transition-all flex items-center gap-3 border border-white/20 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-all" />
            <Check className="w-4 h-4 text-zinc-950 relative z-10" />
            <span className="relative z-10">Commit_To_Memory</span>
          </button>
        </div>
      </div>
    </div>
  );
}
