"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  Plus,
  Search,
  Download,
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Project, ProjectStage, PROJECT_STAGES } from "@/types/project";
import { createProject, updateProjectStage } from "@/app/actions/projects";
import { ProjectDriveModal } from "./ProjectDriveModal";
import { ContactDetailModal } from "./ContactDetailModal";
import { Lead } from "@/types/contact";
import { CreateProjectModal } from "./projects/CreateProjectModal";
import { getProjectColumns } from "./projects/ProjectColumns";

export function ProjectsTable({
  data,
  contacts,
}: {
  data: Project[];
  contacts: Lead[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [projects, setProjects] = React.useState(data);
  const [fullDetailContact, setFullDetailContact] = React.useState<Lead | null>(
    null,
  );
  const [driveProject, setDriveProject] = React.useState<{
    id: number;
    name: string;
    folderId?: string;
  } | null>(null);
  const [modalMode, setModalMode] = React.useState<"form" | "json">("form");

  React.useEffect(() => {
    setProjects(data);
    const handleOpenCreate = (e: any) => {
      setModalMode(e.detail || "form");
      setIsModalOpen(true);
    };
    const handleExport = () => {
      const headers = [
        "ID",
        "Dátum vytvorenia",
        "Typ projektu",
        "Kontakt",
        "Štádium",
      ];
      const rows = projects.map((p) => [
        p.id,
        new Date(p.date_created).toLocaleDateString(),
        p.project_type,
        p.contact_name || "N/A",
        PROJECT_STAGES.find((s) => s.value === p.stage)?.label || p.stage,
      ]);
      const csv = [headers.join(","), ...rows.map((e) => e.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `projekty_export.csv`;
      link.click();
    };
    window.addEventListener("open-create-project", handleOpenCreate);
    window.addEventListener("export-projects-csv", handleExport);
    return () => {
      window.removeEventListener("open-create-project", handleOpenCreate);
      window.removeEventListener("export-projects-csv", handleExport);
    };
  }, [data, projects]);

  const columns = getProjectColumns(
    contacts,
    async (id, stage) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stage } : p)),
      );
      await updateProjectStage(id, stage);
    },
    (contact) => setFullDetailContact(contact),
    (project) =>
      setDriveProject({
        id: project.id,
        name: `${project.project_type} - ${project.contact_name}`,
        folderId: project.drive_folder_id,
      }),
  );

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <CreateProjectModal
        isOpen={isModalOpen}
        initialMode={modalMode}
        onClose={() => setIsModalOpen(false)}
        contacts={contacts}
        onSubmit={async (formData) => {
          const contact = contacts.find(
            (c) => String(c.id) === String(formData.contact_id),
          );
          const res = await createProject({
            ...formData,
            contact_name: contact
              ? `${contact.first_name} ${contact.last_name}`
              : "Neznámy",
          });
          if (res.success) toast.success("Deal vytvorený");
          else toast.error("Chyba: " + res.error);
        }}
      />
      <ProjectDriveModal
        key={driveProject?.id || "none"}
        isOpen={!!driveProject}
        onClose={() => setDriveProject(null)}
        projectId={driveProject?.id || 0}
        projectName={driveProject?.name || ""}
        folderId={driveProject?.folderId}
      />
      <ContactDetailModal
        contact={fullDetailContact}
        isOpen={!!fullDetailContact}
        onClose={() => setFullDetailContact(null)}
      />

      <div className="flex flex-col h-full bg-card rounded-2xl shadow-sm border border-border overflow-hidden transition-colors duration-300">
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Nový
            </button>
            <div className="relative ml-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Hľadať projekty..."
                className="pl-9 pr-4 py-2 border border-border bg-background dark:bg-slate-900 rounded-xl text-sm outline-none w-64 focus:border-blue-500 text-foreground"
              />
            </div>
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {projects.length} projektov
          </div>
        </div>

        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50/80 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-border">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                      </div>
                    </th>
                  ))}
                  <th className="w-12 p-4" />
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center py-20"
                  >
                    <FolderKanban className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Žiadne projekty</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-1.5 text-xs text-foreground"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-1.5 text-right">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
