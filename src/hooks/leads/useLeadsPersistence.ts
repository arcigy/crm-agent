"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { GmailMessage } from "@/types/gmail";

export function useLeadsPersistence(
  setMessages: React.Dispatch<React.SetStateAction<GmailMessage[]>>,
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>,
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>,
  setIsComposeOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setHasDraft: React.Dispatch<React.SetStateAction<boolean>>,
  setDraftContent: React.Dispatch<React.SetStateAction<string>>,
  setDraftData: React.Dispatch<React.SetStateAction<{ to: string; subject: string; body: string }>>,
  setSelectedEmail: React.Dispatch<React.SetStateAction<GmailMessage | null>>,
  setCustomPrompt: React.Dispatch<React.SetStateAction<string>>,
  setCustomCommandMode: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveActionId: React.Dispatch<React.SetStateAction<string | null>>,
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>,
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>,
  setCustomTags: React.Dispatch<React.SetStateAction<string[]>>,
  setTagColors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setMessageTags: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
  states: any
) {
  const searchParams = useSearchParams();
  const isComposingFromUrl = searchParams?.has("compose");
  const composeEmail = searchParams?.get("compose");

  // Restore logic
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const persistedSession = localStorage.getItem("crm_leads_session");
      const persistedMessages = localStorage.getItem("crm_leads_messages");
      
      const isComposing = searchParams?.has("compose");

      if (persistedMessages) {
        try {
          const parsedMessages = JSON.parse(persistedMessages);
          if (Array.isArray(parsedMessages)) setMessages(parsedMessages);
        } catch(e) {}
      }

      if (persistedSession) {
        try {
          const state = JSON.parse(persistedSession);
          const CANONICAL_TAGS = ["NALIEHAVÉ", "URGENTNÉ", "NOVÝ OBCHOD", "SERVIS", "VYBAVOVAČKY"];
          
          if (state.customTags) setCustomTags(Array.from(new Set([...state.customTags.map((t:any)=>t.toUpperCase()), ...CANONICAL_TAGS])).sort());
          if (state.messageTags) setMessageTags(state.messageTags);
          if (state.tagColors) setTagColors(state.tagColors);
          if (state.selectedTab) setSelectedTab(state.selectedTab);
          if (state.searchQuery !== undefined) setSearchQuery(state.searchQuery);
          
          // Compose handling: URL always wins over persistence
          if (isComposingFromUrl && composeEmail) {
            setIsComposeOpen(true);
            setDraftData({ to: composeEmail, subject: "", body: "" });
            setHasDraft(false);
          } else {
            if (state.isComposeOpen !== undefined) setIsComposeOpen(state.isComposeOpen);
            if (state.hasDraft !== undefined) setHasDraft(state.hasDraft);
            if (state.draftContent !== undefined) setDraftContent(state.draftContent);
            if (state.draftData) setDraftData(state.draftData);
          }

          if (state.selectedEmail) setSelectedEmail(state.selectedEmail);
          if (state.currentPage) setCurrentPage(state.currentPage);
          if (state.selectedIds) setSelectedIds(new Set(state.selectedIds));
        } catch(e) {}
      }
    }
  }, []);

  // Save logic
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_leads_session", JSON.stringify(states));
    }
  }, [states]);
}
