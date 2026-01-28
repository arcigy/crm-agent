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
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import { toast } from "sonner";

import { Deal } from "@/types/deal";
import { Project, PROJECT_STAGES } from "@/types/project";
import {
  invoiceDeal,
  togglePaid,
  updateDeal,
  createDealFromProject,
} from "@/app/actions/deals";
import { StageBadge } from "./projects/StageBadge";

const columnHelper = createColumnHelper<Deal & { project?: Project }>();

export function DealsTable({
  deals,
  projects,
}: {
  deals: Deal[];
  projects: Project[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Merge projects and deals
  // For each project, find its deal. If no deal found, create a "virtual" one from project data
  const tableData = React.useMemo(() => {
    return projects.map((project) => {
      const deal = deals.find(
        (d) => d.project_id === project.id || d.name === project.name,
      );
      return {
        ...(deal || {
          id: -project.id, // Negative ID for virtual deals
          name: project.name,
          value: 0,
          contact_id: project.contact_id,
          project_id: project.id,
          paid: false,
          date_created: project.date_created,
        }),
        project,
      };
    });
  }, [deals, projects]);

  const columns = [
    columnHelper.accessor("name", {
      header: "Projekt / Obchod",
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-black text-foreground text-sm tracking-tight">
            {info.getValue()}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(info.row.original.date_created), "d. MMMM yyyy", {
              locale: sk,
            })}
          </span>
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
            currentStage={stage || "planning"}
          />
        );
      },
    }),
    columnHelper.accessor("value", {
      header: "Suma",
      cell: (info) => {
        const value = info.getValue();
        const isVirtual = info.row.original.id < 0;

        if (isVirtual) {
          return (
            <button
              onClick={async () => {
                const val = prompt("Zadajte sumu projektu v EUR:");
                if (val && !isNaN(Number(val))) {
                  const res = await createDealFromProject(
                    info.row.original.project?.id || 0,
                    info.row.original.name,
                    info.row.original.project?.contact_id || 0,
                    Number(val),
                  );
                  if (res.success) toast.success("Obchod vytvorený");
                  else toast.error("Chyba: " + res.error);
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
        const isVirtual = deal.id < 0;

        if (isVirtual)
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
            {!isVirtual && !deal.invoice_date && (
              <button
                onClick={() => {
                  toast.promise(invoiceDeal(deal.id), {
                    loading: "Generujem faktúru...",
                    success: "Faktúra vygenerovaná",
                    error: "Chyba pri fakturácii",
                  });
                }}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 text-[10px] font-black uppercase px-4"
              >
                <Receipt className="w-3 h-3" /> Fakturovať
              </button>
            )}
            {!isVirtual && deal.invoice_date && !deal.paid && (
              <button
                onClick={() => togglePaid(deal.id, deal.paid)}
                className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-[10px] font-black uppercase px-4"
              >
                <Banknote className="w-3 h-3" /> Označiť ako zaplatené
              </button>
            )}
            <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
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
    <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden transition-colors duration-300">
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
}
