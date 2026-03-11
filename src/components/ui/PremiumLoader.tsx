"use client";

import React from "react";
import { Loader2, Zap } from "lucide-react";

interface PremiumLoaderProps {
  message?: string;
}

export function PremiumLoader({ message = "Inicializujem systém..." }: PremiumLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-500">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-600/10 blur-[100px] rounded-full animate-pulse" />
      
      {/* Content */}
      <div className="relative flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Double spinning rings */}
            <div className="absolute inset-0 border-t-2 border-violet-500 rounded-full animate-spin [animation-duration:1s]" />
            <div className="absolute inset-2 border-r-2 border-white/20 rounded-full animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
            <Zap className="w-10 h-10 text-violet-400 fill-violet-400/20 animate-pulse" />
          </div>
        </div>
        
        {/* Text */}
        <div className="text-center space-y-2">
            <h2 className="text-base font-bold text-zinc-100 tracking-widest uppercase">
                {message}
            </h2>
            <div className="flex items-center justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" 
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
