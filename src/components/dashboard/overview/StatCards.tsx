"use client";

import { Users, FolderKanban, TrendingUp, Check } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}

function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-zinc-900/60 backdrop-blur-xl px-4 py-6 rounded-[2.5rem] border border-black/[0.08] dark:border-white/[0.08] transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 shadow-sm active:scale-95 flex flex-col items-center justify-center text-center`}>
      {/* Soft Radial Glow */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 shadow-sm
          ${label === "Hotové Úlohy" ? 'bg-green-500 text-white shadow-green-500/20' : ''}
          ${label === "Kontakty" ? 'bg-blue-500/10 text-blue-500' : ''}
          ${label === "Projekty" ? 'bg-indigo-500/10 text-indigo-500' : ''}
          ${label === "Hodnota" ? 'bg-emerald-500/10 text-emerald-500' : ''}
        `}>
          <Icon 
            className="w-7 h-7" 
            strokeWidth={label === "Hotové Úlohy" ? 3.5 : 2.5}
          />
        </div>

        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] italic mb-1 opacity-60">
          {label}
        </span>
        <h3 className="text-2xl font-black text-foreground italic tracking-tighter leading-none mb-2">
          {value}
        </h3>
        
        {trend ? (
          <div className="text-[10px] font-black italic text-emerald-500 mt-1 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
            <TrendingUp className="w-3 h-3" />
            {trend.split(' ')[0]}
          </div>
        ) : (
          <div className="h-[21px] mt-1" />
        )}
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-3 md:mb-8 pt-2 relative z-30 w-full">
      <StatCard
        label="Kontakty"
        value={stats.contactsCount || 0}
        icon={Users}
        color="bg-blue-500"
        trend={stats.contactsTrend}
      />
      <StatCard
        label="Projekty"
        value={stats.activeProjects || 0}
        icon={FolderKanban}
        color="bg-indigo-500"
        trend={stats.projectsTrend}
      />
      <StatCard
        label="Hodnota"
        value={`${(stats.totalDealsValue || 0).toLocaleString()} €`}
        icon={TrendingUp}
        color="bg-emerald-500"
        trend={stats.dealsTrend}
      />
      <StatCard
        label="Hotové Úlohy"
        value={stats.completedTasks || 0}
        icon={Check}
        color="bg-green-500"
      />
    </div>
  );
}
