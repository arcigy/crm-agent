"use client";

import * as React from "react";
import { GmailMessage } from "@/types/gmail";
import { 
  agentCreateContact, agentCreateDeal, agentCheckAvailability, 
  agentScheduleEvent, agentSendEmail 
} from "@/app/actions/agent";

export function useLeadsAgent(
  setDraftContent: React.Dispatch<React.SetStateAction<string>>,
  setDraftingEmail: React.Dispatch<React.SetStateAction<GmailMessage | null>>,
  setIsGeneratingDraft: React.Dispatch<React.SetStateAction<boolean>>,
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>,
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>,
  setMessages: React.Dispatch<React.SetStateAction<GmailMessage[]>>
) {
  const handleDraftReply = async (msg: GmailMessage) => {
    setIsGeneratingDraft(true);
    try {
      const cleanBody = (msg.body || "").toString().replace(/<[^>]*>?/gm, "").substring(0, 1000);
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

  const executeCommand = async (prompt: string, selectedEmail: GmailMessage) => {
    setIsGeneratingDraft(true);
    try {
      const cleanBody = (selectedEmail.body || "").toString().replace(/<[^>]*>?/gm, "").substring(0, 2000);
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          emailBody: cleanBody,
          sender: selectedEmail.from,
          messageId: selectedEmail.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.plan?.actions) {
        for (const action of data.plan.actions) {
          if (action.tool === "draft_reply") {
            setDraftContent(action.parameters.body_html || action.parameters.body);
            setDraftingEmail(selectedEmail);
          } else if (action.tool === "create_contact") await agentCreateContact(action.parameters);
          else if (action.tool === "create_deal") await agentCreateDeal({ ...action.parameters, contact_email: selectedEmail.from });
          else if (action.tool === "check_availability") await agentCheckAvailability(action.parameters.time_range);
          else if (action.tool === "schedule_event") await agentScheduleEvent(action.parameters);
          else if (action.tool === "send_email") await agentSendEmail({
              recipient: selectedEmail.from,
              subject: "Re: " + selectedEmail.subject,
              body_html: action.parameters.content || action.parameters.body,
              threadId: selectedEmail.id,
          });
          else if (action.tool === "search_filter") {
            if (action.parameters.query) setSearchQuery(action.parameters.query);
            if (action.parameters.tab) setSelectedTab(action.parameters.tab);
          } else if (action.tool === "mark_read") {
            await fetch("/api/google/gmail", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: selectedEmail.id }) });
            setMessages((prev) => prev.map((m) => m.id === selectedEmail.id ? { ...m, isRead: true } : m));
          }
        }
      }
    } catch (error) {
      console.error("Agent Execution Failed:", error);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  return { handleDraftReply, executeCommand };
}
