'use client';

import { useState, useRef, useEffect } from 'react';
import { ConversationSidebar, Conversation } from './ConversationSidebar';
import { ChatBubble } from './ChatBubble';
import { SendHorizontal, MessageSquare, Copy, Check, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>;
  conversations: Conversation[];
  chatCount: number;
  maxChats: number;
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
  conversations,
  chatCount,
  maxChats
}: ChatInterfaceProps) {
  const router = useRouter();
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCopyChat = () => {
    let textToCopy = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n------------------\n\n');
    
    if (debugLogs.length > 0) {
      textToCopy += '\n\n\n========================================\n';
      textToCopy += '           FULL DEBUG LOGS\n';
      textToCopy += '========================================\n\n';
      textToCopy += debugLogs.map(log => 
        `[${log.timestamp}] [${log.stage}] ${log.message}${log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : ''}`
      ).join('\n\n---\n\n');
    }

    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    router.refresh();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: input, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setDebugLogs([]); // Reset debug logs on new message
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content, 
          conversationId: activeConvId,
          debug: true // Request full debug
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const activeId = res.headers.get('x-conversation-id');
      if (!activeConvId && activeId) {
        window.history.replaceState(null, '', `/chat/${activeId}`);
        setActiveConvId(activeId);
        router.refresh(); // so sidebar picks up the new chat
      }

      // Pre read streams:
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';
      let buffer = '';

      setMessages(prev => [
        ...prev,
        { id: 'streaming-id', role: 'assistant', content: '', created_at: new Date().toISOString() }
      ]);

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Split by the double newline to get individual data chunks
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep the last partial chunk in the buffer

        for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            try {
                const data = JSON.parse(part.substring(6));
                
                if (data.type === 'status') {
                    setStatusMessage(data.message);
                } else if (data.type === 'debug') {
                    setDebugLogs(prev => [...prev, data]);
                } else if (data.type === 'response') {
                    assistantMsg += data.message;
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.id === 'streaming-id') {
                            lastMsg.content = assistantMsg;
                        }
                        return newMsgs;
                    });
                }
            } catch (e) {
                console.error("Failed to parse stream chunk", e, part);
            }
        }
      }
      
      // Cleanup ID
      setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.id === 'streaming-id') {
              lastMsg.id = Date.now().toString();
          }
          return newMsgs;
      });
      setStatusMessage(null);

    } catch (err) {
      console.error(err);
      setMessages(prev => {
          const filtered = prev.filter(m => m.id !== 'streaming-id');
          return [...filtered, { id: Date.now().toString(), role: 'assistant', content: 'Prepáč, vyskytla sa chyba.', created_at: new Date().toISOString() }];
      });
    } finally {
      setIsTyping(false);
      setStatusMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-950 text-white overflow-hidden font-sans border border-gray-800 rounded-3xl">
      {isSidebarOpen && (
        <ConversationSidebar 
          conversations={conversations} 
          onDelete={handleDelete} 
          chatCount={chatCount} 
          maxChats={maxChats} 
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-4 left-4 xl:left-6 z-10 flex items-center gap-2">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors border border-gray-700 shadow-md"
              title="Zobraziť panel konverzácií"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={handleCopyChat}
            className="absolute top-4 right-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xs transition-colors border border-gray-700 shadow-md"
            title="Kopírovať celý chat s kompletným debug logom"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Skopírované' : 'Kopírovať (Full Debug)'}
          </button>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar md:pt-14">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center shadow-inner">
                <MessageSquare className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-xl font-medium text-gray-200">Ako ti môžem pomôcť?</h1>
              <p className="max-w-md text-sm">Opýtaj sa ma čokoľvek, vyhľadám kontakt, vytvorím projekt alebo ti zanalyzujem históriu z nášho CRM.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              {messages.map(msg => (
                <ChatBubble 
                  key={msg.id} 
                  role={msg.role} 
                  content={msg.content} 
                  createdAt={msg.created_at} 
                />
              ))}
              {isTyping && <ChatBubble role="assistant" content="*Pracujem na tom...*" createdAt={new Date().toISOString()} isStreaming />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-gray-950/80 backdrop-blur border-t border-gray-800">
          <div className="max-w-4xl mx-auto relative">
            {statusMessage && (
              <div className="absolute -top-10 left-0 flex items-center gap-2 px-4 py-2 text-sm text-gray-400 bg-gray-900/50 rounded-t-xl border-x border-t border-gray-800 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="font-medium tracking-wide">{statusMessage}</span>
              </div>
            )}
            <div className="flex items-end gap-3">
              <VoiceRecorder 
                onTranscription={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                isProcessing={isProcessingVoice}
                setIsProcessing={setIsProcessingVoice}
              />
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napíš správu ArciGy asistentovi..."
                  disabled={isTyping || isProcessingVoice}
                  className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none min-h-[56px] text-gray-100 placeholder-gray-500 disabled:opacity-50"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping || isProcessingVoice}
                  className="absolute right-3 top-3 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 rounded-xl transition-colors text-white"
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

