"use client";

import * as React from "react";
import { SortingState, GroupingState } from "@tanstack/react-table";
import { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { Lead } from "@/types/contact";
import { updateContact } from "@/app/actions/contacts";

export function useContactsTable(data: Lead[]) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [rowOrder, setRowOrder] = React.useState<string[]>([]);
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>({});
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
    
    // Load persisted table state
    const savedColumnOrder = localStorage.getItem("contacts_column_order");
    const savedSizing = localStorage.getItem("contacts_column_sizing");
    const savedRowOrder = localStorage.getItem("contacts_row_order");
    
    if (savedColumnOrder) {
      try { setColumnOrder(JSON.parse(savedColumnOrder)); } catch (e) { console.error(e); }
    }
    if (savedSizing) {
      try { setColumnSizing(JSON.parse(savedSizing)); } catch (e) { console.error(e); }
    }
    if (savedRowOrder) {
      try { setRowOrder(JSON.parse(savedRowOrder)); } catch (e) { console.error(e); }
    }

    const handleOpenQr = (e: CustomEvent) => setQrPhone(e.detail);
    const handleOpenDetail = (e: CustomEvent) => setDetailContact(e.detail);
    const handleOpenFullDetail = (e: CustomEvent) => setFullDetailContact(e.detail);
    const handleOpenProjects = (e: CustomEvent) => setProjectsContact(e.detail);
    const handleOpenCreate = (e: CustomEvent) => {
      setModalMode(e.detail || "form");
      setIsModalOpen(true);
    };
    const handleOpenImport = () => setIsImportModalOpen(true);
    const handleOpenGoogleImport = () => setIsGoogleImportOpen(true);

    window.addEventListener("open-qr", handleOpenQr as any);
    window.addEventListener("open-activity-detail", handleOpenDetail as any);
    window.addEventListener("open-contact-detail", handleOpenFullDetail as any);
    window.addEventListener("open-project-detail", handleOpenProjects as any);
    window.addEventListener("open-create-contact", handleOpenCreate as any);
    window.addEventListener("open-import-contact", handleOpenImport);
    window.addEventListener("open-import-google", handleOpenGoogleImport);

    return () => {
      window.removeEventListener("open-qr", handleOpenQr as any);
      window.removeEventListener("open-activity-detail", handleOpenDetail as any);
      window.removeEventListener("open-contact-detail", handleOpenFullDetail as any);
      window.removeEventListener("open-project-detail", handleOpenProjects as any);
      window.removeEventListener("open-create-contact", handleOpenCreate as any);
      window.removeEventListener("open-import-contact", handleOpenImport);
      window.removeEventListener("open-import-google", handleOpenGoogleImport);
    };
  }, []);

  // Persist table state changes
  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("contacts_column_order", JSON.stringify(columnOrder));
    }
  }, [columnOrder, isMounted]);

  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("contacts_column_sizing", JSON.stringify(columnSizing));
    }
  }, [columnSizing, isMounted]);

  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("contacts_column_sizing", JSON.stringify(columnSizing));
    }
  }, [columnSizing, isMounted]);

  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("contacts_row_order", JSON.stringify(rowOrder));
    }
  }, [rowOrder, isMounted]);

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
          error: (err: any) => "Failed to update status: " + err.message,
        });
        await promise;
        window.location.reload();
        return;
      }
    }

    if (active.id !== over.id && overData?.type === "row") {
      const activeId = String(active.id).replace("row-", "");
      const overId = String(over.id).replace("row-", "");
      
      const currentOrder: string[] = (rowOrder.length > 0 ? rowOrder : data.map(d => String(d.id))) as string[];
      const oldIndex = currentOrder.indexOf(activeId);
      const newIndex = currentOrder.indexOf(overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...currentOrder];
        const [removed] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed);
        setRowOrder(newOrder);
        toast.info("Row order updated locally");
      }
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
    rowSelection,
    setRowSelection,
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
    rowOrder,
    setRowOrder,
    handleDragEnd,
  };
}
