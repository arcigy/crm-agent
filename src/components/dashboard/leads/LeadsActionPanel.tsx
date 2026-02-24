"use client";

import * as React from "react";
import {
  Brain,
  UserPlus,
  Calendar,
  Zap,
  Sparkles,
  X,
  RefreshCcw,
  Lightbulb,
  ArrowRight,
  MessageSquareText,
  Target,
  TrendingUp,
  Cpu,
} from "lucide-react";

import { GmailMessage } from "@/types/gmail";

interface LeadsActionPanelProps {
  email: GmailMessage;
  isGeneratingDraft: boolean;
  customCommandMode: boolean;
  customPrompt: string;
  panelTheme: any;
  setCustomPrompt: (prompt: string) => void;
  setCustomCommandMode: (mode: boolean) => void;
  onSaveContact: (e: React.MouseEvent, email: GmailMessage) => void;
  onDraftReply: (email: GmailMessage) => void;
  onExecuteCustomCommand: () => void;
  onToggleAction: (e: React.MouseEvent, id: string) => void;
}

export function LeadsActionPanel({
  email,
  isGeneratingDraft,
  customCommandMode,
  customPrompt,
  panelTheme,
  setCustomPrompt,
  setCustomCommandMode,
  onSaveContact,
  onDraftReply,
  onExecuteCustomCommand,
  onToggleAction,
}: LeadsActionPanelProps) {
  if (!email.classification) return null;

  return (
    <div
      className="bg-[#fcfaff] dark:bg-black/40 border-y border-violet-100 dark:border-white/5 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="max-w-[98%] mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* LEFT COMMAND CARD: Intelligence & Insights */}
          <div className="bg-gradient-to-br from-white to-violet-50/10 dark:from-zinc-900 dark:to-violet-900/5 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] border border-black/[0.03] dark:border-white/5 overflow-hidden flex flex-col min-h-[420px]">
            <div className="p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600/70 dark:text-violet-400">Intelligence Core</h4>
                    <span className="text-[9px] font-bold text-violet-300 uppercase tracking-widest">Real-time Analysis</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <MessageSquareText className="w-5 h-5 text-violet-400 mt-1 flex-shrink-0" />
                    <p className="text-[20px] font-black leading-tight text-violet-950 dark:text-white italic">
                      "{email.classification.summary}"
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-8">
                  {/* Neon Integrated Badges */}
                  <div className="px-4 py-1.5 bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_6px_15px_rgba(99,102,241,0.4)] border border-white/20 flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_10px_20px_rgba(99,102,241,0.6)] cursor-default">
                    <Target className="w-3.5 h-3.5" /> {email.classification.intent || "Lead"}
                  </div>
                  
                  {email.classification.estimated_budget && email.classification.estimated_budget !== "—" && (
                    <div className="px-4 py-1.5 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_6px_15px_rgba(16,185,129,0.3)] border border-white/20 flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_10px_20px_rgba(16,185,129,0.5)] cursor-default">
                      <Zap className="w-3.5 h-3.5" /> {email.classification.estimated_budget}
                    </div>
                  )}

                  {email.classification.service_category && email.classification.service_category !== "—" && (
                    <div className="px-4 py-1.5 bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_6px_15px_rgba(244,63,94,0.3)] border border-white/20 flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_10px_20px_rgba(244,63,94,0.5)] cursor-default">
                      <TrendingUp className="w-3.5 h-3.5" /> {email.classification.service_category}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 mt-auto flex items-center gap-8">
              <button onClick={(e) => onSaveContact(e, email)} className="flex items-center gap-3 text-[11px] font-black text-violet-600/60 hover:text-violet-600 transition-all uppercase tracking-widest group">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-violet-600/20">
                  <UserPlus className="w-4 h-4" />
                </div>
                CRM Sync
              </button>
              <button className="flex items-center gap-3 text-[11px] font-black text-violet-600/60 hover:text-violet-600 transition-all uppercase tracking-widest group">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-violet-600/20">
                  <Calendar className="w-4 h-4" />
                </div>
                Booking
              </button>
            </div>
          </div>

          {/* RIGHT COMMAND CARD: Agent Execution */}
          <div className="bg-gradient-to-br from-white to-violet-50/10 dark:from-zinc-900 dark:to-violet-900/5 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] border border-black/[0.03] dark:border-white/5 overflow-hidden flex flex-col min-h-[420px] transform-gpu">
            {!customCommandMode ? (
              <>
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600/70 dark:text-violet-400">Agent Command</h4>
                        <span className="text-[9px] font-bold text-violet-300 uppercase tracking-widest">Active Strategy</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                       <Lightbulb className="w-5 h-5 text-amber-500" />
                       <span className="text-[11px] font-black text-violet-400 uppercase tracking-widest">Decision Logic</span>
                    </div>
                    
                    <h3 className="text-[26px] font-black leading-tight text-violet-950 dark:text-white italic mb-10">
                      {email.classification.next_step}
                    </h3>

                    <button 
                      onClick={() => onDraftReply(email)}
                      className="flex items-center gap-3 text-violet-600 dark:text-violet-400 font-black text-sm uppercase tracking-widest hover:translate-x-2 transition-transform"
                    >
                      Smart Draft Engine <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-8 pt-0 flex flex-col gap-4">
                  <div className="flex gap-4">
                    <button
                      onClick={() => onDraftReply(email)}
                      disabled={isGeneratingDraft}
                      className="flex-1 h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-[0_12px_24px_rgba(139,92,246,0.3)] active:scale-95 transition-all flex items-center justify-center gap-4 border border-violet-500/50"
                    >
                      {isGeneratingDraft ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {isGeneratingDraft ? "Writing..." : "Execute Smart Draft"}
                    </button>

                    <button
                      onClick={(e) => onToggleAction(e, email.id)}
                      className="w-14 h-14 bg-white dark:bg-zinc-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-black/[0.03] dark:border-white/5 text-zinc-400 hover:text-violet-600 rounded-2xl flex items-center justify-center transition-all group"
                    >
                      <X className="w-6 h-6 transition-transform group-hover:rotate-90 group-hover:text-violet-600" />
                    </button>
                  </div>
                  <button
                    onClick={() => setCustomCommandMode(true)}
                    className="text-[10px] font-black text-violet-400 hover:text-violet-600 uppercase tracking-[0.2em] text-center transition-colors"
                  >
                    Custom Agent Instruction
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">Custom Neural Command</span>
                  </div>
                  <button onClick={() => setCustomCommandMode(false)} className="p-2 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-full transition-colors group">
                    <X className="w-5 h-5 text-zinc-400 group-hover:text-violet-600" />
                  </button>
                </div>
                <div className="p-10 flex-1">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Input direct agent instructions..."
                    className="w-full h-full bg-transparent border-none outline-none text-[22px] font-black text-violet-950 dark:text-white placeholder:text-violet-200 resize-none font-sans"
                    autoFocus
                  />
                </div>
                <div className="p-8 pt-0 flex justify-end">
                  <button
                    onClick={onExecuteCustomCommand}
                    disabled={isGeneratingDraft}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(139,92,246,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingDraft ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Deploy Command"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
