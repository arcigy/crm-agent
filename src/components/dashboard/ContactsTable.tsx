"use client";

import * as React from "react";
import {
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Lead } from "@/types/contact";
import { CreateContactModal } from "./contacts/CreateContactModal";
import { ContactImportModal } from "./ContactImportModal";
import { GoogleImportModal } from "./GoogleImportModal";
import { PhoneQrModal } from "./contacts/PhoneQrModal";
import { ActivityDetailModal } from "./contacts/ActivityDetailModal";
import { ContactDetailModal } from "./ContactDetailModal";
import { ContactProjectsModal } from "./contacts/ContactProjectsModal";
import { ContactsTableToolbar } from "./contacts/ContactsTableToolbar";
import { DraggableRow } from "./contacts/DraggableRow";
import { DraggableHeader } from "./contacts/DraggableHeader";
import { GroupHeader } from "./contacts/GroupHeader";
import { EmptyStateActions } from "./ContactActionButtons";
import { BulkActions } from "./contacts/BulkActions";
import { BulkEditModal } from "./contacts/BulkEditModal";
import { useContactsTable } from "@/hooks/useContactsTable";
import { contactColumns } from "./contacts/ContactColumns";
import { TestSyncModal } from "./contacts/TestSyncModal";
import { AddToSmartLeadModal } from "./contacts/AddToSmartLeadModal";

import { useRouter } from "next/navigation";
import { exportToCSV } from "@/lib/export";

