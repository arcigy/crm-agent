"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, Check } from "lucide-react";

interface ModernTimePickerProps {
  value: string; // format "HH:mm"
  onChange: (val: string) => void;
  variant?: "input" | "item";
}

const TIMES = Array.from({ length: 24 * 4 }).map((_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

function getNearestTime() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  const date = new Date(now);
  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function ModernTimePicker({ value, onChange, variant = "input" }: ModernTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isItem = variant === "item";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const timer = setTimeout(() => {
        let targetTime = value || getNearestTime();
        let targetElement = listRef.current?.querySelector(`[data-time="${targetTime}"]`);

        if (!targetElement && targetTime.includes(":")) {
           const [h, m] = targetTime.split(':').map(Number);
           const roundedM = Math.floor(m / 15) * 15;
           const fallbackTime = `${h.toString().padStart(2, '0')}:${roundedM.toString().padStart(2, '0')}`;
           targetElement = listRef.current?.querySelector(`[data-time="${fallbackTime}"]`);
        }

        if (targetElement) {
          targetElement.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, value]);

  const handleTimeSelect = (time: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(time);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`
          flex items-center transition-all duration-300
          ${isItem 
            ? `gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border
               ${value 
                 ? "bg-violet-500/10 text-violet-600 border-violet-500/20 shadow-none" 
                 : "bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 border-dashed border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-100"}`
            : `gap-2.5 px-5 py-3 rounded-2xl border
               ${value 
                 ? "bg-violet-600 text-white border-transparent shadow-[0_10px_25px_rgba(139,92,246,0.4)] scale-105" 
                 : "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-violet-500/50 hover:text-violet-500"}`
          }
        `}
      >
        <Clock size={isItem ? 10 : 16} />
        <span className="whitespace-nowrap italic pt-0.5 leading-none">
          {value || (isItem ? "Čas" : "Pridať čas")}
        </span>
      </button>

      {isOpen && (
        <div 
          className={`
            absolute mt-2 w-44 bg-white/95 dark:bg-zinc-900/98 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-700/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200
            ${isItem ? "top-full right-0" : "bottom-full left-0 mb-3 top-auto"}
          `}
        >
          <div 
            ref={listRef}
            className={`${isItem ? "max-h-[160px]" : "max-h-[220px]"} overflow-y-auto thin-scrollbar py-1`}
          >
            {TIMES.map((time) => {
              const isSelected = value === time;
              return (
                <button
                  key={time}
                  type="button"
                  data-time={time}
                  onClick={(e) => handleTimeSelect(time, e)}
                  className={`w-full px-4 py-2 text-[11px] font-black uppercase tracking-widest italic transition-all flex items-center justify-between group/item
                    ${isSelected ? "bg-violet-600 text-white shadow-lg" : "text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5"}
                  `}
                >
                  <span>{time}</span>
                  {isSelected && <Check size={14} className="text-white" />}
                </button>
              );
            })}
            
            <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1">
              <button
                type="button"
                onClick={(e) => handleTimeSelect("", e)}
                className="w-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/5 transition-all text-left italic"
              >
                Zrušiť čas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
