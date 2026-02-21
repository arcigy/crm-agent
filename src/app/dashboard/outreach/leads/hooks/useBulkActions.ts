"use client";

import { toast } from "sonner";
import { 
    bulkDeleteColdLeads, 
    bulkUpdateColdLeads,
    sendColdLeadEmail,
    bulkReEnrichLeads,
    bulkSortLeads,
    identifyIndustryLead,
    bulkSortLeadsByIndustry,
    bulkQueueForSmartLead,
    cleanupDuplicates,
    type ColdLeadItem
} from "@/app/actions/cold-leads";

export function useBulkActions(
    selectedIds: Set<string | number>,
    setSelectedIds: (ids: Set<string | number>) => void,
    activeListName: string,
    refreshLeads: (list: string) => void
) {
    const handleBulkDelete = async () => {
        if (!confirm(`Naozaj vymazať ${selectedIds.size} leadov?`)) return;
        const ids = Array.from(selectedIds);
        const res = await bulkDeleteColdLeads(ids);
        if (res.success) {
            toast.success(`${ids.length} leadov vymazaných`);
            refreshLeads(activeListName);
            setSelectedIds(new Set());
        }
    };

    const handleBulkMove = async (targetListName: string) => {
        if (!confirm(`Presunúť ${selectedIds.size} leadov do ${targetListName}?`)) return;
        const ids = Array.from(selectedIds);
        const res = await bulkUpdateColdLeads(ids, { list_name: targetListName });
        if (res.success) {
            toast.success("Leady presunuté");
            refreshLeads(activeListName);
            setSelectedIds(new Set());
        }
    };

    const handleBulkReEnrich = async () => {
        const ids = Array.from(selectedIds);
        if (!confirm(`Re-spustiť scraping a AI spracovanie pre ${ids.length} leadov?`)) return;
        const res = await bulkReEnrichLeads(ids);
        if (res.success) {
            toast.success("Procesy reštartované na pozadí");
            setSelectedIds(new Set());
            refreshLeads(activeListName);
            fetch("/api/cron/enrich-leads").catch(console.error);
        }
    };

    const handleIndustryClassifier = async () => {
        const ids = Array.from(selectedIds);
        if (!confirm(`Spustiť Industry Classifier pre ${ids.length} leadov?`)) return;
        const res = await identifyIndustryLead(ids);
        if (res.success) {
            toast.success("Pridané do fronty");
            setSelectedIds(new Set());
            fetch("/api/cron/industry-classifier").catch(console.error);
        }
    };

    return {
        handleBulkDelete,
        handleBulkMove,
        handleBulkReEnrich,
        handleIndustryClassifier
    };
}
