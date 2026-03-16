"use client";

import * as React from "react";

export function useLeadsTagging() {
  const [messageTags, setMessageTags] = React.useState<Record<string, string[]>>({});

  const getSmartTags = (classification: any): string[] => {
    return [];
  };

  const applySmartTagging = (messageId: string, classification: any) => {
    // Disabled as requested
  };

  return {
    messageTags, setMessageTags,
    getSmartTags,
    applySmartTagging
  };
}
