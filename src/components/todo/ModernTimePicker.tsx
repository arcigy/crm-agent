"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

interface ModernTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  variant?: "input" | "item";
}

export function ModernTimePicker({ value, onChange, variant = "input" }: ModernTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [h, m] = value ? value.split(":") : ["10", "00"];
  const isItem = variant === "item";

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`
          flex items-center transition-all duration-300
          ${isItem 
            ? `gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border
               ${value 
                 ? "bg-violet-500/10 text-violet-500 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]" 
                 : "bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-dashed border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-100 hover:border-violet-500/30 hover:text-violet-500"}`
            : `gap-2.5 px-5 py-3 rounded-2xl border
               ${value 
                 ? "bg-violet-600 text-white border-transparent shadow-[0_10px_25px_rgba(139,92,246,0.4)] scale-105" 
                 : "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-violet-500/50 hover:text-violet-500"}`
          }
        `}
      >
        <Clock size={isItem ? 11 : 16} className={value ? "animate-pulse" : ""} />
        <span className="whitespace-nowrap italic pt-0.5 leading-none">
          {value || (isItem ? "Čas" : "Pridať čas")}
        </span>
      </button>

      {isOpen && (
        <div className={`
          absolute mt-5 left-0 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-700/50 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.4)] p-8 animate-in slide-in-from-top-3 fade-in duration-300 z-[9999]
          ${isItem ? "top-full" : "bottom-full mb-5 top-auto"}
          w-[450px]
        `}>
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-5">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] px-2 italic">Hodina</p>
              <div className="h-80 overflow-y-auto thin-scrollbar grid grid-cols-2 gap-2.5 pr-2">
                {hours.map(hour => (
                  <button
                    key={hour}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(`${hour}:${m}`);
                    }}
                    className={`py-5 rounded-2xl text-lg font-black transition-all duration-200 ${h === hour ? 'bg-violet-600 text-white shadow-[0_15px_30px_rgba(139,92,246,0.4)] scale-110 z-10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:scale-105'}`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] px-2 italic">Minúty</p>
              <div className="h-80 overflow-y-auto thin-scrollbar space-y-2.5 pr-2">
                {minutes.map(min => (
                  <button
                    key={min}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(`${h}:${min}`);
                    }}
                    className={`w-full py-5 rounded-2xl text-lg font-black transition-all duration-200 ${m === min ? 'bg-violet-600 text-white shadow-[0_15px_30px_rgba(139,92,246,0.4)] scale-110 z-10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:scale-105'}`}
                  >
                    {min}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-zinc-100 dark:border-zinc-800 flex gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setIsOpen(false);
              }}
              className="flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all italic active:scale-95"
            >
              Zrušiť
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="flex-1 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-violet-500 bg-violet-600/10 hover:bg-violet-600 hover:text-white transition-all italic shadow-xl shadow-violet-500/10 active:scale-95"
            >
              Hotovo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
