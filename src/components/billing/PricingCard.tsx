"use client";

import React from "react";
import { Check, Zap, Sparkles, MoveRight } from "lucide-react";
import { BillingPlan } from "@/types/billing";

interface PricingCardProps {
  plan: BillingPlan;
  isCurrent?: boolean;
  onSelect: (priceId: string) => void;
  isLoading?: boolean;
}

export function PricingCard({ plan, isCurrent, onSelect, isLoading }: PricingCardProps) {
  return (
    <div className={`
      relative group flex flex-col p-8 rounded-[2.5rem] border transition-all duration-700
      ${plan.isPopular 
        ? "bg-violet-600/5 dark:bg-violet-600/10 border-violet-500/30 shadow-[0_40px_100px_rgba(139,92,246,0.15)]" 
        : "bg-black/30 border-white/[0.03] hover:border-white/[0.1] shadow-inner"}
    `}>
      {plan.isPopular && (
        <div className="absolute top-0 right-10 -translate-y-1/2 px-5 py-2 bg-zinc-100 rounded-full flex items-center gap-2 shadow-2xl border border-white/20">
          <Sparkles className="w-3 h-3 text-violet-600 animate-pulse" />
          <span className="text-[8px] font-black text-violet-600 uppercase tracking-[0.2em] leading-none pt-0.5">Most Recommended</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-100 group-hover:scale-105 transition-transform origin-left mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
           {plan.name}
        </h3>
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed max-w-[200px]">
          {plan.description}
        </p>
      </div>

      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-5xl font-black tracking-tighter text-zinc-100 italic drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">{plan.price}€</span>
        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">/ {plan.interval === 'month' ? 'month' : 'year'}</span>
      </div>

      <div className="flex-1 space-y-4 mb-8">
        {plan.features.map((feat, i) => (
          <div key={i} className="flex items-start gap-4 group/feat">
            <div className={`
              mt-0.5 w-4 h-4 rounded-lg flex items-center justify-center transition-all bg-zinc-900 border border-white/5 shadow-inner
              ${plan.isPopular ? 'text-violet-400 border-violet-500/20' : 'text-zinc-600'}
            `}>
              <Check className="w-2.5 h-2.5" />
            </div>
            <span className="text-[10px] font-black text-zinc-400 group-hover/feat:text-zinc-200 uppercase tracking-widest transition-colors italic">
              {feat}
            </span>
          </div>
        ))}
      </div>

      <button
        disabled={isCurrent || isLoading}
        onClick={() => onSelect(plan.id)}
        className={`
          w-full py-5 rounded-2xl font-black uppercase italic tracking-[0.4em] text-[10px]
          transition-all duration-500 flex items-center justify-center gap-4 relative overflow-hidden group/btn
          ${isCurrent 
            ? "bg-zinc-950/60 text-zinc-700 border border-white/5 cursor-not-allowed" 
            : plan.isPopular
              ? "bg-violet-600 text-white shadow-[0_20px_40px_rgba(139,92,246,0.3)] hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-[0.98] border border-violet-400/30"
              : "bg-zinc-100 text-zinc-950 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98] border border-white/20"}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] transition-all" />
        
        {isCurrent ? (
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
             <span className="relative z-10">Active_Registry</span>
           </div>
        ) : (
          <>
            <Zap className={`w-4 h-4 transition-transform group-hover/btn:scale-125 ${plan.isPopular ? 'text-white' : 'text-zinc-950'}`} fill="currentColor" />
            <span className="relative z-10">{isLoading ? "Deploying..." : "Initialize_Upgrade"}</span>
          </>
        )}
      </button>
    </div>
  );
}
