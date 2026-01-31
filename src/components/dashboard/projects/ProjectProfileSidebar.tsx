"use client";

import * as React from "react";
import {
  FolderKanban,
  Calendar,
  ExternalLink,
  Tag,
  Clock,
  DollarSign,
  X,
  FileCode,
} from "lucide-react";
import { Project, PROJECT_STAGES } from "@/types/project";

interface ProjectProfileSidebarProps {
  project: Project;
  onClose: () => void;
}

export function ProjectProfileSidebar({
  project,
  onClose,
}: ProjectProfileSidebarProps) {
  const initials = project.project_type?.[0] || project.name?.[0] || "P";
  const stageInfo = PROJECT_STAGES.find((s) => s.value === project.stage);

  return (
    <div className="w-80 lg:w-96 bg-sidebar border-r border-border flex flex-col shrink-0 overflow-y-auto transition-all duration-300">
      <div className="h-32 bg-gradient-to-br from-purple-800 to-indigo-900 relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full sm:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 relative">
        <div className="-mt-12 mb-4 w-24 h-24 rounded-3xl bg-card p-1.5 shadow-xl transition-colors">
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-black text-3xl uppercase">
            {initials}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground leading-tight mb-1">
            {project.project_type || project.name}
          </h2>
          <p
            className={`text-xs font-black uppercase px-2 py-0.5 rounded-full inline-block ${stageInfo?.color || "bg-gray-100"}`}
          >
            {stageInfo?.label || project.stage}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8 relative">
          <button
            onClick={() =>
              project.drive_folder_id &&
              window.open(
                `https://drive.google.com/drive/folders/${project.drive_folder_id}`,
                "_blank",
              )
            }
            className="flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
            disabled={!project.drive_folder_id}
          >
            <FolderKanban className="w-4 h-4" />{" "}
            <span className="text-xs font-bold">Files</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-2.5 bg-card border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-xl shadow-sm transition-colors">
            <Calendar className="w-4 h-4" />{" "}
            <span className="text-xs font-bold">Event</span>
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Project Info
          </h3>
          <InfoRow
            icon={<FileCode />}
            label="Type"
            value={project.project_type}
          />
          <InfoRow
            icon={<Clock />}
            label="Due Date"
            value={
              project.end_date
                ? new Date(project.end_date).toLocaleDateString("sk-SK")
                : "—"
            }
          />
          <InfoRow
            icon={<DollarSign />}
            label="Budget"
            value={project.value ? `${project.value} €` : "—"}
            valueClass="text-emerald-600 font-black"
          />
          <InfoRow
            icon={<Tag />}
            label="Contact"
            value={project.contact_name}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, copyable, valueClass }: any) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 bg-card border border-border shadow-sm shrink-0 transition-colors">
        {React.cloneElement(icon, { className: "w-3.5 h-3.5" })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p
          className={`text-xs font-semibold text-foreground truncate ${valueClass || ""}`}
        >
          {value || "—"}
        </p>
      </div>
      {copyable && value && (
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-xs text-zinc-400 hover:text-foreground transition-all"
        >
          Copy
        </button>
      )}
    </div>
  );
}
