"use client";

import { GmailMessage } from "@/types/gmail";

export function useLeadsMockData() {
  const getMockMessages = (getSmartTags: (c: any) => string[]): GmailMessage[] => {
    if (process.env.NODE_ENV !== "development") return [];

    const mockTemplates = [
      {
        from: "Marek Urgentný <marek@servis-web.sk>",
        subject: "KRÍZA: Celý systém spadol!",
        body: "SÚRNE! Nefunguje nám webová stránka, klienti sa nevedia prihlásiť. Potrebujem to vyriešiť do hodiny, inak prichádzame o peniaze. Prosím, volajte mi hneď!",
        snippet: "SÚRNE! Nefunguje nám webová stránka, klienti sa nevedia prihlásiť. Potrebujem to vyriešiť...",
        budget: "—",
        intent: "problem",
        category: "Technická podpora",
        nextStep: "Okamžite nahodiť server a volať klientovi",
        priority: "vysoka"
      },
      {
        from: "Andrej Networking <andrej@biznis-klub.sk>",
        subject: "Dajme kávu / Lunch?",
        body: "Ahoj, sledoval som tvoj posledný projekt a fakt super práca. Nechceš skočiť niekedy budúci týždeň na kávu alebo spoločný lunch? Rád by som prebral možnosti spolupráce a networking.",
        snippet: "Ahoj, sledoval som tvoj posledný projekt a fakt super práca. Nechceš skočiť niekedy...",
        budget: "—",
        intent: "ine",
        category: "Networking",
        nextStep: "Navrhnúť termín na stretnutie",
        priority: "nizka"
      },
      {
        from: "Účtovníctvo <faktury@ucto-plus.sk>",
        subject: "Faktúra za február 2026",
        body: "Dobrý deň, v prílohe vám posielam faktúru za služby za mesiac február. Prosím o úhradu v lehote splatnosti. V prípade otázok ma neváhajte kontaktovať.",
        snippet: "Dobrý deň, v prílohe vám posielam faktúru za služby za mesiac február. Prosím o úhradu...",
        budget: "250 €",
        intent: "faktura",
        category: "Administratíva",
        nextStep: "Uhradiť faktúru do 14 dní",
        priority: "stredna"
      }
    ];

    return Array.from({ length: 155 }).map((_, i) => {
      const template = mockTemplates[i % mockTemplates.length];
      const id = `mock-${i}`;
      
      let isRead = false;
      let isStarred = false;
      if (typeof window !== 'undefined') {
        try {
          isRead = localStorage.getItem(`email_read_mock-${i}`) === "true";
          isStarred = localStorage.getItem(`email_starred_mock-${i}`) === "true";
        } catch(e) {}
      }

      const classification = {
        intent: (template.intent as any),
        priority: (template.priority as any),
        estimated_budget: template.budget,
        summary: template.body.substring(0, 80) + "...",
        next_step: template.nextStep,
        service_category: template.category,
        sentiment: "pozitivny" as any
      };

      return {
        id,
        threadId: `thread-${i}`,
        from: template.from,
        subject: `${template.subject} #${i + 1}`,
        snippet: template.snippet,
        date: new Date(Date.now() - i * 1800000).toISOString(),
        isRead,
        isStarred,
        body: template.body,
        labels: ["INBOX"],
        classification
      };
    });
  };

  return { getMockMessages };
}
