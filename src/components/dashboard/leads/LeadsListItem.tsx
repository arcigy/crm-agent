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
   X,
   AlertCircle
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
  onToggleStar: (e: React.MouseEvent, email: GmailMessage) => void;
  onDeleteMessage: (e: React.MouseEvent, email: GmailMessage) => void;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent, id: string) => void;
}

// Optimization: Use memo to prevent re-renders when scrolling other parts of the UI
export const LeadsListItem = React.memo(({
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
  onToggleStar,
  onDeleteMessage,
  isSelected,
  onToggleSelection,
}: LeadsListItemProps) => {

  // Performance optimization: Pre-format date
  const formattedDate = React.useMemo(() => {
    const d = (item as any).date || (item as any).timestamp;
    if (!d) return "";
    try {
      return format(new Date(d), "d. M.", { locale: sk });
    } catch {
      return "";
    }
  }, [item]);

  if (item.itemType === "email") {
    const msg = item as unknown as GmailMessage;
    const isSpam = msg.classification?.intent === "spam";
    const isRead = msg.isRead;

    return (
      <React.Fragment>
        <div
          onClick={() => onOpenEmail(msg)}
          className={`group flex items-center h-[52px] px-10 border-b border-violet-500/[0.06] dark:border-violet-400/[0.08] cursor-pointer relative transition-all duration-200 ${
            !isRead 
              ? "bg-[#fdfdfe] dark:bg-zinc-700 z-10 shadow-sm" 
              : "bg-transparent dark:bg-transparent text-zinc-500/80 dark:text-zinc-500"
          } hover:bg-violet-50/60 dark:hover:bg-violet-900/10 hover:z-20 hover:shadow-sm`}
        >
          {/* Status Bar Indicator - Neon Violet & White */}
          <div 
            className={`absolute left-0 top-0 bottom-0 w-[6px] transition-all duration-300 z-30`} 
            style={{ 
              backgroundColor: !isRead ? '#FFFFFF' : '#d946ef',
              boxShadow: !isRead 
                ? '0 0 8px rgba(255,255,255,1), 2px 0 15px rgba(255,255,255,0.6), 4px 0 25px rgba(255,255,255,0.2)' 
                : '0 0 8px rgba(217, 70, 239, 1), 2px 0 15px rgba(217, 70, 239, 0.6), 4px 0 25px rgba(217, 70, 239, 0.2)',
              borderRight: !isRead ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(217, 70, 239, 0.5)'
            }}
          />

          {/* Controls */}
          <div className={`flex items-center gap-1 mr-4 flex-shrink-0 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleSelection?.(e, msg.id); }}
              className="p-1 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-all group/checkbox"
              title={isSelected ? "Zrušiť výber" : "Vybrať správu"}
            >
              {isSelected 
                ? <CheckSquare className="w-3.5 h-3.5 text-violet-600 drop-shadow-[0_0_5px_rgba(139,92,246,0.3)]" /> 
                : <Square className="w-3.5 h-3.5 text-zinc-400 group-hover/checkbox:text-violet-500 group-hover/checkbox:drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] transition-all" />
              }
            </button>
            <button 
              onClick={(e) => onToggleStar(e, msg)}
              className="p-1 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 rounded-lg transition-all group/star"
            >
              <Star className={`w-3.5 h-3.5 transition-all duration-300 ${msg.isStarred 
                ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" 
                : "text-zinc-400 group-hover/star:text-amber-400 group-hover/star:fill-amber-400/20 group-hover/star:drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"}`} 
              />
            </button>
          </div>

          {/* Sender */}
          <div className={`w-[180px] flex-shrink-0 truncate text-[13px] mr-4 tracking-tight ${!isRead ? "font-black text-black dark:text-white" : "font-bold text-zinc-500 dark:text-zinc-500"}`}>
            {msg.from?.split("<")[0].replace(/"/g, "") || "Neznámy"}
          </div>

          {/* Subject and Snippet */}
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex-1 truncate">
              <span className={`text-[13px] ${!isRead ? "font-black text-violet-950 dark:text-zinc-100" : "font-bold text-zinc-500 dark:text-zinc-500"}`}>
                {msg.subject}
              </span>
              <span className="text-[13px] text-zinc-300 dark:text-zinc-700 mx-2">|</span>
              <span className={`text-[12px] truncate font-semibold ${!isRead ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-500"}`}>
                {msg.snippet}
              </span>
            </div>

            {/* AI Badges */}
            {msg.classification && !isSpam && (
              <div className="flex items-center gap-1.5 flex-shrink-0 mr-4">
                {msg.classification.priority === "vysoka" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 dark:bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.1em] shadow-[0_4px_12px_rgba(220,38,38,0.25)] border border-red-400/20">
                    <AlertCircle className="w-3 h-3" />
                    <span>Súrne</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date and Hover Actions */}
          <div className="flex-shrink-0 ml-2 flex items-center gap-3 min-w-[70px] justify-end">
            <span className={`text-[11px] font-black group-hover:hidden transition-all tabular-nums tracking-tighter ${!isRead ? "text-violet-800 dark:text-violet-300" : "text-zinc-600 dark:text-zinc-500"}`}>
              {formattedDate}
            </span>

            <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleAction(e, msg.id); }}
                className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-all text-white shadow-lg shadow-violet-600/30 hover:scale-110 active:scale-95"
                title="AI Intelligence"
              >
                <Sparkles className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteMessage(e, msg); }}
                className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-all text-zinc-400 hover:text-violet-600 hover:scale-110 active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {isActionOpen && msg.classification && (
          <div className="z-20 relative">
            <LeadsActionPanel
              email={msg}
              isGeneratingDraft={isGeneratingDraft}
              customCommandMode={customCommandMode}
              customPrompt={customPrompt}
              panelTheme={{
                bg: "bg-transparent",
                iconBg: "bg-violet-600 text-white",
                button: "bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-600/30",
                text: "text-violet-950 dark:text-zinc-100",
                accent: "text-violet-600 dark:text-violet-400"
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

  return (
    <div className="group flex items-center px-10 py-4 border-b border-violet-500/[0.06] hover:bg-violet-50/60 dark:hover:bg-violet-900/10 transition-all cursor-pointer bg-white/40 dark:bg-transparent relative">
       {/* Android Indicator */}
       <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-violet-600/20" />
       
       <div className="w-[180px] flex-shrink-0 truncate text-[13px] font-black text-violet-800 dark:text-violet-400 mr-4">
        {(item as any).phone_number || "Neznámy odosielateľ"}
      </div>
      <div className="flex-1 truncate text-[13px] text-zinc-600 dark:text-zinc-400 font-bold">
        {(item as any).body || `Incoming Call (${(item as any).duration}s)`}
      </div>
      <div className="flex-shrink-0 ml-4 tabular-nums text-[11px] font-black text-violet-400/60">
        {formattedDate}
      </div>
    </div>
  );
});

LeadsListItem.displayName = "LeadsListItem";
