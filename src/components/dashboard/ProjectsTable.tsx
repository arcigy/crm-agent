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
    <div className="flex flex-col h-full bg-zinc-950/50 backdrop-blur-md rounded-3xl border border-violet-500/10 shadow-2xl shadow-black/20 overflow-hidden transition-all duration-500">
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

      <div className="p-6 border-b border-violet-500/10 bg-violet-500/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-1 min-w-[300px]">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/30 group-focus-within:text-violet-400 transition-colors" />
            <input
              type="text"
              placeholder="VYHĽADAŤ V PROJEKTOCH..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-violet-500/10 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:border-violet-500/50 outline-none transition-all placeholder:text-violet-400/20 text-zinc-100"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-900/50 border border-violet-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> EXPORTOVAŤ
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 thin-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-violet-500/5 backdrop-blur-xl sticky top-0 z-10 border-b border-violet-500/10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-8 py-5 text-[10px] font-black text-violet-400/50 uppercase tracking-[0.25em] border-r border-violet-500/5 last:border-0"
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
          <tbody className="divide-y divide-violet-500/5">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-violet-500/[0.03] transition-all duration-300 group border-b border-violet-500/[0.02] relative hover:z-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-8 py-5 relative">
                    <div className="transition-transform duration-300 group-hover:translate-x-1">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="p-32 text-center flex flex-col items-center gap-6">
            <div className="p-8 rounded-[2.5rem] bg-violet-500/5 border border-violet-500/10 animate-pulse">
              <FolderKanban className="w-16 h-16 text-violet-500/20" />
            </div>
            <div className="space-y-2">
                <p className="text-violet-400 font-black uppercase tracking-[0.3em] text-[10px]">
                  ŽIADNE AKTÍVNE PROJEKTY
                </p>
                <p className="text-violet-400/30 font-bold text-[9px] uppercase tracking-widest">
                  Vaša agenda je prázdna. Pridajte prvý projekt.
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
