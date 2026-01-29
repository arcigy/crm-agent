"use client";

import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Banknote,
  FileText,
  HardDrive,
  Search,
  Filter,
  ArrowUpDown,
  X,
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import { toast } from "sonner";
import { ProjectDriveModal } from "./ProjectDriveModal";
import { InvoiceModal } from "./deals/InvoiceModal";
import { PaymentModal } from "./deals/PaymentModal";

import { Deal } from "@/types/deal";
import { Project, PROJECT_STAGES } from "@/types/project";
import {
  invoiceDeal,
  togglePaid,
  updateDeal,
  createDealFromProject,
} from "@/app/actions/deals";
import { StageBadge } from "./projects/StageBadge";
import { updateProjectStage, updateProject } from "@/app/actions/projects";
import { Lead } from "@/types/contact";

const columnHelper = createColumnHelper<Deal & { project?: Project }>();

export function DealsTable({
  deals,
  projects,
  contacts,
}: {
  deals: Deal[];
  projects: Project[];
  contacts: Lead[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [currentProjects, setCurrentProjects] = React.useState(projects);
  const [driveProject, setDriveProject] = React.useState<{
    id: number;
    name: string;
    folderId?: string;
  } | null>(null);

  // Financial Modals State
  const [invoicingProject, setInvoicingProject] =
    React.useState<Project | null>(null);
  const [payingProject, setPayingProject] = React.useState<Project | null>(
    null,
  );

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<string>("all");
  const [priceFilter, setPriceFilter] = React.useState<string>("all");
  const [uninvoicedOnly, setUninvoicedOnly] = React.useState(false);

  // Merge projects and deals
  // For each project, find its deal. If no deal found, create a "virtual" one from project data
  const tableData = React.useMemo(() => {
    const data = currentProjects.map((project) => {
      const deal = deals.find(
        (d) => d.project_id === project.id || d.name === project.name,
      );

      // Resolve contact name if it's "Neznámy" or missing
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
        // Source data
        id: deal?.id || -project.id,
        name: project.name,
        // Prioritize project-level financial fields
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

    // Apply filtering
    return data.filter((item) => {
      // 1. Search Query
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        (item.name || "").toLowerCase().includes(search) ||
        (item.project?.contact_name || "").toLowerCase().includes(search) ||
        (item.project?.project_type || "").toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // 2. Stage Filter
      if (stageFilter !== "all" && item.project?.stage !== stageFilter)
        return false;

      // 3. Uninvoiced Filter
      if (uninvoicedOnly && item.invoice_date) return false;

      // 4. Price Filter
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
    deals,
    currentProjects,
    contacts,
    searchQuery,
    stageFilter,
    priceFilter,
    uninvoicedOnly,
  ]);

  const columns = [
    columnHelper.accessor("name", {
      header: "Projekt / Obchod",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-black text-foreground text-[11px] uppercase tracking-tighter italic">
            {info.row.original.project?.name || info.getValue()}
          </span>
          <div className="flex items-center gap-1 opacity-50">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {info.row.original.project?.project_type || "Obchod"}
            </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("contact_id", {
      header: "Kontakt",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-500">
            {info.row.original.project?.contact_name
              ?.substring(0, 2)
              .toUpperCase() || "??"}
          </div>
          <span className="font-bold text-xs text-foreground/80">
            {info.row.original.project?.contact_name || "Neznámy"}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("project.stage", {
      header: "Štádium",
      cell: (info) => {
        const stage = info.getValue();
        const stageInfo = PROJECT_STAGES.find((s) => s.value === stage);
        return (
          <StageBadge
            projectId={info.row.original.project?.id || 0}
            stage={(info.getValue() as any) || "planning"}
            onStageChange={async (id, newStage) => {
              setCurrentProjects((prev) =>
                prev.map((p) => (p.id === id ? { ...p, stage: newStage } : p)),
              );
              await updateProjectStage(id, newStage);
            }}
          />
        );
      },
    }),
    columnHelper.accessor("value", {
      header: "Suma",
      cell: (info) => {
        const value = info.getValue();
        const project = info.row.original.project;

        if (!value || value === 0) {
          return (
            <button
              onClick={async () => {
                const val = prompt("Zadajte sumu projektu v EUR:");
                if (val && !isNaN(Number(val))) {
                  const numVal = Number(val);
                  if (project) {
                    const res = await updateProject(project.id, {
                      value: numVal,
                    });
                    if (res.success) {
                      toast.success("Suma nastavená");
                      setCurrentProjects((prev) =>
                        prev.map((p) =>
                          p.id === project.id ? { ...p, value: numVal } : p,
                        ),
                      );
                    } else toast.error("Chyba: " + res.error);
                  }
                }
              }}
              className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 hover:bg-blue-500/20 transition-all font-mono"
            >
              + Nastaviť sumu
            </button>
          );
        }

        return (
          <div className="flex flex-col">
            <span className="font-black text-blue-500 text-lg tabular-nums tracking-tighter">
              {new Intl.NumberFormat("sk-SK", {
                style: "currency",
                currency: "EUR",
              }).format(value)}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("paid", {
      header: "Stav Fakturácie",
      cell: (info) => {
        const deal = info.row.original;
        const project = deal.project;

        if (!deal.value || deal.value === 0)
          return (
            <span className="text-muted-foreground/30 text-[10px] font-black uppercase italic">
              Nefakturované
            </span>
          );

        if (deal.paid) {
          return (
            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Zaplatené
              </span>
            </div>
          );
        }

        if (deal.invoice_date) {
          const isOverdue = deal.due_date
            ? isBefore(new Date(deal.due_date), new Date())
            : false;
          return (
            <div
              className={`flex flex-col gap-1 ${isOverdue ? "text-red-500" : "text-amber-500"}`}
            >
              <div
                className={`flex items-center gap-2 ${isOverdue ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"} px-3 py-1.5 rounded-xl border w-fit`}
              >
                {isOverdue ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {isOverdue ? "Po splatnosti" : "Čaká na platbu"}
                </span>
              </div>
              {deal.due_date && (
                <span className="text-[9px] font-bold opacity-60 ml-1 italic">
                  Splatnosť:{" "}
                  {format(new Date(deal.due_date), "d. MMM", { locale: sk })}
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl border border-border w-fit">
            <FileText className="w-4 h-4 opacity-40" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              Pripravené na faktúru
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const deal = info.row.original;
        const isVirtual = deal.id < 0;

        return (
          <div className="flex items-center justify-end gap-2">
            {!deal.invoice_date && deal.value > 0 && (
              <button
                onClick={() => {
                  if (deal.project) setInvoicingProject(deal.project);
                }}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 text-[10px] font-black uppercase px-4"
              >
                <Receipt className="w-3 h-3" /> Fakturovať
              </button>
            )}
            {deal.invoice_date && !deal.paid && (
              <button
                onClick={() => {
                  if (deal.project) setPayingProject(deal.project);
                }}
                className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-[10px] font-black uppercase px-4"
              >
                <Banknote className="w-3 h-3" /> Označiť ako zaplatené
              </button>
            )}
            <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {deal.project?.drive_folder_id && (
              <button
                onClick={() =>
                  setDriveProject({
                    id: deal.project!.id,
                    name: deal.project!.name,
                    folderId: deal.project!.drive_folder_id,
                  })
                }
                className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 transition-all hover:text-white shadow-lg shadow-blue-500/5 group"
                title="Otvoriť Zmluvy a Faktúry"
              >
                <HardDrive className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <ProjectDriveModal
        isOpen={!!driveProject}
        onClose={() => setDriveProject(null)}
        projectId={driveProject?.id || 0}
        projectName={driveProject?.name || ""}
        folderId={driveProject?.folderId}
        subfolderName="01_Zmluvy_a_Faktury"
      />

      {invoicingProject && (
        <InvoiceModal
          isOpen={!!invoicingProject}
          onClose={() => setInvoicingProject(null)}
          project={invoicingProject}
          onConfirm={async (data) => {
            const res = await updateProject(invoicingProject.id, data);
            if (res.success) {
              toast.success("Faktúra úspešne vygenerovaná");
              setCurrentProjects((prev) =>
                prev.map((p) =>
                  p.id === invoicingProject.id ? { ...p, ...data } : p,
                ),
              );
            }
          }}
        />
      )}

      {payingProject && (
        <PaymentModal
          isOpen={!!payingProject}
          onClose={() => setPayingProject(null)}
          project={payingProject}
          onConfirm={async () => {
            const res = await updateProject(payingProject.id, { paid: true });
            if (res.success) {
              toast.success("Platba bola úspešne spracovaná");
              setCurrentProjects((prev) =>
                prev.map((p) =>
                  p.id === payingProject.id ? { ...p, paid: true } : p,
                ),
              );
            }
          }}
        />
      )}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden transition-colors duration-300">
        {/* Filters Toolbar */}
        <div className="p-6 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Hľadať projekt alebo kontakt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all placeholder:text-muted-foreground/30 text-foreground"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-1.5 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-foreground cursor-pointer"
              >
                <option value="all">Všetky štádiá</option>
                {PROJECT_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-1.5 shadow-sm">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-foreground cursor-pointer"
              >
                <option value="all">Všetky ceny</option>
                <option value="zero">Bez ceny (0 €)</option>
                <option value="less_5">Lacnejšie (pod 5 €)</option>
                <option value="more_5">Drahšie (nad 5 €)</option>
                <option value="high">Premium (nad 1000 €)</option>
              </select>
            </div>

            <button
              onClick={() => setUninvoicedOnly(!uninvoicedOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                uninvoicedOnly
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/10"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Nevyfakturované
            </button>

            {(searchQuery ||
              stageFilter !== "all" ||
              priceFilter !== "all" ||
              uninvoicedOnly) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStageFilter("all");
                  setPriceFilter("all");
                  setUninvoicedOnly(false);
                }}
                className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all border border-transparent hover:border-red-500/20"
                title="Resetovať filtre"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#020617]/50 backdrop-blur-md sticky top-0 z-10 border-b border-border">
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
                  className="hover:bg-blue-500/5 transition-colors group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tableData.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="p-6 rounded-full bg-muted/50 border border-border">
              <Banknote className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
              Žiadne obchody ani projekty na zobrazenie
            </p>
          </div>
        )}
      </div>
    </>
  );
}
