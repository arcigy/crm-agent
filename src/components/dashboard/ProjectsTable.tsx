"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import { Plus, Search, Download, FolderKanban } from "lucide-react";
import { Project } from "@/types/project";
import { ContactDetailModal } from "./ContactDetailModal";
import { Lead } from "@/types/contact";
import { CreateProjectModal } from "./projects/CreateProjectModal";
import { getProjectColumns } from "./projects/ProjectColumns";
import { useProjectsTable } from "@/hooks/useProjectsTable";
import { ProjectDetailModal } from "./ProjectDetailModal";

export function ProjectsTable({
  data,
  contacts,
}: {
  data: Project[];
  contacts: Lead[];
}) {
  const {
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
    handleCreateProject,
  } = useProjectsTable(data, contacts);

  const columns = React.useMemo(
    () =>
      getProjectColumns(
        contacts,
        handleStageChange,
        (contact) => setDetailContact(contact),
        (project) => {
          setFullDetailTab("documents");
          setFullDetailProject(project);
        },
        (project) => {
          setFullDetailTab("overview");
          setFullDetailProject(project);
        },
      ),
    [
      contacts,
      handleStageChange,
      setDetailContact,
      setFullDetailTab,
      setFullDetailProject,
    ],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!isMounted)
    return (
      <div className="p-20 text-center font-bold text-gray-300 uppercase tracking-widest">
        Inicializujem...
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden transition-all duration-300">
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
        contacts={contacts}
      />
      <ContactDetailModal
        contact={detailContact}
        isOpen={!!detailContact}
        onClose={() => setDetailContact(null)}
      />
      <ProjectDetailModal
        key={fullDetailProject?.id}
        project={fullDetailProject}
        isOpen={!!fullDetailProject}
        onClose={() => setFullDetailProject(null)}
        initialTab={fullDetailTab}
      />

      <div className="p-6 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Hľadať v projektoch..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-muted-foreground/30 text-foreground"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-muted transition-all"
          >
            <Download className="w-4 h-4 text-indigo-500" /> Export
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nový Projekt
        </button>
      </div>

      <div className="overflow-x-auto flex-1 thin-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-indigo-50/50 dark:bg-indigo-950/20 backdrop-blur-md sticky top-0 z-10 border-b border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-5 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] border-r border-border/50 last:border-0"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/50">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-indigo-500/5 transition-colors group"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="p-6 rounded-full bg-muted/50 border border-border">
              <FolderKanban className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
              Žiadne aktívne projekty
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
