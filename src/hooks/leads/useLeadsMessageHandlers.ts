"use client";

import * as React from "react";
import { toast } from "sonner";
import { GmailMessage } from "@/types/gmail";

export function useLeadsMessageHandlers(
  setMessages: React.Dispatch<React.SetStateAction<GmailMessage[]>>,
  setSelectedEmail: React.Dispatch<React.SetStateAction<GmailMessage | null>>
) {
  const handleDeleteMessage = async (e: React.MouseEvent | null, msg: GmailMessage) => {
    if (e) e.stopPropagation();
    const toastId = toast.loading("Odstraňujem správu...");
    
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const currentLabels = m.labels || [];
          return { ...m, labels: [...currentLabels.filter(l => l !== "INBOX"), "TRASH"] };
        }
        return m;
      }),
    );

    setSelectedEmail(null);

    if (msg.id.startsWith("mock-") || msg.id.startsWith("local-sent-") || msg.id === "local-draft-1") {
      toast.success("Správa bola presunutá do koša", { id: toastId });
      return;
    }

    try {
      const res = await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, action: "trash" }),
      });
      if (res.ok) toast.success("Správa bola presunutá do koša", { id: toastId });
      else throw new Error();
    } catch (error) {
      toast.error("Nepodarilo sa odstrániť správu", { id: toastId });
    }
  };

  const handleArchiveMessage = async (msg: GmailMessage) => {
    const toastId = toast.loading("Archivujem správu...");
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const currentLabels = m.labels || [];
          return { ...m, labels: [...currentLabels.filter(l => l !== "INBOX"), "ARCHIVE"] };
        }
        return m;
      }),
    );
    setSelectedEmail(null);

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
          return { ...m, labels: [...currentLabels.filter(l => l !== "INBOX"), "SPAM"] };
        }
        return m;
      }),
    );
    setSelectedEmail(null);

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
    setSelectedEmail(null);

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

  const handleRestoreMessage = async (e: React.MouseEvent | null, msg: GmailMessage) => {
    if (e) e.stopPropagation();
    const toastId = toast.loading("Obnovujem správu...");
    
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msg.id) {
          const currentLabels = m.labels || [];
          return { ...m, labels: [...currentLabels.filter(l => l !== "TRASH"), "INBOX"] };
        }
        return m;
      }),
    );

    setSelectedEmail(null);

    if (msg.id.startsWith("mock-") || msg.id.startsWith("local-sent-") || msg.id === "local-draft-1") {
      toast.success("Správa bola obnovená do doručenej pošty", { id: toastId });
      return;
    }

    try {
      const res = await fetch("/api/google/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, action: "untrash" }),
      });
      if (res.ok) toast.success("Správa bola obnovená do doručenej pošty", { id: toastId });
      else throw new Error();
    } catch (error) {
      toast.error("Nepodarilo sa obnoviť správu", { id: toastId });
    }
  };

  return {
    handleDeleteMessage,
    handleArchiveMessage,
    handleSpamMessage,
    handleMarkUnreadMessage,
    handleRestoreMessage
  };
}
