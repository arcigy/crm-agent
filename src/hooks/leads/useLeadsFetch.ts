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
  const [userLabels, setUserLabels] = React.useState<any[]>([]);
  const [inboxStats, setInboxStats] = React.useState<Record<string, { total: number, unread: number }>>({});
  const [totalMessages, setTotalMessages] = React.useState(0);
  const [nextPageToken, setNextPageToken] = React.useState<string | undefined>(undefined);
  const [isBuffering, setIsBuffering] = React.useState(false);

  // FIX 3: Client-side tab cache
  const emailCache = React.useRef<Record<string, {
    data: GmailMessage[],
    fetchedAt: number,
    nextPageToken?: string,
    totalMessages?: number
  }>>({});
  
  const CACHE_TTL = 900000; // 15 minutes - keep data long during session
  const MAX_BUFFER_SIZE = 1000;

  const fetchMessages = async (isBackground = false, tabParam?: string, pageToken?: string, isAppend = false) => {
    const activeTab = tabParam || selectedTab;
    const category = activeTab.startsWith("tag:") ? activeTab.replace("tag:", "") : activeTab;
    const now = Date.now();
    const cached = emailCache.current[category];

    // Return cache immediately if fresh and not a manual/background refresh AND NOT page change
    // If it's a page change but we already HAVE the emails for it, don't fetch
    if (!isBackground && !pageToken && cached && (now - cached.fetchedAt) < CACHE_TTL) {
      setMessages(cached.data);
      setNextPageToken(cached.nextPageToken);
      setTotalMessages(cached.totalMessages || 0);
      setLoading(false);
      
      // Silently refresh in background (don't force if we have lots of data)
      if (cached.data.length < 100) {
        fetchFresh(category, true).then(result => {
          if (result && result.messages) {
            updateCache(category, result.messages, result.nextPageToken, result.totalMessages, false, result.stats, result.userLabels);
          }
        });
      }
      return;
    }

    if (!isBackground) setLoading(true);
    const result = await fetchFresh(category, isBackground, pageToken);
    if (result && result.messages) {
      updateCache(category, result.messages, result.nextPageToken, result.totalMessages, isAppend, result.stats, result.userLabels);
    }
    setLoading(false);
  };

  const updateCache = (
    category: string, 
    newMessages: GmailMessage[], 
    token?: string, 
    total?: number, 
    append = false,
    stats?: any,
    labels?: any[]
  ) => {
    const existing = emailCache.current[category]?.data || [];
    const merged = append 
      ? [...existing, ...newMessages.filter(m => !existing.some(em => em.id === m.id))]
      : newMessages;
    
    emailCache.current[category] = { 
      data: merged, 
      fetchedAt: Date.now(),
      nextPageToken: token,
      totalMessages: total
    };

    if (category === (selectedTab.startsWith("tag:") ? selectedTab.replace("tag:", "") : selectedTab)) {
      setMessages(merged);
      setNextPageToken(token);
      setTotalMessages(total || 0);
      if (labels) setUserLabels(labels);
      if (stats) setInboxStats(stats);
    }
  };

  const fetchFresh = async (category: string, isBackground: boolean, pageToken?: string): Promise<{ messages: GmailMessage[], userLabels?: any[], stats?: any, nextPageToken?: string, totalMessages?: number } | null> => {
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

      const pageQuery = pageToken ? `&pageToken=${pageToken}` : '';
      const gmailRes = await fetch(`/api/google/gmail?tab=${category}${pageQuery}&t=${Date.now()}`, { cache: "no-store" });
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

          return { 
            messages: processedMessages, 
            userLabels: gmailData.userLabels,
            stats: gmailData.stats,
            nextPageToken: gmailData.nextPageToken,
            totalMessages: gmailData.totalMessages
          };
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

  // Buffer background pages
  React.useEffect(() => {
    if (loading || !isConnected || !nextPageToken || messages.length >= MAX_BUFFER_SIZE) {
      if (isBuffering) setIsBuffering(false);
      return;
    }

    const category = selectedTab.startsWith("tag:") ? selectedTab.replace("tag:", "") : selectedTab;
    
    // Safety: ensure we only buffer for the ACTIVE tab
    const bufferTimeout = setTimeout(() => {
      setIsBuffering(true);
      fetchMessages(true, selectedTab, nextPageToken, true);
    }, 5000); // 5s interval to not hammer the API

    return () => clearTimeout(bufferTimeout);
  }, [selectedTab, nextPageToken, messages.length, loading, isConnected]);

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
    userLabels,
    inboxStats,
    totalMessages,
    nextPageToken,
    isBuffering
  };
}
