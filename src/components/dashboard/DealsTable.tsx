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

import { InvoiceModal } from "./deals/InvoiceModal";
import { PaymentModal } from "./deals/PaymentModal";
import { DealsFilters } from "./deals/DealsFilters";
import { useDealsTable } from "@/hooks/useDealsTable";

import { ContactDetailModal } from "./ContactDetailModal";
import { ProjectDetailModal } from "./ProjectDetailModal";

import { Deal } from "@/types/deal";
import { Project } from "@/types/project";
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
  // Dummy data
  const dummyDeals: Deal[] = [
    {
      id: 9991,
      name: "E-shop Redesign",
      value: 5400,
      contact_id: 991,
      project_id: 9991,
      paid: false,
      invoice_date: "2024-02-01",
      due_date: "2024-02-15",
      date_created: new Date().toISOString(),
      contact_name: "TechCorp s.r.o.",
    },
    {
      id: 9992,
      name: "Q1 Marketing Campaign",
      value: 2800,
      contact_id: 992,
      project_id: 9992,
      paid: true,
      invoice_date: "2024-01-10",
      date_created: new Date().toISOString(),
      contact_name: "Local Bakery",
    },
    {
      id: 9993,
      name: "Mobile App MVP",
      value: 12500,
      contact_id: 993,
      project_id: 9993,
      paid: false,
      date_created: new Date().toISOString(),
      contact_name: "Startup Inc.",
    },
  ];

  const dummyProjects: Project[] = [
    {
      id: 9991,
      name: "E-shop Redesign",
      project_type: "E-commerce",
      contact_id: 991,
      contact_name: "TechCorp s.r.o.",
      stage: "in_progress",
      value: 5400,
      paid: false,
      invoice_date: "2024-02-01",
      due_date: "2024-02-15",
      date_created: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      end_date: null,
      deleted_at: null,
    },
    {
      id: 9992,
      name: "Q1 Marketing Campaign",
      project_type: "Marketing Campaign",
      contact_id: 992,
      contact_name: "Local Bakery",
      stage: "completed",
      value: 2800,
      paid: true,
      invoice_date: "2024-01-10",
      date_created: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      end_date: null,
      deleted_at: null,
    },
    {
      id: 9993,
      name: "Mobile App MVP",
      project_type: "Mobile App",
      contact_id: 993,
      contact_name: "Startup Inc.",
      stage: "planning",
      value: 12500,
      paid: false,
      date_created: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      end_date: null,
      deleted_at: null,
    },
  ];

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
  } = useDealsTable([...deals, ...dummyDeals], [...projects, ...dummyProjects], contacts);

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
          <span className="font-bold text-foreground text-[11px] group-hover/name:text-blue-600 transition-colors">
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
            <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[9px] font-black text-blue-500 group-hover/contact:scale-110 transition-transform">
              {p?.contact_name?.substring(0, 2).toUpperCase() || "??"}
            </div>
            <span className="font-medium text-xs text-foreground/80 group-hover/contact:text-blue-600 transition-colors">
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
          <span className="font-black text-blue-500 text-sm tabular-nums tracking-tighter">
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
            <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 w-fit">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">
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
              className={`flex flex-col gap-0.5 ${isOverdue ? "text-red-500" : "text-amber-500"}`}
            >
              <div
                className={`flex items-center gap-1.5 ${isOverdue ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"} px-2 py-1 rounded-lg border w-fit`}
              >
                {isOverdue ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3 text-amber-500" />
                )}
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {isOverdue ? "Po splatnosti" : "Čaká na platbu"}
                </span>
              </div>
              {deal.due_date && !isNaN(new Date(deal.due_date).getTime()) && (
                <span className="text-[9px] font-bold opacity-60 ml-1 italic">
                  Splatnosť:{" "}
                  {format(new Date(deal.due_date), "d. MMM", { locale: sk })}
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border w-fit">
            <FileText className="w-3 h-3 opacity-40" />
            <span className="text-[9px] font-black uppercase tracking-wider">
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
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!deal.invoice_date && deal.value > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (deal.project) setInvoicingProject(deal.project);
                }}
                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-1 text-[9px] font-black uppercase px-3"
              >
                <Receipt className="w-3 h-3" /> Fakturovať
              </button>
            )}
            {deal.invoice_date && !deal.paid && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (deal.project) setPayingProject(deal.project);
                }}
                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1 text-[9px] font-black uppercase px-3"
              >
                <Banknote className="w-3 h-3" /> Označiť ako zaplatené
              </button>
            )}
            {deal.paid && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    deal.project &&
                    confirm("Naozaj chcete vrátiť stav na 'Čaká na platbu'?")
                  ) {
                    handleTogglePaidStatus(deal.project.id, false);
                  }
                }}
                className="p-1.5 rounded-lg border border-amber-500/20 text-amber-500 hover:bg-amber-500/10 transition-all"
                title="Vrátiť na nezaplatené"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            {!deal.paid && deal.invoice_date && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    deal.project &&
                    confirm("Naozaj chcete stornovať túto faktúru?")
                  ) {
                    handleInvoiceProject(deal.project.id, {
                      invoice_date: null,
                      due_date: null,
                      paid: false,
                    });
                  }
                }}
                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                title="Stornovať faktúru"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="w-3 h-3" />
            </button>
            {deal.project?.drive_folder_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (deal.project) {
                    setFullDetailTab("documents");
                    setFullDetailProject(deal.project);
                  }
                }}
                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 transition-all hover:text-white shadow-lg shadow-blue-500/5 group"
              >
                <HardDrive className="w-3 h-3 group-hover:scale-110 transition-transform" />
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
        key={fullDetailProject?.id}
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
          onConfirm={async (data) => {
            await handleInvoiceProject(invoicingProject.id, data);
          }}
        />
      )}

      {payingProject && (
        <PaymentModal
          isOpen={!!payingProject}
          onClose={() => setPayingProject(null)}
          project={payingProject}
          onConfirm={async () => {
            await handleTogglePaidStatus(payingProject.id, true);
          }}
        />
      )}

      <ContactDetailModal
        contact={detailContact}
        isOpen={!!detailContact}
        onClose={() => setDetailContact(null)}
      />

      <div className="bg-transparent rounded-[2.5rem] border border-border/50 overflow-hidden transition-colors duration-300 h-full flex flex-col">
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

        <div className="overflow-auto flex-1 thin-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] border-r border-border/50 last:border-0"
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
                  className="group bg-card hover:bg-indigo-500/5 transition-all duration-150 relative"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-3 border-r border-border/10 last:border-0">
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
