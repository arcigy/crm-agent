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
  Plus,
  Edit2
} from "lucide-react";

interface LeadsSidebarProps {
  selectedTab: "all" | "unread" | "leads" | "sms" | "calls" | "starred" | "snoozed" | "sent" | "drafts" | "shopping" | "more";
  onTabChange: (tab: any) => void;
  unreadCount?: number;
}

export function LeadsSidebar({ selectedTab, onTabChange, unreadCount = 0 }: LeadsSidebarProps) {
  const menuItems = [
    { id: "all", label: "Doručené", icon: Inbox, count: unreadCount > 0 ? unreadCount.toLocaleString() : "" },
    { id: "starred", label: "S hviezdičkou", icon: Star },
    { id: "snoozed", label: "Odložené", icon: Clock },
    { id: "sent", label: "Odoslané", icon: Send },
    { id: "drafts", label: "Koncepty", icon: File, count: "1" },
    { id: "shopping", label: "Nákupy", icon: Tag },
    { id: "more", label: "Ďalšie", icon: ChevronDown },
  ];

  return (
    <div className="w-full flex flex-col pt-4 h-full bg-transparent overflow-y-auto">
      {/* Compose Button - Gmail Style Pill */}
      <div className="px-4 mb-4">
        <button className="flex items-center gap-3 px-6 py-4 bg-[#c2e7ff] dark:bg-indigo-600 hover:shadow-md transition-all rounded-[1rem] text-sm font-bold text-[#001d35] dark:text-white group transition-all duration-200">
          <Edit2 className="w-5 h-5 text-[#001d35] dark:text-white" />
          <span className="pr-2">Napísať</span>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="pr-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center justify-between pl-6 pr-4 py-1.5 rounded-r-full text-[14px] transition-all group ${
              selectedTab === item.id 
                ? "bg-[#d3e3fd] dark:bg-zinc-800 text-[#001d35] dark:text-zinc-100 font-bold" 
                : "text-[#444746] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${selectedTab === item.id ? "text-inherit" : "text-[#444746] dark:text-zinc-400"}`} />
              <span className="tracking-normal">{item.label}</span>
            </div>
            {item.count && (
              <span className={`text-[12px] ${selectedTab === item.id ? "font-bold text-[#001d35] dark:text-zinc-100" : "text-[#444746] dark:text-zinc-400"}`}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Labels Section */}
      <div className="mt-6 px-6 flex items-center justify-between mb-2">
        <span className="text-[14px] font-bold text-[#444746] dark:text-zinc-400">Štítky</span>
        <button className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all">
          <Plus className="w-4 h-4 text-[#444746] dark:text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
