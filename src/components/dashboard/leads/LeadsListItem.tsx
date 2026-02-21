"use client";

import * as React from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Star,
  Square,
  CheckSquare,
  MoreVertical,
  Paperclip,
  Zap,
  Trash2,
  Brain,
  Sparkles,
  X
} from "lucide-react";
import { GmailMessage } from "@/types/gmail";
import { AndroidLog } from "@/types/android";
import { LeadsActionPanel } from "./LeadsActionPanel";

interface LeadsListItemProps {
  item: (GmailMessage | AndroidLog) & { itemType: "email" | "android" };
  isActionOpen: boolean;
  isGeneratingDraft: boolean;
  customCommandMode: boolean;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  setCustomCommandMode: (mode: boolean) => void;
  onOpenEmail: (email: GmailMessage) => void;
  onToggleAction: (e: React.MouseEvent, id: string) => void;
  onManualAnalyze: (e: React.MouseEvent, email: GmailMessage) => void;
  onSaveContact: (e: React.MouseEvent, email: GmailMessage) => void;
  onDraftReply: (email: GmailMessage) => void;
  onExecuteCustomCommand: () => void;
}

export function LeadsListItem({
  item,
  isActionOpen,
  isGeneratingDraft,
  customCommandMode,
  customPrompt,
  setCustomPrompt,
  setCustomCommandMode,
  onOpenEmail,
  onToggleAction,
  onManualAnalyze,
  onSaveContact,
  onDraftReply,
  onExecuteCustomCommand,
}: LeadsListItemProps) {
  const [isStarred, setIsStarred] = React.useState(false);
  const [isSelected, setIsSelected] = React.useState(false);

  if (item.itemType === "email") {
    const msg = item as unknown as GmailMessage;
    const isSpam = msg.classification?.intent === "spam";
    const isRead = msg.isRead;

    return (
      <React.Fragment>
        <div
          onClick={() => onOpenEmail(msg)}
          className={`group flex items-center px-4 py-2 border-b border-[#f1f1f1] dark:border-white/5 cursor-pointer relative transition-colors ${
            !isRead 
              ? "bg-white dark:bg-zinc-900 border-l-[3px] border-l-blue-600 shadow-sm z-10" 
              : "bg-[#f2f6fc]/60 dark:bg-transparent text-[#444746] dark:text-zinc-400"
          } hover:shadow-md hover:bg-white dark:hover:bg-zinc-900`}
        >
          {/* Controls: Checkbox and Star */}
          <div className="flex items-center gap-2 mr-6 flex-shrink-0 opacity-30 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsSelected(!isSelected); }}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all text-muted-foreground"
            >
              {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsStarred(!isStarred); }}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all"
            >
              <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground group-hover:text-amber-400/50"}`} />
            </button>
          </div>

          {/* Sender */}
          <div className={`w-[200px] flex-shrink-0 truncate text-[14px] mr-4 tracking-tight ${!isRead ? "font-bold text-[#1f1f1f] dark:text-zinc-100" : "text-[#444746] dark:text-zinc-400"}`}>
            {msg.from || "Neznámy"}
          </div>

          {/* Subject and Snippet */}
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex-1 truncate">
              <span className={`text-[14px] ${!isRead ? "font-bold text-[#1f1f1f] dark:text-zinc-100" : "text-[#444746] dark:text-zinc-400"}`}>
                {msg.subject}
              </span>
              <span className="text-[14px] text-[#5f6368] mx-2">—</span>
              <span className="text-[14px] text-[#5f6368] dark:text-zinc-500 truncate">
                {msg.snippet}
              </span>
            </div>

            {/* AI Badges (Subtle but high contrast) */}
            {msg.classification && !isSpam && (
              <div className="flex items-center gap-1.5 flex-shrink-0 mr-4">
                {msg.classification.priority === "vysoka" && (
                  <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20">Vysoká</span>
                )}
                {msg.classification.estimated_budget && msg.classification.estimated_budget !== "—" && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                    {msg.classification.estimated_budget}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Date and Hover Actions */}
          <div className="flex-shrink-0 ml-4 flex items-center gap-4 min-w-[80px] justify-end">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500/60 group-hover:hidden transition-all italic`}>
              {msg.date ? format(new Date(msg.date), "d. M.", { locale: sk }) : ""}
            </span>
            
            <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleAction(e, msg.id); }}
                className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all text-indigo-400"
                title="AI Akcia"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              {!msg.classification && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onManualAnalyze(e, msg); }}
                  className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all text-indigo-400"
                  title="Analyzovať"
                >
                  <Brain className="w-4 h-4" />
                </button>
              )}
              <button className="p-2 hover:bg-red-500/10 rounded-xl transition-all text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isActionOpen && msg.classification && (
          <div className="px-12 py-6 bg-indigo-500/5 dark:bg-white/5 backdrop-blur-md border-b border-black/5 dark:border-white/5 animate-in slide-in-from-top-4 duration-300">
            <LeadsActionPanel
              email={msg}
              isGeneratingDraft={isGeneratingDraft}
              customCommandMode={customCommandMode}
              customPrompt={customPrompt}
              panelTheme={{
                bg: "bg-transparent",
                iconBg: "bg-indigo-500/10 text-indigo-600",
                button: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20",
                text: "text-foreground",
                accent: "text-indigo-600"
              }}
              setCustomPrompt={setCustomPrompt}
              setCustomCommandMode={setCustomCommandMode}
              onSaveContact={onSaveContact}
              onDraftReply={onDraftReply}
              onExecuteCustomCommand={onExecuteCustomCommand}
              onToggleAction={onToggleAction}
            />
          </div>
        )}
      </React.Fragment>
    );
  }

  // Handle Android Log (SMS/Calls) in similar style
  return (
    <div className="group flex items-center px-4 py-2 border-b border-black/5 hover:bg-black/5 transition-all cursor-pointer bg-white/40">
       <div className="w-[200px] flex-shrink-0 truncate text-sm font-bold text-[#444746] mr-4 ml-10">
        {(item as any).phone_number || "Neznáme"}
      </div>
      <div className="flex-1 truncate text-sm text-[#444746]">
        {(item as any).body || `Hovor (${(item as any).duration}s)`}
      </div>
      <div className="flex-shrink-0 ml-4">
        <span className="text-[11px] font-bold text-[#444746]">
          {(item as any).timestamp ? format(new Date((item as any).timestamp), "d. M.", { locale: sk }) : ""}
        </span>
      </div>
    </div>
  );
}
