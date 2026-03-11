"use client";

import React from "react";
import { Zap } from "lucide-react";

interface MiniPremiumLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MiniPremiumLoader({ className = "", size = "md" }: MiniPremiumLoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };
  
  const iconSize = {
    sm: "w-2.5 h-2.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <div className={`absolute inset-0 bg-violet-500/20 blur-lg rounded-full animate-pulse`} />
      <div className={`${sizeClasses[size]} bg-zinc-900 border border-violet-500/30 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.15)]`}>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
          <Zap className={`${iconSize[size]} text-violet-400 fill-violet-400/20 animate-bounce`} />
          {/* Scanning line effect */}
          <div className="absolute inset-0 w-full h-[2px] bg-violet-400/30 -translate-y-full animate-[scan_2s_infinite]" />
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
