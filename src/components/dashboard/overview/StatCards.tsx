"use client";

import { Users, FolderKanban, TrendingUp, Check } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  glowColor: string;       // tailwind bg color for glow, e.g. "bg-blue-500"
  borderColor: string;     // tailwind border color, e.g. "border-blue-500/30"
  iconBg: string;          // tailwind bg + shadow for icon pill
  textColor: string;       // value text color
}

function StatCard({ label, value, icon: Icon, trend, glowColor, borderColor, iconBg, textColor }: StatCardProps) {
  return (
    <div className={`
      relative overflow-hidden flex flex-col items-center justify-center text-center
      bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl
      rounded-2xl md:rounded-[2rem]
      border ${borderColor} dark:border-opacity-40
      shadow-sm hover:shadow-xl
      transition-all duration-300 ease-out
      hover:-translate-y-1.5 hover:scale-[1.02]
      active:scale-95 cursor-default
      px-3 py-5 md:py-6
      group
    `}>
      {/* ── Neon glow in top-left corner ── */}
      <div className={`
        absolute -top-4 -left-4 w-16 h-16 ${glowColor} opacity-40 rounded-full blur-[28px] 
        transition-all duration-300 group-hover:opacity-70 group-hover:w-20 group-hover:h-20
        pointer-events-none
      `} />

      {/* ── Icon pill ── */}
      <div className={`
        relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center mb-3
        ${iconBg}
        shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]
      `}>
        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>

      {/* ── Label ── */}
      <span className="relative z-10 text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] leading-none mb-1.5">
        {label}
      </span>

      {/* ── Value ── */}
      <h3 className={`relative z-10 text-xl md:text-2xl font-black tracking-tighter leading-none ${textColor} group-hover:scale-105 transition-transform duration-300 origin-center`}>
        {value}
      </h3>

      {/* ── Trend badge ── */}
      {trend ? (
        <div className="relative z-10 mt-2 text-[7px] font-black uppercase text-emerald-500 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
          <TrendingUp className="w-2 h-2" />
          {trend.split(' ')[0]}
        </div>
      ) : (
        <div className="h-3" />
      )}
    </div>
  );
}

export function DashboardStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-3 pt-2 relative z-30 w-full">
      <StatCard
        label="Kontakty"
        value={stats.contactsCount || 0}
        icon={Users}
        trend={stats.contactsTrend}
        glowColor="bg-blue-500"
        borderColor="border-blue-400/30"
        iconBg="bg-blue-500 shadow-blue-500/40"
        textColor="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Projekty"
        value={stats.activeProjects || 0}
        icon={FolderKanban}
        trend={stats.projectsTrend}
        glowColor="bg-indigo-500"
        borderColor="border-indigo-400/30"
        iconBg="bg-indigo-500 shadow-indigo-500/40"
        textColor="text-indigo-600 dark:text-indigo-400"
      />
      <StatCard
        label="Hodnota"
        value={`${(stats.totalDealsValue || 0).toLocaleString()} €`}
        icon={TrendingUp}
        trend={stats.dealsTrend}
        glowColor="bg-emerald-500"
        borderColor="border-emerald-400/30"
        iconBg="bg-emerald-500 shadow-emerald-500/40"
        textColor="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        label="Hotové Úlohy"
        value={stats.completedTasks || 0}
        icon={Check}
        glowColor="bg-violet-500"
        borderColor="border-violet-400/30"
        iconBg="bg-violet-500 shadow-violet-500/40"
        textColor="text-violet-600 dark:text-violet-400"
      />
    </div>
  );
}
