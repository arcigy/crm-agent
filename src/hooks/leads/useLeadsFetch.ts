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
  const [isBuffering] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<{
    sync_status: string;
    synced_messages: number;
    total_messages: number;
  } | null>(null);

  // Cache: keyed by category_page_view_search
  const emailCache = React.useRef<Record<string, {
    data: GmailMessage[],
    fetchedAt: number,
    totalMessages?: number,
    userLabels?: any[],
    stats?: any,
    category: string
  }>>({});

  // AbortControllers keyed by cacheKey — cancel stale requests
  const abortControllers = React.useRef<Record<string, AbortController>>({});

  // Track latest request ID per category to prevent race conditions
  const tabRequestIds = React.useRef<Record<string, number>>({});

  const CACHE_TTL = 30_000; // 30s — fast switching uses cache, background refresh keeps it fresh

  // ─── Core fetch function ──────────────────────────────────────────────────
  const fetchMessages = React.useCallback(async (
    isBackground = false,
    tabParam?: string,
    page: number = 1,
    view: string = "threads",
    search: string = ""
  ) => {
    const activeTab = tabParam || selectedTab;
    const category = activeTab.startsWith("tag:") ? activeTab.replace("tag:", "") : activeTab;
    const now = Date.now();
    const cacheKey = `${category}_${page}_${view}_${search}`;
    const cached = emailCache.current[cacheKey];

    // ── FIX 1: Show cached data IMMEDIATELY, never block UI ─────────────────
    if (cached) {
      // Show cached data instantly regardless of freshness
      setMessages(cached.data);
      setTotalMessages(cached.totalMessages || 0);
      if (cached.userLabels) setUserLabels(cached.userLabels);
      if (cached.stats) setInboxStats(cached.stats);
      setLoading(false);

      // Cache still fresh? Done — no refetch needed
      if (now - cached.fetchedAt < CACHE_TTL) {
        console.log(`[fetch] cache hit (${Date.now() - now}ms)`, cacheKey);
        return;
      }

      // Cache stale — refetch silently in background (no loading spinner)
      fetchFresh(category, true /* silent */, page, view, search, cacheKey);
      return;
    }

    // No cache — show loading and fetch
    if (!isBackground) {
      // DO NOT clear messages - keep old content visible
      setIsTransitioning(true);
      setLoading(true);
    }
    await fetchFresh(category, isBackground, page, view, search, cacheKey);
  }, [selectedTab]); // eslint-disable-line

  // ─── Fresh fetch with abort + race condition protection ───────────────────
  const fetchFresh = React.useCallback(async (
    category: string,
    isBackground: boolean,
    page: number,
    view: string,
    search: string,
    cacheKey: string
  ): Promise<void> => {
    // ── FIX 2: Abort previous request for same key ───────────────────────────
    abortControllers.current[cacheKey]?.abort();
    const controller = new AbortController();
    abortControllers.current[cacheKey] = controller;

    // ── FIX 2: Unique ID per category to prevent race conditions ─────────────
    const requestId = Date.now();
    tabRequestIds.current[category] = requestId;

    const t0 = Date.now();
    console.log('[fetch] start', category, page, view, 'requestId:', requestId);

    try {
      const pageQuery = `&page=${page}&limit=50&view=${view}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const gmailUrl = `/api/google/gmail?tab=${category}${pageQuery}`;

      // Only fetch android logs on foreground initial load
      const [gmailRes, dbRes, androidRes] = await Promise.all([
        fetch(gmailUrl, { signal: controller.signal }).catch(() => null),
        fetch("/api/notes?type=ai_analysis", { signal: controller.signal }).catch(() => null),
        !isBackground ? fetch("/api/android-logs").catch(() => null) : Promise.resolve(null)
      ]);

      console.log('[fetch] got response', Date.now() - t0, 'ms');

      // ── FIX 2: Check if this is still the latest request for this category ─
      if (tabRequestIds.current[category] !== requestId) {
        console.log('[fetch] discarding stale result for', category, 'latest is', tabRequestIds.current[category]);
        return;
      }

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

      if (gmailRes?.ok) {
        const gmailData = await gmailRes.json().catch(() => ({}));
        if (gmailData.isConnected && gmailData.messages) {
          setIsConnected(true);

          const processedMessages = gmailData.messages.map((newMsg: GmailMessage) => {
            const dbMatch = currentAnalyses.find((a) => a.metadata?.gmail_id === newMsg.id);
            if (dbMatch) return { ...newMsg, classification: dbMatch.metadata.classification };
            const saved = typeof window !== 'undefined' ? localStorage.getItem(`ai_classify_${newMsg.id}`) : null;
            if (saved) try { return { ...newMsg, classification: JSON.parse(saved) }; } catch {}
            return newMsg;
          });

          if (gmailData.sync) setSyncStatus(gmailData.sync);

          // ── FIX 2: Always cache the result, even for non-active tabs ───────
          emailCache.current[cacheKey] = {
            data: processedMessages,
            fetchedAt: Date.now(),
            totalMessages: gmailData.pagination?.total || gmailData.totalMessages,
            userLabels: gmailData.userLabels,
            stats: gmailData.stats,
            category
          };

          // ── FIX 2: Only update UI if this is still the active category ─────
          const activeCategory = selectedTab.startsWith("tag:") ? selectedTab.replace("tag:", "") : selectedTab;
          if (category === activeCategory) {
            setMessages(processedMessages);
            setTotalMessages(gmailData.pagination?.total || gmailData.totalMessages || 0);
            if (gmailData.stats) setInboxStats(gmailData.stats);
            setIsTransitioning(false);
          }

          console.log('[fetch] state updated', Date.now() - t0, 'ms total');

        } else if (gmailData.isConnected === false) {
          setIsConnected(false);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[fetch] aborted for', cacheKey);
        return;
      }
      console.error("Failed to fetch messages:", error);
      setIsConnected(false);
    } finally {
      if (!isBackground) {
        setLoading(false);
        setIsTransitioning(false);
      }
    }
  }, [selectedTab, dbAnalyses]); // eslint-disable-line

  // ─── Fetch Labels and Sync Progress periodically ────────────────────────
  React.useEffect(() => {
    const fetchLabelsAndSync = async () => {
      try {
        const [labelRes, syncRes] = await Promise.all([
          fetch("/api/google/gmail?action=getLabels"),
          fetch("/api/google/gmail/sync")
        ]);

        if (labelRes.ok) {
          const data = await labelRes.json();
          if (data.success && data.labels) {
            setUserLabels(data.labels.filter((l: any) => l.type === 'user'));
          }
        }

        if (syncRes.ok) {
          const data = await syncRes.json();
          // Find the INBOX sync state which we use for general progress
          const inboxSync = data.sync_states?.find((s: any) => s.label_id === 'INBOX');
          if (inboxSync) {
            setSyncStatus(inboxSync);
          }
        }
      } catch (err) {
        console.error("Failed to fetch labels/sync:", err);
      }
    };

    fetchLabelsAndSync();
    const interval = setInterval(fetchLabelsAndSync, 300000); // Polling every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // ─── Preload adjacent tabs silently ──────────────────────────────────────
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
      const cacheKey = `${tab}_1_threads_`;
      const cached = emailCache.current[cacheKey];
      if (!cached || (now - cached.fetchedAt) > CACHE_TTL) {
        // Background preload — no loading state
        fetchFresh(tab, true, 1, "threads", "", cacheKey);
      }
    });
  }, [selectedTab]); // eslint-disable-line

  // ─── Re-fetch when tab changes ────────────────────────────────────────────
  React.useEffect(() => {
    fetchMessages(false, selectedTab);
  }, [selectedTab]); // eslint-disable-line

  // Store last known change time for auto-refresh
  const lastChangeRef = React.useRef<string | null>(null);
  const suppressPollRef = React.useRef(false);

  // ─── Auto-refresh UI when ANY change occurs ───────────────────────────────
  React.useEffect(() => {
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (loading) return;
      if (suppressPollRef.current) return;
      
      console.log('[Poll] checking last_change...');
      try {
        const res = await fetch(
          `/api/google/gmail?action=last_change`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (!res.ok) return;
        
        const data = await res.json();
        const serverLastChange = data.last_change;
        
        console.log('[Poll] server lastChange:', serverLastChange);
        console.log('[Poll] local lastChange:', lastChangeRef.current);
        
        if (!serverLastChange) return;
        
        // First poll - just store the value
        if (!lastChangeRef.current) {
          console.log('[Poll] initial load - storing lastChange:', serverLastChange);
          lastChangeRef.current = serverLastChange;
          // Trigger fresh fetch to ensure we have latest data on load
          fetchMessages(false, selectedTab);
          return;
        }
        
        // If server has newer change than we know about
        if (serverLastChange > lastChangeRef.current) {
          console.log('[Poll] CHANGE DETECTED - refreshing:', serverLastChange);
          lastChangeRef.current = serverLastChange;
          
          // ── FIX 5: Smart cache clearing - only if change happened after last fetch ──
          const category = selectedTab.startsWith("tag:") ? selectedTab.replace("tag:", "") : selectedTab;
          const cacheKey = `${category}_1_threads_`;
          const cached = emailCache.current[cacheKey];
          const serverChangeTime = new Date(serverLastChange).getTime();
          
          if (cached && serverChangeTime > cached.fetchedAt) {
            console.log('[Poll] clearing cache for:', cacheKey);
            delete emailCache.current[cacheKey];
          }

          // ── FIX 5: Background refresh only - no empty flash ───────────────
          fetchMessages(true, selectedTab);
        }
      } catch (err) {
        // Silent fail
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedTab, loading, fetchMessages]);

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
    isTransitioning,
    setIsTransitioning,
    invalidateCache: (category?: string) => {
      if (category) {
        Object.keys(emailCache.current).forEach(key => {
          if (key.startsWith(`${category}_`)) delete emailCache.current[key];
        });
      } else {
        emailCache.current = {};
      }
    },
    // ── FIX 3: Smart cache clearing for star toggle ─────────────────────────
    updateCachedStar: (messageId: string, isStarred: boolean) => {
      Object.keys(emailCache.current).forEach(key => {
        const cached = emailCache.current[key];
        if (cached) {
          cached.data = cached.data.map(m =>
            m.id === messageId ? { ...m, isStarred } : m
          );
        }
      });
      // Only invalidate starred cache if not currently on starred tab
      if (selectedTab !== 'starred') {
        Object.keys(emailCache.current).forEach(key => {
          if (key.startsWith('starred_')) delete emailCache.current[key];
        });
      }
    },
    suppressPoll: () => {
      console.log('[Poll] suppressing next poll cycles...');
      suppressPollRef.current = true;
      setTimeout(() => { suppressPollRef.current = false; }, 3000);
    },
    syncStatus
  };
}
