"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Loader2, Terminal, User, Bot, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AgentDebugPage() {
  const [debugLog, setDebugLog] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debugScrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, isLoading, setMessages } = useChat({
    api: "/api/ai/agent",
    body: { debug: true },
    onResponse: async () => {},
  });

  // Custom chat handler for Debug mode (JSON instead of Stream)
  const sendDebugMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: "user" as const, content: input };
    setMessages([...messages, userMsg]);
    handleInputChange({ target: { value: "" } } as any);

    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          debug: true
        })
      });

      const data = await res.json();
      if (data.debugLog) {
        setDebugLog(data.debugLog);
      }
      
      const assistantMsg = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant" as const, 
        content: data.response || "No response" 
      };
      setMessages([...messages, userMsg, assistantMsg]);
    } catch (error) {
      toast.error("Chyba pri komunikácii s agentom");
      console.error(error);
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
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Terminal className="text-primary" />
          Agent Black-Box Debugger
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMessages([])}>
            <Trash2 className="w-4 h-4 mr-2" /> Vyčistiť chat
          </Button>
          <Button variant="outline" size="sm" onClick={copyDebug} disabled={debugLog.length === 0}>
            <Copy className="w-4 h-4 mr-2" /> Kopírovať Debug
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat Panel */}
        <Card className="flex-[0.4] flex flex-col overflow-hidden bg-background/50 backdrop-blur">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((m: any) => (
                <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
                    m.role === "user" ? "bg-primary" : "bg-muted")}>
                    {m.role === "user" ? <User size={16} className="text-primary-foreground" /> : <Bot size={16} />}
                  </div>
                  <div className={cn("p-3 rounded-lg max-w-[85%] text-sm", 
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Loader2 size={16} className="animate-spin text-primary" />
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-sm italic">Agent premýšľa...</div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <form onSubmit={sendDebugMessage} className="p-4 border-t flex gap-2">
            <Input 
              value={input} 
              onChange={handleInputChange} 
              placeholder="Zadaj úlohu pre agenta..." 
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              Poslať
            </Button>
          </form>
        </Card>

        {/* Debug Console */}
        <Card className="flex-[0.6] flex flex-col overflow-hidden bg-zinc-950 text-zinc-300 border-zinc-800 font-mono text-xs">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Terminal size={14} className="text-emerald-500" />
              LIVE BACKEND LOGS
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Black Box Execution Trace</span>
          </div>
          <ScrollArea className="flex-1 p-4" ref={debugScrollRef}>
            <div className="space-y-3">
              {debugLog.length === 0 ? (
                <div className="text-zinc-600 italic">Čakám na prvý request...</div>
              ) : (
                debugLog.map((log, i) => (
                  <div key={i} className="border-l-2 border-zinc-800 pl-3 py-1 hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", 
                        log.stage === "ROUTER" ? "bg-blue-900/50 text-blue-400" :
                        log.stage === "ORCHESTRATOR" ? "bg-purple-900/50 text-purple-400" :
                        log.stage === "PREPARER" ? "bg-orange-900/50 text-orange-400" :
                        log.stage === "EXECUTOR" ? "bg-emerald-900/50 text-emerald-400" :
                        "bg-zinc-800 text-zinc-400")}>
                        {log.stage}
                      </span>
                      <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-zinc-200 font-medium">{log.message}</span>
                    </div>
                    {log.data && (
                      <pre className="text-zinc-500 overflow-x-auto whitespace-pre-wrap mt-1 pb-1">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
