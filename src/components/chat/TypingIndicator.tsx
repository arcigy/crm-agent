"use client";

import React from "react";
import { Zap } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-4 py-6 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
        <div className="relative w-10 h-10 bg-zinc-900 border border-violet-500/30 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
            <Zap className="w-5 h-5 text-violet-400 fill-violet-400/20 animate-bounce" />
            {/* Scanning line effect */}
            <div className="absolute inset-0 w-full h-[2px] bg-violet-400/30 -translate-y-full animate-[scan_2s_infinite]" />
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" 
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/70 animate-pulse">
            AI Spracovanie...
        </span>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
