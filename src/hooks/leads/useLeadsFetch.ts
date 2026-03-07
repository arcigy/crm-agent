"use client";

import * as React from "react";
import { GmailMessage } from "@/types/gmail";
import { AndroidLog } from "@/types/android";

export function useLeadsFetch(
  initialMessages: GmailMessage[],
  getSmartTags: (c: any) => string[]
) {
  const [messages, setMessages] = React.useState<GmailMessage[]>(initialMessages);
  const [dbAnalyses, setDbAnalyses] = React.useState<any[]>([]);
  const [androidLogs, setAndroidLogs] = React.useState<AndroidLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);

  const fetchMessages = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const dbRes = await fetch("/api/notes?type=ai_analysis");
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.success) setDbAnalyses(dbData.notes || []);
      }

      const gmailRes = await fetch("/api/google/gmail", { cache: "no-store" });
      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        if (gmailData.isConnected && gmailData.messages) {
          setIsConnected(true);
          const smartTagsBatch: Record<string, string[]> = {};
          setMessages((prev) => {
            return gmailData.messages.map((newMsg: GmailMessage) => {
              const existing = prev.find((p) => p.id === newMsg.id);
              let classification = existing?.classification;
              if (!classification) {
                const dbMatch = dbAnalyses.find((a) => a.metadata?.gmail_id === newMsg.id);
                if (dbMatch) classification = dbMatch.metadata.classification;
                else {
                  const saved = typeof window !== 'undefined' ? localStorage.getItem(`ai_classify_${newMsg.id}`) : null;
                  if (saved) classification = JSON.parse(saved);
                }
              }
              if (classification) {
                const tags = getSmartTags(classification);
                if (tags.length > 0) smartTagsBatch[newMsg.id] = tags;
                return { ...newMsg, classification };
              }
              return newMsg;
            });
          });
        } else if (gmailData.isConnected === false) setIsConnected(false);
      }

      try {
        if (!isBackground) {
          const androidRes = await fetch("/api/android-logs");
          if (androidRes.ok) {
            const androidData = await androidRes.json();
            if (androidData.success) setAndroidLogs(androidData.logs);
          }
        }
      } catch (e) { console.error("Android logs fetch error", e); }
    } catch (error) { console.error("Failed to fetch inbox:", error); } 
    finally { setLoading(false); }
  };

  return {
    messages, setMessages,
    dbAnalyses, setDbAnalyses,
    androidLogs, setAndroidLogs,
    loading, setLoading,
    isConnected, setIsConnected,
    fetchMessages
  };
}
