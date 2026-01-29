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
import {
  chatWithAgent,
  getAgentChats,
  saveAgentChat,
} from "@/app/actions/agent";
import { toast } from "sonner";
import { readStreamableValue } from "@ai-sdk/rsc";
import {
  Mail,
  Copy,
  Check,
  MessageSquare,
  Plus,
  Clock,
  History,
  Trash2,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolResults?: any[];
  thoughts?: {
    intent?: string;
    plan?: string[];
    extractedData?: any;
  };
}

export default function AgentChat() {
  const [chatId, setChatId] = React.useState<string>("");
  const [chatList, setChatList] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content:
        "Čau! Som tvoj ArciGy Agent. Pozvám ťa do tvojho CRM – pýtaj sa, čo potrebuješ.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    const list = await getAgentChats();
    setChatList(list);
  };

  React.useEffect(() => {
    setChatId(crypto.randomUUID());
    fetchChats();
  }, []);

  const [isCopying, setIsCopying] = React.useState(false);
  const [expandedLogs, setExpandedLogs] = React.useState<
    Record<number, boolean>
  >({});

  const toggleLog = (idx: number) => {
    setExpandedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Define userMessage BEFORE using it
    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    // Prepare messages
    const assistantPlaceholder: Message = {
      role: "assistant",
      content: "Antigravity analyzuje...",
      toolResults: [],
      thoughts: { intent: "Analyzujem...", plan: [], extractedData: {} },
    };

    // Create the history array with current messages + new user message
    const history = [...messages, userMessage];

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. SAVE TO DB (Non-blocking)
      const isNewChat = history.length <= 2; // initial assistant + user
      const finalTitle = isNewChat
        ? userMessage.content.slice(0, 30)
        : "Pokračujúci chat";

      saveAgentChat(chatId, finalTitle, history)
        .then(() => fetchChats())
        .catch((err) => console.error("Persistence Error:", err));

      const { stream } = await chatWithAgent(
        history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      );

      let finalMessages: Message[] = [];
      for await (const val of readStreamableValue(stream)) {
        setMessages((prev) => {
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          newMsgs[lastIdx] = {
            role: "assistant",
            content:
              val?.content ||
              (val?.status === "thinking" ? "Antigravity pracuje..." : ""),
            toolResults: val?.toolResults || [],
            thoughts: val?.thoughts || assistantPlaceholder.thoughts,
          };
          finalMessages = newMsgs;
          return newMsgs;
        });
      }

      // 2. SAVE FINAL RESULT
      saveAgentChat(chatId, finalTitle, finalMessages)
        .then(() => fetchChats())
        .catch((err) => console.error("Persistence Error:", err));
    } catch (error: any) {
      toast.error("Chyba spojenia.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    setChatId(crypto.randomUUID());
    setMessages([
      { role: "assistant", content: "Nová misia začína. Ako ti pomôžem?" },
    ]);
  };

  const loadChat = (chat: any) => {
    setChatId(chat.id);
    setMessages(chat.messages);
  };

  return (
    <div className="flex gap-6 max-w-7xl mx-auto h-[calc(100vh-180px)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden relative">
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
                    <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/40">
                      <button
                        onClick={() => toggleLog(idx)}
                        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-4 text-indigo-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">
                            Analýza & Plán Misie
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-indigo-500/50 transition-transform ${expandedLogs[idx] ? "rotate-90" : ""}`}
                        />
                      </button>

                      {expandedLogs[idx] && (
                        <div className="p-4 pt-0 space-y-4 border-t border-indigo-500/10">
                          {/* 1. INTENT & DATA */}
                          {msg.thoughts && (
                            <div className="pt-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="px-2 py-0.5 bg-indigo-500/20 rounded text-[9px] font-bold text-indigo-400 uppercase">
                                  {msg.thoughts.intent}
                                </div>
                              </div>

                              {msg.thoughts.extractedData && (
                                <div className="bg-black/20 rounded-xl p-3 border border-indigo-500/10">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-indigo-500/50 mb-2">
                                    Extrahované dáta
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(
                                      msg.thoughts.extractedData,
                                    ).map(
                                      ([k, v]) =>
                                        v && (
                                          <div
                                            key={k}
                                            className="flex flex-col"
                                          >
                                            <span className="text-[7px] uppercase opacity-40">
                                              {k}
                                            </span>
                                            <span className="text-[10px] font-bold truncate">
                                              {String(v)}
                                            </span>
                                          </div>
                                        ),
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 2. PLANNED STEPS */}
                              {msg.thoughts.plan &&
                                msg.thoughts.plan.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-indigo-500/50">
                                      Plánované kroky
                                    </div>
                                    {msg.thoughts.plan.map((p, pIdx) => (
                                      <div
                                        key={pIdx}
                                        className="flex items-center gap-2 text-[10px] font-medium text-foreground/70"
                                      >
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                                        {p}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}

                          <div className="h-px bg-border/20" />

                          {/* 3. ACTUAL EXECUTION LOGS */}
                          <div className="space-y-3">
                            <div className="text-[8px] font-black uppercase tracking-widest text-indigo-500/50">
                              Technická exekúcia
                            </div>
                            {msg.toolResults.map((step, tIdx) => (
                              <div
                                key={tIdx}
                                className="space-y-1.5 pt-3 first:pt-0"
                              >
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
                                    {step.result?.success
                                      ? "Success"
                                      : "Failed"}
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
                        </div>
                      )}
                    </div>
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
              onClick={() =>
                setInput("Vytvor nový lead Ján Novák (jan@test.sk)")
              }
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

      {/* Persistence Sidebar (History) */}
      <div className="w-80 flex flex-col bg-card/40 backdrop-blur-xl border border-border rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
              História Chatu
            </h3>
          </div>
          <button
            onClick={createNewChat}
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
              onClick={() => loadChat(chat)}
              className={`w-full text-left p-4 rounded-2xl border transition-all group relative overflow-hidden ${
                chatId === chat.id
                  ? "bg-indigo-500/10 border-indigo-500/40"
                  : "bg-muted/30 border-border hover:border-indigo-500/20"
              }`}
            >
              <div className="relative z-10 flex flex-col gap-1">
                <span
                  className={`text-[11px] font-black tracking-tight line-clamp-1 ${chatId === chat.id ? "text-indigo-400" : "text-foreground/80"}`}
                >
                  {chat.title}
                </span>
                <div className="flex items-center gap-2 opacity-50">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold">
                    {new Date(chat.date_created).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {chatId === chat.id && (
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
    </div>
  );
}
