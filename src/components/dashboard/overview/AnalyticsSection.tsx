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
    <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm h-full flex flex-col overflow-hidden">
      <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-center lg:text-left flex-shrink-0">Distribúcia Kontaktov</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-2 flex-shrink-0 overflow-y-auto max-h-[80px] scrollbar-hide">
        {pieData.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
