"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Terminal, User, Bot, Copy, Trash2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuickComposerModal } from "@/components/dashboard/QuickComposerModal";

export default function AgentDebugPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<any[]>([]);
  
  // Modal state for Tool Actions
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ body: "", name: "" });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const debugScrollRef = useRef<HTMLDivElement>(null);

  // Custom chat handler for Debug mode (JSON instead of Stream)
  const sendDebugMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          debug: true
        })
      });

      if (!res.ok) throw new Error("API request failed");

      const reader = res.body?.getReader();
      const textDecoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = textDecoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split("\n");
          // Keep the last partial line in the buffer
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("LOG:")) {
              try {
                const logData = JSON.parse(line.substring(4));
                setDebugLog(prev => [...prev, logData]);

                // Handle specific tool actions (Side Effects)
                if (logData.stage === "EXECUTOR" && logData.data?.action === "open_compose") {
                  setModalData({
                    body: logData.data.compose.body,
                    name: logData.data.compose.toName || logData.data.compose.to
                  });
                  setModalOpen(true);
                  toast.success("Koncept emailu pripravený!");
                }
              } catch (e) {
                console.warn("Failed to parse log line", e);
              }
            } else if (line.trim()) {
              assistantContent += line;
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === "assistant") {
                  lastMsg.content = assistantContent;
                  return [...newMsgs];
                } else {
                  return [...newMsgs, { id: "asst-" + Date.now(), role: "assistant", content: assistantContent }];
                }
              });
            }
          }
        }
        
        // Handle remaining buffer
        if (buffer.trim()) {
            if (buffer.startsWith("LOG:")) {
                try {
                    const logData = JSON.parse(buffer.substring(4));
                    setDebugLog(prev => [...prev, logData]);
                } catch (e) {}
            } else {
                assistantContent += buffer;
                setMessages(prev => {
                   const newMsgs = [...prev];
                   const lastMsg = newMsgs[newMsgs.length - 1];
                   if (lastMsg && lastMsg.role === "assistant") {
                       lastMsg.content = assistantContent;
                       return [...newMsgs];
                   } else {
                       return [...newMsgs, { id: "asst-" + Date.now(), role: "assistant", content: assistantContent }];
                   }
                });
            }
        }
      }
    } catch (error) {
      toast.error("Chyba pri komunikácii s agentom");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (debugScrollRef.current) debugScrollRef.current.scrollTop = debugScrollRef.current.scrollHeight;
  }, [debugLog]);

  const copyDebug = () => {
    navigator.clipboard.writeText(JSON.stringify(debugLog, null, 2));
    toast.success("Debug trace skopírovaný do schránky");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4 overflow-hidden bg-background">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Terminal className="text-blue-600" />
          Agent Black-Box Debugger
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setMessages([])}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Vyčistiť chat
          </button>
          <button 
            onClick={copyDebug}
            disabled={debugLog.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Copy className="w-4 h-4" /> Kopírovať Debug
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-[0.4] flex flex-col overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.map((m: any) => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", 
                  m.role === "user" ? "bg-blue-600" : "bg-gray-100")}>
                  {m.role === "user" ? <User size={16} className="text-white" /> : <Bot size={16} className="text-gray-600" />}
                </div>
                <div className={cn("p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm", 
                  m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-50 border border-gray-100 text-gray-700 rounded-tl-sm")}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm italic text-gray-400">Agent premýšľa...</div>
              </div>
            )}
          </div>
          
          <form onSubmit={sendDebugMessage} className="p-4 border-t border-gray-100 flex gap-2 bg-gray-50/50">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Zadaj úlohu pre agenta..." 
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* Debug Console */}
        <div className="flex-[0.6] flex flex-col overflow-hidden bg-zinc-950 text-zinc-300 border border-zinc-800 rounded-xl font-mono text-xs shadow-2xl">
          <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-emerald-500" />
              <span className="font-bold tracking-wider">LIVE BACKEND LOGS</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Connected</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-400 border border-zinc-700">TRACE V1</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={debugScrollRef}>
            {debugLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 italic space-y-2 opacity-50">
                <Bot size={32} className="mb-2" />
                <p>Čakám na prvý request...</p>
                <p className="text-[10px] uppercase font-bold tracking-widest">Send a message to see execution trace</p>
              </div>
            ) : (
              debugLog.map((log, i) => (
                <div key={i} className="group border-l-2 border-zinc-800 pl-4 py-2 hover:bg-white/5 transition-all duration-200 ease-in-out">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter", 
                      log.stage === "ROUTER" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                      log.stage === "ORCHESTRATOR" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                      log.stage === "PREPARER" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                      log.stage === "EXECUTOR" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      log.stage === "VERIFIER" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                      "bg-zinc-800 text-zinc-400 border border-zinc-700")}>
                      {log.stage}
                    </span>
                    <span className="text-zinc-600 text-[10px] tabular-nums font-light">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-zinc-100 font-semibold tracking-tight">{log.message}</span>
                  </div>
                  {log.data && (
                    <div className="mt-2 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
                      <pre className="text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed text-[10px]">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Tool Action Modals */}
      <QuickComposerModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialContent={modalData.body}
        recruitName={modalData.name}
        onSend={(content) => {
          toast.success("Email bol odoslaný (Simulácia)");
          setModalOpen(false);
        }}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
