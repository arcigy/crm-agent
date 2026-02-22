"use client";

import * as React from "react";
import { 
  Bot, 
  X, 
  Send, 
  RefreshCcw
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentChat } from "@/hooks/useAgentChat";
import { AgentChatMessage } from "./agent/AgentChatMessage";

interface FloatingAgentChatProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (val: boolean) => void;
}

export function FloatingAgentChat({ isMenuOpen, setIsMenuOpen }: FloatingAgentChatProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    totalSessionCost,
    expandedLogs,
    toggleLog,
    handleSend,
  } = useAgentChat();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Close menu if chat opens
  React.useEffect(() => {
    if (isOpen && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isOpen, isMenuOpen, setIsMenuOpen]);

  // Hide floating components if we are already on the full agent page
  if (pathname === "/dashboard/agent") return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[2000] flex flex-col items-end gap-3 transition-all duration-500`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[95vw] md:w-[420px] h-[650px] max-h-[85vh] bg-card/85 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_20px_80px_rgba(79,70,229,0.25)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 fade-in duration-500 ease-out transition-all">
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent" />
                
                <Link 
                    href="/dashboard/agent"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 group/header transition-all hover:opacity-80 relative z-10"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 animate-pulse" />
                        <div className="relative p-2.5 bg-indigo-600 rounded-2xl shadow-lg border border-indigo-400/30 group-hover/header:rotate-6 transition-transform">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover/header:text-indigo-400 transition-colors leading-tight">
                            ArciGy Assistant
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                                Systém Aktívny
                            </span>
                        </div>
                    </div>
                </Link>

                <div className="flex items-center gap-2 relative z-10">
                    {totalSessionCost > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <span className="text-[10px] font-black text-emerald-500">
                                {(totalSessionCost * 0.92).toFixed(4)}€
                            </span>
                        </div>
                    )}
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative bg-gradient-to-b from-transparent to-indigo-500/5">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in duration-1000">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
                            <Bot className="w-12 h-12 text-indigo-500/50 relative z-10" />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80 mb-2">
                            Pripravený na akciu
                        </h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest max-w-[200px] leading-relaxed">
                            Napíš mi, čo potrebuješ vybaviť v CRM (napr. vytvoriť kontakt, úlohu alebo poslať mail)
                        </p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <AgentChatMessage key={idx} idx={idx} msg={msg} isExpanded={!!expandedLogs[idx]} onToggleLog={toggleLog} />
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 text-muted-foreground animate-pulse ml-2 pb-4">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <RefreshCcw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] italic opacity-70">Antigravity premýšľa...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-border bg-card/85 backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <input
                            type="text"
                            autoFocus
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                            placeholder="Čo mám dnes urobiť?"
                            className="w-full bg-muted/40 border border-border/50 rounded-2xl py-4 px-5 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-inner"
                        />
                    </div>
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-90 disabled:opacity-40 transition-all flex items-center justify-center group">
                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Agent Button Trigger */}
      {!isOpen && (
          <button
              onClick={() => setIsOpen(true)}
              className="group relative w-16 h-16 rounded-[1.8rem] shadow-[0_15px_40px_rgba(79,70,229,0.4)] flex items-center justify-center transition-all duration-500 active:scale-90 overflow-hidden"
          >
              {/* Shining Background Effects */}
              <div className="absolute inset-0 bg-indigo-600 transition-colors group-hover:bg-indigo-500" />
              
              {/* Animated Glow Halo */}
              <div className="absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-[-100%] bg-gradient-to-r from-transparent via-white/40 to-transparent rotate-45 animate-[shimmer_3s_infinite_linear]" />
              </div>

              {/* Glowing Pulse Rings */}
              <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-0 group-hover:opacity-40 transition-opacity scale-150 animate-pulse" />
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                <Bot className="w-7 h-7 text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.5)] group-hover:scale-110 transition-transform duration-300" />
              </div>

              {/* External Ring Shadow (Svietiace tlačidlo) */}
              <div className="absolute inset-0 rounded-[inherit] border border-white/30 group-hover:border-white/50 transition-colors" />

              <style jsx>{`
                @keyframes shimmer {
                  0% { transform: translateX(-100%) rotate(45deg); }
                  100% { transform: translateX(100%) rotate(45deg); }
                }
              `}</style>
          </button>
      )}
    </div>
  );
}