export function ContactsTable({
  data,
  onCreate,
}: {
  data: Lead[];
  onCreate?: (data: any) => Promise<any>;
}) {
  const router = useRouter();
  const [isTestModalOpen, setIsTestModalOpen] = React.useState(false);
  const {
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
    handleDragEnd,
    rowOrder,
  } = useContactsTable(data);

  // Apply manual row order if exists
  const sortedData = React.useMemo(() => {
    if (!rowOrder || rowOrder.length === 0) return data;
    const orderMap = new Map(rowOrder.map((id, index) => [id, index]));
    return [...data].sort((a, b) => {
      const aOrder = orderMap.get(String(a.id));
      const bOrder = orderMap.get(String(b.id));
      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return 0;
    });
  }, [data, rowOrder]);

  const table = useReactTable({
    data: sortedData,
    columns: contactColumns,
    state: { sorting, grouping, globalFilter, rowSelection, columnOrder, columnSizing },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: (updaterOrValue: any) => {
      const newSizing = typeof updaterOrValue === 'function' 
        ? updaterOrValue(columnSizing) 
        : updaterOrValue;
      
      // Apply the new sizing
      setColumnSizing(newSizing);
    },
    columnResizeMode: "onChange",
    defaultColumn: {
      minSize: 60,
      maxSize: 1000,
      size: 150,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { expanded: true },
  });

  const handleExport = () => {
    const visibleData = table.getFilteredRowModel().rows.map(row => row.original);
    if (visibleData.length === 0) {
      toast.error("Žiadne dáta na export");
      return;
    }
    toast.success(`Exportujem ${visibleData.length} kontaktov...`);
    exportToCSV(visibleData, `kontakty_export_${new Date().toISOString().split('T')[0]}`);
  };

  const handleRefresh = () => {
    toast.promise(new Promise(resolve => {
        router.refresh();
        setTimeout(resolve, 800);
    }), {
        loading: "Aktualizujem dáta...",
        success: "Dáta boli aktualizované",
        error: "Chyba pri aktualizácii"
    });
  };

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    // Check if it's a column or row
    if (active.id !== over.id && !String(active.id).startsWith("row-")) {
      const oldIndex = columnOrder.indexOf(active.id);
      const newIndex = columnOrder.indexOf(over.id);
      
      const newOrder = arrayMove(
        columnOrder.length > 0 ? columnOrder : table.getAllLeafColumns().map(c => c.id),
        oldIndex !== -1 ? oldIndex : table.getAllLeafColumns().findIndex(c => c.id === active.id),
        newIndex !== -1 ? newIndex : table.getAllLeafColumns().findIndex(c => c.id === over.id)
      );
      setColumnOrder(newOrder);
    } else {
      handleDragEnd(event);
    }
  };

  const [isBulkEditOpen, setIsBulkEditOpen] = React.useState(false);
  const [isSmartLeadOpen, setIsSmartLeadOpen] = React.useState(false);
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = selectedRows.map(r => r.original.id);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor),
  );

  if (!isMounted)
    return (
      <div className="p-20 text-center font-bold text-gray-300 uppercase tracking-widest">
        Inicializujem...
      </div>
    );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToFirstScrollableAncestor]}
      onDragEnd={onDragEnd}
      collisionDetection={closestCenter}
    >
      <BulkActions
        selectedIds={selectedIds}
        selectedNames={selectedRows.map(r => `${r.original.first_name || ''} ${r.original.last_name || ''}`.trim())}
        onClear={() => setRowSelection({})}
        onEdit={() => setIsBulkEditOpen(true)}
        onSelectAllVisible={() => table.toggleAllRowsSelected(true)}
        isAllVisibleSelected={table.getIsAllRowsSelected()}
        onAddToSmartLead={() => setIsSmartLeadOpen(true)}
      />

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
        onSuccess={() => setRowSelection({})}
      />

      <AddToSmartLeadModal
        isOpen={isSmartLeadOpen}
        onClose={() => setIsSmartLeadOpen(false)}
        selectedContacts={selectedRows.map(r => r.original)}
        onSuccess={() => setRowSelection({})}
      />

      <CreateContactModal
        isOpen={isModalOpen}
        initialMode={modalMode}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (d) => onCreate && (await onCreate(d))}
      />
      <ContactImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
      <GoogleImportModal
        isOpen={isGoogleImportOpen}
        onClose={() => setIsGoogleImportOpen(false)}
      />
      <PhoneQrModal phone={qrPhone} onClose={() => setQrPhone(null)} />
      <ActivityDetailModal
        contact={detailContact}
        onClose={() => setDetailContact(null)}
      />
      <ContactDetailModal
        contact={fullDetailContact}
        isOpen={!!fullDetailContact}
        onClose={() => setFullDetailContact(null)}
      />
      <ContactProjectsModal
        contact={projectsContact}
        onClose={() => setProjectsContact(null)}
      />
      <TestSyncModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        contacts={data}
      />

      {data.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center bg-zinc-950 rounded-[2rem] border border-violet-900/30 shadow-xl shadow-violet-900/10 p-24 text-center relative overflow-hidden group transition-all">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-900/5 to-transparent pointer-events-none" />
          <h3 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tight relative z-10">
            V databáze nie sú žiadne kontakty
          </h3>
          <div className="relative z-10"><EmptyStateActions /></div>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-violet-900/30 overflow-hidden transition-all duration-300 shadow-xl shadow-violet-900/10">
          <ContactsTableToolbar
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            totalCount={data.length}
            onNewClick={() => setIsModalOpen(true)}
            onImportClick={() => setIsImportModalOpen(true)}
            onExport={handleExport}
            onRefresh={handleRefresh}
            onTestClick={() => setIsTestModalOpen(true)}
          />
          <div className="overflow-auto flex-1 thin-scrollbar relative">
            <table 
              className="w-full text-left border-collapse"
              style={{ 
                tableLayout: "fixed",
                minWidth: "100%"
              }}
            >
              <colgroup>
                <col style={{ width: "54px" }} />
                {table.getVisibleLeafColumns().map(col => (
                  <col key={col.id} style={{ width: col.getSize() }} />
                ))}
                <col style={{ width: "40px" }} />
              </colgroup>
              <thead className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {/* Gutter: Consolidated Selection, Strip, Drag */}
                    <th style={{ width: "54px" }} className="p-0 bg-transparent z-20 border-r border-white/5">
                      <div className="flex items-center justify-center h-full">
                        <button
                          onClick={() => table.toggleAllRowsSelected()}
                          className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                            table.getIsAllRowsSelected()
                              ? "bg-violet-600 border-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.4)]"
                              : "border-white/20 hover:border-violet-400/50"
                          }`}
                        >
                          {table.getIsAllRowsSelected() && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </button>
                      </div>
                    </th>
                    
                    <SortableContext
                      items={headerGroup.headers.map((h) => h.column.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map((header) => (
                        <DraggableHeader key={header.id} header={header} />
                      ))}
                    </SortableContext>
                    <th style={{ width: "40px" }} className="p-2 border-l border-white/5 text-center bg-transparent">
                      <Plus className="w-4 h-4 text-violet-400/50 hover:text-violet-400 transition-colors mx-auto" />
                    </th>
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                <SortableContext
                  items={table
                    .getRowModel()
                    .rows.filter((r) => !r.getIsGrouped())
                    .map((r) => `row-${r.original.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {table
                    .getRowModel()
                    .rows.map((row) =>
                      row.getIsGrouped() ? (
                        <GroupHeader
                          key={row.id}
                          row={row}
                          columnsCount={table.getVisibleLeafColumns().length}
                        />
                      ) : (
                        <DraggableRow key={row.id} row={row} />
                      ),
                    )}
                </SortableContext>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DndContext>
  );
}
