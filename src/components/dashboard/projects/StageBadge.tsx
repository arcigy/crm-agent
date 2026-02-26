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
        return 'text-sky-400 bg-sky-500/5 border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.05)]';
      case 'in_progress': 
        return 'text-white bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)]';
      case 'review': 
        return 'text-orange-500 bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]';
      case 'completed': 
        return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case 'on_hold': 
        return 'text-amber-400 bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]';
      case 'cancelled': 
        return 'text-rose-400 bg-rose-500/5 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]';
      default: 
        return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  // We use inline background for the dot to bypass ANY class-based color constraints
  const getDotStyles = (s: string) => {
    switch (s) {
       case 'planning': return { bg: '#38bdf8', shadow: 'rgba(56,189,248,0.5)' };
       case 'in_progress': return { bg: '#FFFFFF', shadow: 'white' };
       case 'review': return { bg: '#ea580c', shadow: 'rgba(234,88,12,0.8)' };
       case 'completed': return { bg: '#10b981', shadow: 'rgba(16,185,129,0.5)' };
       case 'on_hold': return { bg: '#f59e0b', shadow: 'rgba(245,158,11,0.5)' };
       case 'cancelled': return { bg: '#f43f5e', shadow: 'rgba(244,63,94,0.5)' };
       default: return { bg: 'rgba(255,255,255,0.2)', shadow: 'transparent' };
    }
  }

  const dot = getDotStyles(stage);

  return (
    <div className="relative h-7 flex items-center">
      <button
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-2 px-3 h-7 rounded-full text-[9px] font-[900] uppercase tracking-[0.15em] border transition-all active:scale-95 group/stage min-w-[150px] justify-between ${getNeonStyles(stage)}`}
      >
        <div className="flex items-center gap-2 flex-1">
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
                <span className="truncate">{stageInfo.label}</span>
            </>
            )}
        </div>
        <ChevronDown className={`w-3 h-3 opacity-30 group-hover/stage:opacity-100 transition-all shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[110]"
            onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
            }}
          />
          <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-1.5 z-[120] min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
            {PROJECT_STAGES.map((s) => {
              const sDot = getDotStyles(s.value);
              return (
                <button
                  key={s.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChange(s.value);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all group/item
                    ${stage === s.value ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
                >
                  <div 
                      className={`w-1.5 h-1.5 rounded-full transition-shadow duration-500`} 
                      style={{ 
                          backgroundColor: stage === s.value ? 'white' : sDot.bg,
                          background: stage === s.value ? 'white' : sDot.bg,
                          boxShadow: stage === s.value ? '0 0 10px white' : 'none'
                      }}
                  />
                  {s.label}
                  {stage === s.value && (
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
