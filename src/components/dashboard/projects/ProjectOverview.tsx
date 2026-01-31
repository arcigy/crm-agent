"use client";

import * as React from "react";

import {
  Wallet,
  Briefcase,
  Layers,
  Clock,
  Edit2,
  Trash2,
  X,
  FileText,
  Receipt,
  CheckCircle,
  Calendar,
  Zap,
} from "lucide-react";
import { Project } from "@/types/project";

interface ProjectOverviewProps {
  project: Project;
  onClose: () => void;
}

export function ProjectOverview({ project, onClose }: ProjectOverviewProps) {
  // Simple age calculation
  const createdDate = new Date(project.date_created);
  const ageDays = Math.floor(
    (new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24),
  );

  return (
    <div className="overflow-y-auto p-8 bg-zinc-50/30 dark:bg-zinc-900/10 transition-colors custom-scrollbar h-full">
      <div className="grid grid-cols-12 gap-6">
        {/* KPI Row */}
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <KpiCard
            label="Hodnota projektu"
            value={project.value ? `${project.value} €` : "—"}
            icon={<Wallet className="w-4 h-4 text-emerald-600" />}
            trend={project.paid ? "Plne uhradené" : "Čaká na úhradu"}
            trendClass={project.paid ? "text-emerald-500" : "text-amber-500"}
          />
          <KpiCard
            label="Aktuálne Štádium"
            value={project.stage}
            icon={<Layers className="w-4 h-4 text-blue-600" />}
            trend="Aktívne"
          />
          <KpiCard
            label="Vek Projektu"
            value={`${ageDays} dní`}
            icon={<Clock className="w-4 h-4 text-purple-600" />}
            trend={`Vytvorené ${createdDate.toLocaleDateString("sk-SK")}`}
          />
          <KpiCard
            label="Identifikátor"
            value={`ID-${project.id}`}
            icon={<Zap className="w-4 h-4 text-amber-600" />}
            trend="Pridelené systémom"
          />
        </div>

        {/* Main Content Sections */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Financial Details Card */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <h3 className="text-xs font-black uppercase text-zinc-400 mb-6 flex items-center gap-2 tracking-widest">
              <Receipt className="w-4 h-4" /> Finančné detaily
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <DetailBox
                label="Stav platby"
                value={project.paid ? "Uhradené" : "Neuhradené"}
                icon={
                  project.paid ? (
                    <CheckCircle className="text-emerald-500" />
                  ) : (
                    <Clock className="text-amber-500" />
                  )
                }
              />
              <DetailBox
                label="Dátum fakturácie"
                value={
                  project.invoice_date
                    ? new Date(project.invoice_date).toLocaleDateString("sk-SK")
                    : "—"
                }
                icon={<Calendar className="text-zinc-400" />}
              />
              <DetailBox
                label="Splatnosť faktúry"
                value={
                  project.due_date
                    ? new Date(project.due_date).toLocaleDateString("sk-SK")
                    : "—"
                }
                icon={<Clock className="text-zinc-400" />}
              />
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm min-h-[300px]">
            <h3 className="text-xs font-black uppercase text-zinc-400 mb-4 tracking-widest">
              Projektová aktivita
            </h3>
            <div className="flex flex-col items-center justify-center h-48 text-zinc-400 space-y-2 opacity-30">
              <Clock className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-tight">
                História zmien je prázdna
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Sections within Overview */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <h3 className="text-xs font-black uppercase text-zinc-400 mb-4 tracking-widest">
              Interné poznámky
            </h3>
            <div className="space-y-4">
              <textarea
                className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-xs focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                placeholder="Sem napíšte súkromné poznámky k projektu..."
              />
              <button className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md">
                Uložiť poznámku
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">
                Rýchly prehľad
              </h3>
            </div>
            <p className="text-xs opacity-90 leading-relaxed font-medium">
              Tento projekt bol vytvorený pred {ageDays} dňami. Všetky dokumenty
              a úlohy nájdete v príslušných záložkách vyššie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value, icon }: any) {
  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
      <div className="flex items-center gap-2 mb-2">
        {React.cloneElement(icon, { className: "w-3 h-3" })}
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function KpiCard({ label, value, icon, trend, trendClass }: any) {
  return (
    <div className="bg-card p-4 rounded-3xl border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
          {label}
        </span>
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-xl font-black text-foreground tracking-tight transition-colors truncate block">
          {value}
        </span>
        {trend && (
          <p
            className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${trendClass || "text-zinc-400"}`}
          >
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
