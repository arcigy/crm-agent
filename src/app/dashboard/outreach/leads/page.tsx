"use client";

import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLeadsLogic } from "./hooks/useLeadsLogic";
import { useBulkActions } from "./hooks/useBulkActions";
import { LeadsSidebar } from "./components/LeadsSidebar";
import { LeadsTable } from "./components/LeadsTable";
import { LeadsHeader } from "./components/LeadsHeader";
import { BulkActionsBar } from "./components/BulkActionsBar";
import { ColdLeadsImportModal } from "@/components/dashboard/ColdLeadsImportModal";
import { ColdLeadDetailModal } from "@/components/dashboard/ColdLeadDetailModal";
import { cleanupDuplicates, updateColdLead, deleteColdLeadList, updateColdLeadList, createColdLeadList, getColdLeadLists, sendColdLeadEmail } from "@/app/actions/cold-leads";

export default function OutreachLeadsPage() {
  const {
    leads, setLeads,
    lists, setLists,
    activeListName, setActiveListName,
    loading,
    searchTerm, setSearchTerm,
    selectedIds, setSelectedIds,
    editingCell, setEditingCell,
    editValue, setEditValue,
    editInputRef,
    refreshLeads,
    filteredLeads
  } = useLeadsLogic();

  const {
    handleBulkDelete,
    handleBulkMove,
    handleBulkReEnrich,
    handleIndustryClassifier
  } = useBulkActions(selectedIds, setSelectedIds, activeListName, refreshLeads);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [openedLead, setOpenedLead] = useState<any>(null);

  // Individual Actions
  const handleEdit = (lead: any, field: any, value: any) => {
    setEditingCell({ id: lead.id, field });
    setEditValue(value || "");
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const updatedFields = { [field]: editValue };
    
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedFields } : l));
    const res = await updateColdLead(id, updatedFields);
    if (res.success) toast.success("Uložené");
    else toast.error("Chyba pri ukladaní");
    setEditingCell(null);
  };

  const handleSendEmail = async (id: string | number) => {
    const tid = toast.loading("Odosielam...");
    const res = await sendColdLeadEmail(id);
    if (res.success) toast.success("Odoslané", { id: tid });
    else toast.error(res.error || "Chyba (Skontrolujte Google prepojenie)", { id: tid });
    refreshLeads(activeListName);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/30">
      <LeadsSidebar 
        lists={lists} 
        activeListName={activeListName} 
        setActiveListName={setActiveListName}
        handleCreateList={() => setIsImportModalOpen(true)} 
        handleEditList={() => {}}
      />

      <main className="flex-1 overflow-y-auto w-full relative p-8 space-y-6">
        <LeadsHeader 
          activeListName={activeListName}
          lists={lists}
          filteredCount={filteredLeads.length}
          onCleanup={() => cleanupDuplicates(activeListName).then(() => refreshLeads(activeListName))}
          onImport={() => setIsImportModalOpen(true)}
        />

        <div className="relative group max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Hľadať v zozname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-[1.2rem] text-[11px] font-bold uppercase tracking-widest outline-none focus:border-blue-500/50 shadow-sm"
          />
        </div>

        {loading ? (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        ) : (
            <LeadsTable 
                leads={filteredLeads}
                selectedIds={selectedIds}
                toggleSelectAll={() => setSelectedIds(new Set(selectedIds.size === filteredLeads.length ? [] : filteredLeads.map(l => l.id)))}
                toggleSelectOne={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                }}
                onEdit={handleEdit}
                onDelete={() => {}}
                onSendEmail={handleSendEmail}
                onOpenDetail={setOpenedLead}
                editingCell={editingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                saveEdit={saveEdit}
                cancelEdit={() => setEditingCell(null)}
                handleKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                editInputRef={editInputRef as any}
            />
        )}

        <BulkActionsBar 
            selectedCount={selectedIds.size}
            activeListName={activeListName}
            lists={lists}
            onBulkMove={handleBulkMove}
            onBulkDelete={handleBulkDelete}
            onBulkSendEmail={() => {}}
            onBulkReEnrich={handleBulkReEnrich}
            onBulkSort={() => {}}
            onIndustryClassifier={handleIndustryClassifier}
            onSmartLead={() => {}}
            onExport={() => {}}
        />

        <ColdLeadsImportModal 
            isOpen={isImportModalOpen} 
            onClose={() => setIsImportModalOpen(false)} 
            initialListName={activeListName}
            onSuccess={() => refreshLeads(activeListName)}
        />

        {openedLead && (
            <ColdLeadDetailModal 
                isOpen={!!openedLead} 
                onClose={() => setOpenedLead(null)} 
                lead={openedLead}
            />
        )}
      </main>
    </div>
  );
}
