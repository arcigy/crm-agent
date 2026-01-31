"use client";

import * as React from "react";
import {
  FolderKanban,
  Calendar,
  ExternalLink,
  Clock,
  DollarSign,
  X,
  User,
} from "lucide-react";

import { Project, PROJECT_STAGES } from "@/types/project";
import { useContactPreview } from "@/components/providers/ContactPreviewProvider";

interface ProjectProfileSidebarProps {
  project: Project;
  onClose: () => void;
  onTabChange?: (tab: "overview" | "tasks" | "documents") => void;
}

export function ProjectProfileSidebar({
  project,
  onClose,
  onTabChange,
}: ProjectProfileSidebarProps) {
  const { openContact } = useContactPreview();
  const initials = project.project_type?.[0] || project.name?.[0] || "P";
  const stageInfo = PROJECT_STAGES.find((s) => s.value === project.stage);

  const handleContactClick = () => {
    if (project.contact_id) {
      const cid =
        typeof project.contact_id === "object"
          ? (project.contact_id as any).id
          : project.contact_id;
      if (cid) openContact(cid);
    }
  };

  return (
    <div className="w-80 lg:w-96 bg-sidebar border-r border-border flex flex-col shrink-0 overflow-y-auto transition-all duration-300 select-none">
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
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
            Projekt #{project.id}
          </div>
          <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
            {project.project_type || project.name}
          </h2>
          <div
            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${stageInfo?.color || "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {stageInfo?.label || project.stage}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8 relative">
          <button
            onClick={() => onTabChange?.("documents")}
            className="flex items-center justify-center gap-2 p-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <FolderKanban className="w-4 h-4" />{" "}
            <span className="text-xs font-bold">Súbory</span>
          </button>
          <button
            onClick={() => onTabChange?.("tasks")}
            className="flex items-center justify-center gap-2 p-2.5 bg-card border border-border hover:bg-zinc-50 dark:hover:bg-zinc-800 text-foreground rounded-xl shadow-sm transition-colors"
          >
            <Calendar className="w-4 h-4" />{" "}
            <span className="text-xs font-bold">Úlohy</span>
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Projektové detaily
          </h3>
          <InfoRow
            icon={<User />}
            label="Zodpovedný kontakt"
            value={project.contact_name || "Nezadaný kontakt"}
            valueClass={
              project.contact_name
                ? "text-blue-600 dark:text-blue-400 group-hover:underline"
                : "text-zinc-400 font-medium"
            }
            onClick={project.contact_id ? handleContactClick : undefined}
          />
          <InfoRow
            icon={<Clock />}
            label="Termín dokončenia"
            value={
              project.end_date
                ? new Date(project.end_date).toLocaleDateString("sk-SK")
                : "Termín neurčený"
            }
          />
          <InfoRow
            icon={<DollarSign />}
            label="Rozpočet / Hodnota"
            value={project.value ? `${project.value} €` : "Bez hodnoty"}
            valueClass={project.value ? "text-emerald-600 font-bold" : ""}
          />
          <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
          <InfoRow
            icon={<Calendar />}
            label="Vytvorené"
            value={new Date(project.date_created).toLocaleDateString("sk-SK")}
          />
          {project.updated_at && (
            <InfoRow
              icon={<ExternalLink />}
              label="Posledná úprava"
              value={new Date(project.updated_at).toLocaleDateString("sk-SK")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, copyable, valueClass, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 group select-none ${onClick ? "cursor-pointer active:opacity-70" : ""}`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 bg-card border border-border shadow-sm shrink-0 transition-colors group-hover:bg-blue-500/10 group-hover:text-blue-500">
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
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(value);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-xs text-zinc-400 hover:text-foreground transition-all"
        >
          Copy
        </button>
      )}
    </div>
  );
}
