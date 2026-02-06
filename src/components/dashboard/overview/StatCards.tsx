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
    <div className="bg-card px-4 py-3 rounded-[1.2rem] border border-border shadow-sm transition-all duration-300 group overflow-hidden relative hover:shadow-[0_0_30px_rgba(99,102,241,0.08)] hover:border-indigo-500/30 hover:-translate-y-0.5">
      {/* Subtle Light-up background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
            {label}
          </p>
          <h3 className="text-xl font-black text-foreground italic tracking-tight">
            {value}
          </h3>
          {trend && (
            <p className="text-[9px] font-bold text-emerald-500 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              {trend}
            </p>
          )}
        </div>
        
        <div className={`w-8 h-8 rounded-lg ${color.replace('bg-', 'bg-opacity-10 ')} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-opacity-20`}>
          <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transition-all duration-500 ease-in-out">
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
