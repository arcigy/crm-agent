"use client";

import * as React from "react";
import { Project } from "@/types/project";
import { ProjectProfileSidebar } from "./projects/ProjectProfileSidebar";
import { ProjectOverview } from "./projects/ProjectOverview";

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDetailModal({
  project,
  isOpen,
  onClose,
}: ProjectDetailModalProps) {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="bg-background w-full max-w-[95vw] sm:max-w-6xl h-[95vh] sm:rounded-[3rem] shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-border dark:border-white/10 transition-colors duration-300">
        <ProjectProfileSidebar project={project} onClose={onClose} />

        <div className="flex-1 flex flex-col bg-background overflow-hidden relative transition-colors">
          <ProjectOverview project={project} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
