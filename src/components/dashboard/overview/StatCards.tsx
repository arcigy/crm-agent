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
    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-3xl px-3 py-5 md:px-5 md:py-6 rounded-[2.5rem] border border-black/5 dark:border-white/10 transition-all duration-300 group overflow-hidden relative hover:bg-white/80 dark:hover:bg-white/10 hover:-translate-y-1 shadow-xl shadow-black/5 dark:shadow-none">
      {/* 1. Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }} 
      />

      {/* 2. Soft Radial Glows */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20 transition-all duration-700" />
      
      <div className="flex flex-col items-center justify-center text-center relative z-10 w-full pt-1">
        <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110 mb-3 border border-white/10 shadow-lg
          ${label === "Hotové Úlohy" 
            ? 'bg-green-500 text-white shadow-green-500/40 border-green-400/50' 
            : label === "Kontakty" ? 'bg-blue-500/10 text-blue-500'
            : label === "Projekty" ? 'bg-indigo-500/10 text-indigo-500'
            : 'bg-emerald-500/10 text-emerald-500'
          }
        `}>
          <Icon 
            className="w-7 h-7" 
            strokeWidth={label === "Hotové Úlohy" ? 3.5 : 2.5}
          />
        </div>

        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-1 opacity-60">
          {label}
        </p>
        <h3 className="text-2xl font-black text-foreground italic tracking-tighter leading-none mb-2">
          {value}
        </h3>
        
        {trend ? (
          <p className="text-[10px] font-black italic text-emerald-500 mt-1 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </p>
        ) : (
          <div className="h-[21px] mt-1" />
        )}
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8 pt-2 transition-all duration-300 ease-in-out relative z-30">
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
