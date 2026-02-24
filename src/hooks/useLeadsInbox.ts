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

export function useLeadsInbox(initialMessages: GmailMessage[] = []) {
  const { user, isLoaded } = useCurrentCRMUser();
  const [messages, setMessages] =
    React.useState<GmailMessage[]>(initialMessages);
  const [dbAnalyses, setDbAnalyses] = React.useState<any[]>([]);
  const [androidLogs, setAndroidLogs] = React.useState<AndroidLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTab, setSelectedTab] = React.useState<string>("all");
  const [customTags, setCustomTags] = React.useState<string[]>(["Urgentné", "Dôležité", "Naliehavé"]);
  const [messageTags, setMessageTags] = React.useState<Record<string, string[]>>({});
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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isComposeOpen, setIsComposeOpen] = React.useState(false);
  const [hasDraft, setHasDraft] = React.useState(false);
  const [draftData, setDraftData] = React.useState({ to: "", subject: "", body: "" });
  const [localSentMessages, setLocalSentMessages] = React.useState<GmailMessage[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [tagModalEmail, setTagModalEmail] = React.useState<GmailMessage | null>(null);
  const itemsPerPage = 50;

  // Restore State on Mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const persistedSession = localStorage.getItem("crm_leads_session");
      const persistedMessages = localStorage.getItem("crm_leads_messages");
      
      if (persistedMessages) {
        try {
          const parsedMessages = JSON.parse(persistedMessages);
          if (Array.isArray(parsedMessages)) {
            // Definitívny scrub starých 'súrne' mailov
            const sanitized = parsedMessages
              .filter(m => {
                const s = (m.subject || "").toLowerCase();
                const b = (m.body || "").toLowerCase();
                return !(s.includes("súrne") || s.includes("⚠️") || b.includes("súrne"));
              })
              .map(m => ({
                ...m,
                subject: (m.subject || "").replace(/⚠️|SÚRNE:|súrne/gi, "").trim(),
                body: (m.body || "").replace(/súrne/gi, "").trim()
              }));
            setMessages(sanitized);
            localStorage.setItem("crm_leads_messages", JSON.stringify(sanitized));
          }
        } catch(e) {}
      }

      if (persistedSession) {
        try {
          const state = JSON.parse(persistedSession);
          // Vynútenie nových štítkov aj v uloženej relácii
          const mandatoryTags = ["Urgentné", "Dôležité", "Naliehavé"];
          setCustomTags(mandatoryTags);
          
          if (state.selectedTab) setSelectedTab(state.selectedTab);
          if (state.searchQuery !== undefined) setSearchQuery(state.searchQuery);
          if (state.isComposeOpen !== undefined) setIsComposeOpen(state.isComposeOpen);
          if (state.hasDraft !== undefined) setHasDraft(state.hasDraft);
          if (state.draftContent !== undefined) setDraftContent(state.draftContent);
          if (state.draftData) setDraftData(state.draftData);
          if (state.selectedEmail) setSelectedEmail(state.selectedEmail);
          
          if (state.messageTags) setMessageTags(state.messageTags);
          
          if (state.customPrompt !== undefined) setCustomPrompt(state.customPrompt);
          if (state.customCommandMode !== undefined) setCustomCommandMode(state.customCommandMode);
          if (state.activeActionId !== undefined) setActiveActionId(state.activeActionId);
          if (state.currentPage) setCurrentPage(state.currentPage);
          if (state.selectedIds && Array.isArray(state.selectedIds)) {
            setSelectedIds(new Set(state.selectedIds));
          }
        } catch(e) { console.error("Error parsing CRM leads session", e); }
      }
    }
  }, []);

  // Persist State continuously
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_leads_session", JSON.stringify({
        selectedTab,
        searchQuery,
        isComposeOpen,
        hasDraft,
        draftData,
        draftContent,
        selectedEmail,
        customPrompt,
        customCommandMode,
        activeActionId,
        currentPage,
        selectedIds: Array.from(selectedIds),
        customTags,
        messageTags
      }));
    }
  }, [selectedTab, searchQuery, isComposeOpen, hasDraft, draftData, draftContent, selectedEmail, customPrompt, customCommandMode, activeActionId, currentPage, selectedIds, customTags, messageTags]);

  // Persist messages purely for offline fallback
  React.useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("crm_leads_messages", JSON.stringify(messages));
    }
  }, [messages]);

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
                  const saved = typeof window !== 'undefined' ? localStorage.getItem(`ai_classify_${newMsg.id}`) : null;
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
      try {
        if (!isBackground) {
          const androidRes = await fetch("/api/android-logs");
          if (androidRes.ok) {
            const androidData = await androidRes.json();
            if (androidData.success) {
              setAndroidLogs(androidData.logs);
            }
          }
        }
      } catch (e) {
        console.error("Android logs fetch error", e);
      }

      // DEVELOPMENT MOCK DATA: Inject fake emails for visualization
      if (process.env.NODE_ENV === "development") {
        setMessages(prev => {
          if (prev.length > 0) return prev;
          
          const mockTemplates = [
            {
              from: "Miroslav Horský <miro.horsky@reality-ba.sk>",
              subject: "Zameranie hraníc pozemku - Stupava",
              body: "Dobrý deň,\n\npotreboval by som zamerať hranice pozemku v Stupave pre účely dedičského konania. Máme tam spor so susedom o cca 2 metre.\n\nVedeli by ste sa na to prísť pozrieť do konca týždňa? Dokumentáciu z katastra mám k dispozícii.\n\nS pozdravom,\nHorský",
              snippet: "Dobrý deň, potreboval by som zamerat hranice pozemku v Stupave pre účely dedičského konania...",
              budget: "1 500 €",
              intent: "dopyt",
              category: "Geodézia",
              nextStep: "Zavolať klientovi a dohodnúť obhliadku",
              priority: "stredna"
            },
            {
              from: "Lucia Nováková <lucia@fashion-web.sk>",
              subject: "Dopyt: Redizajn e-shopu na mieru",
              body: "Zdravím tím Arcigy,\n\nnaša značka rastie a náš aktuálny e-shop už nestíha. Potrebujeme niečo moderné, rýchle a hlavne Mobile-First.\n\nMáte skúsenosti s prepojením na Shoptet alebo radšej staviate na vlastnom jadre? Radi by sme začali s prácami čo najskôr.\n\nVďaka, Lucia",
              snippet: "Zdravím tím Arcigy, naša značka rastie a náš aktuálny e-shop už nestíha. Potrebujeme niečo moderné...",
              budget: "4 000 €",
              intent: "dopyt",
              category: "Web Development",
              nextStep: "Poslať dotazník na špecifikáciu",
              priority: "stredna"
            },
            {
              from: "Peter Kováč <peter.kovac@gmail.com>",
              subject: "Otázka k faktúre č. 2024015",
              body: "Dobrý deň, v poslednej faktúre vidím položku 'Dodatočné merania', o ktorých sme nehovorili. Môžete mi k tomu poslať viac informácií?\n\nĎakujem,\nKováč",
              snippet: "Dobrý deň, v poslednej faktúre vidím položku 'Dodatočné merania', o ktorých sme nehovorili...",
              budget: "—",
              intent: "podpora",
              category: "Administratíva",
              nextStep: "Preveriť záznamy u účtovníčky",
              priority: "stredna"
            },
            {
              from: "Google Cloud <noreply@google.com>",
              subject: "Monthly Statement: February 2026",
              body: "Your monthly statement for Google Cloud is now available. Your total for this month is $12.45.\n\nYou can view and download your statement in the Cloud Console.",
              snippet: "Your monthly statement for Google Cloud is now available. Your total for this month is $12.45...",
              budget: "—",
              intent: "notifikácia",
              category: "IT / Infraštruktúra",
              nextStep: "Archivovať faktúru",
              priority: "stredna"
            },
            {
              from: "Zuzana Trénerka <zuzi@fit-studio.sk>",
              subject: "Rezervácia termínu - Geodetické práce",
              body: "Ahojte, chcem sa opýtať na voľné termíny na vytýčenie stavby rodinného domu v Senci. Základy by sme chceli kopať o 2 týždne, tak by bolo super to stihnúť v predstihu.\n\nTelefón na mňa: 0903 123 456.\n\nDajte vedieť!",
              snippet: "Ahojte, chcem sa opýtať na voľné termíny na vytýčenie stavby rodinného domu v Senci...",
              budget: "800 €",
              intent: "dopyt",
              category: "Lokalizácia stavby",
              nextStep: "Preveriť dostupnosť v kalendári",
              priority: "stredna"
            }
          ];

          const mocks: GmailMessage[] = Array.from({ length: 155 }).map((_, i) => {
            const template = mockTemplates[i % mockTemplates.length];
            let isRead = false;
            let isStarred = false;
            try {
              if (typeof window !== 'undefined') {
                isRead = localStorage.getItem(`email_read_mock-${i}`) === "true";
                isStarred = localStorage.getItem(`email_starred_mock-${i}`) === "true";
              }
            } catch (e) {
              console.warn("localStorage access denied", e);
            }

            const isUrgent = template.priority === "vysoka";

            let mockLabels: string[] = ["INBOX"];

            return {
              id: `mock-${i}`,
              threadId: `thread-${i}`,
              from: template.from,
              subject: `${template.subject} #${i + 1}`,
              snippet: template.snippet,
              date: new Date(Date.now() - i * 1800000).toISOString(), // Spread over time
              isRead: isRead,
              isStarred: isStarred,
              body: template.body,
              labels: mockLabels,
              classification: {
                intent: (template.intent as any),
                priority: (isUrgent ? "vysoka" : "stredna") as any,
                estimated_budget: template.budget,
                summary: template.body.substring(0, 80) + "...",
                next_step: template.nextStep,
                service_category: template.category,
                sentiment: "pozitivny" as any
              }
            };
          });
          return mocks;
        });
      }
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteMessage = async (e: React.MouseEvent | null, msg: GmailMessage) => {
    if (e) e.stopPropagation();

    const toastId = toast.loading("Odstraňujem správu...");
    
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const currentLabels = m.labels || [];
          return { 
            ...m, 
            labels: [...currentLabels.filter(l => l !== "INBOX"), "TRASH"] 
          };
        }
        return m;
      }),
    );

    if (selectedEmail?.id === msg.id) {
      setSelectedEmail(null);
    }

    if (msg.id.startsWith("mock-") || msg.id.startsWith("local-sent-") || msg.id === "local-draft-1") {
      toast.success("Správa bola presunutá do koša", { id: toastId });
      return;
    }

    try {
      const res = await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messageId: msg.id,
          action: "trash" 
        }),
      });

      if (res.ok) {
        toast.success("Správa bola presunutá do koša", { id: toastId });
      } else {
        throw new Error("Failed to trash");
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
      // Revert on failure
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msg.id) {
            const currentLabels = m.labels || [];
            return { 
              ...m, 
              labels: [...currentLabels.filter(l => l !== "TRASH"), "INBOX"] 
            };
          }
          return m;
        }),
      );
      toast.error("Nepodarilo sa odstrániť správu", { id: toastId });
    }
  };

  const handleArchiveMessage = async (msg: GmailMessage) => {
    const toastId = toast.loading("Archivujem správu...");
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const currentLabels = m.labels || [];
          return { 
            ...m, 
            labels: [...currentLabels.filter(l => l !== "INBOX"), "ARCHIVE"] 
          };
        }
        return m;
      }),
    );
    if (selectedEmail?.id === msg.id) setSelectedEmail(null);

    if (msg.id.startsWith("mock-") || msg.id.startsWith("local-sent-") || msg.id === "local-draft-1") {
      toast.success("Správa bola archivovaná", { id: toastId });
      return;
    }

    try {
      const res = await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, action: "archive" }),
      });
      if (res.ok) toast.success("Správa bola archivovaná", { id: toastId });
      else throw new Error();
    } catch (e) {
      toast.error("Chyba pri archivácii", { id: toastId });
    }
  };

  const handleSpamMessage = async (msg: GmailMessage) => {
    const toastId = toast.loading("Nahlasujem spam...");
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const currentLabels = m.labels || [];
          return { 
            ...m, 
            labels: [...currentLabels.filter(l => l !== "INBOX"), "SPAM"] 
          };
        }
        return m;
      }),
    );
    if (selectedEmail?.id === msg.id) setSelectedEmail(null);

    // Mock handling
    if (msg.id.startsWith("mock-")) {
      toast.success("Nahlásené ako spam", { id: toastId });
      return;
    }

    try {
      const res = await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, action: "spam" }),
      });
      if (res.ok) toast.success("Nahlásené ako spam", { id: toastId });
      else throw new Error();
    } catch (e) {
      toast.error("Chyba pri nahlasovaní", { id: toastId });
    }
  };

  const handleMarkUnreadMessage = async (msg: GmailMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isRead: false } : m)),
    );
    if (selectedEmail?.id === msg.id) setSelectedEmail(null);

    if (msg.id.startsWith("mock-")) {
      toast.success("Označené ako neprečítané");
      return;
    }

    try {
      await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, action: "unread" }),
      });
      toast.success("Označené ako neprečítané");
    } catch (e) {
      console.error(e);
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

    // Globálny filter na odstránenie nežiaducich výrazov
    const sub = (msg.subject || "").toLowerCase();
    const snip = (msg.snippet || "").toLowerCase();
    if (sub.includes("súrne") || sub.includes("⚠️") || snip.includes("súrne")) return false;

    if (selectedTab === "unread") return matchesSearch && !msg.isRead;
    if (selectedTab === "starred") return matchesSearch && msg.isStarred;
    if (selectedTab === "sent") return matchesSearch && msg.labels?.includes("SENT");
    if (selectedTab === "drafts") return matchesSearch && msg.labels?.includes("DRAFT");
    if (selectedTab === "snoozed") return matchesSearch && msg.labels?.includes("SNOOZED");
    if (selectedTab === "shopping") return matchesSearch && msg.labels?.includes("CATEGORY_PURCHASES");
    if (selectedTab === "spam") return matchesSearch && msg.labels?.includes("SPAM");
    if (selectedTab === "trash") return matchesSearch && msg.labels?.includes("TRASH");
    if (selectedTab === "all") return matchesSearch && (!msg.labels || msg.labels.includes("INBOX") || msg.labels.length === 0);
    if (selectedTab.startsWith("tag:")) {
      const tag = selectedTab.replace("tag:", "");
      const msgTags = messageTags[msg.id] || [];
      const hasGmailTag = msg.labels?.includes(tag) || false;
      return matchesSearch && (hasGmailTag || msgTags.includes(tag));
    }
    
    // For now, these tabs are placeholders, so we show all messages
    if (["leads", "more", "archive"].includes(selectedTab)) {
      return matchesSearch;
    }
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
    const dateA = new Date(
      (a as any).date || (a as any).timestamp || 0,
    ).getTime();
    const dateB = new Date(
      (b as any).date || (b as any).timestamp || 0,
    ).getTime();
    return dateB - dateA;
  });

  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const paginatedItems = allItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
    import('sonner').then(({ toast }) => toast.success(`Archivovaných ${idsToArchive.length} správ`));
    setMessages(prev => 
      prev.map(m => idsToArchive.includes(m.id) ? { ...m, labels: [...(m.labels || []), "ARCHIVE"].filter(l => l !== "INBOX") } : m)
    );
    setSelectedIds(prev => {
      const next = new Set(prev);
      idsToArchive.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const handleBulkTag = React.useCallback((idsToTag: string[], tag: string) => {
    import('sonner').then(({ toast }) => toast.success(`Štítok '${tag}' pridaný na ${idsToTag.length} správ`));
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
  }, [clearSelection]);

  const handleEmptyTrash = React.useCallback(() => {
    import('sonner').then(({ toast }) => toast.success("Kôš bol úspešne vyprázdnený"));
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
  }, []);

  const handleRemoveCustomTag = React.useCallback((tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
    setMessageTags(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = next[id].filter(t => t !== tag);
      });
      return next;
    });
    import('sonner').then(({ toast }) => toast.success(`Štítok '${tag}' bol odstránený`));
  }, []);

  const handleRenameCustomTag = React.useCallback((oldTag: string, newTag: string) => {
    if (!newTag.trim() || oldTag === newTag) return;
    
    setCustomTags(prev => {
      const next = prev.map(t => t === oldTag ? newTag : t);
      return [...new Set(next)].sort();
    });
    
    setMessageTags(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = next[id].map(t => t === oldTag ? newTag : t);
      });
      return next;
    });
    
    import('sonner').then(({ toast }) => toast.success(`Štítok '${oldTag}' premenovaný na '${newTag}'`));
  }, []);

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
