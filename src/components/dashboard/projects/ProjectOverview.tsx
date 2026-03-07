"use client";

import * as React from "react";
import {
  Coins,
  Activity,
  Clock,
  Zap,
  Receipt,
  CheckCircle,
  Calendar,
  History,
  TrendingUp,
} from "lucide-react";
import { Project } from "@/types/project";

interface ProjectOverviewProps {
  project: Project;
  onClose: () => void;
}

export function ProjectOverview({ project, onClose }: ProjectOverviewProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const createdDate = new Date(project.date_created);
  const isValidCreated = !isNaN(createdDate.getTime());
  
  if (isValidCreated) {
    createdDate.setHours(0, 0, 0, 0);
  }

  const ageDays = isValidCreated
    ? Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24),
      )
    : 0;

  const getDaysLabel = (days: number) => {
    if (days === 1) return "deň";
    if (days >= 2 && days <= 4) return "dni";
    return "dní";
  };

  return (
    <div className="h-full flex flex-col p-8 space-y-8 bg-[#000000] overflow-hidden">
      {/* KPI Cards - Static Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NeonKpi 
            label="Rozpočet"
            value={project.value ? `${new Intl.NumberFormat('sk-SK').format(project.value)} €` : "Dohodou"}
            icon={Coins}
            neonColor="emerald"
        />
        <NeonKpi 
            label="Štádium"
            value={project.stage}
            icon={Activity}
            neonColor="violet"
        />
        <NeonKpi 
            label="Vek Projektu"
            value={`${ageDays} ${getDaysLabel(ageDays)}`}
            icon={Clock}
            neonColor="blue"
        />
        <NeonKpi 
            label="Systémové ID"
            value={`${project.id}`}
            icon={Zap}
            neonColor="amber"
        />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-12 space-y-6 overflow-y-auto thin-scrollbar pr-2 pb-10">
            {/* Finančný Report - Static with Themed Border */}
            <section className="bg-zinc-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-[2.5rem] p-10 relative overflow-hidden group">
                {/* Standard Dashboard Glow (Top-Left) */}
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-indigo-500 opacity-20 rounded-full blur-[35px] pointer-events-none transition-all duration-500 group-hover:opacity-30" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500 shadow-indigo-500/40 flex items-center justify-center text-white shadow-lg transition-transform duration-300">
                            <Receipt className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[14px] font-black uppercase text-white italic tracking-[0.2em]">Finančný Report</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                        <VerticalInfo 
                            label="Status Platby"
                            value={project.paid ? "Uhradené" : "Neuhradené"}
                            icon={project.paid ? CheckCircle : Clock}
                            color={project.paid ? "text-emerald-400" : "text-rose-400/90"}
                        />
                        <VerticalInfo 
                            label="Dátum Faktúry"
                            value={project.invoice_date ? new Date(project.invoice_date).toLocaleDateString("sk-SK") : "—"}
                            icon={Calendar}
                        />
                        <VerticalInfo 
                            label="Dátum Splatnosti"
                            value={project.due_date ? new Date(project.due_date).toLocaleDateString("sk-SK") : "Okamžitá"}
                            icon={TrendingUp}
                        />
                    </div>
                </div>
            </section>

            <div className="p-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2.5rem] opacity-30 hover:opacity-50 transition-opacity duration-500 group bg-black/20">
                <History className="w-10 h-10 text-zinc-700 mb-4 transition-transform" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Timeline_Feed_Empty</p>
            </div>
        </div>
      </div>
    </div>
  );
}

function NeonKpi({ label, value, icon: Icon, neonColor }: any) {
  const configs: any = {
    emerald: {
      glow: "bg-emerald-500",
      border: "border-emerald-500/30",
      iconBg: "bg-emerald-500 shadow-emerald-500/40",
      text: "text-emerald-400"
    },
    violet: {
      glow: "bg-violet-500",
      border: "border-violet-500/30",
      iconBg: "bg-violet-500 shadow-violet-500/40",
      text: "text-violet-400"
    },
    blue: {
      glow: "bg-blue-500",
      border: "border-blue-500/30",
      iconBg: "bg-blue-500 shadow-blue-500/40",
      text: "text-blue-400"
    },
    amber: {
      glow: "bg-amber-500",
      border: "border-amber-500/30",
      iconBg: "bg-amber-500 shadow-amber-500/40",
      text: "text-amber-400"
    }
  };

  const config = configs[neonColor] || configs.violet;

  return (
    <div className={`
      relative overflow-hidden flex flex-col items-center justify-center text-center
      bg-zinc-900/40 backdrop-blur-xl
      rounded-[2.5rem] border ${config.border}
      px-6 py-8 group h-48 cursor-default
    `}>
        {/* Neon glow in top-left corner */}
        <div className={`
          absolute -top-6 -left-6 w-28 h-28 ${config.glow} opacity-20 rounded-full blur-[35px] 
          transition-all duration-500 group-hover:opacity-40 group-hover:w-32 group-hover:h-32
          pointer-events-none
        `} />

        {/* Icon pill */}
        <div className={`
          relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center mb-4
          ${config.iconBg}
          shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300
        `}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>

        {/* Label */}
        <span className="relative z-10 text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em] leading-none mb-2">
          {label}
        </span>

        {/* Value */}
        <div className="relative z-10 w-full px-4">
            <h3 className={`text-lg md:text-xl font-black tracking-tighter leading-tight ${config.text} transition-colors break-words`}>
              {value}
            </h3>
        </div>
    </div>
  )
}

function VerticalInfo({ label, value, icon: Icon, color }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-zinc-400" />
                </div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">{label}</p>
            </div>
            <p className={`text-lg font-black italic tracking-tighter uppercase ${color || 'text-zinc-200'}`}>{value}</p>
        </div>
    )
}
