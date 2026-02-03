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

export function ContactsTable({
  data,
  onCreate,
}: {
  data: Lead[];
  onCreate?: (data: any) => Promise<any>;
}) {
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
  } = useContactsTable(data);

  const table = useReactTable({
    data,
    columns: contactColumns,
    state: { sorting, grouping, globalFilter, rowSelection, columnOrder, columnSizing },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { expanded: true },
  });

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
        onClear={() => setRowSelection({})}
        onEdit={() => setIsBulkEditOpen(true)}
        onSelectAllVisible={() => table.toggleAllRowsSelected(true)}
        isAllVisibleSelected={table.getIsAllRowsSelected()}
      />

      <BulkEditModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
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

      {data.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center bg-card rounded-[4rem] border border-border p-24 text-center shadow-sm relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />
          <h3 className="text-3xl font-black text-foreground mb-4 uppercase italic tracking-tight">
            V databáze nie sú žiadne kontakty
          </h3>
          <EmptyStateActions />
        </div>
      ) : (
        <div className="flex flex-col h-full bg-card rounded-lg shadow-sm border border-border overflow-hidden transition-all duration-300">
          <ContactsTableToolbar
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            totalCount={data.length}
            onNewClick={() => setIsModalOpen(true)}
            onImportClick={() => setIsImportModalOpen(true)}
          />
          <div className="overflow-auto flex-1 thin-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    <th className="w-10 p-2" />
                    <th className="w-8 p-2" />
                    <SortableContext
                      items={headerGroup.headers.map((h) => h.column.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {headerGroup.headers.map((header) => (
                        <DraggableHeader key={header.id} header={header} />
                      ))}
                    </SortableContext>
                    <th className="w-10 p-2 border-l border-border text-center">
                      <Plus className="w-4 h-4 text-muted-foreground mx-auto" />
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
            <div
              className="p-3 border-t border-border bg-muted/30 sticky bottom-0 transition-colors hover:bg-muted/50"
              onClick={() => setIsModalOpen(true)}
            >
              <div className="flex items-center gap-2 text-muted-foreground text-sm hover:text-blue-600 cursor-pointer font-medium group">
                <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                <span>Kliknite pre pridanie kontaktu...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
