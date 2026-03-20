"use client";

import * as React from "react";
import { 
  Bot, 
  X, 
  Send, 
  RefreshCcw,
  Bug,
  Mail, 
  History, 
  Plus, 
  MessageSquare 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentChat } from "@/hooks/useAgentChat";
import { AgentChatMessage } from "./agent/AgentChatMessage";
import { AgentChatSidebar } from "./agent/AgentChatSidebar";
import { AgentChatInput } from "./agent/AgentChatInput";
import { useEmailContext } from "@/components/providers/EmailContextProvider";

interface FloatingAgentChatProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (val: boolean) => void;
}

export function FloatingAgentChat({ isMenuOpen, setIsMenuOpen }: FloatingAgentChatProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [view, setView] = React.useState<"chat" | "history">("chat");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  const {
    chatList,
    chatId,
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
    copyMessagesToClipboard
  } = useAgentChat() as any;

  const { activeEmail, activeThread, clearEmailContext } = useEmailContext();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, view]);

  // Close menu if chat opens
  React.useEffect(() => {
    if (isOpen && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isOpen, isMenuOpen, setIsMenuOpen]);

  // Hide floating components if we are already on the full agent page
  if (pathname === "/chat" || pathname === "/dashboard/agent") return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[2000] flex flex-col items-end gap-3 transition-all duration-500`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[95vw] md:w-[420px] h-[650px] max-h-[85vh] bg-card/85 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_20px_80px_rgba(79,70,229,0.25)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 fade-in duration-500 ease-out transition-all">
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent" />
                
                <div className="flex items-center gap-3 relative z-10 w-full overflow-hidden">
                    <button 
                        onClick={() => setView(view === "chat" ? "history" : "chat")}
                        className={`relative p-2.5 rounded-2xl shadow-lg border transition-all ${
                          view === "history" ? "bg-indigo-600 border-indigo-400/30 rotate-6" : "bg-zinc-800/50 border-white/5 hover:bg-zinc-700/50"
                        }`}
                        title="História misie"
                    >
                        {view === "chat" ? <Bot className="w-4 h-4 text-indigo-400" /> : <History className="w-4 h-4 text-white" />}
                        {view === "chat" && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping opacity-20" />}
                    </button>

                    <div className="flex-1 overflow-hidden">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">
                            {view === "history" ? "Archív Relácií" : "ArciGy Assistant"}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] ${view === "history" ? "bg-indigo-400" : "bg-emerald-500"}`} />
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                                {view === "history" ? `${chatList.length} Stavebníc` : "Systém Aktívny"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {view === "history" && (
                            <button 
                                onClick={() => { createNewChat(); setView("chat"); }}
                                className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={copyMessagesToClipboard}
                            className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all text-muted-foreground hover:text-indigo-500 group/debug"
                            title="Copy Debug JSON"
                        >
                            <Bug className="w-4 h-4 group-hover:debug:rotate-12 transition-transform" />
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages / History View */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide relative bg-gradient-to-b from-transparent to-indigo-500/5">
                {view === "history" ? (
                  <div className="p-6 space-y-4">
                    {chatList.length === 0 ? (
                      <div className="py-20 text-center opacity-30 flex flex-col items-center">
                        <MessageSquare className="w-10 h-10 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Žiadna história</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatList.map((chat: any) => (
                          <button
                            key={chat.id}
                            onClick={() => { loadChat(chat); setView("chat"); }}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              chatId === chat.id ? "bg-indigo-500/20 border-indigo-500/40" : "bg-card/50 border-border hover:border-indigo-500/20"
                            }`}
                          >
                            <span className="text-[11px] font-black tracking-tight text-foreground line-clamp-1 truncate">{chat.title || "Bez názvu"}</span>
                            <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">
                              {new Date(chat.created_at || Date.now()).toLocaleDateString("sk-SK")}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
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
                    {messages.map((msg: any, idx: number) => (
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
                )}
            </div>

            {/* Email Context Badge */}
            {activeEmail && (
              <div className="mx-6 mb-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between group/badge animate-in slide-in-from-bottom-2 shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shrink-0">
                    <Mail className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 leading-none">Kontext e-mailu</span>
                      <span className="text-[8px] text-muted-foreground">•</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase truncate">Od {activeEmail.from?.split('<')[0].replace(/"/g, '') || activeEmail.from}</span>
                    </div>
                    <h4 className="text-[11px] font-bold text-foreground truncate mt-0.5">{activeEmail.subject || "(Bez predmetu)"}</h4>
                  </div>
                </div>
                <button 
                  onClick={clearEmailContext}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground ml-2 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input - Reusing the Premium AgentChatInput logic/design */}
            <div className={`transition-all duration-300 ${view === "history" ? "h-0 opacity-0 pointer-events-none" : "h-auto"}`}>
              <AgentChatInput 
                input={input}
                isLoading={isLoading}
                totalSessionCost={totalSessionCost}
                setInput={setInput}
                onSend={handleSend}
              />
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
