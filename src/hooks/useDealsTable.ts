"use client";

import * as React from "react";
import { SortingState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Deal } from "@/types/deal";
import { Project } from "@/types/project";
import { Lead } from "@/types/contact";
import { updateProject, updateProjectStage } from "@/app/actions/projects";

export function useDealsTable(
  initialDeals: Deal[],
  initialProjects: Project[],
  contacts: Lead[],
) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [currentProjects, setCurrentProjects] = React.useState(initialProjects);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [priceFilter, setPriceFilter] = React.useState<string>("all");
  const [uninvoicedOnly, setUninvoicedOnly] = React.useState(false);

  // Modals state
  const [driveProject, setDriveProject] = React.useState<{
    id: number;
    name: string;
    folderId?: string;
  } | null>(null);
  const [invoicingProject, setInvoicingProject] =
    React.useState<Project | null>(null);
  const [payingProject, setPayingProject] = React.useState<Project | null>(
    null,
  );

  const tableData = React.useMemo(() => {
    const data = currentProjects.map((project) => {
      const deal = initialDeals.find(
        (d) => d.project_id === project.id || d.name === project.name,
      );

      let contactName = project.contact_name;
      if (!contactName || contactName === "Neznámy") {
        const contact = contacts.find(
          (c) => String(c.id) === String(project.contact_id),
        );
        if (contact) {
          contactName = `${contact.first_name} ${contact.last_name}`;
        }
      }

      return {
        id: deal?.id || -project.id,
        name: project.name,
        value: project.value ?? deal?.value ?? 0,
        paid: project.paid ?? deal?.paid ?? false,
        invoice_date: project.invoice_date ?? deal?.invoice_date,
        due_date: project.due_date ?? deal?.due_date,
        contact_id: project.contact_id,
        project_id: project.id,
        date_created: project.date_created,
        project: { ...project, contact_name: contactName },
      };
    });

    return data.filter((item) => {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        (item.name || "").toLowerCase().includes(search) ||
        (item.project?.contact_name || "").toLowerCase().includes(search) ||
        (item.project?.project_type || "").toLowerCase().includes(search);

      if (!matchesSearch) return false;
      if (stageFilter !== "all" && item.project?.stage !== stageFilter)
        return false;
      if (uninvoicedOnly && item.invoice_date) return false;

      if (priceFilter !== "all") {
        const val = item.value || 0;
        if (priceFilter === "less_5" && val >= 5) return false;
        if (priceFilter === "more_5" && val < 5) return false;
        if (priceFilter === "zero" && val !== 0) return false;
        if (priceFilter === "high" && val < 1000) return false;
      }

      return true;
    });
  }, [
    initialDeals,
    currentProjects,
    contacts,
    searchQuery,
    stageFilter,
    priceFilter,
    uninvoicedOnly,
  ]);

  const handleUpdateProjectStage = async (id: number, newStage: string) => {
    setCurrentProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage: newStage } : p)),
    );
    await updateProjectStage(id, newStage);
  };

  const handleUpdateProjectValue = async (
    projectId: number,
    numVal: number,
  ) => {
    const res = await updateProject(projectId, { value: numVal });
    if (res.success) {
      toast.success("Suma nastavená");
      setCurrentProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, value: numVal } : p)),
      );
      return true;
    } else {
      toast.error("Chyba: " + res.error);
      return false;
    }
  };

  const handleTogglePaidStatus = async (projectId: number, paid: boolean) => {
    const res = await updateProject(projectId, { paid });
    if (res.success) {
      toast.success(
        paid ? "Označené ako zaplatené" : "Stav vrátený na čakajúcu platbu",
      );
      setCurrentProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, paid } : p)),
      );
      return true;
    }
    return false;
  };

  const handleInvoiceProject = async (projectId: number, data: any) => {
    const res = await updateProject(projectId, data);
    if (res.success) {
      toast.success("Faktúra úspešne vygenerovaná");
      setCurrentProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, ...data } : p)),
      );
      return true;
    }
    return false;
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStageFilter("all");
    setPriceFilter("all");
    setUninvoicedOnly(false);
  };

  return {
    tableData,
    sorting,
    setSorting,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    priceFilter,
    setPriceFilter,
    uninvoicedOnly,
    setUninvoicedOnly,
    driveProject,
    setDriveProject,
    invoicingProject,
    setInvoicingProject,
    payingProject,
    setPayingProject,
    handleUpdateProjectStage,
    handleUpdateProjectValue,
    handleTogglePaidStatus,
    handleInvoiceProject,
    resetFilters,
  };
}
