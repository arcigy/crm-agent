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
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{
    sync_status: string;
    synced_messages: number;
    total_messages: number;
  } | null>(null);

  // FIX 3: Client-side tab cache mapped by category and page
  const emailCache = React.useRef<Record<string, {
    data: GmailMessage[],
    fetchedAt: number,
    totalMessages?: number
  }>>({});
  
  const CACHE_TTL = 900000; // 15 minutes - keep data long during session

  const fetchMessages = async (isBackground = false, tabParam?: string, page: number = 1, view: string = "threads", search: string = "") => {
    const activeTab = tabParam || selectedTab;
    const category = activeTab.startsWith("tag:") ? activeTab.replace("tag:", "") : activeTab;
    const now = Date.now();
    const cacheKey = `${category}_${page}_${view}_${search}`;
    const cached = emailCache.current[cacheKey];

    if (!isBackground && cached && (now - cached.fetchedAt) < CACHE_TTL) {
      setMessages(cached.data);
      setTotalMessages(cached.totalMessages || 0);
      setLoading(false);
      return;
    }

    if (!isBackground) setLoading(true);
    const result = await fetchFresh(category, isBackground, page, view, search);

    
    if (result && result.messages) {
      updateCache(category, page, view, search, result.messages, result.totalMessages, result.stats, result.userLabels);
    }
    setLoading(false);
  };

  const updateCache = (
    category: string, 
    page: number,
    view: string,
    search: string,
    newMessages: GmailMessage[], 
    total?: number, 
    stats?: any,
    labels?: any[]
  ) => {
    const cacheKey = `${category}_${page}_${view}_${search}`;
    
    emailCache.current[cacheKey] = { 
      data: newMessages, 
      fetchedAt: Date.now(),
      totalMessages: total
    };

    if (category === (selectedTab.startsWith("tag:") ? selectedTab.replace("tag:", "") : selectedTab)) {
      setMessages(newMessages);
      setTotalMessages(total || 0);
      if (labels) setUserLabels(labels);
      if (stats) setInboxStats(stats);
    }
  };

  const fetchFresh = async (category: string, isBackground: boolean, page: number, view: string = "threads", search: string = ""): Promise<{ messages: GmailMessage[], userLabels?: any[], stats?: any, totalMessages?: number } | null> => {
    try {
      const pageQuery = `&page=${page}&limit=50&view=${view}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const gmailUrl = `/api/google/gmail?tab=${category}${pageQuery}&t=${Date.now()}`;
      
      // Parallelize all fetches to avoid 1s waterfall delay
      const [gmailRes, dbRes, androidRes] = await Promise.all([
        fetch(gmailUrl, { cache: "no-store" }),
        fetch("/api/notes?type=ai_analysis"),
        !isBackground ? fetch("/api/android-logs") : Promise.resolve(null)
      ]);

      let currentAnalyses = dbAnalyses;
      if (dbRes?.ok) {
        const dbData = await dbRes.json();
        if (dbData.success) {
          setDbAnalyses(dbData.notes || []);
          currentAnalyses = dbData.notes || [];
        }
      }

      if (androidRes?.ok) {
        const androidData = await androidRes.json();
        if (androidData.success) setAndroidLogs(androidData.logs);
      }

      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        if (gmailData.isConnected && gmailData.messages) {
          setIsConnected(true);
          
          // Map AI findings efficiently
          const processedMessages = gmailData.messages.map((newMsg: GmailMessage) => {
            const dbMatch = currentAnalyses.find((a) => a.metadata?.gmail_id === newMsg.id);
            if (dbMatch) return { ...newMsg, classification: dbMatch.metadata.classification };
            
            const saved = typeof window !== 'undefined' ? localStorage.getItem(`ai_classify_${newMsg.id}`) : null;
            if (saved) return { ...newMsg, classification: JSON.parse(saved) };
            
            return newMsg;
          });

          if (gmailData.sync) setSyncStatus(gmailData.sync);

          return { 
            messages: processedMessages, 
            userLabels: gmailData.userLabels,
            stats: gmailData.stats,
            totalMessages: gmailData.pagination?.total || gmailData.totalMessages
          };
        } else if (gmailData.isConnected === false) {
           setIsConnected(false);
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
      const cacheKey = `${tab}_1`;
      const cached = emailCache.current[cacheKey];
      if (!cached || (now - cached.fetchedAt) > CACHE_TTL) {
        fetchFresh(tab, true, 1).then(result => {
          if (result && result.messages) {
            emailCache.current[cacheKey] = { data: result.messages, fetchedAt: Date.now() };
            if (result.userLabels) setUserLabels(result.userLabels);
          }
        });
      }
    });
  }, [selectedTab]);

  // Removed old buffering logic since we now read instantly from local mirror DB.

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
    isBuffering,
    invalidateCache: (category?: string) => {
      if (category) {
        Object.keys(emailCache.current).forEach(key => {
          if (key.startsWith(`${category}_`)) delete emailCache.current[key];
        });
      } else {
        emailCache.current = {};
      }
    },
    syncStatus
  };
}
