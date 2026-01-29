import OpenAI from "openai";
import { getIsolatedAIContext } from "@/lib/ai-context";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function classifyEmail(
  content: string,
  userEmail?: string,
  sender?: string,
  subject?: string,
) {
  let context = {
    user_nickname: "",
    user_profession: "",
    user_custom_instructions: "",
    business_company_name: "",
    business_industry: "",
    business_goals: "",
    business_services: "",
    communication_tone: "",
    ai_focus_areas: "",
    learned_memories: [] as string[],
  };

  if (userEmail) {
    context = await getIsolatedAIContext(userEmail, "LEAD_ANALYSIS");
  }

  const prompt = `
Si **profesionálny CRM asistent** špecializovaný na extrakciu dát a kategorizáciu klientskej komunikácie. Tvojou úlohou je analyzovať prichádzajúci e-mail.

---

## KONTEXT POUŽÍVATEĽA (PERSONALIZÁCIA)
Tieto informácie ti pomôžu správne interpretovať e-mail v kontexte firmy ${context.business_company_name}:

* **Firma:** ${context.business_company_name} (${context.business_industry})
* **Služby:** ${context.business_services}
* **Ciele:** ${context.business_goals}
* **Zameranie AI:** ${context.ai_focus_areas}
* **Učenie:** ${context.learned_memories.join("\n")}

---

## ŠPECIFICKÉ INŠTRUKCIE (CUSTOM PROMPT)
${context.user_custom_instructions || "Postupuj podľa štandardných pravidiel."}

---

## 1. Detekcia nerelevantného obsahu (Spam Filter)

Akonáhle zistíš, že ide o **SPAM, NEWSLETTER, REKLAMU** alebo nerelevantnú hromadnú správu, aplikuj tento protokol:

1. **Intent:** Nastav na \`spam\`.
2. **Priority:** Nastav na \`nizka\`.
3. **Summary:** Napíš výhradne \`Filter: Spam/Newsletter\`.
4. **Ostatné polia:** Všetky ostatné kategórie (service_category, estimated_budget, next_step, deadline) nastav na hodnotu \`—\`.
5. **Akcia:** Okamžite ukonči analýzu.

---

## 3. Schéma analýzy relevantnej správy

Ak je správa vyhodnotená ako relevantná, vyplň nasledujúce body:

* **Intent:** Vyber jedno z (dopyt, otazka, problem, faktura, ine).
* **Priority:** Vyber jedno z (vysoka, stredna, nizka).
* **Sentiment:** Urči emočné ladenie správy.
* **Service Category:** Identifikuj typ požadovanej služby.
* **Summary:** Stručné a vecné zhrnutie obsahu.
* **Estimated Budget:** Ak je spomenutý, uveď sumu, inak \`—\`.
* **Next Step:** Navrhni najbližší logický krok.
* **Deadline:** Ak je v texte uvedený konkrétny termín, extrahuj ho.
* **Entities:** Extrahuj kontaktné údaje v JSON objekte:
    * **contact_name:** Meno odosielateľa/podpis (napr. "Ján Novák").
    * **company_name:** Názov firmy (napr. "Novák s.r.o.").
    * **phone:** Telefónne číslo v medzinárodnom formáte (napr. "+421 905 ...").
    * **email:** Email z textu alebo hlavičky (ak je dostupný).
    * **website:** Webová stránka/doména firmy (napr. "www.firma.sk", "firma.sk", "https://..."). Hľadaj hlavne v podpise alebo pri kontaktných údajoch. Ak je ich viac, vyber hlavnú firemnú stránku.

---

## 4. Príklady (Few-Shot Learning)

### Príklad 1: Relevantný dopyt
**Input:**
Subject: Záujem o inštaláciu FVE
Body: Dobrý deň, mali by sme záujem o inštaláciu 10kW systému na náš dom v Nitre. Máme strechu na juh. Aká by bola cena? Chceli by sme to stihnúť do konca leta.
Sender: jan.novak@gmail.com

**Output:**
{
  "intent": "dopyt",
  "priority": "vysoka",
  "sentiment": "pozitivny",
  "service_category": "Fotovoltika (FVE)",
  "summary": "Klient Ján Novák má záujem o 10kW FVE systém pre rodinný dom v Nitre s orientáciou na juh. Požaduje realizáciu do konca leta.",
  "estimated_budget": "—",
  "next_step": "Pripraviť predbežnú cenovú ponuku a dohodnúť obhliadku.",
  "deadline": "Koniec leta",
  "entities": {
      "contact_name": "Ján Novák",
      "company_name": "—",
      "phone": "—",
      "email": "jan.novak@gmail.com",
      "website": "—"
  }
}

### Príklad 2: Spam / Newsletter
**Input:**
Subject: Výpredaj tonerov -50%!
Body: Vážený zákazník, nenechajte si ujsť našu jarnú akciu na všetky tonery HP a Canon. Kliknite sem pre zľavu.
Sender: promo@tonery-lacno.sk

**Output:**
{
  "intent": "spam",
  "priority": "nizka",
  "sentiment": "neutralny",
  "service_category": "—",
  "summary": "Filter: Spam/Newsletter",
  "estimated_budget": "—",
  "next_step": "—",
  "deadline": "—",
  "entities": {
      "contact_name": "—",
      "company_name": "—",
      "phone": "—",
      "email": "promo@tonery-lacno.sk",
      "website": "—"
  }
}

---

## 5. Vstup na analýzu

KOMPLETNÝ EMAIL:

MENO ADRESÁTA (ODOSIELATEĽ):
"""
${sender || "Neznámy"}
"""

SUBJECT:
"""
${subject || "Bez predmetu"}
"""

E-MAIL:
"""
${content}
"""

Vráť čistý JSON. Odpovedaj v slovenčine.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Si expert na analýzu obchodnej komunikácie. Odpovedáš striktne v JSON formáte.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("AI Classification Error:", error);
    return null;
  }
}
