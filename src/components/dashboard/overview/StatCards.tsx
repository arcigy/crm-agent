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
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl px-3 py-3 rounded-2xl md:rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 shadow-sm active:scale-95 flex flex-col items-center justify-center text-center">
      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover:scale-110 shadow-lg
          ${label === "Hotové Úlohy" ? 'bg-green-500 shadow-green-500/30' : ''}
          ${label === "Kontakty" ? 'bg-blue-500 shadow-blue-500/30' : ''}
          ${label === "Projekty" ? 'bg-indigo-500 shadow-indigo-500/30' : ''}
          ${label === "Hodnota" ? 'bg-emerald-500 shadow-emerald-500/30' : ''}
        `}>
          <Icon 
            className="w-5 h-5 text-white" 
            strokeWidth={3}
          />
        </div>

        <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1.5 px-2 truncate w-full">
          {label}
        </span>
        <h3 className="text-lg font-black text-foreground tracking-tighter leading-none mb-1.5">
          {value}
        </h3>
        
        {trend ? (
          <div className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
            <TrendingUp className="w-2.5 h-2.5" />
            {trend.split(' ')[0]}
          </div>
        ) : (
          <div className="h-[18px]" />
        )}
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 pt-2 relative z-30 md:max-w-5xl mx-auto w-full">
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
