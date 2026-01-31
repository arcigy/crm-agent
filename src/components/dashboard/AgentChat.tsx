"use client";

import * as React from "react";
import { Bot, Check, Copy, RefreshCcw, Zap } from "lucide-react";
import { toast } from "sonner";

// New Refactored Components
import { useAgentChat } from "@/hooks/useAgentChat";
import { AgentChatMessage } from "./agent/AgentChatMessage";
import { AgentChatSidebar } from "./agent/AgentChatSidebar";
import { AgentChatInput } from "./agent/AgentChatInput";

export default function AgentChat() {
  const {
    chatId,
    chatList,
    messages,
    input,
    setInput,
    isLoading,
    totalSessionCost,
    expandedLogs,
    toggleLog,
    handleSend,
    createNewChat,
    loadChat,
  } = useAgentChat();

  const [isCopying, setIsCopying] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const copySessionToClipboard = () => {
    const sessionData = JSON.stringify(messages, null, 2);
    navigator.clipboard.writeText(sessionData);
    setIsCopying(true);
    toast.success("Konverzácia a logy skopírované!");
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className="flex gap-6 max-w-7xl mx-auto h-[calc(100vh-180px)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative px-8 py-5 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 animate-pulse" />
              <div className="relative p-2.5 bg-indigo-600 rounded-2xl shadow-lg border border-indigo-400/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                ArciGy Agent
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Systém Aktívny
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copySessionToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-xl border border-border transition-all active:scale-95"
              title="Skopírovať JSON celej session pre debug"
            >
              {isCopying ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Debug JSON
              </span>
            </button>
            <div className="px-3 py-1.5 bg-muted rounded-xl border border-border hidden md:flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                GPT-4o Antigravity
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 relative scroll-smooth thin-scrollbar"
        >
          {messages.map((msg, idx) => (
            <AgentChatMessage
              key={idx}
              idx={idx}
              msg={msg}
              isExpanded={!!expandedLogs[idx]}
              onToggleLog={toggleLog}
            />
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground animate-pulse ml-2">
              <div className="p-2 bg-muted rounded-xl">
                <RefreshCcw className="w-4 h-4 animate-spin text-indigo-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest italic">
                Agent Premýšľa...
              </span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <AgentChatInput
          input={input}
          isLoading={isLoading}
          totalSessionCost={totalSessionCost}
          setInput={setInput}
          onSend={handleSend}
        />
      </div>

      {/* Persistence Sidebar (History) */}
      <AgentChatSidebar
        chatList={chatList}
        currentChatId={chatId}
        onNewChat={createNewChat}
        onLoadChat={loadChat}
      />
    </div>
  );
}
