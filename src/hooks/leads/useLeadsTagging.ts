"use client";

import * as React from "react";

export function useLeadsTagging() {
  const [customTags, setCustomTags] = React.useState<string[]>([]);
  const [tagColors, setTagColors] = React.useState<Record<string, string>>({});
  const [messageTags, setMessageTags] = React.useState<Record<string, string[]>>({});

  const getSmartTags = (classification: any): string[] => {
    // Original smart tags disabled by user request
    return [];
  };

  const applySmartTagging = (messageId: string, classification: any) => {
    const newTags = getSmartTags(classification);
    if (newTags.length > 0) {
      setMessageTags(prev => {
        const existing = prev[messageId] || [];
        const merged = Array.from(new Set([...existing, ...newTags]));
        return { ...prev, [messageId]: merged };
      });
    }
  };

  return {
    customTags, setCustomTags,
    tagColors, setTagColors,
    messageTags, setMessageTags,
    getSmartTags,
    applySmartTagging
  };
}
