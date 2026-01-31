"use client";

import * as React from "react";
import {
  Bot,
  User,
  Sparkles,
  ChevronRight,
  Mail,
  Database,
  Coins,
} from "lucide-react";
import { AgentStep } from "@/app/actions/agent-types";

export interface CostInfo {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  breakdown?: {
    openai: number;
    anthropic: number;
    gemini: number;
  };
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  toolResults?: AgentStep[];
  thoughts?: {
    intent?: string;
    plan?: string[];
    extractedData?: any;
  };
  costInfo?: CostInfo;
}

interface AgentChatMessageProps {
  msg: Message;
  idx: number;
  isExpanded: boolean;
  onToggleLog: (idx: number) => void;
}

export function AgentChatMessage({
  msg,
  idx,
  isExpanded,
  onToggleLog,
}: AgentChatMessageProps) {
  return (
    <div
      className={`flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        msg.role === "user" ? "flex-row-reverse" : ""
      }`}
    >
      <div
        className={`p-2 rounded-xl border ${
          msg.role === "assistant"
            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
            : "bg-muted border-border text-muted-foreground"
        }`}
      >
        {msg.role === "assistant" ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      <div
        className={`space-y-4 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}
      >
        <div
          className={`p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm border ${
            msg.role === "assistant"
              ? "bg-card border-border rounded-tl-none text-foreground"
              : "bg-indigo-600 border-indigo-400/30 text-white rounded-tr-none"
          }`}
        >
          {msg.content}
        </div>

        {/* Cost Badge */}
        {msg.role === "assistant" &&
          msg.costInfo &&
          msg.costInfo.totalCost > 0 && (
            <div className="flex items-center gap-2 mt-2 animate-in fade-in duration-300">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Coins className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500">
                  {(msg.costInfo.totalCost * 0.92).toFixed(5)}€
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 border border-border rounded-full">
                <span className="text-[9px] font-medium text-muted-foreground">
                  {msg.costInfo.inputTokens + msg.costInfo.outputTokens} tokenov
                </span>
              </div>
              {msg.costInfo.breakdown && (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted/30 border border-border/50 rounded-full">
                  {msg.costInfo.breakdown.openai > 0 && (
                    <span className="text-[8px] font-medium text-blue-400">
                      OpenAI
                    </span>
                  )}
                  {msg.costInfo.breakdown.anthropic > 0 && (
                    <span className="text-[8px] font-medium text-orange-400">
                      Claude
                    </span>
                  )}
                  {msg.costInfo.breakdown.gemini > 0 && (
                    <span className="text-[8px] font-medium text-cyan-400">
                      Gemini
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Molecular Thought Process */}
        {msg.toolResults && msg.toolResults.length > 0 && (
          <div className="space-y-2 animate-in fade-in duration-500">
            <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/40 text-left">
              <button
                onClick={() => onToggleLog(idx)}
                className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">
                    Analýza & Plán Misie
                  </span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-indigo-500/50 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-4 border-t border-indigo-500/10">
                  {msg.thoughts && (
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 bg-indigo-500/20 rounded text-[9px] font-bold text-indigo-400 uppercase">
                          {msg.thoughts.intent}
                        </div>
                      </div>

                      {msg.thoughts.extractedData && (
                        <div className="bg-black/20 rounded-xl p-3 border border-indigo-500/10">
                          <div className="text-[8px] font-black uppercase tracking-widest text-indigo-500/50 mb-2">
                            Extrahované dáta
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(
                              (msg.thoughts?.extractedData || {}) as Record<
                                string,
                                any
                              >,
                            ).map(
                              ([k, v]) =>
                                v && (
                                  <div key={k} className="flex flex-col">
                                    <span className="text-[7px] uppercase opacity-40">
                                      {k}
                                    </span>
                                    <span className="text-[10px] font-bold truncate">
                                      {String(v)}
                                    </span>
                                  </div>
                                ),
                            )}
                          </div>
                        </div>
                      )}

                      {msg.thoughts.plan && msg.thoughts.plan.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[8px] font-black uppercase tracking-widest text-indigo-500/50">
                            Plánované kroky
                          </div>
                          {msg.thoughts.plan.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="flex items-center gap-2 text-[10px] font-medium text-foreground/70"
                            >
                              <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                              {p}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-px bg-border/20" />

                  <div className="space-y-3">
                    <div className="text-[8px] font-black uppercase tracking-widest text-indigo-500/50">
                      Technická exekúcia
                    </div>
                    {msg.toolResults.map((step, tIdx) => (
                      <div key={tIdx} className="space-y-1.5 pt-3 first:pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {step.tool?.startsWith("gmail") ? (
                              <Mail className="w-3 h-3 text-indigo-400" />
                            ) : (
                              <Database className="w-3 h-3 text-violet-400" />
                            )}
                            <span className="text-[9px] font-black uppercase tracking-tight text-foreground/70">
                              {step.tool}
                            </span>
                          </div>
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              step.result?.success
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-rose-500/10 text-rose-500"
                            }`}
                          >
                            {step.result?.success ? "Success" : "Failed"}
                          </span>
                        </div>

                        <pre className="text-[10px] font-mono bg-black/20 p-3 rounded-xl overflow-x-auto text-indigo-300/80 border border-indigo-500/5">
                          {JSON.stringify(
                            step.result?.data || step.result,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
