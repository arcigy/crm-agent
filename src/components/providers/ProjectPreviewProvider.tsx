"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ProjectDetailModal } from "@/components/dashboard/ProjectDetailModal";
import { getProject } from "@/app/actions/projects";
import { toast } from "sonner";
import { Project } from "@/types/project";

interface ProjectPreviewContextType {
  openProject: (id: string | number) => void;
  closeProject: () => void;
}

const ProjectPreviewContext = createContext<
  ProjectPreviewContextType | undefined
>(undefined);

export function useProjectPreview() {
  const context = useContext(ProjectPreviewContext);
  if (!context) {
    throw new Error(
      "useProjectPreview must be used within a ProjectPreviewProvider",
    );
  }
  return context;
}

export function ProjectPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | number | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const openProject = (id: string | number) => {
    setProjectId(id);
    setIsOpen(true);
  };

  const closeProject = () => {
    setIsOpen(false);
    setTimeout(() => {
      setProjectId(null);
      setProject(null);
    }, 300);
  };

  useEffect(() => {
    if (projectId && isOpen) {
      getProject(projectId).then((res) => {
        if (res.success && res.data) {
          setProject(res.data);
        } else {
          toast.error("Projekt nenájdený");
          closeProject();
        }
      });
    }
  }, [projectId, isOpen]);

  return (
    <ProjectPreviewContext.Provider value={{ openProject, closeProject }}>
      {children}
      <ProjectDetailModal
        project={project}
        isOpen={isOpen}
        onClose={closeProject}
      />
    </ProjectPreviewContext.Provider>
  );
}
