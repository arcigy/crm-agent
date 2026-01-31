"use client";

import React, { useState } from "react";
import { Landmark, Save, Plus, Trash2, FileText, User, Calculator } from "lucide-react";
import { toast } from "sonner";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function QuotesPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", description: "Konzultácia", quantity: 1, unitPrice: 50 },
  ]);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Cenová ponuka bola uložená");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 animate-in fade-in duration-500 text-zinc-900 dark:text-zinc-100">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/20">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic leading-none">
              Custom / <span className="text-emerald-600">Ponuky</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-1 opacity-70">
              Tvorba custom cenových ponúk pre vašich klientov
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col gap-2 mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Meno klienta</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 opacity-50" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Názov firmy alebo meno klienta"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Položky ponuky</h3>
                <button 
                  onClick={addItem}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Pridať položku
                </button>
              </div>

              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="col-span-6 flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Popis</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none"
                      placeholder="Názov služby/produktu"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center">Množstvo</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                      className="bg-transparent border-none p-0 text-sm font-bold text-center focus:ring-0 outline-none"
                    />
                  </div>
                  <div className="col-span-3 flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-right">Cena / MJ</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                      className="bg-transparent border-none p-0 text-sm font-bold text-right focus:ring-0 outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-xl">
            <h3 className="font-black uppercase italic tracking-tighter text-xl mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              Súhrn
            </h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span>Základ</span>
                <span>{total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <span>DPH (0%)</span>
                <span>0.00 €</span>
              </div>
              <div className="pt-4 border-t border-zinc-800 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Celková suma</span>
                <span className="text-3xl font-black italic tracking-tighter tabular-nums">{total.toFixed(2)} €</span>
              </div>
            </div>
            <button
              disabled={isSaving}
              onClick={handleSave}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20"
            >
              {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                <>
                  <FileText className="w-4 h-4" />
                  Generovať ponuku
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
