"use client";

import * as React from "react";
import { SortingState, GroupingState } from "@tanstack/react-table";
import { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { Lead } from "@/types/contact";
import { updateContact } from "@/app/actions/contacts";

export function useContactsTable(data: Lead[]) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [grouping, setGrouping] = React.useState<GroupingState>(["status"]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [isMounted, setIsMounted] = React.useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"form" | "json">("form");
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [qrPhone, setQrPhone] = React.useState<string | null>(null);
  const [detailContact, setDetailContact] = React.useState<Lead | null>(null);
  const [fullDetailContact, setFullDetailContact] = React.useState<Lead | null>(
    null,
  );
  const [projectsContact, setProjectsContact] = React.useState<Lead | null>(
    null,
  );
  const [isGoogleImportOpen, setIsGoogleImportOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const handleOpenQr = (e: any) => setQrPhone(e.detail);
    const handleOpenDetail = (e: any) => setDetailContact(e.detail);
    const handleOpenFullDetail = (e: any) => setFullDetailContact(e.detail);
    const handleOpenProjects = (e: any) => setProjectsContact(e.detail);
    const handleOpenCreate = (e: any) => {
      setModalMode(e.detail || "form");
      setIsModalOpen(true);
    };
    const handleOpenImport = () => setIsImportModalOpen(true);
    const handleOpenGoogleImport = () => setIsGoogleImportOpen(true);

    window.addEventListener("open-qr", handleOpenQr);
    window.addEventListener("open-activity-detail", handleOpenDetail);
    window.addEventListener("open-contact-detail", handleOpenFullDetail);
    window.addEventListener("open-project-detail", handleOpenProjects);
    window.addEventListener("open-create-contact", handleOpenCreate);
    window.addEventListener("open-import-contact", handleOpenImport);
    window.addEventListener("open-import-google", handleOpenGoogleImport);

    return () => {
      window.removeEventListener("open-qr", handleOpenQr);
      window.removeEventListener("open-activity-detail", handleOpenDetail);
      window.removeEventListener("open-contact-detail", handleOpenFullDetail);
      window.removeEventListener("open-project-detail", handleOpenProjects);
      window.removeEventListener("open-create-contact", handleOpenCreate);
      window.removeEventListener("open-import-contact", handleOpenImport);
      window.removeEventListener("open-import-google", handleOpenGoogleImport);
    };
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const contact = activeData?.contact as Lead;

    if (overData?.type === "group") {
      const targetStatus = overData.status as string;
      if (contact && targetStatus && contact.status !== targetStatus) {
        const promise = updateContact(contact.id, { status: targetStatus });
        toast.promise(promise, {
          loading: "Updating contact status...",
          success: "Status updated successfully",
          error: (err) => "Failed to update status: " + err.message,
        });
        await promise;
        window.location.reload();
        return;
      }
    }

    if (active.id !== over.id && overData?.type === "row") {
      const overContact = overData.contact as Lead;
      if (contact.status !== overContact.status) {
        await updateContact(contact.id, { status: overContact.status });
      }
      toast.info("Sorting saved (Simulated)");
      window.location.reload();
    }
  };

  return {
    sorting,
    setSorting,
    grouping,
    setGrouping,
    globalFilter,
    setGlobalFilter,
    isMounted,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    isImportModalOpen,
    setIsImportModalOpen,
    qrPhone,
    setQrPhone,
    detailContact,
    setDetailContact,
    fullDetailContact,
    setFullDetailContact,
    projectsContact,
    setProjectsContact,
    isGoogleImportOpen,
    setIsGoogleImportOpen,
    handleDragEnd,
  };
}
