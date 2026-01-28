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
      <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-background shrink-0 transition-colors">
        <div className="flex items-center gap-6">
          <button className="text-sm font-bold text-foreground border-b-2 border-primary pb-5 pt-5">
            Overview
          </button>
          <button className="text-sm font-medium text-gray-500 hover:text-foreground transition-colors pb-5 pt-5">
            Documents
          </button>
          <button className="text-sm font-medium text-gray-500 hover:text-foreground transition-colors pb-5 pt-5">
            Invoices
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-foreground hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-foreground hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

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
