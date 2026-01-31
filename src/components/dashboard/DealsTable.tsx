"use client";

import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Banknote,
  FileText,
  HardDrive,
  RotateCcw,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { sk } from "date-fns/locale";
import { toast } from "sonner";
import { ProjectDriveModal } from "./ProjectDriveModal";
import { InvoiceModal, InvoiceModal } from "./deals/InvoiceModal";
import { PaymentModal } from "./deals/PaymentModal";
import { DealsFilters } from "./deals/DealsFilters";
import { useDealsTable } from "@/hooks/useDealsTable";

import { ContactDetailModal } from "./ContactDetailModal";
import { ProjectDetailModal } from "./ProjectDetailModal";

import { Deal } from "@/types/deal";
import { Project, PROJECT_STAGES } from "@/types/project";
import { StageBadge } from "./projects/StageBadge";
import { Lead } from "@/types/contact";

const columnHelper = createColumnHelper<any>();

export function DealsTable({
  deals,
  projects,
  contacts,
}: {
  deals: Deal[];
  projects: Project[];
  contacts: Lead[];
}) {
  const {
    tableData,
    sorting,
    setSorting,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    priceFilter,
    setPriceFilter,
    uninvoicedOnly,
    setUninvoicedOnly,
    invoicingProject,
    setInvoicingProject,
    payingProject,
    setPayingProject,
    detailContact,
    setDetailContact,
    fullDetailProject,
    setFullDetailProject,
    fullDetailTab,
    setFullDetailTab,
    handleUpdateProjectStage,
    handleUpdateProjectValue,
    handleTogglePaidStatus,
    handleInvoiceProject,
    resetFilters,
  } = useDealsTable(deals, projects, contacts);

  const columns = [
    columnHelper.accessor("name", {
      header: "Projekt / Obchod",
      cell: (info) => (
        <div
          className="flex flex-col cursor-pointer group/name"
          onClick={() => {
            const p = info.row.original.project;
            if (p) {
              setFullDetailTab("overview");
              setFullDetailProject(p);
            }
          }}
        >
          <span className="font-black text-foreground text-[11px] uppercase tracking-tighter italic group-hover/name:text-blue-600 transition-colors">
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
      cell: (info) => {
        const p = info.row.original.project;
        return (
          <div
            className="flex items-center gap-2 cursor-pointer group/contact"
            onClick={() => {
              const c = contacts.find(
                (c) => String(c.id) === String(p?.contact_id),
              );
              if (c) setDetailContact(c);
            }}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-500 group-hover/contact:scale-110 transition-transform">
              {p?.contact_name?.substring(0, 2).toUpperCase() || "??"}
            </div>
            <span className="font-bold text-xs text-foreground/80 group-hover/contact:text-blue-600 transition-colors">
              {p?.contact_name || "Neznámy"}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("project.stage", {
      header: "Štádium",
      cell: (info) => (
        <StageBadge
          projectId={info.row.original.project?.id || 0}
          stage={(info.getValue() as any) || "planning"}
          onStageChange={handleUpdateProjectStage}
        />
      ),
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
                  handleUpdateProjectValue(project.id, Number(val));
                }
              }}
              className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 hover:bg-blue-500/20 transition-all font-mono"
            >
              + Nastaviť sumu
            </button>
          );
        }

        return (
          <span className="font-black text-blue-500 text-lg tabular-nums tracking-tighter">
            {new Intl.NumberFormat("sk-SK", {
              style: "currency",
              currency: "EUR",
            }).format(value)}
          </span>
        );
      },
    }),
    columnHelper.accessor("paid", {
      header: "Stav Fakturácie",
      cell: (info) => {
        const deal = info.row.original;
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
        return (
          <div className="flex items-center justify-end gap-2">
            {!deal.invoice_date && deal.value > 0 && (
              <button
                onClick={() =>
                  deal.project && setInvoicingProject(deal.project)
                }
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 text-[10px] font-black uppercase px-4"
              >
                <Receipt className="w-3 h-3" /> Fakturovať
              </button>
            )}
            {deal.invoice_date && !deal.paid && (
              <button
                onClick={() => deal.project && setPayingProject(deal.project)}
                className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 text-[10px] font-black uppercase px-4"
              >
                <Banknote className="w-3 h-3" /> Označiť ako zaplatené
              </button>
            )}
            {deal.paid && (
              <button
                onClick={() =>
                  deal.project &&
                  confirm("Naozaj chcete vrátiť stav na 'Čaká na platbu'?") &&
                  handleTogglePaidStatus(deal.project.id, false)
                }
                className="p-2 rounded-xl border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 transition-all"
                title="Vrátiť na nezaplatené"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            {!deal.paid && deal.invoice_date && (
              <button
                onClick={() =>
                  deal.project &&
                  confirm("Naozaj chcete stornovať túto faktúru?") &&
                  handleInvoiceProject(deal.project.id, {
                    invoice_date: null,
                    due_date: null,
                    paid: false,
                  })
                }
                className="p-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                title="Stornovať faktúru"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {deal.project?.drive_folder_id && (
              <button
                onClick={() => {
                  if (deal.project) {
                    setFullDetailTab("documents");
                    setFullDetailProject(deal.project);
                  }
                }}
                className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 transition-all hover:text-white shadow-lg shadow-blue-500/5 group"
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
      <ProjectDetailModal
        project={fullDetailProject}
        isOpen={!!fullDetailProject}
        onClose={() => setFullDetailProject(null)}
        initialTab={fullDetailTab}
      />

      {invoicingProject && (
        <InvoiceModal
          isOpen={!!invoicingProject}
          onClose={() => setInvoicingProject(null)}
          project={invoicingProject}
          onConfirm={(data) => handleInvoiceProject(invoicingProject.id, data)}
        />
      )}

      {payingProject && (
        <PaymentModal
          isOpen={!!payingProject}
          onClose={() => setPayingProject(null)}
          project={payingProject}
          onConfirm={() => handleTogglePaidStatus(payingProject.id, true)}
        />
      )}

      <ContactDetailModal
        contact={detailContact}
        isOpen={!!detailContact}
        onClose={() => setDetailContact(null)}
      />

      <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden transition-colors duration-300">
        <DealsFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          priceFilter={priceFilter}
          setPriceFilter={setPriceFilter}
          uninvoicedOnly={uninvoicedOnly}
          setUninvoicedOnly={setUninvoicedOnly}
          onReset={resetFilters}
        />

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
