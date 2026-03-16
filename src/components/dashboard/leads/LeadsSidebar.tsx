"use client";

import * as React from "react";
import { 
  Inbox, 
  Star, 
  Clock, 
  Send, 
  FileEdit, 
  Tag, 
  ChevronDown, 
  ChevronUp,
  Plus,
  PenLine,
  Archive,
  AlertOctagon,
  Trash2,
  ShoppingBag
} from "lucide-react";

interface LeadsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: any) => void;
  unreadCount?: number;
  draftCount?: number;
  onCompose: () => void;
  gmailLabels?: any[];
  inboxStats?: Record<string, { total: number, unread: number }>;
  onManageTags?: React.Dispatch<React.SetStateAction<void>>;
}

export function LeadsSidebar({ selectedTab, onTabChange, unreadCount = 0, draftCount = 0, onCompose, gmailLabels = [], inboxStats, onManageTags }: LeadsSidebarProps) {
  const [isMoreExpanded, setIsMoreExpanded] = React.useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = React.useState(false);

  const mainItems = [
    { id: "inbox", label: "Doručené", icon: Inbox, count: (inboxStats?.['inbox']?.unread || unreadCount) > 0 ? (inboxStats?.['inbox']?.unread || unreadCount).toLocaleString() : "" },
    { id: "starred", label: "S hviezdičkou", icon: Star, count: inboxStats?.['starred']?.total ? inboxStats['starred'].total.toLocaleString() : "" },
    { id: "snoozed", label: "Odložené", icon: Clock },
    { id: "sent", label: "Odoslané", icon: Send },
    { id: "drafts", label: "Koncepty", icon: FileEdit, count: (inboxStats?.['draft']?.total || draftCount) > 0 ? (inboxStats?.['draft']?.total || draftCount).toString() : "" },
  ];

  const moreItems = [
    { id: "purchases", label: "Nákupy", icon: ShoppingBag },
    { id: "archive", label: "Archív", icon: Archive },
    { id: "trash", label: "Kôš", icon: Trash2, count: inboxStats?.['trash']?.total ? inboxStats['trash'].total.toString() : "" },
    { id: "spam", label: "Spam", icon: AlertOctagon, count: inboxStats?.['spam']?.total ? inboxStats['spam'].total.toString() : "" },
  ];


  return (
    <div
      className="w-full flex flex-col h-full overflow-y-auto thin-scrollbar relative bg-transparent"
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
              <ChevronUp className="w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:text-white" />
            ) : (
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-all duration-200 group-hover:text-white" />
            )}
            <span className="tracking-wide font-medium text-white/40 group-hover:text-white transition-colors">
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

        {/* Gmail Labels Section */}
        <div className="py-2 mt-6 mb-2 relative z-10">
          <div className="flex items-center justify-between mb-2 pl-2 pr-1">
            <button 
              onClick={() => setIsTagsExpanded(!isTagsExpanded)}
              className="flex items-center gap-2 group transition-all"
            >
              {isTagsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
              )}
              <span
                className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 group-hover:text-white transition-colors"
              >
                Gmail Štítky
              </span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onManageTags) onManageTags();
              }}
              title="Spravovať štítky"
              className="p-1 rounded-xl transition-all duration-300 hover:bg-white/10 text-white/30 hover:text-white group flex-shrink-0"
            >
              <Plus className="w-4 h-4 transition-all" />
            </button>
          </div>

          {isTagsExpanded && (
            <div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {/* Native Gmail Labels ONLY as requested */}
              {(gmailLabels || []).map((l: any) => (
                 <SidebarTag
                   key={`label:${l.name}`}
                   label={l.name}
                   isActive={selectedTab === `tag:${l.name}`}
                   onClick={() => onTabChange(`tag:${l.name}`)}
                   color={l.color || (l.name.startsWith("CRM/") ? "#a78bfa" : undefined)}
                 />
              ))}

              {(gmailLabels || []).length === 0 && (
                 <div className="text-[11px] text-white/30 px-3 py-2 italic font-medium">Žiadne štítky v Gmaile</div>
              )}
            </div>
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
        <item.icon
          className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${!isActive ? 'group-hover:scale-110' : 'scale-110'}`}
          style={{
            color: color || (isActive ? "#c4b5fd" : "rgba(255,255,255,0.35)"),
            filter: color
              ? isActive
                ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}80)`
                : `drop-shadow(0 0 4px ${color}90)`
              : undefined
          }}
        />
        <span className={`tracking-wide ${isActive ? "font-bold text-white" : "font-semibold text-white/50 group-hover:text-white/80 transition-colors"}`}>
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

// Helper component specifically for tags (Sleek Mini Neon Text Cards)
function SidebarTag({ label, isActive, onClick, color, count }: { label: string; isActive: boolean; onClick: () => void; color?: string; count?: number }) {
  const badgeColor = color || "#a78bfa"; // Default to violet if no color
  
  return (
    <button
      onClick={onClick}
      className={`group w-full px-3 py-2 mb-1.5 flex items-center rounded-xl transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${isActive ? '' : 'hover:bg-white/5'}`}
      style={{
        background: isActive 
           ? `linear-gradient(90deg, ${badgeColor}10 0%, transparent 100%)` 
           : `transparent`,
        border: `1px solid ${isActive ? `${badgeColor}30` : `transparent`}`,
      }}
    >
      {/* Intense but thin indicator line for active card */}
      {isActive && (
        <div 
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full pointer-events-none"
          style={{ 
            background: badgeColor,
            boxShadow: `0 0 10px 1px ${badgeColor}` 
          }}
        />
      )}

      {/* Pure, clear, smaller Neon Label */}
      <span 
        className={`relative z-10 w-full text-left uppercase tracking-widest text-[10px] transition-all duration-300 ml-1 ${isActive ? 'font-black' : 'font-bold opacity-60 group-hover:opacity-100'}`}
        style={{
          color: isActive ? '#ffffff' : badgeColor,
          textShadow: isActive 
             ? `0 0 8px ${badgeColor}, 0 0 16px ${badgeColor}` 
             : `0 0 4px ${badgeColor}50`, // Clearer, less aggressive aura
        }}
      >
          {label}
        </span>
        
        {count !== undefined && count > 0 && (
           <span 
             className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-md tabular-nums min-w-[18px] text-center transition-all duration-300 ${isActive ? 'bg-white/20 text-white font-black' : 'bg-white/5 text-white/40 font-bold group-hover:bg-white/10 group-hover:text-white/60'}`}
             style={{
               border: isActive ? `1px solid ${badgeColor}40` : `1px solid transparent`
             }}
           >
             {count}
           </span>
        )}
    </button>
  );
}
