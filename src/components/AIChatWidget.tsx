'use client';

import * as React from 'react';
import { Sparkles, Send, X, Mic, Paperclip, Minimize2, Maximize2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function AIChatWidget() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [messages, setMessages] = React.useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Ahoj! Som tvoj CRM asistent. Povedz mi, čo sa stalo? Napr: "Volal mi nový klient..."',
            timestamp: new Date()
        }
    ]);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue('');

        // Simulate AI thinking
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Rozumiem (simulácia). Vytváram kontakt, projekt a termín v kalendári...',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
            >
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                <Sparkles className="w-7 h-7" />
            </button>
        );
    }

    return (
        <div className={cn(
            "fixed z-50 bg-white shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden font-sans",
            isExpanded
                ? "inset-4 md:inset-10 rounded-2xl"
                : "bottom-6 right-6 w-[380px] h-[600px] rounded-2xl"
        )}>
            {/* Header */}
            <div className="h-16 bg-gradient-to-r from-blue-600 to-indigo-700 shrink-0 flex items-center justify-between px-4 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">CRM Copilot</h3>
                        <p className="text-[10px] text-blue-100 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex max-w-[85%] animate-in slide-in-from-bottom-2 duration-300",
                            msg.role === 'user' ? "ml-auto justify-end" : "mr-auto justify-start"
                        )}
                    >
                        <div className={cn(
                            "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm relative",
                            msg.role === 'user'
                                ? "bg-blue-600 text-white rounded-tr-sm"
                                : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm"
                        )}>
                            {msg.content}
                            <span className={cn(
                                "text-[9px] absolute bottom-1 right-2 opacity-60",
                                msg.role === 'user' ? "text-blue-100" : "text-gray-400"
                            )}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="relative">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Opíš, čo sa stalo..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none max-h-32 min-h-[50px]"
                        rows={1}
                    />
                    <div className="absolute right-2 bottom-2 flex gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Mic className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <SuggestionPill text="Nový klient volal" onClick={() => setInputValue('Volal mi nový klient ')} />
                    <SuggestionPill text="Dohodnutý meeting" onClick={() => setInputValue('Dohodol som si meeting s ')} />
                    <SuggestionPill text="Vytvoriť deal" onClick={() => setInputValue('Vytvor nový deal pre ')} />
                </div>
            </div>
        </div>
    );
}

function SuggestionPill({ text, onClick }: { text: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="whitespace-nowrap px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-600 transition-colors flex-shrink-0"
        >
            ✨ {text}
        </button>
    )
}
