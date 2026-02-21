"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { 
    getColdLeads, 
    deleteColdLead, 
    updateColdLead, 
    getColdLeadLists, 
    createColdLeadList, 
    bulkDeleteColdLeads, 
    bulkUpdateColdLeads,
    sendColdLeadEmail,
    updateColdLeadList,
    deleteColdLeadList,
    cleanupDuplicates,
    type ColdLeadItem, 
    type ColdLeadList 
} from "@/app/actions/cold-leads";

export function useLeadsLogic(initialListName: string = "Zoznam 1") {
    const [leads, setLeads] = useState<ColdLeadItem[]>([]);
    const [lists, setLists] = useState<ColdLeadList[]>([]);
    const [activeListName, setActiveListName] = useState<string>(initialListName);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
    const [editingCell, setEditingCell] = useState<{ id: string | number, field: keyof ColdLeadItem } | null>(null);
    const [editValue, setEditValue] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    const refreshLeads = useCallback(async (listName: string, isBackground = false) => {
        if (!isBackground) setLoading(true);
        const res = await getColdLeads(listName);
        if (res.success && res.data) {
            setLeads(res.data);
            if (!isBackground) {
                setSelectedIds(new Set());
            }
        }
        if (!isBackground) setLoading(false);
    }, []);

    const initData = useCallback(async () => {
        setLoading(true);
        const listsRes = await getColdLeadLists();
        if (listsRes.success && listsRes.data) {
            setLists(listsRes.data);
        }
        await refreshLeads(activeListName);
        setLoading(false);
    }, [activeListName, refreshLeads]);

    useEffect(() => {
        initData();
    }, [initData]);

    const filteredLeads = leads.filter(l => 
        l.company_name_reworked?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        leads, setLeads,
        lists, setLists,
        activeListName, setActiveListName,
        loading, setLoading,
        searchTerm, setSearchTerm,
        selectedIds, setSelectedIds,
        editingCell, setEditingCell,
        editValue, setEditValue,
        editInputRef,
        refreshLeads,
        initData,
        filteredLeads
    };
}
