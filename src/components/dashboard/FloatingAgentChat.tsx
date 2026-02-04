"use client";

import * as React from "react";
import { 
  Bot, 
  X, 
  Maximize2, 
  Send, 
  RefreshCcw
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentChat } from "@/hooks/useAgentChat";
import { AgentChatMessage } from "./agent/AgentChatMessage";

export function FloatingAgentChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    expandedLogs,
    toggleLog,
    handleSend,
  } = useAgentChat();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Hide floating chat if we are already on the full agent page
  if (pathname === "/dashboard/agent") return null;

  return (
    <div className="fixed bottom-6 right-6 z-[2000] flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen ? (
        <div className="w-[95vw] md:w-[420px] h-[650px] max-h-[85vh] bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500 ease-out transition-all">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between">
                <Link 
                    href="/dashboard/agent"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 group/header transition-all hover:opacity-80"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 animate-pulse" />
                        <div className="relative p-2.5 bg-indigo-600 rounded-2xl shadow-lg border border-indigo-400/30 group-hover/header:scale-105 transition-transform">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover/header:text-indigo-400 transition-colors">
                            ArciGy Agent
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                Systém Pripravený
                            </span>
                        </div>
                    </div>
                </Link>

                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-white"
                        title="Zavrieť chat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide relative"
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
                    <div className="flex items-center gap-3 text-muted-foreground animate-pulse ml-2 pb-4">
                        <div className="p-2 bg-muted/50 rounded-xl">
                            <RefreshCcw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest italic opacity-70">
                            Agent premýšľa...
                        </span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-border bg-card/60 backdrop-blur-xl relative z-10">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Čo mám dnes urobiť?"
                            className="w-full bg-muted/40 border border-white/5 rounded-2xl py-3.5 px-5 text-sm font-medium placeholder:text-muted-foreground/50 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none shadow-inner"
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-90 disabled:opacity-40 transition-all flex items-center justify-center"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
            {/* Full Page Shortcut Button (Hidden when open) */}
            <Link 
                href="/dashboard/agent"
                className="w-12 h-12 bg-card/80 backdrop-blur-xl border border-white/10 text-muted-foreground rounded-2xl shadow-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all active:scale-90 group animate-in slide-in-from-bottom-2 duration-300"
                title="Agent Page"
            >
                <Maximize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>

            {/* Main Bubble Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-16 h-16 rounded-[1.8rem] bg-indigo-600 border border-indigo-400/30 shadow-[0_15px_40px_rgba(79,70,229,0.3)] flex items-center justify-center transition-all duration-500 hover:bg-indigo-500 hover:scale-110 shadow-indigo-600/40 active:scale-90 relative"
            >
                <div className="absolute inset-0 bg-white/10 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity" />
                <Bot className="w-9 h-9 text-white" />
            </button>
        </div>
      )}
    </div>
  );
}
