"use client";

import * as React from "react";
import {
  Wallet,
  Briefcase,
  MessageSquare,
  Clock,
  Coins,
  Activity,
  Zap,
} from "lucide-react";
import { Lead } from "@/types/contact";

interface ContactOverviewProps {
  contact: Lead;
  onClose: () => void;
  children: React.ReactNode;
}

export function ContactOverview({
  contact,
  onClose,
  children,
}: ContactOverviewProps) {
  const totalDealValue =
    contact.deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;

  return (
    <div className="h-full flex flex-col p-5 space-y-4 bg-transparent overflow-hidden scrollbar-hide">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <NeonKpi 
            label="Objem Dealov"
            value={`${new Intl.NumberFormat('sk-SK').format(totalDealValue)} €`}
        />
        <NeonKpi 
            label="Aktívne Dealy"
            value={String(contact.deals?.length || 0)}
        />
        <NeonKpi 
            label="Interakcie"
            value={String(contact.activities?.length || 0)}
        />
        <NeonKpi 
            label="Vek Kontaktu"
            value="142 dní"
        />
        <NeonKpi 
            label="Posledný Kontakt"
            value="2 dni"
        />
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar pr-2 pb-5">
        <div className="grid grid-cols-12 gap-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function NeonKpi({ label, value }: any) {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center text-center bg-slate-900 bg-opacity-50 backdrop-blur-lg rounded-2xl border border-violet-900/30 px-3 py-3 h-20 shadow-sm transition-all hover:bg-opacity-70 group/kpi">
        {/* Label */}
        <span className="text-[10px] font-semibold text-violet-400/80 mb-1 tracking-wider uppercase group-hover/kpi:text-violet-400 transition-colors">
          {label}
        </span>

        {/* Value */}
        <div className="w-full">
            <h3 className="text-xl font-bold text-white leading-none">
              {value}
            </h3>
        </div>
    </div>
  )
}
