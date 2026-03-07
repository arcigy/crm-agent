"use client";

import * as React from "react";

export function useLeadsTagging() {
  const [customTags, setCustomTags] = React.useState<string[]>([
    "NALIEHAVÉ", "URGENTNÉ", "NOVÝ OBCHOD", "SERVIS", "VYBAVOVAČKY"
  ]);
  const [tagColors, setTagColors] = React.useState<Record<string, string>>({
    "NALIEHAVÉ": "#ff6d00",
    "URGENTNÉ": "#ff2040",
    "NOVÝ OBCHOD": "#00e676",
    "SERVIS": "#00b0ff",
    "VYBAVOVAČKY": "#ffab00"
  });
  const [messageTags, setMessageTags] = React.useState<Record<string, string[]>>({});

  const getSmartTags = (classification: any): string[] => {
    if (!classification) return [];
    const tags: string[] = [];

    const intent    = (classification.intent || "").toLowerCase();
    const priority  = (classification.priority || "").toLowerCase();
    const sentiment = (classification.sentiment || "").toLowerCase();
    const summary   = (classification.summary || "").toLowerCase();
    const category  = (classification.service_category || "").toLowerCase();
    const combined  = summary + " " + category;

    const krisisKeywords = [
      "zastavil", "stopka", "chyba", "záloha", "kataster vrátil",
      "opravte", "súdny", "predvolanie", "povinná", "zajtra",
      "ráno", "betón", "termín", "vytýčenie", "blokovaný"
    ];
    const isKrisisKeyword = krisisKeywords.some(k => combined.includes(k));

    const financialKeywords = [
      "faktúra", "upomienka", "splatnosť", "hypotéka", "banka",
      "reklamácia", "doplňte", "výzva", "48 hod", "po splatnosti",
      "zmen", "pozor"
    ];
    const isFinancialKeyword = financialKeywords.some(k => combined.includes(k));

    const servisKeywords = [
      "posielam", "príloha", "dwg", "mapy", "kľúče", "prístup",
      "súhlas", "podpísal", "sken", "rodné číslo", "vlastník",
      "podklady", "dokumenty", "doplnenie"
    ];
    const isServisKeyword = servisKeywords.some(k => combined.includes(k));

    if (priority === "vysoka" && (isKrisisKeyword || (intent === "problem" && sentiment === "negativny"))) {
      tags.push("NALIEHAVÉ");
    } else if (priority === "vysoka" && (intent === "faktura" || isFinancialKeyword || sentiment === "negativny")) {
      tags.push("URGENTNÉ");
    } else if (priority === "vysoka") {
      tags.push("URGENTNÉ");
    }

    if (intent === "dopyt") {
      tags.push("NOVÝ OBCHOD");
    } else if (intent === "problem" && !tags.includes("NALIEHAVÉ")) {
      tags.push("SERVIS");
    } else if (isServisKeyword && !tags.some(t => ["NALIEHAVÉ", "URGENTNÉ"].includes(t))) {
      tags.push("SERVIS");
    } else if ((intent === "faktura" && priority !== "vysoka") || priority === "nizka") {
      if (!tags.length) tags.push("VYBAVOVAČKY");
    }

    return Array.from(new Set(tags));
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
