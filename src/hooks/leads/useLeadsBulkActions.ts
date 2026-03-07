"use client";

import * as React from "react";
import { toast } from "sonner";
import { GmailMessage } from "@/types/gmail";

export function useLeadsBulkActions(
  setMessages: React.Dispatch<React.SetStateAction<GmailMessage[]>>,
  setMessageTags: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
  setCustomTags: React.Dispatch<React.SetStateAction<string[]>>
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

  const handleBulkArchive = React.useCallback((idsToArchive: string[]) => {
    toast.success(`Archivovaných ${idsToArchive.length} správ`);
    setMessages(prev => 
      prev.map(m => idsToArchive.includes(m.id) ? { ...m, labels: [...(m.labels || []), "ARCHIVE"].filter(l => l !== "INBOX") } : m)
    );
    setSelectedIds(prev => {
      const next = new Set(prev);
      idsToArchive.forEach(id => next.delete(id));
      return next;
    });
  }, [setMessages]);

  const handleBulkTag = React.useCallback((idsToTag: string[], tag: string) => {
    toast.success(`Štítok '${tag}' pridaný na ${idsToTag.length} správ`);
    setMessageTags(prev => {
      const next = { ...prev };
      idsToTag.forEach(id => {
        next[id] = [...new Set([...(next[id] || []), tag])];
      });
      return next;
    });
    setCustomTags(prev => {
      if (!prev.includes(tag)) return [...prev, tag].sort();
      return prev;
    });
    clearSelection();
  }, [setMessageTags, setCustomTags, clearSelection]);

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
