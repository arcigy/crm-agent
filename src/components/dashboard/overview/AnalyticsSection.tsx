"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function AnalyticsSection({ contacts }: { contacts: any[], deals: any[] }) {
  // 1. Data for Pie Chart (Contacts Status)
  const statusCounts = contacts.reduce((acc: any, c) => {
    const status = c.status || 'lead';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: statusCounts[status]
  }));

  const COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-6 md:p-7 rounded-[2.5rem] border border-border shadow-sm h-full flex flex-col overflow-hidden transition-all duration-300 relative group">
      {/* Subtle Background Glow */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-700" />
      
      <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 flex-shrink-0 relative z-10">Distribúcia Kontaktov</h3>
      
      <div className="flex-1 w-full min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}
              itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 flex-shrink-0 overflow-y-auto max-h-[100px] scrollbar-hide py-1 relative z-10">
        {pieData.map((d, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-white/30 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-sm">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[9px] font-black uppercase tracking-tight text-muted-foreground truncate">
              {d.name}: <span className="text-foreground">{d.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
