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
      className={`${panelTheme.bg} border-y relative overflow-hidden animate-in slide-in-from-top-2 duration-300`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="px-16 py-6 relative">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* LEFT: INTELLIGENCE CARD */}
          <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${panelTheme.iconBg}`}
                >
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${panelTheme.text} opacity-70`}
                >
                  Analýza Situácie
                </span>
              </div>
              <p
                className={`text-sm font-medium leading-relaxed ${panelTheme.text}`}
              >
                {email.classification.summary}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100/50 flex items-center gap-4">
              <button
                onClick={(e) => onSaveContact(e, email)}
                className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Uložiť kontakt
              </button>
              <div className="w-px h-3 bg-gray-300/50"></div>
              <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                <Calendar className="w-3.5 h-3.5" /> Naplánovať
              </button>
            </div>
          </div>

          {/* RIGHT: ACTION STRATEGY */}
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-0 border border-white/60 shadow-lg shadow-gray-200/20 overflow-hidden flex flex-col">
            {!customCommandMode ? (
              <>
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${panelTheme.iconBg}`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${panelTheme.accent}`}
                    >
                      Odporúčaná stratégia
                    </span>
                  </div>
                  <h3
                    className={`text-lg font-black leading-tight mb-1 ${panelTheme.text}`}
                  >
                    {email.classification.next_step}
                  </h3>
                </div>

                <div className="bg-white/50 border-t border-gray-100 p-3 flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onDraftReply(email)}
                      disabled={isGeneratingDraft}
                      className={`flex-1 ${panelTheme.button} h-12 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn`}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {isGeneratingDraft ? (
                          <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isGeneratingDraft
                          ? "Analyzujem..."
                          : "Vytvoriť Odpoveď"}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                    </button>

                    <button
                      onClick={(e) => onToggleAction(e, email.id)}
                      className="w-12 h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600 rounded-xl flex items-center justify-center transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setCustomCommandMode(true)}
                    className="w-full py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                  >
                    Chcem urobiť niečo iné...
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full bg-white/90">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                      Vlastný príkaz
                    </span>
                  </div>
                  <button
                    onClick={() => setCustomCommandMode(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3 flex-1 relative">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Napr: Zisti či mám voľno v utorok a navrhni termín..."
                    className="w-full h-full bg-transparent border-none outline-none text-sm text-gray-700 font-medium resize-none placeholder:text-gray-300 pr-10"
                    autoFocus
                  />
                  {/* Use a simple flex gap as spacer */}
                  <div className="absolute right-4 bottom-4 w-8 h-8" />
                </div>
                <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button
                    onClick={onExecuteCustomCommand}
                    disabled={isGeneratingDraft}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isGeneratingDraft ? (
                      <RefreshCcw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {isGeneratingDraft ? "Pracujem..." : "Vykonať"}
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
