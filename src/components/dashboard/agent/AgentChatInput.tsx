"use client";

import * as React from "react";
import { Send, Coins, PlusCircle, Database, Search } from "lucide-react";

interface AgentChatInputProps {
  input: string;
  isLoading: boolean;
  totalSessionCost: number;
  setInput: (val: string) => void;
  onSend: () => void;
}

export function AgentChatInput({
  input,
  isLoading,
  totalSessionCost,
  setInput,
  onSend,
}: AgentChatInputProps) {
  return (
    <div className="px-8 py-6 border-t border-border bg-card/50 backdrop-blur-md relative z-10">
      <div className="relative max-w-3xl mx-auto flex items-end gap-3">
        <div className="flex-1 relative group">
          <div className="absolute inset-0 bg-indigo-500/5 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Povedz agentovi, čo má urobiť..."
            className="w-full bg-muted/50 border border-border rounded-[2rem] py-4 px-6 text-sm font-bold placeholder:text-muted-foreground focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none shadow-inner"
          />
        </div>

        {totalSessionCost > 0 && (
          <div className="flex flex-col items-center justify-center px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Coins className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500">
              {(totalSessionCost * 0.92).toFixed(4)}€
            </span>
          </div>
        )}

        <button
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all group"
        >
          <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <button
          onClick={() => setInput("Vytvor nový lead Ján Novák (jan@test.sk)")}
          className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-3 h-3" /> Nový Kontakt
        </button>
        <button
          onClick={() => setInput("Aké sú moje finančné štatistiky?")}
          className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center gap-1.5"
        >
          <Database className="w-3 h-3" /> Štatistiky
        </button>
        <button
          onClick={() => setInput("Nájdi projekty v štádiu planning")}
          className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center gap-1.5"
        >
          <Search className="w-3 h-3" /> Hľadať Projekty
        </button>
      </div>
    </div>
  );
}
