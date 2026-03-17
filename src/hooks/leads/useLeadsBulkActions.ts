"use client";

import * as React from "react";
import { toast } from "sonner";
import { GmailMessage } from "@/types/gmail";

export function useLeadsBulkActions(
  setMessages: React.Dispatch<React.SetStateAction<GmailMessage[]>>,
  setMessageTags: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = React.useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      if (prev.size === ids.length) return new Set();
      return new Set(ids);
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkArchive = React.useCallback(async (idsToArchive: string[]) => {
    try {
      const res = await fetch("/api/google/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", ids: idsToArchive })
      });
      
      if (!res.ok) throw new Error("API error");

      toast.success(`Archivovaných ${idsToArchive.length} správ`);
      setMessages(prev => 
        prev.map(m => idsToArchive.includes(m.id) ? { ...m, labels: [...(m.labels || []), "ARCHIVE"].filter(l => l !== "INBOX") } : m)
      );
      setSelectedIds(prev => {
        const next = new Set(prev);
        idsToArchive.forEach(id => next.delete(id));
        return next;
      });
    } catch (err) {
      toast.error("Chyba pri hromadnej archivácii");
    }
  }, [setMessages]);

  const handleBulkTag = React.useCallback(async (idsToTag: string[], tag: string) => {
    try {
      const res = await fetch("/api/google/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addLabel", ids: idsToTag, labelName: tag })
      });

      if (!res.ok) throw new Error("API error");

      toast.success(`Štítok '${tag}' pridaný na ${idsToTag.length} správ`);
      
      // Update local state
      setMessageTags(prev => {
        const next = { ...prev };
        idsToTag.forEach(id => {
          next[id] = [...new Set([...(next[id] || []), tag])];
        });
        return next;
      });

      clearSelection();
    } catch (err) {
      toast.error(`Chyba pri pridávaní štítka '${tag}'`);
    }
  }, [setMessageTags, clearSelection]);

  return {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkArchive,
    handleBulkTag
  };
}
