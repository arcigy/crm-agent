"use client";

import * as React from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCcw,
  Zap,
  Search,
  PlusCircle,
  Database,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { chatWithAgent } from "@/app/actions/agent";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolResults?: any[];
}

export default function AgentChat() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ahoj! Som tvoj ArciGy Agent. Pozvám ťa do tvojho CRM – môžem pre teba niečo nájsť, vytvoriť kontakt alebo skontrolovať štatistiky. Čo urobíme ako prvé?",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatWithAgent(
        [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      );

      if (response.error) {
        toast.error("Chyba agenta: " + response.error);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.content || "",
            toolResults: response.toolResults,
          },
        ]);
      }
    } catch (error) {
      toast.error("Systémová chyba komunikácie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-5xl mx-auto bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden relative">
      {/* Dynamic Background Effects */}
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
          <div className="px-3 py-1.5 bg-muted rounded-xl border border-border hidden md:flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              GPT-4o Mini Turbo
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
          <div
            key={idx}
            className={`flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`p-2 rounded-xl border ${
                msg.role === "assistant"
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            <div
              className={`space-y-4 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}
            >
              <div
                className={`p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm border ${
                  msg.role === "assistant"
                    ? "bg-card border-border rounded-tl-none text-foreground"
                    : "bg-indigo-600 border-indigo-400/30 text-white rounded-tr-none"
                }`}
              >
                {msg.content}
              </div>

              {/* Molecular Thought Process (Expandable) */}
              {msg.toolResults && msg.toolResults.length > 0 && (
                <div className="space-y-2 animate-in fade-in duration-500">
                  <details className="group border border-indigo-500/20 bg-indigo-500/5 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/40">
                    <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer list-none select-none">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">
                          Logika & Molekulárny Plán
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-500/50 group-open:rotate-90 transition-transform" />
                    </summary>

                    <div className="p-4 pt-0 space-y-3 border-t border-indigo-500/10">
                      {msg.toolResults.map((step, tIdx) => (
                        <div key={tIdx} className="space-y-1.5 pt-3 first:pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {step.tool?.startsWith("gmail") ? (
                                <Mail className="w-3 h-3 text-indigo-400" />
                              ) : (
                                <Database className="w-3 h-3 text-violet-400" />
                              )}
                              <span className="text-[9px] font-black uppercase tracking-tight text-foreground/70">
                                {step.tool}
                              </span>
                            </div>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                step.result?.success
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-rose-500/10 text-rose-500"
                              }`}
                            >
                              {step.result?.success ? "Success" : "Failed"}
                            </span>
                          </div>

                          <pre className="text-[10px] font-mono bg-black/20 p-3 rounded-xl overflow-x-auto text-indigo-300/80 border border-indigo-500/5">
                            {JSON.stringify(
                              step.result?.data || step.result,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
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
      <div className="px-8 py-6 border-t border-border bg-card/50 backdrop-blur-md relative z-10">
        <div className="relative max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-indigo-500/5 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
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
              placeholder="Povedz agentovi, čo má urobiť..."
              className="w-full bg-muted/50 border border-border rounded-[2rem] py-4 px-6 text-sm font-bold placeholder:text-muted-foreground focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none shadow-inner"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-4 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all group"
          >
            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <button
            onClick={() => setInput("Vytvor nový lead Ján Novák (jan@test.sk)")}
            className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3 h-3" /> Nový Kontakt
          </button>
          <button
            onClick={() => setInput("Aké sú moje finančné štatistiky?")}
            className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3 h-3" /> Štatistiky
          </button>
          <button
            onClick={() => setInput("Nájdi projekty v štádiu planning")}
            className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3 h-3" /> Hľadať Projekty
          </button>
        </div>
      </div>
    </div>
  );
}
