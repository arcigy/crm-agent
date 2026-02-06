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
    <div className="bg-card px-5 py-4 rounded-[1.5rem] border border-border shadow-sm transition-all duration-300 group overflow-hidden relative hover:shadow-[0_0_30px_rgba(99,102,241,0.08)] hover:border-indigo-500/30 hover:-translate-y-0.5">
      {/* Subtle Light-up background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
            {label}
          </p>
          <h3 className="text-2xl font-black text-foreground italic tracking-tight">
            {value}
          </h3>
          {trend && (
            <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        
        <div className={`w-10 h-10 rounded-xl ${color.replace('bg-', 'bg-opacity-10 ')} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-opacity-20`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
