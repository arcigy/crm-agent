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
  const {
    customTags, setCustomTags,
    tagColors, setTagColors,
    messageTags, setMessageTags,
    getSmartTags,
    applySmartTagging
  } = useLeadsTagging();

  const {
    messages, setMessages,
    androidLogs, setAndroidLogs,
    loading, setLoading,
    isConnected, setIsConnected,
    fetchMessages
  } = useLeadsFetch(initialMessages, getSmartTags);

  const { getMockMessages } = useLeadsMockData();
  const [selectedTab, setSelectedTab] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
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
  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const [hasDraft, setHasDraft] = React.useState(false);
  const [draftData, setDraftData] = React.useState({ to: "", subject: "", body: "" });
  const [localSentMessages, setLocalSentMessages] = React.useState<GmailMessage[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [tagModalEmail, setTagModalEmail] = React.useState<GmailMessage | null>(null);
  const [selectedEmail, setSelectedEmail] = React.useState<GmailMessage | null>(
    null,
  );
  const {
      selectedIds,
      setSelectedIds,
      toggleSelection,
      selectAll,
      clearSelection,
      handleBulkArchive,
      handleBulkTag
  } = useLeadsBulkActions(setMessages, setMessageTags, setCustomTags);

  const {
      handleDeleteMessage,
      handleArchiveMessage,
      handleSpamMessage,
      handleMarkUnreadMessage
  } = useLeadsMessageHandlers(setMessages, setSelectedEmail);
  const itemsPerPage = 50;
  const searchParams = useSearchParams();

  // Listen for 'compose' query param to trigger new email
  React.useEffect(() => {
    const composeEmail = searchParams?.get("compose");
    if (composeEmail) {
      setDraftData({
        to: composeEmail,
        subject: "",
        body: "",
      });
      setIsComposeOpen(true);
      setHasDraft(false); // Clear previous draft state to focus on new
      
      // Clean up URL after processing (optional but cleaner)
      // window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  useLeadsPersistence(
    setMessages, setSelectedTab, setSearchQuery, setIsComposeOpen, setHasDraft,
    setDraftContent, setDraftData, setSelectedEmail, setCustomPrompt, setCustomCommandMode,
    setActiveActionId, setCurrentPage, setSelectedIds, setCustomTags, setTagColors, setMessageTags,
    { selectedTab, searchQuery, isComposeOpen, hasDraft, draftData, draftContent, selectedEmail, customPrompt, customCommandMode, activeActionId, currentPage, selectedIds: Array.from(selectedIds), customTags, tagColors, messageTags }
  );

  const analyzedIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // Development Mock Data logic remains in the main hook for visibility but uses the helper
  React.useEffect(() => {
      if (process.env.NODE_ENV === "development" && messages.length === 0 && !loading) {
        const smartTagsBatch: Record<string, string[]> = {};
        const mocks = getMockMessages(getSmartTags);

        mocks.forEach(m => {
          const tags = getSmartTags(m.classification);
          if (tags.length > 0) smartTagsBatch[m.id] = tags;
        });

        setMessages(mocks);
        if (Object.keys(smartTagsBatch).length > 0) {
          setMessageTags(prev => ({ ...prev, ...smartTagsBatch }));
        }
      }
  }, [messages.length, loading, getMockMessages, getSmartTags, setMessages, setMessageTags]);

  const handleConnect = async () => {
    if (!isLoaded || !user) return;
    setLoading(true);
    try {
      // We need the real clerk user object here. 
      // If we are in bypass mode, this function shouldn't be called 
      // because Google connection is handled differently.
      if ((user as any).createExternalAccount) {
        await (user as any).createExternalAccount({
          strategy: "oauth_google",
          redirectUrl: window.location.href,
        });
      }
    } catch (error) {
      console.error("Failed to connect Google via Clerk:", error);
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

  const { allItems } = useLeadsFiltering(
    messages, localSentMessages, androidLogs, searchQuery, selectedTab, messageTags, hasDraft, draftData
  );

  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const paginatedItems = allItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEmptyTrash = React.useCallback(() => {
    toast.success("Kôš bol úspešne vyprázdnený");
    setMessages(prev => prev.filter(m => !(m.labels || []).includes("TRASH")));
  }, []);

  const handleToggleTag = React.useCallback((id: string, tag: string) => {
    setMessageTags(prev => {
      const current = prev[id] || [];
      const next = current.includes(tag) 
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...prev, [id]: next };
    });
  }, [setMessageTags]);

  const handleRemoveCustomTag = React.useCallback((tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
    setTagColors(prev => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    setMessageTags(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = next[id].filter(t => t !== tag);
      });
      return next;
    });
    toast.success(`Štítok '${tag}' bol odstránený`);
  }, [setCustomTags, setTagColors, setMessageTags]);

  const handleRenameCustomTag = React.useCallback((oldTag: string, newTag: string) => {
    if (!newTag.trim() || oldTag === newTag) return;
    
    setCustomTags(prev => {
      const next = prev.map(t => t === oldTag ? newTag : t);
      return [...new Set(next)].sort();
    });

    setTagColors(prev => {
      const next = { ...prev };
      if (next[oldTag]) {
        next[newTag] = next[oldTag];
        delete next[oldTag];
      }
      return next;
    });
    
    setMessageTags(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = next[id].map(t => t === oldTag ? newTag : t);
      });
      return next;
    });
    
    toast.success(`Štítok '${oldTag}' premenovaný na '${newTag}'`);
  }, [setCustomTags, setTagColors, setMessageTags]);

  return {
    messages,
    isConnected,
    loading,
    searchQuery,
    onSearchChange: setSearchQuery,
    onRefresh: fetchMessages,
    onConnect: handleConnect,
    totalCount: messages.length + localSentMessages.length + androidLogs.length,
    currentPage,
    totalPages: Math.ceil((messages.length + localSentMessages.length + androidLogs.length) / itemsPerPage),
    onPageChange: setCurrentPage,
    allItems,
    paginatedItems,
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
    handleRemoveCustomTag,
    handleRenameCustomTag,
    handleEmptyTrash,
    analyzeEmail,
    handleOpenEmail,
    handleToggleStar,
    handleManualAnalyze,
    handleToggleAction,
    handleDraftReply,
    handleExecuteCustomCommand,
    handleSaveContact,
    customTags,
    setCustomTags,
    tagColors,
    setTagColors,
    messageTags,
    setMessageTags,
    isTagModalOpen,
    setIsTagModalOpen,
    tagModalEmail,
    setTagModalEmail,
    selectedTab,
    setSelectedTab,
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
    }
  };
}
