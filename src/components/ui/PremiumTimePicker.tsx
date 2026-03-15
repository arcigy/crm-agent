"use client";

import * as React from "react";
import { Clock, Check } from "lucide-react";

interface PremiumTimePickerProps {
  value: string; // format "HH:mm"
  onChange: (value: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
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

export function PremiumTimePicker({
  value,
  onChange,
  className,
  align = "center",
}: PremiumTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to active or nearest time when opened
  React.useEffect(() => {
    if (isOpen && listRef.current) {
      // Use a small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        let targetTime = value || getNearestTime();
        let targetElement = listRef.current?.querySelector(`[data-time="${targetTime}"]`);

        // If exact match not found (e.g. 10:07), find closest rounded down
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

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 bg-white/5 border border-white/10 rounded-2xl px-4 flex items-center justify-between text-sm font-mono font-medium text-violet-100 hover:bg-white/10 hover:border-violet-500/20 focus:border-violet-500/30 outline-none transition-all group"
      >
        <span className={!value ? "text-zinc-700" : ""}>{value || "Vybrať čas"}</span>
        <Clock
          size={16}
          className={`transition-colors ${isOpen ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"}`}
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full mt-1 w-40 bg-[#0a0a0c]/98 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto
            ${align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"}
          `}
        >
          <div 
            ref={listRef}
            className="max-h-[220px] overflow-y-auto scrollbar-hide py-1"
          >
            {TIMES.map((time) => {
              const isSelected = value === time;
              return (
                <button
                  key={time}
                  type="button"
                  data-time={time}
                  data-active={isSelected}
                  onClick={() => handleTimeSelect(time)}
                  className={`w-full px-4 py-1.5 text-[12px] font-mono font-bold transition-all flex items-center justify-between group/item
                    ${isSelected ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-400 hover:text-white hover:bg-white/5"}
                  `}
                >
                  <span>{time}</span>
                  {isSelected && <Check size={14} className="text-white" />}
                  {!isSelected && (
                    <div className="w-1 h-1 rounded-full bg-violet-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to format now (since I can't import format from date-fns easily here without complicating)
function format(date: Date, fmt: string) {
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
}
