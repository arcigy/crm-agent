"use client";

import * as React from "react";
import { SortingState, GroupingState, ColumnFiltersState } from "@tanstack/react-table";
import { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Lead } from "@/types/contact";
import { updateContact } from "@/app/actions/contacts";

export function useContactsTable(data: Lead[]) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [rowOrder, setRowOrder] = React.useState<string[]>([]);
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>({});
   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
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
    const savedColumnFilters = localStorage.getItem("contacts_column_filters");
    
    if (savedColumnOrder) {
      try { setColumnOrder(JSON.parse(savedColumnOrder)); } catch (e) { console.error(e); }
    }
    if (savedSizing) {
      try { setColumnSizing(JSON.parse(savedSizing)); } catch (e) { console.error(e); }
    }
    if (savedRowOrder) {
      try { 
        const parsed = JSON.parse(savedRowOrder);
        if (Array.isArray(parsed)) {
          setRowOrder(parsed.map(id => String(id)));
        }
      } catch (e) { console.error(e); }
    }
    if (savedColumnFilters) {
      try { setColumnFilters(JSON.parse(savedColumnFilters)); } catch (e) { console.error(e); }
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
    if (isMounted && Object.keys(columnSizing).length > 0) {
      localStorage.setItem("contacts_column_sizing", JSON.stringify(columnSizing));
    }
  }, [columnSizing, isMounted]);

   React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("contacts_row_order", JSON.stringify(rowOrder));
    }
  }, [rowOrder, isMounted]);

  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem("contacts_column_filters", JSON.stringify(columnFilters));
    }
  }, [columnFilters, isMounted]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (active.id !== over.id && String(active.id).startsWith("row-")) {
      const activeId = String(active.id).replace("row-", "");
      const activeContact = activeData?.contact as Lead;
      
      const dataIds = data.map(d => String(d.id));
      const currentOrder = rowOrder.length > 0 ? [...rowOrder] : [...dataIds];
      
      let normalizedOrder = Array.from(new Set(currentOrder.map(id => String(id))));
      dataIds.forEach(id => {
        if (!normalizedOrder.includes(id)) normalizedOrder.push(id);
      });

      const oldIndex = normalizedOrder.indexOf(activeId);
      let newIndex = -1;

      // Case 1: Dropped on a Group Header
      if (overData?.type === "group") {
        const targetStatus = overData.status as string;
        
        if (activeContact && activeContact.status !== targetStatus) {
           // Async status update
           updateContact(activeContact.id, { status: targetStatus }).then(() => {
              React.startTransition(() => {
                router.refresh();
              });
           });
           toast.success(`Presunuté do ${targetStatus}`, { duration: 1500 });
        }

        const firstInGroup = data.find(d => String(d.status).toLowerCase() === targetStatus.toLowerCase());
        newIndex = firstInGroup ? normalizedOrder.indexOf(String(firstInGroup.id)) : 0;
      } 
      // Case 2: Dropped on another Row
      else if (overData?.type === "row") {
        const overId = String(over.id).replace("row-", "");
        const overContact = overData.contact as Lead;
        newIndex = normalizedOrder.indexOf(overId);

        if (activeContact && overContact && activeContact.status !== overContact.status) {
          updateContact(activeContact.id, { status: String(overContact.status) }).then(() => {
            React.startTransition(() => {
              router.refresh();
            });
          });
        }
      } 
      // Case 3: Dropped on Header
      else if (!overData?.type) {
        newIndex = 0;
      }
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const [removed] = normalizedOrder.splice(oldIndex, 1);
        normalizedOrder.splice(newIndex, 0, removed);
        
        // INSTANT UI UPDATE
        setRowOrder([...normalizedOrder]);
        setSorting([]);
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
    columnFilters,
    setColumnFilters,
    handleDragEnd,
  };
}
