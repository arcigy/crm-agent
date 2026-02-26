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
  RotateCcw,
  FolderArchive,
  Trash2,
  ExternalLink,
  Settings,
  Zap,
} from "lucide-react";
import { isBefore } from "date-fns";
import { toast } from "sonner";

import { InvoiceModal } from "./deals/InvoiceModal";
import { PaymentModal } from "./deals/PaymentModal";
import { DealsFilters } from "./deals/DealsFilters";
import { PriceModal } from "./deals/PriceModal";
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

  const [activeMenu, setActiveMenu] = React.useState<number | null>(null);
  const [editingPriceProject, setEditingPriceProject] = React.useState<Project | null>(null);

  const columns = [
    columnHelper.accessor("project.name", {
      header: "Projekt / Klient",
      cell: (info) => (
        <div
          className="flex items-center gap-4 cursor-pointer group/name py-1"
          onClick={() => {
            const p = info.row.original.project;
            if (p) {
              setFullDetailTab("overview");
              setFullDetailProject(p);
            }
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-600/20 transition-all shadow-lg shrink-0">
            <FolderArchive className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white text-[13px] group-hover:text-violet-400 transition-colors truncate">
                {info.row.original.project?.name || "Projekt"}
            </span>
            <span className="text-[11px] text-zinc-500 truncate font-medium">
                {info.row.original.project?.contact_name || "Neznámy klient"}
            </span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("project.stage", {
      id: "project_stage",
      header: "Status Pipeline",
      cell: (info) => (
        <div className="flex items-center py-1">
            <StageBadge
            projectId={info.row.original.project?.id || 0}
            stage={(info.getValue() as any) || "planning"}
            onStageChange={handleUpdateProjectStage}
            />
        </div>
      ),
    }),
    columnHelper.accessor("value", {
      header: "Hodnota",
      cell: (info) => {
        const value = info.getValue();
        const project = info.row.original.project;

        if (!value || value === 0) {
          return (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                setEditingPriceProject(project);
              }}
              className="text-[11px] font-bold text-violet-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
              Zadať cenu
            </button>
          );
        }

        return (
          <div className="flex flex-col py-1">
            <span className="font-black text-white text-[15px] tabular-nums tracking-tighter italic">
                {new Intl.NumberFormat("sk-SK", {
                style: "currency",
                currency: "EUR",
                }).format(value)}
            </span>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Net_Revenue</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("paid", {
      header: "Stav Platby",
      cell: (info) => {
        const deal = info.row.original;
        if (!deal.value || deal.value === 0) return null;

        if (deal.paid) {
          return (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Uhradené</span>
            </div>
          );
        }

        if (deal.invoice_date) {
            const isOverdue = deal.due_date ? isBefore(new Date(deal.due_date), new Date()) : false;
            return (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit ${isOverdue ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isOverdue ? "Po Termíne" : "Čaká"}</span>
              </div>
            );
        }

        return (
          <div className="flex items-center gap-2 text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/20 w-fit">
            <Receipt className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pripravené</span>
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
          <div className="flex items-center justify-end gap-3 opacity-100 transition-all duration-300 relative">
            <div className="flex items-center gap-1.5">
                {!deal.invoice_date && deal.value > 0 ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (deal.project) setInvoicingProject(deal.project);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600 hover:text-white transition-all shadow-lg active:scale-95 group/inv"
                        title="Vystaviť faktúru"
                    >
                        <FileText className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                    </button>
                ) : deal.invoice_date && !deal.paid ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (deal.project) setPayingProject(deal.project);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-lg active:scale-95 group/pay"
                        title="Prijať platbu"
                    >
                        <Banknote className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                    </button>
                ) : (
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800/10 border border-zinc-800/20 text-zinc-700 opacity-20 pointer-events-none">
                        <FileText className="w-4.5 h-4.5" />
                    </div>
                )}
            </div>
            
            <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === deal.project?.id ? null : deal.project?.id);
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-zinc-600 hover:text-white hover:bg-white/10 ${activeMenu === deal.project?.id ? 'bg-white/10 text-white' : ''}`}
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {activeMenu === deal.project?.id && (
                    <>
                        <div 
                          className="fixed inset-0 z-[100]" 
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 z-[101] animate-in fade-in zoom-in-95 duration-200">
                            <button 
                              onClick={() => {
                                setFullDetailTab("overview");
                                setFullDetailProject(deal.project);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <ExternalLink className="w-4 h-4 text-violet-400" />
                                Detail Projektu
                            </button>
                            <button 
                              onClick={() => {
                                setEditingPriceProject(deal.project);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-500/10 transition-all"
                            >
                                <Settings className="w-4 h-4 text-emerald-400" />
                                Upraviť Cenu
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button 
                              onClick={() => {
                                toast.error("Funkcia vymazania momentálne nie je dostupná.");
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Vymazať
                            </button>
                        </div>
                    </>
                )}
            </div>
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
      <div className="contents">
        {fullDetailProject && (
          <ProjectDetailModal
            project={fullDetailProject}
            isOpen={!!fullDetailProject}
            onClose={() => setFullDetailProject(null)}
            initialTab={fullDetailTab}
          />
        )}

        {editingPriceProject && (
          <PriceModal
            isOpen={!!editingPriceProject}
            onClose={() => setEditingPriceProject(null)}
            initialValue={editingPriceProject?.value || 0}
            projectName={editingPriceProject?.name || ""}
            onConfirm={async (val) => {
                if (editingPriceProject) {
                    await handleUpdateProjectValue(editingPriceProject.id, val);
                }
            }}
          />
        )}

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
      </div>

      <div className="flex flex-col h-full bg-black/20 backdrop-blur-md rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
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
          onNewClick={() => {}}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden thin-scrollbar px-2 min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0a0a0c] sticky top-0 z-20 border-b border-white/5">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic whitespace-nowrap"
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
            <tbody className="divide-y divide-white/[0.03]">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group hover:bg-white/[0.02] transition-all duration-300"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td 
                      key={cell.id} 
                      className={`px-6 py-4 ${cell.column.id === 'actions' || cell.column.id === 'project_stage' ? 'overflow-visible' : ''}`}
                    >
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

          {tableData.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-6 opacity-30">
                <Banknote className="w-16 h-16 text-zinc-700" />
                <div className="space-y-1">
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Žiadne finančné údaje</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Financial Ledger Empty</p>
                </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
