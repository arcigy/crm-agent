"use client";

import * as React from "react";
import { 
  Bot, 
  X, 
  Send, 
  RefreshCcw,
  Menu,
  LayoutDashboard,
  Mail,
  Users,
  Briefcase,
  FolderKanban,
  Calendar,
  CheckSquare,
  FileText,
  HardDrive,
  Receipt,
  BrainCircuit,
  History,
  Settings,
  Zap
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentChat } from "@/hooks/useAgentChat";
import { AgentChatMessage } from "./agent/AgentChatMessage";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { useUser } from "@clerk/nextjs";

const menuItems = [
  { name: "Nástenka", href: "/dashboard", icon: LayoutDashboard },
  { name: "Doručená pošta", href: "/dashboard/leads", icon: Mail },
  { name: "Kontakty", href: "/dashboard/contacts", icon: Users },
  { name: "Obchody", href: "/dashboard/deals", icon: Briefcase },
  { name: "Projekty", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Kalendár", href: "/dashboard/calendar", icon: Calendar },
  { name: "Úlohy", href: "/dashboard/todo", icon: CheckSquare },
  { name: "Poznámky", href: "/dashboard/notes", icon: FileText },
  { name: "Súbory", href: "/dashboard/files", icon: HardDrive },
  { name: "Fakturácia", href: "/dashboard/invoicing", icon: Receipt },
  { name: "AI Kontext", href: "/dashboard/settings/ai", icon: BrainCircuit },
  { name: "Pamäť AI", href: "/dashboard/settings/memory", icon: History },
  { 
    name: "Cold Outreach", 
    href: "/dashboard/outreach", 
    icon: Zap,
    allowedEmails: ['branislav@arcigy.group']
  },
];

export function FloatingAgentChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  
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
      {/* Menu Window */}
      {isMenuOpen && (
        <div className="w-[85vw] md:w-[320px] bg-card/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Navigácia</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto scrollbar-hide py-4 space-y-1">
                {menuItems
                    .filter(item => !item.allowedEmails || item.allowedEmails.includes(userEmail))
                    .map((item) => (
                    <Link 
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`
                            flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                            ${pathname === item.href ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-gray-400 hover:bg-white/5 hover:text-white"}
                        `}
                    >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                    </Link>
                ))}
            </div>
            <div className="p-3 border-t border-white/5 bg-black/20 space-y-1">
                <ThemeToggle />
                <Link
                    href="/dashboard/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-all group"
                >
                    <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                    <span>Nastavenia</span>
                </Link>
                <LogoutButton className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all" />
            </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[95vw] md:w-[420px] h-[650px] max-h-[85vh] bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500 ease-out transition-all">
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
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                Systém Pripravený
                            </span>
                        </div>
                    </div>
                </Link>

                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide relative">
                {messages.map((msg, idx) => (
                    <AgentChatMessage key={idx} idx={idx} msg={msg} isExpanded={!!expandedLogs[idx]} onToggleLog={toggleLog} />
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 text-muted-foreground animate-pulse ml-2 pb-4">
                        <div className="p-2 bg-muted/50 rounded-xl">
                            <RefreshCcw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest italic opacity-70">Agent premýšľa...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-border bg-card/60 backdrop-blur-xl relative z-10">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative group">
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Čo mám dnes urobiť?"
                            className="w-full bg-muted/40 border border-white/5 rounded-2xl py-3.5 px-5 text-sm font-medium focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
                        />
                    </div>
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-90 disabled:opacity-40 transition-all flex items-center justify-center">
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Floating Buttons Group */}
      <div className="flex flex-col gap-3">
        {/* Hamburger Button */}
        {!isOpen && (
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`
                    w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-90 group animate-in slide-in-from-bottom-2 duration-300
                    ${isMenuOpen ? "bg-slate-900 border border-white/10 text-white" : "bg-card/80 backdrop-blur-xl border border-white/10 text-muted-foreground hover:bg-indigo-600 hover:text-white"}
                `}
                title="Menu"
            >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-6 h-6" />}
            </button>
        )}

        {/* Main Agent Button */}
        {!isMenuOpen && (
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-16 h-16 rounded-[1.8rem] shadow-[0_15px_40px_rgba(79,70,229,0.3)] flex items-center justify-center transition-all duration-500 active:scale-90 relative
                    ${isOpen ? "bg-slate-900 border border-white/10 rotate-180" : "bg-indigo-600 border border-indigo-400/30 hover:bg-indigo-500 hover:scale-110 shadow-indigo-600/40"}
                `}
            >
                <div className="absolute inset-0 bg-white/10 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity" />
                {isOpen ? <X className="w-7 h-7 text-white" /> : <Bot className="w-9 h-9 text-white" />}
            </button>
        )}
      </div>
    </div>
  );
}
