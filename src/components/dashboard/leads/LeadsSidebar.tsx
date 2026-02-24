"use client";

import * as React from "react";
import { 
  Inbox, 
  Star, 
  Clock, 
  Send, 
  File, 
  Tag, 
  ChevronDown, 
  ChevronUp,
  Plus,
  PenLine,
  Archive,
  AlertOctagon,
  Trash2
} from "lucide-react";

interface LeadsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: any) => void;
  unreadCount?: number;
  draftCount?: number;
  onCompose: () => void;
  customTags?: string[];
  tagColors?: Record<string, string>;
  onManageTags?: () => void;
}

export function LeadsSidebar({ selectedTab, onTabChange, unreadCount = 0, draftCount = 0, onCompose, customTags = [], tagColors = {}, onManageTags }: LeadsSidebarProps) {
  const [isMoreExpanded, setIsMoreExpanded] = React.useState(false);

  const mainItems = [
    { id: "all", label: "Doručené", icon: Inbox, count: unreadCount > 0 ? unreadCount.toLocaleString() : "" },
    { id: "starred", label: "S hviezdičkou", icon: Star },
    { id: "snoozed", label: "Odložené", icon: Clock },
    { id: "sent", label: "Odoslané", icon: Send },
    { id: "drafts", label: "Koncepty", icon: File, count: draftCount > 0 ? draftCount.toString() : "" },
  ];

  const moreItems = [
    { id: "shopping", label: "Nákupy", icon: Tag },
    { id: "archive", label: "Archív", icon: Archive },
    { id: "spam", label: "Spam", icon: AlertOctagon },
    { id: "trash", label: "Kôš", icon: Trash2 },
  ];

  return (
    <div
      className="w-full flex flex-col h-full overflow-y-auto relative"
      style={{
        background: "#000000",
      }}
    >

      {/* Compose Button */}
      <div className="px-3 pt-5 pb-4 relative z-10">
        <button
          onClick={onCompose}
          className="w-full flex items-center gap-3 px-6 py-4 rounded-[1.2rem] text-sm font-black tracking-wider transition-all duration-300 group relative overflow-hidden hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.25) 100%)",
            border: "1.5px solid rgba(167,139,250,0.5)",
            boxShadow: "0 8px 30px rgba(124,58,237,0.25), inset 0 1px 0 rgba(196,181,253,0.25)",
            color: "rgba(255,255,255,0.95)"
          }}
        >
          {/* Hover sweep */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.4) 0%, transparent 80%)" }}
          />
          <PenLine className="w-5 h-5 flex-shrink-0 relative z-10" style={{ color: "rgba(196,181,253,1)" }} />
          <span className="uppercase tracking-[0.16em] text-[12px] relative z-10">Napísať</span>
        </button>
      </div>

      {/* Marble divider */}
      <div
        className="mx-4 mb-3 h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
      />

      {/* Main Navigation */}
      <div className="px-2 flex-1 relative z-10">
        {mainItems.map((item) => (
          <SidebarButton
            key={item.id}
            item={item}
            isActive={selectedTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}

        {/* More Toggle */}
        <button
          onClick={() => setIsMoreExpanded(!isMoreExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] transition-all duration-200 group mb-0.5 relative overflow-hidden bg-transparent border border-transparent text-white/40"
        >
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 100%)" }} />
          <div className="flex items-center gap-3">
            {isMoreExpanded ? (
              <ChevronUp className="w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:text-violet-400" />
            ) : (
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:text-violet-400" />
            )}
            <span className="tracking-wide font-medium text-white/40 group-hover:text-violet-300 transition-colors">
              {isMoreExpanded ? "Menej" : "Ďalšie"}
            </span>
          </div>
        </button>

        {/* Expanded Items */}
        {isMoreExpanded && (
          <div className="mt-1 animate-in slide-in-from-top-2 fade-in duration-200">
            {moreItems.map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={selectedTab === item.id}
                onClick={() => onTabChange(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Labels Section */}
      <div className="px-4 py-4 relative z-10">
        <div
          className="h-[1px] mb-4"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
        />
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40"
            >
              Moje Štítky
            </span>
          </div>
          <button
            onClick={onManageTags}
            title="Spravovať štítky"
            className="p-1.5 rounded-xl transition-all duration-300 hover:bg-violet-500/10 text-white/30 hover:text-violet-400 group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          </button>
        </div>
        <div className="mt-2 -mx-2">
          {customTags.map((tag) => (
             <SidebarButton
               key={`tag:${tag}`}
               item={{ id: `tag:${tag}`, label: tag, icon: Tag }}
               isActive={selectedTab === `tag:${tag}`}
               onClick={() => onTabChange(`tag:${tag}`)}
               color={tagColors[tag]}
             />
          ))}
          {customTags.length === 0 && (
             <div className="text-[11px] text-white/30 px-3 py-2 italic font-medium">Žiadne štítky, začnite pridaním cez +</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for sidebar buttons to avoid repetition
function SidebarButton({ item, isActive, onClick, color }: { item: any; isActive: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] transition-all duration-200 group mb-0.5 relative overflow-hidden"
      style={isActive ? {
        background: color 
          ? `linear-gradient(135deg, ${color}4d 0%, ${color}33 100%)` 
          : "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(109,40,217,0.2) 100%)",
        border: color 
          ? `1.5px solid ${color}66` 
          : "1.5px solid rgba(167,139,250,0.4)",
        boxShadow: color 
          ? `0 4px 16px ${color}33, inset 0 1px 0 rgba(255,255,255,0.1)` 
          : "0 4px 16px rgba(124,58,237,0.2), inset 0 1px 0 rgba(196,181,253,0.2)",
        color: "rgba(255,255,255,0.95)"
      } : {
        background: "transparent",
        border: "1px solid transparent",
        color: "rgba(255,255,255,0.4)"
      }}
    >
      {/* Hover gloss */}
      {!isActive && (
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 100%)" }}
        />
      )}

      {/* Active gloss highlight at top */}
      {isActive && (
        <div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
        />
      )}

      {/* Active left indicator */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] rounded-r-full"
          style={{ background: color || "linear-gradient(180deg, #a78bfa, #7c3aed)" }}
        />
      )}

      <div className="flex items-center gap-3">
        {color && !isActive ? (
          <div 
            className="w-2.5 h-2.5 rounded-full shadow-sm ml-0.5 mr-0.5" 
            style={{ backgroundColor: color }} 
          />
        ) : (
          <item.icon
            className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${!isActive ? 'group-hover:text-violet-400' : ''}`}
            style={{ color: isActive ? (color || "#c4b5fd") : undefined }}
          />
        )}
        <span className={`tracking-wide ${isActive ? "font-bold text-white" : "font-semibold text-white/50 group-hover:text-violet-300 transition-colors"}`}>
          {item.label}
        </span>
      </div>

      {item.count && (
        <span
          className="text-[11px] font-black tabular-nums px-2 py-0.5 rounded-full"
          style={{
            background: isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
            color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          }}
        >
          {item.count}
        </span>
      )}
    </button>
  );
}
