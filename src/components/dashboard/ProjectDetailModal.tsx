"use client";

import * as React from "react";
import { Project } from "@/types/project";
import { ProjectProfileSidebar } from "./projects/ProjectProfileSidebar";
import { ProjectOverview } from "./projects/ProjectOverview";
import { RelatedTasks } from "./RelatedTasks";
import { DriveViewer } from "./projects/DriveViewer";
import { X, LayoutDashboard, CheckSquare, FolderOpen } from "lucide-react";

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "overview" | "tasks" | "documents";
}

export function ProjectDetailModal({
  project,
  isOpen,
  onClose,
  initialTab = "overview",
}: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "tasks" | "documents"
  >(initialTab);

  React.useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center animate-in fade-in duration-500">
      <div
        className="absolute inset-0 bg-black"
        onClick={onClose}
      />

      <div className="bg-[#0a0a0c] w-full h-full relative flex overflow-hidden animate-in zoom-in-100 duration-500">
        <ProjectProfileSidebar
          project={project}
          onClose={onClose}
          onTabChange={(tab: any) => setActiveTab(tab)}
        />

        <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-hidden">
          {/* Main Content Header / Neon Tabs */}
          <div className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 shrink-0">
            <div className="flex items-center gap-10 h-full">
              <button
                onClick={() => setActiveTab("overview")}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all h-full relative group ${activeTab === "overview" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Prehľad
                {activeTab === "overview" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all h-full relative group ${activeTab === "tasks" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Úlohy
                {activeTab === "tasks" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all h-full relative group ${activeTab === "documents" ? "text-white" : "text-zinc-500 hover:text-white"}`}
              >
                Súbory
                {activeTab === "documents" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative pt-10">
            {activeTab === "overview" && (
                <ProjectOverview project={project} onClose={onClose} />
            )}
            {activeTab === "tasks" && (
              <div className="p-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]" />
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                    Projektové Úlohy
                    </h3>
                </div>
                <RelatedTasks entityId={project.id} type="project" />
              </div>
            )}
            {activeTab === "documents" && (
              <div className="h-full overflow-hidden">
                <DriveViewer
                  projectId={project.id}
                  projectName={project.name}
                  folderId={project.drive_folder_id}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
