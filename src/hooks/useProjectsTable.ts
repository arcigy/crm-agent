"use client";

import * as React from "react";
import { SortingState } from "@tanstack/react-table";
import { Project } from "@/types/project";
import { Lead } from "@/types/contact";
import { toast } from "sonner";

export function useProjectsTable(data: Project[], contacts: Lead[]) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [isMounted, setIsMounted] = React.useState(false);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [detailContact, setDetailContact] = React.useState<Lead | null>(null);
  const [fullDetailProject, setFullDetailProject] =
    React.useState<Project | null>(null);
  const [fullDetailTab, setFullDetailTab] = React.useState<
    "overview" | "tasks" | "documents"
  >("overview");

  React.useEffect(() => {
    setIsMounted(true);
    const handleOpenContactDetail = (e: any) => setDetailContact(e.detail);
    const handleOpenCreateProject = () => setIsModalOpen(true);

    window.addEventListener("open-contact-detail", handleOpenContactDetail);
    window.addEventListener("open-create-project", handleOpenCreateProject);

    return () => {
      window.removeEventListener(
        "open-contact-detail",
        handleOpenContactDetail,
      );
      window.removeEventListener(
        "open-create-project",
        handleOpenCreateProject,
      );
    };
  }, []);

  const handleStageChange = async (id: number, stage: any) => {
    const { updateProjectStage } = await import("@/app/actions/projects");
    await updateProjectStage(id, stage);
    toast.success("Štádium upravené");
  };

  const handleExport = () => {
    const headers = [
      "ID",
      "Name",
      "Type",
      "Contact",
      "Stage",
      "Value",
      "End Date",
    ];
    const csvContent = [
      headers.join(","),
      ...data.map((p) =>
        [
          p.id,
          `"${p.name}"`,
          p.project_type,
          `"${p.contact_name}"`,
          p.stage,
          p.value,
          p.end_date,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `projects_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export hotový");
  };

  return {
    sorting,
    setSorting,
    globalFilter,
    setGlobalFilter,
    isMounted,
    isModalOpen,
    setIsModalOpen,
    detailContact,
    setDetailContact,
    fullDetailProject,
    setFullDetailProject,
    fullDetailTab,
    setFullDetailTab,
    handleStageChange,
    handleExport,
    handleCreateProject: async (data: any) => {
      const { createProject } = await import("@/app/actions/projects/mutate");
      const res = await createProject(data);
      if (res.success) {
        toast.success("Projekt vytvorený");
        setIsModalOpen(false);
      } else {
        toast.error(res.error || "Chyba pri vytváraní");
      }
    }
  };
}
