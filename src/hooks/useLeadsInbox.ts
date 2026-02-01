"use client";

import * as React from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { GmailMessage } from "@/types/gmail";
import { AndroidLog } from "@/types/android";
import {
  agentCreateContact,
  agentCreateDeal,
  agentCheckAvailability,
  agentScheduleEvent,
  agentSendEmail,
} from "@/app/actions/agent";

export function useLeadsInbox(initialMessages: GmailMessage[] = []) {
  const { user, isLoaded } = useUser();
  const [messages, setMessages] =
    React.useState<GmailMessage[]>(initialMessages);
  const [dbAnalyses, setDbAnalyses] = React.useState<any[]>([]);
  const [androidLogs, setAndroidLogs] = React.useState<AndroidLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTab, setSelectedTab] = React.useState<
    "all" | "unread" | "leads" | "sms" | "calls"
  >("all");
  const [selectedEmail, setSelectedEmail] = React.useState<GmailMessage | null>(
    null,
  );

  // MODAL STATE
  const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);
  const [contactModalData, setContactModalData] = React.useState<{
    name: string;
    email: string;
    phone: string;
    company: string;
    website: string;
  } | null>(null);
  const [contactModalEmailBody, setContactModalEmailBody] = React.useState("");

  // NEW STATES
  const [activeActionId, setActiveActionId] = React.useState<string | null>(
    null,
  );
  const [draftingEmail, setDraftingEmail] = React.useState<GmailMessage | null>(
    null,
  );
  const [draftContent, setDraftContent] = React.useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = React.useState(false);
  const [customCommandMode, setCustomCommandMode] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState("");

  const analyzedIds = React.useRef<Set<string>>(new Set());

  const fetchMessages = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // Fetch DB Analyses first (background analyzed emails)
      const dbRes = await fetch("/api/notes?type=ai_analysis");
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.success) {
          setDbAnalyses(dbData.notes || []);
        }
      }

      // Fetch Gmail
      const gmailRes = await fetch("/api/google/gmail", { cache: "no-store" });
      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        if (gmailData.isConnected && gmailData.messages) {
          setIsConnected(true);
          setMessages((prev) => {
            return gmailData.messages.map((newMsg: GmailMessage) => {
              const existing = prev.find((p) => p.id === newMsg.id);

              let classification = existing?.classification;
              if (!classification) {
                // Check DB analyses
                const dbMatch = dbAnalyses.find(
                  (a) => a.metadata?.gmail_id === newMsg.id,
                );
                if (dbMatch) {
                  classification = dbMatch.metadata.classification;
                } else {
                  const saved = localStorage.getItem(
                    `ai_classify_${newMsg.id}`,
                  );
                  if (saved) classification = JSON.parse(saved);
                }
              }

              if (classification) {
                return { ...newMsg, classification };
              }
              return newMsg;
            });
          });
        } else if (gmailData.isConnected === false) {
          setIsConnected(false);
        }
      }

      // Fetch Android Logs
      if (!isBackground) {
        const androidRes = await fetch("/api/android-logs");
        if (androidRes.ok) {
          const androidData = await androidRes.json();
          if (androidData.success) {
            setAndroidLogs(androidData.logs);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!isLoaded || !user) return;
    setLoading(true);
    try {
      await user.createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: window.location.href,
      });
    } catch (error) {
      console.error("Failed to connect Google via Clerk:", error);
      setLoading(false);
    }
  };

  const handleOpenEmail = async (msg: GmailMessage) => {
    setSelectedEmail(msg);
    if (!msg.isRead) {
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
          localStorage.setItem(
            `ai_classify_${msg.id}`,
            JSON.stringify(data.classification),
          );
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

  const handleDraftReply = async (msg: GmailMessage) => {
    setIsGeneratingDraft(true);
    try {
      const cleanBody = (msg.body || "")
        .toString()
        .replace(/<[^>]*>?/gm, "")
        .substring(0, 1000);
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent: cleanBody,
          nextStep: msg.classification?.next_step || "Reply",
          senderName: msg.from,
          messageId: msg.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftContent(data.draft);
        setDraftingEmail(msg);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleExecuteCustomCommand = async () => {
    if (!customPrompt.trim() || !selectedEmail) return;
    setIsGeneratingDraft(true);

    try {
      const cleanBody = (selectedEmail.body || "")
        .toString()
        .replace(/<[^>]*>?/gm, "")
        .substring(0, 2000);

      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt,
          emailBody: cleanBody,
          sender: selectedEmail.from,
          messageId: selectedEmail.id,
        }),
      });

      const data = await res.json();

      if (data.success && data.plan?.actions) {
        for (const action of data.plan.actions) {
          if (action.tool === "draft_reply") {
            setDraftContent(
              action.parameters.body_html || action.parameters.body,
            );
            setDraftingEmail(selectedEmail);
          } else if (action.tool === "create_contact") {
            await agentCreateContact(action.parameters);
          } else if (action.tool === "create_deal") {
            await agentCreateDeal({
              ...action.parameters,
              contact_email: selectedEmail.from,
            });
          } else if (action.tool === "check_availability") {
            await agentCheckAvailability(action.parameters.time_range);
          } else if (action.tool === "schedule_event") {
            await agentScheduleEvent(action.parameters);
          } else if (action.tool === "send_email") {
            await agentSendEmail({
              recipient: selectedEmail.from,
              subject: "Re: " + selectedEmail.subject,
              body_html: action.parameters.content || action.parameters.body,
              threadId: selectedEmail.id,
            });
          } else if (action.tool === "search_filter") {
            if (action.parameters.query)
              setSearchQuery(action.parameters.query);
            if (action.parameters.tab) setSelectedTab(action.parameters.tab);
          } else if (action.tool === "mark_read") {
            await fetch("/api/google/gmail", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messageId: selectedEmail.id }),
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === selectedEmail.id ? { ...m, isRead: true } : m,
              ),
            );
          }
        }
        setCustomCommandMode(false);
        setCustomPrompt("");
      }
    } catch (error) {
      console.error("Agent Execution Failed:", error);
    } finally {
      setIsGeneratingDraft(false);
    }
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
      const emailMatch = msg.from.match(/<([^>]+)>/);
      if (emailMatch) {
        if (!email) email = emailMatch[1];
        if (!name)
          name = msg.from
            .replace(/<[^>]+>/, "")
            .trim()
            .replace(/^"|"$/g, "");
      } else {
        if (!email) email = msg.from.trim();
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

  const filteredMessages = messages.filter((msg) => {
    const lowerSearch = searchQuery.toLowerCase();
    const matchesSearch =
      (msg.subject || "").toLowerCase().includes(lowerSearch) ||
      (msg.from || "").toLowerCase().includes(lowerSearch) ||
      (msg.snippet || "").toLowerCase().includes(lowerSearch);

    if (selectedTab === "unread") return matchesSearch && !msg.isRead;
    if (selectedTab === "all" || selectedTab === "leads") return matchesSearch;
    return false;
  });

  const filteredLogs = androidLogs.filter((log) => {
    const lowerSearch = searchQuery.toLowerCase();
    const matchesSearch =
      (log.phone_number || "").toLowerCase().includes(lowerSearch) ||
      (log.body || "").toLowerCase().includes(lowerSearch);

    if (selectedTab === "sms") return matchesSearch && log.type === "sms";
    if (selectedTab === "calls") return matchesSearch && log.type === "call";
    if (selectedTab === "all") return matchesSearch;
    return false;
  });

  const allItems = [
    ...filteredMessages.map((m) => ({ ...m, itemType: "email" as const })),
    ...filteredLogs.map((l) => ({ ...l, itemType: "android" as const })),
  ].sort((a, b) => {
    const dateA = new Date(
      (a as any).date || (a as any).timestamp || 0,
    ).getTime();
    const dateB = new Date(
      (b as any).date || (b as any).timestamp || 0,
    ).getTime();
    return dateB - dateA;
  });

  return {
    messages,
    allItems,
    loading,
    isConnected,
    searchQuery,
    setSearchQuery,
    selectedTab,
    setSelectedTab,
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
    isGeneratingDraft,
    customCommandMode,
    setCustomCommandMode,
    customPrompt,
    setCustomPrompt,
    fetchMessages,
    handleConnect,
    handleOpenEmail,
    handleManualAnalyze,
    handleToggleAction,
    handleDraftReply,
    handleExecuteCustomCommand,
    handleSaveContact,
    analyzeEmail,
  };
}
