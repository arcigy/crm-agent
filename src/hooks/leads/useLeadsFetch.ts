"use client";

import * as React from "react";
import { GmailMessage } from "@/types/gmail";
import { AndroidLog } from "@/types/android";

export function useLeadsFetch(
  initialMessages: GmailMessage[],
  getSmartTags: (c: any) => string[],
  selectedTab: string = "inbox"
) {
  const [messages, setMessages] = React.useState<GmailMessage[]>(initialMessages);
  const [dbAnalyses, setDbAnalyses] = React.useState<any[]>([]);
  const [androidLogs, setAndroidLogs] = React.useState<AndroidLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [userLabels, setUserLabels] = React.useState<string[]>([]);

  // FIX 3: Client-side tab cache
  const emailCache = React.useRef<Record<string, {
    data: GmailMessage[],
    fetchedAt: number
  }>>({});
  
  const CACHE_TTL = 60000; // 60 seconds

  const fetchMessages = async (isBackground = false, tabParam?: string) => {
    const activeTab = tabParam || selectedTab;
    const category = activeTab.startsWith("tag:") ? activeTab.replace("tag:", "") : activeTab;
    const now = Date.now();
    const cached = emailCache.current[category];

    // Return cache immediately if fresh and not a manual/background refresh
    if (!isBackground && cached && (now - cached.fetchedAt) < CACHE_TTL) {
      setMessages(cached.data);
      setLoading(false);
      
      // Silently refresh in background
      fetchFresh(category, true).then(result => {
        if (result && result.messages) {
          emailCache.current[category] = { data: result.messages, fetchedAt: Date.now() };
          setMessages(result.messages);
          if (result.userLabels) setUserLabels(result.userLabels);
        }
      });
      return;
    }

    if (!isBackground) setLoading(true);
    const result = await fetchFresh(category, isBackground);
    if (result && result.messages) {
      emailCache.current[category] = { data: result.messages, fetchedAt: Date.now() };
      setMessages(result.messages);
      if (result.userLabels) setUserLabels(result.userLabels);
    }
    setLoading(false);
  };

  const fetchFresh = async (category: string, isBackground: boolean): Promise<{ messages: GmailMessage[], userLabels?: string[] } | null> => {
    try {
      const dbRes = await fetch("/api/notes?type=ai_analysis");
      let currentAnalyses = dbAnalyses;
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.success) {
          setDbAnalyses(dbData.notes || []);
          currentAnalyses = dbData.notes || [];
        }
      }

      const gmailRes = await fetch(`/api/google/gmail?tab=${category}&t=${Date.now()}`, { cache: "no-store" });
      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        if (gmailData.isConnected && gmailData.messages) {
          setIsConnected(true);
          
          const processedMessages = gmailData.messages.map((newMsg: GmailMessage) => {
            const existing = messages.find((p) => p.id === newMsg.id);
            let classification = existing?.classification;
            if (!classification) {
              const dbMatch = currentAnalyses.find((a) => a.metadata?.gmail_id === newMsg.id);
              if (dbMatch) classification = dbMatch.metadata.classification;
              else {
                const saved = typeof window !== 'undefined' ? localStorage.getItem(`ai_classify_${newMsg.id}`) : null;
                if (saved) classification = JSON.parse(saved);
              }
            }
            if (classification) {
              return { ...newMsg, classification };
            }
            return newMsg;
          });

          return { messages: processedMessages, userLabels: gmailData.userLabels };
        } else if (gmailData.isConnected === false) {
           setIsConnected(false);
        }
      }

      if (!isBackground) {
        try {
          const androidRes = await fetch("/api/android-logs");
          if (androidRes.ok) {
            const androidData = await androidRes.json();
            if (androidData.success) setAndroidLogs(androidData.logs);
          }
        } catch (e) {
          console.error("Android logs fetch error", e);
        }
      }
    } catch (error) { 
      console.error("Failed to fetch fresh messages:", error);
      setIsConnected(false); // Make button appear on critical failure
    }
    return null;
  };

  // Preload adjacent tabs
  React.useEffect(() => {
    const PRELOAD_TABS: Record<string, string[]> = {
      inbox: ['starred', 'sent'],
      starred: ['inbox'],
      sent: ['inbox'],
      trash: [], 
    };

    const tabsToPreload = PRELOAD_TABS[selectedTab] || [];
    tabsToPreload.forEach(tab => {
      const now = Date.now();
      const cached = emailCache.current[tab];
      if (!cached || (now - cached.fetchedAt) > CACHE_TTL) {
        fetchFresh(tab, true).then(result => {
          if (result && result.messages) {
            emailCache.current[tab] = { data: result.messages, fetchedAt: Date.now() };
            if (result.userLabels) setUserLabels(result.userLabels);
          }
        });
      }
    });
  }, [selectedTab]);

  // Re-fetch when category changes
  React.useEffect(() => {
    // Only fetch if we don't have fresh data for this tab
    fetchMessages(false, selectedTab);
  }, [selectedTab]);

  return {
    messages, setMessages,
    dbAnalyses, setDbAnalyses,
    androidLogs, setAndroidLogs,
    loading, setLoading,
    isConnected, setIsConnected,
    fetchMessages,
    userLabels
  };
}
