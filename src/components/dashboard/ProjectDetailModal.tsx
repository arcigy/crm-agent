"use client";

import * as React from "react";
import { Project } from "@/types/project";
import { ProjectProfileSidebar } from "./projects/ProjectProfileSidebar";
import { ProjectOverview } from "./projects/ProjectOverview";
import { RelatedTasks } from "./RelatedTasks";
import { DriveViewer } from "./projects/DriveViewer";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-background w-full max-w-[95vw] sm:max-w-6xl h-[95vh] sm:rounded-[3rem] shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-border dark:border-white/10 transition-colors duration-300">
        <ProjectProfileSidebar
          project={project}
          onClose={onClose}
          onTabChange={(tab) => setActiveTab(tab)}
        />

        <div className="flex-1 flex flex-col bg-background overflow-hidden relative transition-colors">
          {/* Main Content Header / Tabs */}
          <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-background shrink-0 transition-colors">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "overview" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Prehľad
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "tasks" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Úlohy
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`text-sm font-bold transition-all border-b-2 pb-5 pt-5 ${activeTab === "documents" ? "text-foreground border-primary" : "text-zinc-500 border-transparent hover:text-foreground"}`}
              >
                Documents
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {activeTab === "overview" && (
              <div className="h-full overflow-y-auto">
                <ProjectOverview project={project} onClose={onClose} />
              </div>
            )}
            {activeTab === "tasks" && (
              <div className="h-full overflow-y-auto p-8 bg-zinc-50/10 transition-all">
                <h3 className="text-sm font-black uppercase text-zinc-400 mb-6 tracking-widest">
                  Projektové Úlohy
                </h3>
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
