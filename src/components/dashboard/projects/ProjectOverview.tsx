"use client";

import * as React from "react";
import {
  Wallet,
  Activity,
  Clock,
  Zap,
  Receipt,
  CheckCircle,
  Calendar,
  FileText,
  History,
  TrendingUp,
} from "lucide-react";
import { Project } from "@/types/project";

interface ProjectOverviewProps {
  project: Project;
  onClose: () => void;
}

export function ProjectOverview({ project, onClose }: ProjectOverviewProps) {
  const createdDate = new Date(project.date_created);
  const isValidCreated = !isNaN(createdDate.getTime());
  const ageDays = isValidCreated
    ? Math.floor(
        (new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24),
      )
    : 0;

  return (
    <div className="p-10 space-y-12">
      {/* KPI Cards with Neon Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <NeonKpi 
            label="Rozpočet"
            value={project.value ? `${new Intl.NumberFormat('sk-SK').format(project.value)} €` : "Dohodou"}
            subValue={project.paid ? "Plne uhradené" : "Čaká na platbu"}
            subColor={project.paid ? "text-emerald-500" : "text-amber-500"}
            icon={<Wallet />}
            neonColor="emerald"
        />
        <NeonKpi 
            label="Štádium"
            value={project.stage}
            subValue="Status_Pipeline"
            icon={<Activity />}
            neonColor="violet"
        />
        <NeonKpi 
            label="Vek Projektu"
            value={`${ageDays} dní`}
            subValue={`Od ${isValidCreated ? createdDate.toLocaleDateString("sk-SK") : '—'}`}
            icon={<Clock />}
            neonColor="blue"
        />
        <NeonKpi 
            label="Systémové ID"
            value={`#${project.id}`}
            subValue="Auto_Generated"
            icon={<Zap />}
            neonColor="amber"
        />
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-8 space-y-10">
            <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
                
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black uppercase text-white italic tracking-tighter">Finančný Report</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                    <VerticalInfo 
                        label="Status Platby"
                        value={project.paid ? "Uhradené" : "Neuhradené"}
                        icon={project.paid ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Clock className="w-5 h-5 text-amber-500" />}
                        color={project.paid ? "text-emerald-400" : "text-amber-400"}
                    />
                    <VerticalInfo 
                        label="Dátum Faktúry"
                        value={project.invoice_date ? new Date(project.invoice_date).toLocaleDateString("sk-SK") : "Zatiaľ nie"}
                        icon={<Calendar className="w-5 h-5 text-zinc-500" />}
                    />
                    <VerticalInfo 
                        label="Dátum Splatnosti"
                        value={project.due_date ? new Date(project.due_date).toLocaleDateString("sk-SK") : "Okamžitá"}
                        icon={<TrendingUp className="w-5 h-5 text-zinc-500" />}
                    />
                </div>
            </section>

            <div className="p-20 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[3rem] opacity-20 hover:opacity-30 transition-opacity duration-500 group">
                <History className="w-12 h-12 text-zinc-700 mb-6 group-hover:scale-110 transition-transform" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">Feed aktivít projektu je prázdny</p>
            </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-10">
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black uppercase text-white tracking-[0.2em] italic">Interné Poznámky</h3>
                </div>
                <textarea
                    className="w-full h-48 bg-black/40 border border-white/5 rounded-3xl p-6 text-sm text-zinc-200 placeholder:text-zinc-800 focus:outline-none focus:border-violet-500/30 transition-all resize-none thin-scrollbar mb-6 font-medium leading-relaxed"
                    placeholder="Sem zapíšte dôležité interné informácie..."
                />
                <button 
                  className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-300 relative overflow-hidden active:scale-95 group shadow-2xl shadow-violet-600/20"
                  style={{ 
                      background: "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(109,40,217,0.2) 100%)",
                      border: "1.5px solid rgba(167,139,250,0.4)",
                      color: "white"
                  }}
                >
                    Uložiť Záznam
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

function NeonKpi({ label, value, subValue, subColor, icon, neonColor }: any) {
  const colors: any = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/20",
    violet: "text-violet-500 bg-violet-500/10 border-violet-500/20 shadow-violet-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/20"
  };

  const selectedColor = colors[neonColor] || colors.violet;

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 group hover:bg-white/[0.04] transition-all duration-500 relative overflow-hidden active:scale-[0.98]">
        <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">{label}</span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 ${selectedColor}`}>
                {React.cloneElement(icon, { className: "w-5 h-5" })}
            </div>
        </div>
        <div>
            <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate mb-1">{value}</h4>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${subColor || 'text-zinc-600'}`}>{subValue}</p>
        </div>
    </div>
  )
}

function VerticalInfo({ label, value, icon, color }: any) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                    {icon}
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
            </div>
            <p className={`text-xl font-black italic tracking-tight ${color || 'text-zinc-100'}`}>{value}</p>
        </div>
    )
}
