"use client";

import { GmailMessage } from "@/types/gmail";
import { AndroidLog } from "@/types/android";

export function useLeadsFiltering(
  messages: GmailMessage[],
  localSentMessages: GmailMessage[],
  androidLogs: AndroidLog[],
  searchQuery: string,
  selectedTab: string,
  messageTags: Record<string, string[]>,
  hasDraft: boolean,
  draftData: { to: string; subject: string; body: string }
) {
  const normalizeSearchText = (text?: string | null) => {
    return (text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const filteredMessages = messages.filter((msg) => {
    const lowerSearch = normalizeSearchText(searchQuery);
    const matchesSearch =
      normalizeSearchText(msg.subject).includes(lowerSearch) ||
      normalizeSearchText(msg.from).includes(lowerSearch) ||
      normalizeSearchText(msg.snippet).includes(lowerSearch);

    if (selectedTab === "unread") return matchesSearch && !msg.isRead;
    if (selectedTab === "starred") return matchesSearch && msg.isStarred;
    if (selectedTab === "sent") return matchesSearch && msg.labels?.includes("SENT");
    if (selectedTab === "drafts") return matchesSearch && msg.labels?.includes("DRAFT");
    if (selectedTab === "snoozed") return matchesSearch && msg.labels?.includes("SNOOZED");
    if (selectedTab === "shopping") return matchesSearch && msg.labels?.includes("CATEGORY_PURCHASES");
    if (selectedTab === "spam") return matchesSearch && msg.labels?.includes("SPAM");
    if (selectedTab === "trash") return matchesSearch && msg.labels?.includes("TRASH");
    if (selectedTab === "inbox") return matchesSearch && (!msg.labels || msg.labels.includes("INBOX") || msg.labels.length === 0);
    
    if (selectedTab.startsWith("tag:")) {
      const tagId = selectedTab.replace("tag:", "");
      const msgTags = messageTags[msg.id] || [];
      // Check labels array (which contains objects or strings)
      const hasLabelMatch = msg.labels?.some((l: any) => {
        if (typeof l === 'string') return l === tagId;
        return l.id === tagId;
      });
      return matchesSearch && (hasLabelMatch || msgTags.includes(tagId));
    }

    if (["leads", "more", "archive", "all"].includes(selectedTab)) return matchesSearch;
    return false;
  });

  const filteredLocalSent = localSentMessages.filter((msg) => {
    const lowerSearch = normalizeSearchText(searchQuery);
    const matchesSearch =
      normalizeSearchText(msg.subject).includes(lowerSearch) ||
      normalizeSearchText(msg.snippet).includes(lowerSearch);

    if (selectedTab === "sent") return matchesSearch && msg.labels?.includes("SENT");
    if (selectedTab === "all") return matchesSearch;
    return false;
  });

  const filteredLogs = androidLogs.filter((log) => {
    const lowerSearch = normalizeSearchText(searchQuery);
    const matchesSearch =
      normalizeSearchText(log.phone_number).includes(lowerSearch) ||
      normalizeSearchText(log.body).includes(lowerSearch);

    if (selectedTab === "sms") return matchesSearch && log.type === "sms";
    if (selectedTab === "calls") return matchesSearch && log.type === "call";
    if (selectedTab === "all") return matchesSearch;
    return false;
  });

  const shouldShowDraft = hasDraft && selectedTab === "drafts";

  const localDraftItem = shouldShowDraft ? [{
    id: "local-draft-1",
    threadId: "draft",
    from: "Koncept (Nová správa)",
    subject: (draftData.subject || "Bez predmetu") + " (Rozpísané)",
    snippet: draftData.body || draftData.to || "Zatiaľ bez textu...",
    date: new Date().toISOString(),
    isRead: true,
    isStarred: false,
    body: draftData.body,
    labels: ["DRAFT"],
    classification: {
      intent: "notifikácia" as any,
      priority: "stredna" as any,
      estimated_budget: "—",
      summary: "Neodoslaný koncept. Kliknite pre pokračovanie v písaní.",
      next_step: "Dokončiť a odoslať správu",
      service_category: "Koncepty",
      sentiment: "pozitivny" as any
    },
    itemType: "email" as const
  } as any] : [];

  const allItems = [
    ...localDraftItem,
    ...filteredLocalSent.map((m) => ({ ...m, itemType: "email" as const })),
    ...filteredMessages.map((m) => ({ ...m, itemType: "email" as const })),
    ...filteredLogs.map((l) => ({ ...l, itemType: "android" as const })),
  ].sort((a, b) => {
    const dateA = new Date((a as any).date || (a as any).timestamp || 0).getTime();
    const dateB = new Date((b as any).date || (b as any).timestamp || 0).getTime();
    return dateB - dateA;
  });

  return { allItems };
}
