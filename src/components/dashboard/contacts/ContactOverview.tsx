"use client";

import * as React from "react";
import {
  Wallet,
  Briefcase,
  MessageSquare,
  Clock,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { Lead } from "@/types/contact";

interface ContactOverviewProps {
  contact: Lead;
  onClose: () => void;
  children: React.ReactNode;
}

export function ContactOverview({
  contact,
  onClose,
  children,
}: ContactOverviewProps) {
  const totalDealValue =
    contact.deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden relative transition-colors duration-300">
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-900/10 transition-colors">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            <KpiCard
              label="Total Deals Value"
              value={`$${totalDealValue.toLocaleString()}`}
              icon={<Wallet className="w-4 h-4 text-green-600" />}
              trend="+12% vs last month"
            />
            <KpiCard
              label="Open Deals"
              value={String(contact.deals?.length || 0)}
              icon={<Briefcase className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              label="Total Interactions"
              value={String(contact.activities?.length || 0)}
              icon={<MessageSquare className="w-4 h-4 text-purple-600" />}
            />
            <KpiCard
              label="Last Contact"
              value="2 days ago"
              icon={<Clock className="w-4 h-4 text-amber-600" />}
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, trend }: any) {
  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
        <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-md transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-xl font-black text-foreground tracking-tight transition-colors">
          {value}
        </span>
        {trend && (
          <p className="text-[9px] font-bold text-green-600 mt-1">{trend}</p>
        )}
      </div>
    </div>
  );
}
