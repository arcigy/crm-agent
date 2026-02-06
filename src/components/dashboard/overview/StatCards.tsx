"use client";

import { Users, FolderKanban, TrendingUp, CheckCircle2 } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}

function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div className="bg-white/40 dark:bg-[#0a0a0c]/60 backdrop-blur-2xl px-5 py-4 rounded-[2rem] border border-border/50 shadow-2xl transition-all duration-500 group overflow-hidden relative hover:shadow-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-1">
      {/* 1. Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }} 
      />

      {/* 2. Soft Radial Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-1 opacity-70">
            {label}
          </p>
          <h3 className="text-2xl font-black text-foreground italic tracking-tighter">
            {value}
          </h3>
          {trend && (
            <p className="text-[10px] font-black italic text-emerald-500 mt-1.5 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-2xl ${color.replace('bg-', 'bg-opacity-10 ')} flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-opacity-20 border border-white/5 shadow-xl`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 pt-2 transition-all duration-500 ease-in-out relative z-30">
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
        icon={CheckCircle2}
        color="bg-orange-500"
      />
    </div>
  );
}
