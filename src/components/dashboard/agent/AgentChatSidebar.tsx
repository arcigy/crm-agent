"use client";

import * as React from "react";
import { History, Plus, MessageSquare, Clock } from "lucide-react";
import { AgentChat as AgentChatType } from "@/app/actions/agent-types";

interface AgentChatSidebarProps {
  chatList: AgentChatType[];
  currentChatId: string;
  onNewChat: () => void;
  onLoadChat: (chat: AgentChatType) => void;
}

export function AgentChatSidebar({
  chatList,
  currentChatId,
  onNewChat,
  onLoadChat,
}: AgentChatSidebarProps) {
  return (
    <div className="w-80 flex flex-col bg-card/40 backdrop-blur-xl border border-border rounded-[2.5rem] shadow-xl overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
            História Chatu
          </h3>
        </div>
        <button
          onClick={onNewChat}
          className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
        {chatList.length === 0 && (
          <div className="py-20 text-center space-y-3 opacity-50">
            <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Žiadna história
            </p>
          </div>
        )}
        {chatList.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onLoadChat(chat)}
            className={`w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden ${
              currentChatId === chat.id
                ? "bg-indigo-500/10 border-indigo-500/40"
                : "bg-muted/30 border-border hover:border-indigo-500/20"
            }`}
          >
            <div className="relative z-10 flex flex-col gap-1">
              <span
                className={`text-[11px] font-black tracking-tight line-clamp-1 ${
                  currentChatId === chat.id
                    ? "text-indigo-400"
                    : "text-foreground/80"
                }`}
              >
                {chat.title}
              </span>
              <div className="flex items-center gap-2 opacity-50">
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-bold">
                  {chat.date_created &&
                  !isNaN(new Date(chat.date_created).getTime())
                    ? new Date(chat.date_created).toLocaleDateString("sk-SK")
                    : "—"}
                </span>
              </div>
            </div>
            {currentChatId === chat.id && (
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <div className="p-6 bg-indigo-500/5 border-t border-indigo-500/10">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60 text-center">
          ArciGy Cloud Sync Active
        </div>
      </div>
    </div>
  );
}
