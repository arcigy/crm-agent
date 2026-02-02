"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export function AnalyticsSection({ contacts, deals }: { contacts: any[], deals: any[] }) {
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

  // 2. Data for Bar Chart (Deals Value by name)
  const barData = deals.slice(0, 5).map(d => ({
    name: d.name?.substring(0, 8) + '...',
    value: d.value || 0
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Contact Distribution Pie */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm h-[400px] flex flex-col">
        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-center lg:text-left">Distribúcia Kontaktov</h3>
        <div className="flex-1 w-full">
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
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{d.name}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deals Bar Chart */}
      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm h-[400px] flex flex-col">
        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-center lg:text-left">Top Obchody (€)</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
              />
              <Tooltip 
                cursor={{ fill: '#F1F5F9' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar 
                dataKey="value" 
                fill="#2563eb" 
                radius={[8, 8, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
