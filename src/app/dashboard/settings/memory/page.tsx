"use client";

import * as React from "react";
import {
  BrainCircuit,
  Trash2,
  Plus,
  Search,
  History,
  Sparkles,
  RefreshCcw,
  PlusCircle,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAIMemories,
  addAIMemory,
  deleteAIMemory,
  updateAIMemory,
} from "@/app/actions/memory";

export default function MemorySettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [memories, setMemories] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [newFact, setNewFact] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("manual");

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
    if (
      confirm(
        "Naozaj chcete vymazať túto spomienku? AI na túto informáciu zabudne.",
      )
    ) {
      const res = await deleteAIMemory(id);
      if (res.success) {
        toast.success("Spomienka odstránená.");
        load();
      }
    }
  };

  const handleAdd = async () => {
    if (!newFact.trim()) return;
    const res = await addAIMemory(newFact, newCategory);
    if (res.success) {
      toast.success("Nová spomienka uložená.");
      setNewFact("");
      setIsAdding(false);
      load();
    }
  };

  const filteredMemories = memories.filter(
    (m) =>
      m.fact.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
              <History className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
              Pamäť <span className="text-indigo-500">AI Agenta</span>
            </h1>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Pridať Spomienku
          </button>
        </div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1 opacity-60 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Prehľad informácií, ktoré si AI o Vás uložilo
        </p>
      </div>

      {/* Stats/Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-6 rounded-3xl">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Celkom spomienok
          </p>
          <p className="text-3xl font-black italic">{memories.length}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-3xl">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Automaticky uložené
          </p>
          <p className="text-3xl font-black italic text-indigo-500">
            {memories.filter((m) => m.category !== "manual").length}
          </p>
        </div>
        <div className="bg-card border border-border p-6 rounded-3xl">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Manuálne pridané
          </p>
          <p className="text-3xl font-black italic text-emerald-500">
            {memories.filter((m) => m.category === "manual").length}
          </p>
        </div>
      </div>

      {/* Search & Add Form */}
      <div className="bg-muted/30 border border-border rounded-[2.5rem] p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Hľadať v spomienkach..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 pl-12 font-bold text-sm placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={load}
          className="p-3 hover:bg-muted rounded-2xl transition-all"
        >
          <RefreshCcw
            className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {isAdding && (
        <div className="bg-card border border-blue-500/30 p-8 rounded-[2.5rem] shadow-xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-500" />
              Nová informácia pre AI
            </h3>
            <button
              onClick={() => setIsAdding(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Fakt / Informácia
              </label>
              <textarea
                rows={2}
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="Napr. Preferujem stručné e-maily v piatok poobede..."
                className="w-full bg-muted/30 border border-border rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
              >
                Zrušiť
              </button>
              <button
                onClick={handleAdd}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Uložiť do pamäte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memories List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredMemories.length > 0 ? (
          filteredMemories.map((m) => (
            <div
              key={m.id}
              className="group bg-card border border-border p-6 rounded-[2rem] hover:border-indigo-500/30 transition-all flex items-start justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      m.category === "manual"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-indigo-500/10 text-indigo-500"
                    }`}
                  >
                    {m.category}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {new Date(m.date_created).toLocaleDateString("sk-SK")}
                  </span>
                </div>
                <p className="font-bold text-foreground leading-relaxed">
                  {m.fact}
                </p>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-muted/10 rounded-[3rem] border border-dashed border-border">
            <p className="text-muted-foreground font-bold italic tracking-wide">
              Žiadne spomienky sa nenašli.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
