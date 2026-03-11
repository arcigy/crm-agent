"use client";

import * as React from "react";
import { toast } from "sonner";
import { getAIMemories, addAIMemory, deleteAIMemory } from "@/app/actions/memory";
import MemoryHeader from "@/components/dashboard/settings/memory/MemoryHeader";
import MemoryStats from "@/components/dashboard/settings/memory/MemoryStats";
import MemoryForm from "@/components/dashboard/settings/memory/MemoryForm";
import MemoryList from "@/components/dashboard/settings/memory/MemoryList";

export default function MemorySettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [memories, setMemories] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [newFact, setNewFact] = React.useState("");

  const load = async () => {
    setLoading(true);
    const data = await getAIMemories();
    setMemories(data);
    setLoading(false);
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Naozaj chcete vymazať túto spomienku? AI na túto informáciu zabudne.")) {
      const res = await deleteAIMemory(id);
      if (res.success) {
        toast.success("Spomienka úspešne odstránená.");
        load();
      }
    }
  };

  const handleAdd = async () => {
    if (!newFact.trim()) return;
    const res = await addAIMemory(newFact, "manual");
    if (res.success) {
      toast.success("Informácia uložená do pamäte agenta.");
      setNewFact("");
      setIsAdding(false);
      load();
    }
  };

  const filteredMemories = memories.filter(
    (m) =>
      m.fact.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-1000 pb-40 px-4 md:px-0 relative">
      {/* ── Background Ambiance (Grey Neon) ── */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ── Memory Engine Window ── */}
      <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/[0.03] rounded-[3.5rem] p-10 md:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden">
        
        <MemoryHeader onAddClick={() => setIsAdding(true)} />

        <div className="space-y-12 relative z-10 w-full">
          <MemoryStats
            total={memories.length}
            auto={memories.filter((m) => m.category !== "manual").length}
            manual={memories.filter((m) => m.category === "manual").length}
          />

          {isAdding && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <MemoryForm
                newFact={newFact}
                setNewFact={setNewFact}
                onAdd={handleAdd}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}

          <MemoryList
            loading={loading}
            memories={filteredMemories}
            search={search}
            setSearch={setSearch}
            onRefresh={load}
            onDelete={handleDelete}
          />
        </div>

        {/* ── Registry Status Footer ── */}
        <div className="mt-16 pt-8 border-t border-white/[0.03] flex items-center justify-between opacity-30">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">Memory_Sync_Active</span>
           </div>
           <span className="text-[7px] font-black text-zinc-700 uppercase tracking-[0.2em]">Self_Healing_Neurons_Online</span>
        </div>
      </div>
    </div>
  );
}



