"use client";

import * as React from "react";
import {
  Wallet,
  Briefcase,
  Layers,
  Clock,
  Edit2,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import { Project } from "@/types/project";

interface ProjectOverviewProps {
  project: Project;
  onClose: () => void;
}

export function ProjectOverview({ project, onClose }: ProjectOverviewProps) {
  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden relative transition-colors duration-300">
      <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-background shrink-0 transition-colors">
        <div className="flex items-center gap-6">
          <button className="text-sm font-bold text-foreground border-b-2 border-primary pb-5 pt-5">
            Overview
          </button>
          <button className="text-sm font-medium text-zinc-500 hover:text-foreground transition-colors pb-5 pt-5">
            Tasks
          </button>
          <button className="text-sm font-medium text-zinc-500 hover:text-foreground transition-colors pb-5 pt-5">
            Timeline
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30 dark:bg-zinc-900/10 transition-colors">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            <KpiCard
              label="Project Value"
              value={project.value ? `${project.value} €` : "—"}
              icon={<Wallet className="w-4 h-4 text-emerald-600" />}
              trend="+5% vs estimated"
            />
            <KpiCard
              label="Project Stage"
              value={project.stage}
              icon={<Layers className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              label="File Count"
              value="8 Files"
              icon={<FileText className="w-4 h-4 text-purple-600" />}
            />
            <KpiCard
              label="Project Age"
              value="12 days"
              icon={<Clock className="w-4 h-4 text-amber-600" />}
            />
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm min-h-[300px]">
              <h3 className="text-sm font-black uppercase text-zinc-400 mb-4">
                Project Activity
              </h3>
              <div className="flex flex-col items-center justify-center h-48 text-zinc-400 space-y-2">
                <Clock className="w-8 h-8 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-tight">
                  No activity logs yet
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
              <h3 className="text-sm font-black uppercase text-zinc-400 mb-4">
                Internal Notes
              </h3>
              <div className="space-y-4">
                <textarea
                  className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none"
                  placeholder="Add private project notes..."
                />
                <button className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, trend }: any) {
  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          {label}
        </span>
        <div className="p-1.5 bg-zinc-50 dark:bg-slate-800 rounded-md transition-colors">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-xl font-black text-foreground tracking-tight transition-colors truncate block">
          {value}
        </span>
        {trend && (
          <p className="text-[9px] font-bold text-green-600 mt-1">{trend}</p>
        )}
      </div>
    </div>
  );
}
