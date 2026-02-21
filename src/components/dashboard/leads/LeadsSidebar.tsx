"use client";

import * as React from "react";
import { 
  Inbox, 
  Star, 
  Clock, 
  Send, 
  File, 
  Tag, 
  MoreVertical, 
  ChevronDown, 
  Plus,
  Edit2
} from "lucide-react";

interface LeadsSidebarProps {
  selectedTab: "all" | "unread" | "leads" | "sms" | "calls";
  onTabChange: (tab: any) => void;
  unreadCount?: number;
}

export function LeadsSidebar({ selectedTab, onTabChange, unreadCount = 0 }: LeadsSidebarProps) {
  const menuItems = [
    { id: "all", label: "Doručené", icon: Inbox, count: unreadCount > 0 ? unreadCount.toLocaleString() : "" },
    { id: "starred", label: "S hviezdičkou", icon: Star },
    { id: "snoozed", label: "Odložené", icon: Clock },
    { id: "sent", label: "Odoslané", icon: Send },
    { id: "drafts", label: "Koncepty", icon: File, count: "" },
    { id: "shopping", label: "Nákupy", icon: Tag },
    { id: "more", label: "Ďalšie", icon: ChevronDown },
  ];

  return (
    <div className="w-[240px] flex flex-col pt-4 px-2 h-full bg-white/10 dark:bg-zinc-950 backdrop-blur-xl border-r border-black/5 dark:border-white/5 overflow-y-auto">
      {/* Compose Button */}
      <div className="px-2 mb-6">
        <button className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all rounded-2xl text-sm font-black text-white group shadow-lg">
          <Edit2 className="w-5 h-5 flex-shrink-0" />
          Napísať
        </button>
      </div>

      {/* Main Navigation */}
      <div className="space-y-[4px]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-r-full text-sm font-bold transition-all group ${
              selectedTab === item.id 
                ? "bg-indigo-500/20 text-indigo-400 dark:text-indigo-400 font-black" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-4">
              <item.icon className={`w-4 h-4 ${selectedTab === item.id ? "text-indigo-400" : "opacity-40 group-hover:opacity-100"}`} />
              <span className="tracking-tight">{item.label}</span>
            </div>
            {item.count && (
              <span className={`text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 ${selectedTab === item.id ? "font-black" : "opacity-40"}`}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Labels Section */}
      <div className="mt-8 px-4 flex items-center justify-between mb-2">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-500/60">Štítky</span>
        <button className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all">
          <Plus className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
