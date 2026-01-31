"use client";

import * as React from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Zap,
  TrendingUp,
  Target,
  Trash2,
  X,
  Sparkles,
  Brain,
  RefreshCcw,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  MessageSquare,
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
  if (item.itemType === "email") {
    const msg = item as unknown as GmailMessage;
    const isSpam = msg.classification?.intent === "spam";

    // New Radial Gradient System
    let priorityColor = "hover:bg-gray-50";
    let borderColor = "border-transparent border-b-gray-50";

    if (isSpam) {
      priorityColor =
        "bg-gray-100/80 grayscale opacity-60 hover:opacity-100 hover:bg-gray-200/50 transition-all";
      borderColor = "border border-gray-200";
    } else if (msg.classification?.priority === "vysoka") {
      priorityColor =
        "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-300 via-red-200/60 to-transparent shadow-[inset_0_0_40px_rgba(239,68,68,0.25)]";
      borderColor = "border border-red-400/60";
    } else if (msg.classification?.priority === "stredna") {
      priorityColor =
        "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300 via-amber-200/60 to-transparent shadow-[inset_0_0_40px_rgba(245,158,11,0.25)]";
      borderColor = "border border-amber-400/60";
    } else {
      priorityColor =
        "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-200 via-blue-100/50 to-transparent shadow-[inset_0_0_40px_rgba(59,130,246,0.15)]";
      borderColor = "border border-blue-300/50";
    }

    const readStyle = !msg.isRead ? "" : "opacity-95";

    const panelTheme = isSpam
      ? {
          bg: "bg-gray-50 border-gray-200",
          iconBg: "bg-gray-200 text-gray-500",
          button: "bg-gray-700 hover:bg-gray-800",
          text: "text-gray-600",
        }
      : msg.classification?.priority === "vysoka"
        ? {
            bg: "bg-gradient-to-r from-red-50/80 to-white border-red-100",
            iconBg: "bg-red-100 text-red-600 border-red-200",
            button: "bg-red-600 hover:bg-red-700 text-white",
            text: "text-gray-900",
            accent: "text-red-700",
          }
        : msg.classification?.priority === "stredna"
          ? {
              bg: "bg-gradient-to-r from-amber-50/80 to-white border-amber-100",
              iconBg: "bg-amber-100 text-amber-600 border-amber-200",
              button: "bg-amber-600 hover:bg-amber-700 text-white",
              text: "text-gray-900",
              accent: "text-amber-700",
            }
          : {
              bg: "bg-gradient-to-r from-blue-50/80 to-white border-blue-100",
              iconBg: "bg-blue-100 text-blue-600 border-blue-200",
              button: "bg-gray-900 hover:bg-black text-white",
              text: "text-gray-900",
              accent: "text-blue-700",
            };

    return (
      <React.Fragment>
        <div
          onClick={() => onOpenEmail(msg)}
          className={`group flex items-center gap-6 px-6 py-4 transition-all cursor-pointer relative
                                    ${readStyle} ${priorityColor} ${borderColor}
                                    ${isActionOpen ? "brightness-[0.98] shadow-inner" : ""}`}
        >
          <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-sm font-black text-foreground/60 shadow-sm group-hover:scale-105 transition-transform">
            {msg.from.substring(0, 1).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2">
              <span
                className={`text-sm truncate block ${!msg.isRead ? "font-black text-foreground" : "font-bold text-foreground/80"}`}
              >
                {msg.from}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                {format(new Date(msg.date), "d. MMM HH:mm", { locale: sk })}
              </span>
            </div>

            <div className="col-span-4">
              <h4
                className={`text-sm truncate mb-0.5 ${!msg.isRead ? "font-black text-foreground" : "font-medium text-foreground/90"}`}
              >
                {msg.subject}
              </h4>
              <p className="text-xs text-gray-500 truncate font-medium">
                {msg.snippet}
              </p>
            </div>

            <div className="col-span-6 flex justify-end items-center gap-2">
              {msg.classification ? (
                <div className="flex items-center gap-2">
                  {msg.classification.estimated_budget &&
                    msg.classification.estimated_budget !== "—" &&
                    msg.classification.estimated_budget !== "Neznámy" && (
                      <div className="hidden lg:flex px-2 py-1 rounded-lg bg-white/60 border border-gray-200 text-gray-700 items-center gap-1.5 shadow-sm">
                        <Zap className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-wide">
                          {msg.classification.estimated_budget}
                        </span>
                      </div>
                    )}

                  {msg.classification.service_category &&
                    msg.classification.service_category !== "—" && (
                      <div className="hidden xl:flex px-2 py-1 rounded-lg bg-white/60 border border-gray-200 text-gray-600 items-center gap-1.5 shadow-sm">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px]">
                          {msg.classification.service_category}
                        </span>
                      </div>
                    )}

                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-sm bg-white/80 border-gray-200 text-gray-700`}
                  >
                    {isSpam ? (
                      <Trash2 className="w-3.5 h-3.5" />
                    ) : (
                      <Target className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {isSpam ? "SPAM" : msg.classification.intent}
                    </span>
                  </div>

                  <button
                    onClick={(e) => onToggleAction(e, msg.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActionOpen ? "bg-gray-900 text-white shadow-lg rotate-180" : "bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200"}`}
                  >
                    {isActionOpen ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => onManualAnalyze(e, msg)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 group/btn"
                >
                  {msg.isAnalyzing ? (
                    <RefreshCcw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Brain className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Analyzovať
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {isActionOpen && msg.classification && (
          <LeadsActionPanel
            email={msg}
            isGeneratingDraft={isGeneratingDraft}
            customCommandMode={customCommandMode}
            customPrompt={customPrompt}
            panelTheme={panelTheme}
            setCustomPrompt={setCustomPrompt}
            setCustomCommandMode={setCustomCommandMode}
            onSaveContact={onSaveContact}
            onDraftReply={onDraftReply}
            onExecuteCustomCommand={onExecuteCustomCommand}
            onToggleAction={onToggleAction}
          />
        )}
      </React.Fragment>
    );
  } else {
    const log = item as unknown as AndroidLog;
    const isCall = log.type === "call";
    const isMissed = log.direction === "missed" || log.direction === "rejected";

    return (
      <div
        key={log.id}
        className="group flex items-center gap-6 px-6 py-4 hover:bg-gray-50 transition-all cursor-pointer border-l-[3px] border-transparent"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isCall ? (isMissed ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600") : "bg-indigo-50 text-indigo-600"}`}
        >
          {isCall ? (
            log.direction === "incoming" ? (
              <PhoneIncoming className="w-5 h-5" />
            ) : log.direction === "outgoing" ? (
              <PhoneOutgoing className="w-5 h-5" />
            ) : (
              <PhoneMissed className="w-5 h-5" />
            )
          ) : (
            <MessageSquare className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-black text-gray-900 tracking-tight">
              {log.phone_number}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {format(new Date(log.timestamp), "d. MMM HH:mm", { locale: sk })}
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 truncate">
            {isCall ? `Hovor (${log.duration}s)` : log.body}
          </p>
        </div>
      </div>
    );
  }
}
