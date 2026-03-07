"use client";

import * as React from "react";
import { ChevronDown, Loader2, Check } from "lucide-react";
import { PROJECT_STAGES, ProjectStage } from "@/types/project";

interface StageBadgeProps {
  stage: ProjectStage;
  projectId: number;
  onStageChange: (id: number, stage: ProjectStage) => Promise<void>;
}

export function StageBadge({
  stage,
  projectId,
  onStageChange,
}: StageBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const stageInfo =
    PROJECT_STAGES.find((s) => s.value === stage) || PROJECT_STAGES[0];

  const handleChange = async (newStage: ProjectStage) => {
    setLoading(true);
    await onStageChange(projectId, newStage);
    setLoading(false);
    setIsOpen(false);
  };

  // Map colors to neon characteristic styles
  const getNeonStyles = (s: string) => {
    switch (s) {
      case 'planning': 
        return 'text-violet-400 bg-violet-400/5 border-violet-400/20 shadow-[0_0_15px_rgba(167,139,250,0.05)]';
      case 'in_progress': 
        return 'text-white bg-violet-600/20 border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.2)]';
      case 'review': 
        return 'text-fuchsia-400 bg-fuchsia-400/5 border-fuchsia-400/20 shadow-[0_0_15px_rgba(192,38,211,0.05)]';
      case 'completed': 
        return 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.05)]';
      case 'on_hold': 
        return 'text-zinc-400 bg-zinc-400/5 border-zinc-400/20';
      case 'cancelled': 
        return 'text-rose-400 bg-rose-400/5 border-rose-400/20 shadow-[0_0_15px_rgba(251,113,133,0.05)]';
      default: 
        return 'text-white/40 bg-zinc-900 border-white/10';
    }
  };

  // We use inline background for the dot to bypass ANY class-based color constraints
  const getDotStyles = (s: string) => {
    switch (s) {
       case 'planning': return { bg: '#a78bfa', shadow: 'rgba(167,139,250,0.5)' }; // Violet
       case 'in_progress': return { bg: '#FFFFFF', shadow: 'white' };
       case 'review': return { bg: '#c026d3', shadow: 'rgba(192,38,211,0.5)' }; // Fuchsia
       case 'completed': return { bg: '#34d399', shadow: 'rgba(52,211,153,0.5)' }; // Emerald
       case 'on_hold': return { bg: '#71717a', shadow: 'rgba(113,113,122,0.5)' }; // Zinc
       case 'cancelled': return { bg: '#fb7185', shadow: 'rgba(251,113,133,0.5)' }; // Rose
       default: return { bg: 'rgba(255,255,255,0.2)', shadow: 'transparent' };
    }
  }

  const dot = getDotStyles(stage);

  return (
    <div className={`relative h-7 flex items-center ${isOpen ? 'z-[200]' : 'z-auto'}`}>
      <button
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-2.5 px-4 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 group/stage ${getNeonStyles(stage)}`}
      >
        <div className="flex items-center gap-2.5">
            {loading ? (
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            ) : (
            <>
                <div 
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${stage === 'in_progress' ? 'animate-pulse' : ''}`} 
                  style={{ 
                    backgroundColor: dot.bg,
                    background: dot.bg,
                    boxShadow: `0 0 10px ${dot.shadow}`
                  }}
                />
                <span className="whitespace-nowrap tracking-tighter italic">{stageInfo.label}</span>
            </>
            )}
        </div>
        <ChevronDown className={`w-3 h-3 border-l border-current/10 pl-1.5 ml-0.5 opacity-30 group-hover/stage:opacity-100 transition-all shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[210] bg-black/5"
            onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
            }}
          />
          <div className="absolute top-full left-0 mt-3 bg-zinc-950/95 backdrop-blur-2xl border border-violet-500/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[220] min-w-[210px] animate-in fade-in zoom-in-95 duration-200">
            {PROJECT_STAGES.map((s) => {
              const sDot = getDotStyles(s.value);
              const isActive = stage === s.value;
              return (
                <button
                  key={s.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChange(s.value);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group/item mb-1 last:mb-0
                    ${isActive ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-zinc-500 hover:bg-violet-500/10 hover:text-violet-300"}`}
                >
                  <div 
                      className={`w-1.5 h-1.5 rounded-full transition-shadow duration-500`} 
                      style={{ 
                          backgroundColor: isActive ? 'white' : sDot.bg,
                          background: isActive ? 'white' : sDot.bg,
                          boxShadow: isActive ? '0 0 10px white' : 'none'
                      }}
                  />
                  {s.label}
                  {isActive && (
                    <Check className="w-3 h-3 ml-auto text-white" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
