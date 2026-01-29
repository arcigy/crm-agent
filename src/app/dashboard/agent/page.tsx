"use client";

import AgentChat from "@/components/dashboard/AgentChat";
import { Sparkles, Bot } from "lucide-react";

export default function AgentPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic leading-none">
            Centrálny <span className="text-indigo-500">Agent</span>
          </h1>
        </div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pl-1 opacity-60 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Orchestrácia a inteligentné ovládanie CRM
        </p>
      </div>

      <AgentChat />
    </div>
  );
}
