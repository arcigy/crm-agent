"use client";

import * as React from "react";
import { Mail, MessageSquare, Phone, Clock } from "lucide-react";

interface LeadsSidebarProps {
  selectedTab: "all" | "unread" | "leads" | "sms" | "calls";
  onTabChange: (tab: "all" | "unread" | "leads" | "sms" | "calls") => void;
}

export function LeadsSidebar({ selectedTab, onTabChange }: LeadsSidebarProps) {
  return (
    <div className="w-64 flex flex-col gap-1 border-r border-border bg-sidebar p-4 transition-colors">
      <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 px-2">
        Schránky
      </h3>
      <button
        onClick={() => onTabChange("all")}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
          selectedTab === "all"
            ? "bg-blue-600 text-white shadow-xl"
            : "text-foreground/70 hover:bg-card hover:text-foreground hover:shadow-sm"
        }`}
      >
        <Mail className="w-4 h-4" /> Všetko
      </button>
      <div className="space-y-1 mt-2">
        <button
          onClick={() => onTabChange("sms")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
            selectedTab === "sms"
              ? "bg-blue-600 text-white shadow-xl"
              : "text-foreground/70 hover:bg-card hover:text-foreground hover:shadow-sm"
          }`}
        >
          <MessageSquare className="w-4 h-4" /> SMS
        </button>
        <button
          onClick={() => onTabChange("calls")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
            selectedTab === "calls"
              ? "bg-blue-600 text-white shadow-xl"
              : "text-foreground/70 hover:bg-card hover:text-foreground hover:shadow-sm"
          }`}
        >
          <Phone className="w-4 h-4" /> Hovory
        </button>
      </div>

      <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mt-8 mb-4 px-2">
        Filtre
      </h3>
      <button
        onClick={() => onTabChange("unread")}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
          selectedTab === "unread"
            ? "bg-blue-600 text-white shadow-xl"
            : "text-foreground/70 hover:bg-card hover:text-foreground hover:shadow-sm"
        }`}
      >
        <Clock className="w-4 h-4" /> Neprečítané
      </button>
    </div>
  );
}
