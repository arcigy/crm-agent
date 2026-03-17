"use client";

import * as React from "react";
import { toast } from "sonner";
import { useCurrentCRMUser } from "@/hooks/useCurrentCRMUser";
import { GmailMessage } from "@/types/gmail";
import { AndroidLog } from "@/types/android";
import {
  agentCreateContact,
  agentCreateDeal,
  agentCheckAvailability,
  agentScheduleEvent,
  agentSendEmail,
} from "@/app/actions/agent";
import { useSearchParams } from "next/navigation";
import { useLeadsTagging } from "./leads/useLeadsTagging";
import { useLeadsMockData } from "./leads/useLeadsMockData";
import { useLeadsBulkActions } from "./leads/useLeadsBulkActions";
import { useLeadsMessageHandlers } from "./leads/useLeadsMessageHandlers";
import { useLeadsFiltering } from "./leads/useLeadsFiltering";
import { useLeadsPersistence } from "./leads/useLeadsPersistence";
import { useLeadsAgent } from "./leads/useLeadsAgent";
import { useLeadsFetch } from "./leads/useLeadsFetch";

export function useLeadsInbox(initialMessages: GmailMessage[] = []) {
  const { user, isLoaded } = useCurrentCRMUser();
  const [selectedTab, setSelectedTab] = React.useState<string>("inbox");
  const [view, setView] = React.useState<"threads" | "messages">("threads");
  const {
    messageTags, setMessageTags,
    getSmartTags,
    applySmartTagging
  } = useLeadsTagging();

  const {
    messages, setMessages,
    androidLogs, setAndroidLogs,
    loading, setLoading,
    isConnected, setIsConnected,
    fetchMessages,
    userLabels: gmailLabels,
    inboxStats,
    totalMessages: gmailTotalMessages,
    isBuffering,
    invalidateCache,
    updateCachedStar,
    syncStatus
  } = useLeadsFetch(initialMessages, getSmartTags, selectedTab);

  const { getMockMessages } = useLeadsMockData();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");

  // Performance: Debounce search to avoid choppiness
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);
  const [contactModalData, setContactModalData] = React.useState<{
    name: string;
    email: string;
    phone: string;
    company: string;
    website: string;
  } | null>(null);
  const [contactModalEmailBody, setContactModalEmailBody] = React.useState("");
  const [activeActionId, setActiveActionId] = React.useState<string | null>(null);
  const [draftingEmail, setDraftingEmail] = React.useState<GmailMessage | null>(null);
  const [draftContent, setDraftContent] = React.useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = React.useState(false);
  const [customCommandMode, setCustomCommandMode] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  // IMPORTANT: Initialize as false to prevent hydration mismatch (server vs client)
  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const [hasDraft, setHasDraft] = React.useState(false);
  const [draftData, setDraftData] = React.useState<{
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }>({ 
    to: "", 
    subject: "", 
    body: "" 
  });
  const [localSentMessages, setLocalSentMessages] = React.useState<GmailMessage[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [tagModalEmail, setTagModalEmail] = React.useState<GmailMessage | null>(null);
  const [selectedEmail, setSelectedEmail] = React.useState<GmailMessage | null>(null);
  const lastComposeEmail = React.useRef<string | null>(null);
  const {
      selectedIds,
      setSelectedIds,
      toggleSelection,
      selectAll,
      clearSelection,
      handleBulkArchive,
      handleBulkTag
  } = useLeadsBulkActions(setMessages, setMessageTags);

  const {
      handleDeleteMessage,
      handleArchiveMessage,
      handleSpamMessage,
      handleMarkUnreadMessage,
      handleRestoreMessage
  } = useLeadsMessageHandlers(setMessages, setSelectedEmail);
  const itemsPerPage = 50;
  const searchParams = useSearchParams();

  // Sync compose modal with URL search params (runs after hydration)
  React.useEffect(() => {
    const composeEmail = searchParams?.get("compose");
    if (composeEmail) {
        // Only open if this is a NEW compose trigger
        if (composeEmail !== lastComposeEmail.current) {
            lastComposeEmail.current = composeEmail;
            setDraftData({ to: composeEmail, subject: "", body: "" });
            setIsComposeOpen(true);
            setHasDraft(false);
        }
    } else {
        lastComposeEmail.current = null;
    }
  }, [searchParams]);

  useLeadsPersistence(
    setMessages, setSelectedTab, setSearchQuery, setIsComposeOpen, setHasDraft,
    setDraftContent, setDraftData, setSelectedEmail, setCustomPrompt, setCustomCommandMode,
    setActiveActionId, setCurrentPage, setSelectedIds, setMessageTags,
    { selectedTab, searchQuery, isComposeOpen, hasDraft, draftData, draftContent, selectedEmail, customPrompt, customCommandMode, activeActionId, currentPage, selectedIds: Array.from(selectedIds), messageTags }
  );

  // Sync messageTags with fetched messages from Gmail
  React.useEffect(() => {
    if (messages.length > 0) {
      const newTags: Record<string, string[]> = {};
      messages.forEach(msg => {
        if (msg.googleLabels && msg.googleLabels.length > 0) {
          // Filter out system labels to keep messageTags focused on user labels
          newTags[msg.id] = msg.googleLabels.filter(l => 
            !['INBOX', 'UNREAD', 'STARRED', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'].includes(l.toUpperCase())
          );
        }
      });
      setMessageTags(prev => ({ ...prev, ...newTags }));
    }
  }, [messages, setMessageTags]);

  // Trigger server-side search
  React.useEffect(() => {
    fetchMessages(false, selectedTab, 1, view, debouncedSearchQuery);
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedTab, view]);

  const analyzedIds = React.useRef<Set<string>>(new Set());

  // Initial fetch and periodic sync are now handled in useLeadsFetch
  // with dependency on selectedTab. We only need periodic background refresh here if desired.
  React.useEffect(() => {
    // Initial fetch and periodic sync are now primarily handled in useLeadsFetch
    const interval = setInterval(() => fetchMessages(true, selectedTab, currentPage, view, debouncedSearchQuery), 15000);
    return () => clearInterval(interval);
  }, [selectedTab, fetchMessages, currentPage, view, debouncedSearchQuery]);

  const handleConnect = async () => {
    if (!isLoaded || !user) return;
    setLoading(true);
    try {
      if ((user as any).createExternalAccount) {
        await (user as any).createExternalAccount({
          strategy: "oauth_google",
          redirectUrl: window.location.href,
        });
      } else {
        // Fallback for bypass/dev mode: fetch direct auth URL and redirect
        const res = await fetch("/api/google/auth-url");
        if (res.ok) {
          const { url } = await res.json();
          if (url) window.location.href = url;
          else throw new Error("No URL returned");
        } else throw new Error("API call failed");
      }
    } catch (error) {
      console.error("Failed to connect Google:", error);
      toast.error("Nepodarilo sa spustiť prepojenie s Google");
      setLoading(false);
    }
  };

  const handleOpenEmail = async (msg: GmailMessage) => {
    if (msg.id === "local-draft-1") {
      setIsComposeOpen(true);
      window.dispatchEvent(new CustomEvent("unminimize-compose"));
      return;
    }

    setSelectedEmail(msg);
    if (!msg.isRead) {
      if (typeof window !== 'undefined' && msg.id.startsWith("mock-")) {
        const index = msg.id.split("-")[1];
        localStorage.setItem(`email_read_${index}`, "true");
      }
      
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)),
      );
      try {
        await fetch("/api/google/gmail", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msg.id }),
        });
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // Load full body if missing (for replies/forwards)
    if (!msg.bodyHtml || msg.bodyHtml.length < 50) {
      try {
        const res = await fetch(`/api/google/gmail?id=${msg.id}`);
        const data = await res.json();
        if (data.message?.bodyHtml) {
          const updatedMsg = { 
            ...msg, 
            bodyHtml: data.message.bodyHtml, 
            messageIdHeader: data.message.messageIdHeader,
            referencesHeader: data.message.referencesHeader,
            isRead: true 
          };
          setSelectedEmail(updatedMsg);
          setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
        }
      } catch (err) {
        console.error("Failed to fetch full body:", err);
      }
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, msg: GmailMessage) => {
    e.stopPropagation();
    
    const newIsStarred = !msg.isStarred;
    
    // Save to localStorage for mock emails
    if (typeof window !== 'undefined' && msg.id.startsWith("mock-")) {
      const index = msg.id.split("-")[1];
      localStorage.setItem(`email_starred_mock-${index}`, newIsStarred.toString());
    }

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isStarred: newIsStarred } : m)),
    );

    if (selectedEmail?.id === msg.id) {
      setSelectedEmail({ ...selectedEmail, isStarred: newIsStarred });
    }
    
    if (msg.id.startsWith("mock-")) return;
    
    try {
      // 1. Update all caches immediately
      updateCachedStar(msg.id, newIsStarred);

      await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messageId: msg.id,
          action: newIsStarred ? "star" : "unstar" 
        }),
      });
      
    } catch (error) {
      console.error("Failed to toggle star:", error);
      // Revert on failure
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isStarred: !newIsStarred } : m)),
      );
      updateCachedStar(msg.id, !newIsStarred);
      toast.error("Nepodarilo sa zmeniť stav hviezdičky");
    }
  };

  // Message Handlers moved to useLeadsMessageHandlers hook

  const analyzeEmail = async (msg: GmailMessage) => {
    if (analyzedIds.current.has(msg.id)) return;
    analyzedIds.current.add(msg.id);

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isAnalyzing: true } : m)),
    );

    try {
      let textToAnalyze = (msg.body || "").toString();
      if ((!textToAnalyze || textToAnalyze.length < 50) && msg.bodyHtml) {
        textToAnalyze = (msg.bodyHtml || "")
          .toString()
          .replace(/<[^>]*>?/gm, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      if (!textToAnalyze || textToAnalyze.length < 5) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isAnalyzing: false } : m)),
        );
        return;
      }

      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToAnalyze.substring(0, 3000),
          messageId: msg.id,
          sender: msg.from,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              `ai_classify_${msg.id}`,
              JSON.stringify(data.classification),
            );
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    classification: data.classification,
                    isAnalyzing: false,
                  }
                : m,
            ),
          );
          // Apply smart tags immediately after analysis
          applySmartTagging(msg.id, data.classification);
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isAnalyzing: false } : m)),
      );
    }
  };

  const handleManualAnalyze = async (
    e: React.MouseEvent,
    msg: GmailMessage,
  ) => {
    e.stopPropagation();
    analyzedIds.current.delete(msg.id);
    analyzeEmail(msg);
  };

  const handleToggleAction = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    setActiveActionId((prev) => (prev === msgId ? null : msgId));
  };

  const { handleDraftReply, executeCommand } = useLeadsAgent(
    setDraftContent, setDraftingEmail, setIsGeneratingDraft, setSearchQuery, setSelectedTab, setMessages
  );

  const handleExecuteCustomCommand = async () => {
    if (!customPrompt.trim() || !selectedEmail) return;
    await executeCommand(customPrompt, selectedEmail);
    setCustomCommandMode(false);
    setCustomPrompt("");
  };

  const handleSaveContact = async (e: React.MouseEvent, msg: GmailMessage) => {
    e.stopPropagation();
    const aiEntities = msg.classification?.entities;
    let name =
      aiEntities?.contact_name && aiEntities.contact_name !== "—"
        ? aiEntities.contact_name
        : "";
    let email =
      aiEntities?.email && aiEntities.email !== "—" ? aiEntities.email : "";
    let phone =
      aiEntities?.phone && aiEntities.phone !== "—"
        ? aiEntities.phone.replace(/\s/g, "")
        : "";
    const company =
      aiEntities?.company_name && aiEntities.company_name !== "—"
        ? aiEntities.company_name
        : "";
    let website =
      aiEntities?.website && aiEntities.website !== "—"
        ? aiEntities.website
        : "";

    if (!name || !email) {
      const originalFrom = (msg.from || "").toString();
      const emailMatch = originalFrom.match(/<([^>]+)>/);
      if (emailMatch) {
        if (!email) email = emailMatch[1];
        if (!name)
          name = originalFrom
            .replace(/<[^>]+>/, "")
            .trim()
            .replace(/^"|"$/g, "");
      } else {
        if (!email) email = originalFrom.trim();
        if (!name) name = email.split("@")[0];
      }
    }

    if (!phone) {
      const phoneRegex =
        /(?:\+|00)(?:421|420|43|49)\s?\d{1,4}\s?\d{2,4}\s?\d{2,4}|(?<!\d)09\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)/g;
      const phones = (msg.body || msg.snippet || "").match(phoneRegex);
      if (phones) phone = phones[phones.length - 1].replace(/\s/g, "");
    }

    if (!website || website === "—") {
      const websiteRegex =
        /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:sk|cz|com|eu|net|org|info|biz|at|de|hu))(?:\/[^\s]*)?/gi;
      const text = (msg.body || msg.snippet || "")
        .substring(0, 5000)
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " ");
      const matches = text.match(websiteRegex);
      if (matches) website = matches[matches.length - 1].trim().toLowerCase();
    }

    setContactModalData({ name, email, phone, company, website });
    setContactModalEmailBody(msg.body || msg.snippet || "");
    setIsContactModalOpen(true);
  };

  const [isDealModalOpen, setIsDealModalOpen] = React.useState(false);
  const [dealModalData, setDealModalData] = React.useState<{
    name: string;
    value: number;
    contact_id?: string;
    contact_email?: string;
    description: string;
  } | null>(null);

  const handleCreateDeal = async (e: React.MouseEvent, msg: GmailMessage) => {
    e.stopPropagation();
    const aiEntities = msg.classification?.entities;
    const estimatedBudget = msg.classification?.estimated_budget || "";
    
    // Extract numeric value from budget string
    const budgetValue = parseFloat(estimatedBudget.replace(/[^0-9.]/g, '')) || 0;
    
    const name = aiEntities?.company_name && aiEntities.company_name !== "—" 
      ? `Obchod: ${aiEntities.company_name}`
      : `Obchod: ${msg.subject || "(bez predmetu)"}`;

    setDealModalData({
      name,
      value: budgetValue,
      contact_email: aiEntities?.email || msg.from,
      description: `Vytvorené z e-mailu: ${msg.subject}\n\n${msg.snippet}`
    });
    setIsDealModalOpen(true);
  };

  const { allItems } = useLeadsFiltering(
    messages, localSentMessages, androidLogs, searchQuery, selectedTab, messageTags, hasDraft, draftData
  );

  const paginatedItems = allItems;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab]);

  const handleEmptyTrash = React.useCallback(async () => {
    const toastId = toast.loading("Vysypávam kôš...");
    try {
      // Optimistic update
      setMessages(prev => prev.filter(m => !(m.labels || []).includes("TRASH")));

      const res = await fetch("/api/google/gmail?action=emptyTrash", { method: "DELETE" });
      if (res.ok) {
        toast.success("Kôš bol úspešne vyprázdnený", { id: toastId });
        fetchMessages(true, selectedTab);
      } else {
        toast.error("Nepodarilo sa vyprázdniť kôš", { id: toastId });
      }
    } catch (err) {
      toast.error("Chyba pri vyprázdňovaní koša", { id: toastId });
    }
  }, [fetchMessages, setMessages, selectedTab]);

  const handleToggleTag = React.useCallback(async (id: string, tag: string) => {
    let next: string[] = [];
    setMessageTags(prev => {
      const current = prev[id] || [];
      next = current.includes(tag) 
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...prev, [id]: next };
    });

    // Sync to Gmail in background
    try {
        const { syncMessageTagsToGmail } = await import("@/app/actions/gmail-labels");
        // We sync ALL current CRM tags for this message to Gmail
        await syncMessageTagsToGmail(id, next);
    } catch (err) {
        console.error("Gmail tag sync error:", err);
    }
  }, [setMessageTags]);

  return {
    messages,
    isConnected,
    loading,
    searchQuery,
    debouncedSearchQuery,
    onSearchChange: setSearchQuery,
    onRefresh: () => fetchMessages(false, selectedTab),
    onConnect: handleConnect,
    allItems,
    paginatedItems,
    currentPage,
    isBuffering,
    currentIndex: (selectedEmail && allItems.length > 0) 
      ? ((currentPage - 1) * itemsPerPage) + allItems.findIndex(i => i.id === selectedEmail.id) + 1 
      : 0,
    onPageChange: (page: number) => {
      fetchMessages(false, selectedTab, page, view, debouncedSearchQuery);
      setCurrentPage(page);
    },
    totalCount: (gmailTotalMessages || 0) + androidLogs.length,
    totalPages: Math.ceil(((gmailTotalMessages || 0) + androidLogs.length) / itemsPerPage),
    selectedEmail,
    setSelectedEmail,
    isContactModalOpen,
    setIsContactModalOpen,
    contactModalData,
    contactModalEmailBody,
    activeActionId,
    setActiveActionId,
    draftingEmail,
    setDraftingEmail,
    draftContent,
    setIsGeneratingDraft,
    isGeneratingDraft,
    customCommandMode,
    setCustomCommandMode,
    customPrompt,
    setCustomPrompt,
    isComposeOpen,
    setIsComposeOpen,
    hasDraft,
    setHasDraft,
    draftData,
    setDraftData,
    handleDeleteMessage,
    handleArchiveMessage,
    handleSpamMessage,
    handleMarkUnreadMessage,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkArchive,
    handleBulkTag,
    handleToggleTag,
    handleRestoreMessage,
    handleEmptyTrash,
    analyzeEmail,
    handleOpenEmail,
    handleToggleStar,
    handleManualAnalyze,
    handleToggleAction,
    handleDraftReply,
    handleExecuteCustomCommand,
    handleSaveContact,
    handleCreateDeal,
    isDealModalOpen,
    setIsDealModalOpen,
    dealModalData,
    setDealModalData,
    messageTags,
    setMessageTags,
    isTagModalOpen,
    setIsTagModalOpen,
    tagModalEmail,
    setTagModalEmail,
    selectedTab,
    setSelectedTab,
    view,
    setView: (v: "threads" | "messages") => {
       setView(v);
       fetchMessages(false, selectedTab, 1, v, debouncedSearchQuery);
       setCurrentPage(1);
    },
    setSelectedTabWithReset: (tab: string) => {
        console.time(`tab-switch-to-${tab}`);
        setSelectedTab(tab);
        setSelectedEmail(null);
        setCurrentPage(1);
        fetchMessages(false, tab, 1, view, debouncedSearchQuery).then(() => {
          console.timeEnd(`tab-switch-to-${tab}`);
        });
    },
    handleAddLocalSentMessage: (data: { to: string; subject: string; body: string }) => {
      const newSentMsg = {
        id: `local-sent-${Date.now()}`,
        threadId: `thread-sent-${Date.now()}`,
        from: "Ja <ja@crm.arcigy.cloud>",
        to: data.to,
        subject: data.subject,
        snippet: data.body.substring(0, 100),
        date: new Date().toISOString(),
        isRead: true,
        isStarred: false,
        body: data.body,
        labels: ["SENT"],
        classification: {
          intent: "notifikácia" as any,
          priority: "stredna" as any,
          estimated_budget: "—",
          summary: data.body.substring(0, 80) + "...",
          next_step: "—",
          service_category: "Odoslané",
          sentiment: "pozitivny" as any
        }
      } as any;
      setLocalSentMessages(prev => [newSentMsg, ...prev]);
    },
    gmailLabels,
    inboxStats,
    syncStatus
  };
}
