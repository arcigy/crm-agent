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
   AlertCircle,
   Tag,
   RotateCcw
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
  onRestoreMessage?: (e: React.MouseEvent, email: GmailMessage) => void;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent, id: string) => void;
  tags?: string[];
  onToggleTag?: (e: React.MouseEvent, msg: GmailMessage) => void;
  gmailLabels?: { id: string, name: string, color?: string, type?: string }[];
}

// Darken a hex color by multiplying each channel by `factor` (0 = black, 1 = unchanged)
function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('')}`;
}

// Hex color to rgba string with alpha
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
  onRestoreMessage,
  isSelected,
  onToggleSelection,
  tags = [],
  onToggleTag,
  gmailLabels = []
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

    // Priority order: NALIEHAVÉ > URGENTNÉ > any other tag
    const PRIORITY_TAGS = ["NALIEHAVÉ", "URGENTNÉ"];
    const priorityTag = PRIORITY_TAGS.find(t => tags.includes(t)) ?? null;
    const baseColor = priorityTag ? (msg.googleLabelColors?.[priorityTag] || null) : null;

    // Status bar color: unread = vivid, read = darker solid
    const barColor  = baseColor
      ? (!isRead ? baseColor : darkenHex(baseColor, 0.35))
      : (!isRead ? '#FFFFFF' : '#aaaaaa');
    const barOpacity = (!baseColor && isRead) ? 0.18 : 1;
    const barGlow   = `0 0 8px ${barColor}, 2px 0 15px ${hexToRgba(barColor.slice(0,7), 0.6)}, 4px 0 25px ${hexToRgba(barColor.slice(0,7), 0.25)}`;

    // Row background tint
    const rowBg = baseColor
      ? (!isRead ? hexToRgba(baseColor, 0.12) : hexToRgba(baseColor, 0.04))
      : undefined;
    const rowBgHover = baseColor
      ? (!isRead ? hexToRgba(baseColor, 0.18) : hexToRgba(baseColor, 0.07))
      : undefined;
    const rowBorderColor = baseColor ? hexToRgba(baseColor, 0.25) : undefined;

    return (
      <React.Fragment>
        <div
          onClick={() => onOpenEmail(msg)}
          className={`group flex items-center min-h-[52px] py-1 px-10 border-b cursor-pointer relative transition-all duration-200 hover:z-20 hover:shadow-sm ${
            !baseColor
              ? (!isRead
                ? "bg-[#fdfdfe] dark:bg-zinc-700 border-violet-500/[0.06] dark:border-violet-400/[0.08] z-10 shadow-sm hover:bg-violet-50/60 dark:hover:bg-violet-900/10"
                : "bg-transparent dark:bg-transparent text-zinc-500/80 dark:text-zinc-500 border-violet-500/[0.06] dark:border-violet-400/[0.08] hover:bg-violet-50/60 dark:hover:bg-violet-900/10")
              : ""
          }`}
          style={baseColor ? {
            backgroundColor: rowBg,
            borderColor: rowBorderColor
          } : undefined}
        >
          {/* Status Bar Indicator — dynamic color from tagColors */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-[6px] transition-all duration-300 z-30"
            style={{ 
              backgroundColor: barColor,
              opacity: barOpacity,
              boxShadow: barOpacity === 1 ? barGlow : undefined,
              borderRight: `1px solid ${hexToRgba(barColor.slice(0,7), 0.5 * barOpacity)}`
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
          <div className={`w-[220px] flex-shrink-0 truncate text-[13px] mr-4 tracking-tight ${!isRead ? "font-black text-black dark:text-white" : "font-bold text-zinc-500 dark:text-zinc-500"}`}>
            {(() => {
              const name = msg.from?.split("<")[0].replace(/"/g, "").trim() || "Neznámy";
              const email = msg.from?.match(/<(.+)>/)?.[1] || (msg.from?.includes('@') ? msg.from : '');
              return (
                <>
                  <span>{name}</span>
                  {email && email !== name && (
                    <span className="ml-2 text-[10px] font-medium text-zinc-400/60 dark:text-zinc-500/50 lowercase">
                      {email}
                    </span>
                  )}
                </>
              );
            })()}
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
              
              {/* Attachment indicators */}
              <div className="flex items-center gap-2 ml-2">
                {msg.hasAttachments && (
                  <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                )}
                {(msg as any).drive_files_count > 0 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20">
                    <Paperclip className="w-3 h-3 text-violet-500" />
                    <span className="text-[10px] font-black text-violet-500">{(msg as any).drive_files_count}</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Badges */}
            {msg.classification && !isSpam && (
              <div className="flex items-center gap-1.5 flex-shrink-0 mr-4">
                {/* Priorita skrytá na žiadosť používateľa */}
              </div>
            )}
          </div>

          {/* Gmail Labels — Displaying names and colors from DB */}
          {msg.labels && msg.labels.length > 0 && (
            <div className="flex items-center gap-1.5 ml-4 mr-6 flex-shrink-0 justify-end max-w-[200px] flex-wrap">
              {msg.labels
                .filter((l: any) => !['INBOX', 'UNREAD', 'STARRED', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'].includes(l.id.toUpperCase()))
                .slice(0, 3)
                .map((label: any) => {
                  const displayLabel = label.name.replace(/^CRM\//, '');
                  const color = label.colorBg || "#8e63ce";
                  
                  return (
                    <span
                      key={label.id}
                      className="px-2 py-[2px] rounded-md text-[9px] font-black tracking-widest uppercase border whitespace-nowrap transition-all duration-300"
                      style={{ 
                        borderColor: `${color}40`,
                        backgroundColor: `${color}15`,
                        color: color,
                        textShadow: `0 0 8px ${color}60`
                      }}
                    >
                      {displayLabel}
                    </span>
                  );
                })}

              {msg.labels?.filter((l: any) => !['INBOX', 'UNREAD', 'STARRED', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'].includes(l.id.toUpperCase())).length > 3 && (
                <span className="text-[9px] font-black text-white/30">...</span>
              )}
            </div>
          )}

          {/* Date + floating action buttons on hover - fixed width, no shift */}
          <div className="relative flex-shrink-0 ml-2 flex items-center justify-end" style={{ width: "68px" }}>
            {/* Date - hidden when hovering */}
            <span className={`text-[11px] font-black group-hover:opacity-0 tabular-nums tracking-tighter transition-opacity duration-150 ${!isRead ? "text-violet-800 dark:text-violet-300" : "text-zinc-600 dark:text-zinc-500"}`}>
              {formattedDate}
            </span>

            {/* Action buttons - absolute, float over the date area */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 animate-in fade-in duration-150">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleAction(e, msg.id); }}
                className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-all text-white shadow-lg shadow-violet-600/30 hover:scale-110 active:scale-95"
                title="AI Intelligence"
              >
                <Sparkles className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleTag?.(e, msg); }}
                className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-all text-zinc-400 hover:text-violet-600 hover:scale-110 active:scale-95"
                title="Pridať štítok"
              >
                <Tag className="w-3 h-3" />
              </button>
              {msg.labels?.includes("TRASH") ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRestoreMessage?.(e, msg); }}
                  className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-all text-zinc-400 hover:text-green-600 hover:scale-110 active:scale-95"
                  title="Obnoviť z koša"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteMessage(e, msg); }}
                  className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-all text-zinc-400 hover:text-violet-600 hover:scale-110 active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
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
