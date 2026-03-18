"use client";

import * as React from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Star, Paperclip, MessageSquare } from "lucide-react";

interface ThreadListItemProps {
  item: {
    id: string;
    subject: string;
    from: string;
    from_name: string;
    snippet: string;
    date: string;
    hasUnread: boolean;
    isStarred: boolean;
    message_count: number;
    participants: string[];
    labels: string[];
  };
  isSelected: boolean;
  onToggleSelection: (e: React.MouseEvent, id: string) => void;
  onOpenThread: (threadId: string) => void;
  tags?: string[];
  gmailLabels?: { id: string, name: string, color?: string, type?: string }[];
}

export const ThreadListItem = React.memo(({
  item,
  isSelected,
  onToggleSelection,
  onOpenThread,
  tags = [],
  gmailLabels = []
}: ThreadListItemProps) => {

  const formattedDate = React.useMemo(() => {
    if (!item.date) return "";
    try {
      return format(new Date(item.date), "d. M.", { locale: sk });
    } catch {
      return "";
    }
  }, [item.date]);

  const participantString = React.useMemo(() => {
    const list = item.participants.filter(Boolean);
    if (list.length <= 1) return item.from_name || item.from.split('@')[0];
    const unique = Array.from(new Set(list));
    if (unique.length > 3) {
      return `${unique.slice(0, 2).join(", ")} + ${unique.length - 2}`;
    }
    return unique.join(", ");
  }, [item.participants, item.from_name, item.from]);

  return (
    <div 
      onClick={() => onOpenThread(item.id)}
      className={`group relative flex items-center px-4 py-3 cursor-pointer border-b border-black/[0.03] dark:border-white/[0.03] transition-all hover:bg-violet-50/50 dark:hover:bg-violet-900/10 ${item.hasUnread ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/30 dark:bg-zinc-900/30'} ${isSelected ? 'bg-violet-100/50 dark:bg-violet-900/30' : ''}`}
    >
      {/* Checkbox */}
      <div 
        onClick={(e) => onToggleSelection(e, item.id)}
        className="mr-3 p-1 rounded hover:bg-violet-200/50 dark:hover:bg-violet-800/50 transition-colors"
      >
        <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-zinc-300 dark:border-zinc-700'}`}>
          {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
        </div>
      </div>

      {/* Star */}
      <div className="mr-3">
        <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`} />
      </div>

      {/* Participants */}
      <div className={`w-48 shrink-0 truncate text-sm px-2 ${item.hasUnread ? 'font-black text-[#1f1f1f] dark:text-white' : 'font-medium text-zinc-600 dark:text-zinc-400'}`}>
        {participantString}
        {item.message_count > 1 && (
          <span className="ml-2 text-[11px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-md font-bold text-zinc-500">
            {item.message_count}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] truncate ${item.hasUnread ? 'font-black text-[#1f1f1f] dark:text-white' : 'font-semibold text-zinc-700 dark:text-zinc-300'}`}>
            {item.subject || "(Bez predmetu)"}
          </span>
          {/* Tags — Human names and colors from DB */}
          <div className="flex gap-1">
             {(item.labels || [])
               .filter((l: any) => typeof l === 'object' && !['INBOX', 'UNREAD', 'STARRED', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'].includes(l.id.toUpperCase()))
               .slice(0, 2)
               .map((label: any) => {
                 const name = label.name.replace(/^CRM\//, '');
                 const bgColor = label.colorBg || "#8e63ce";
                 return (
                   <span 
                     key={label.id} 
                     className="px-1.5 py-0.5 text-white text-[9px] font-black rounded uppercase"
                     style={{ backgroundColor: bgColor }}
                   >
                     {name}
                   </span>
                 );
               })}
          </div>
        </div>
        <span className="text-[12px] text-zinc-500 dark:text-zinc-500 truncate font-medium">
          {item.snippet}
        </span>
      </div>

      {/* Date */}
      <div className="ml-4 shrink-0 text-[11px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-tighter w-12 text-right">
        {formattedDate}
      </div>
    </div>
  );
});

ThreadListItem.displayName = "ThreadListItem";
