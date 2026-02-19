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
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl px-2.5 py-2 rounded-xl md:rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 shadow-sm active:scale-95 flex flex-col items-center justify-center text-center">
      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-transform duration-300 group-hover:scale-110 shadow-lg
          ${label === "Hotové Úlohy" ? 'bg-green-500 shadow-green-500/30' : ''}
          ${label === "Kontakty" ? 'bg-blue-500 shadow-blue-500/30' : ''}
          ${label === "Projekty" ? 'bg-indigo-500 shadow-indigo-500/30' : ''}
          ${label === "Hodnota" ? 'bg-emerald-500 shadow-emerald-500/30' : ''}
        `}>
          <Icon 
            className="w-4 h-4 text-white" 
            strokeWidth={3}
          />
        </div>

        <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1 px-1 truncate w-full">
          {label}
        </span>
        <h3 className="text-base font-black text-foreground tracking-tighter leading-none mb-1">
          {value}
        </h3>
        
        {trend ? (
          <div className="text-[8px] font-bold text-emerald-500 flex items-center gap-0.5 bg-emerald-500/10 px-1 py-0.5 rounded-full scale-90 origin-center">
            <TrendingUp className="w-2 h-2" />
            {trend.split(' ')[0]}
          </div>
        ) : (
          <div className="h-2" />
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
