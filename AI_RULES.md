# 🤖 ARCIGY CRM - AI AGENT MASTER RULES

> **CRITICAL WARNING FOR AI:** Tieto pravidlá sú absolútne záväzné. Akýkoľvek odklon od týchto pravidiel môže kriticky narušiť stabilitu produkčného systému. Vždy dávaj prednosť stabilite a modularite pred "rýchlymi hackmi".

---

## 🏗️ 1. ARCHITEKTÚRA: "The Black Box" Tool System
- **Úplná nezávislosť:** Každý nástroj (tool) je **samostatný modul**. Výpadok alebo chyba v jednom module (`src/tools/[tool-id]`) nesmie zhodnotiť zvyšok CRM.
- **Registry Pattern:** Všetky nástroje sa registrujú cez centrálny súbor `src/tools/registry.ts`. Nástroj neexistuje, kým tam nie je prihlásený.
- **Odstraňovanie nástrojov:** Nástroj sa vypína v Registry (`enabled: false`), nikdy sa reálne nevymazávajú prepojené databázové riadky.

## 💾 2. DATABÁZA: "Directus Native" (No Supabase)
- **ZÁKAZ MAZANIA (Soft Deletes Only):** Žiadny záznam sa nikdy reálne nemaže (napr. `.deleteOne()`). Každá tabuľka musí využívať stĺpec `deleted_at`, `is_deleted` alebo status `'archived'`.
- **ZÁKAZ SUPABASE:** Pre dáta sa používa výhradne Directus (PostgreSQL). Supabase sa v tomto projekte **nepoužíva**. Všetok kód so Supabase treba nahradiť za Directus volania.
- **Relácie:** Unified Contacts. Každý tool musí mať svoju dáta prepojené na centrálnu tabuľku `contacts` cez `contact_id`.

## 🎨 3. DIZAJNOVÝ JAZYK: "Violet Branding"
- **Jednotná téma:** Používaj VÝHRADNE Violet/Fialovú farbovú schému (napr. `violet-500`, `violet-600` pre CTA).
- **Glassmorphism:** Komponenty používajú polotransparentné pozadia (`bg-slate-900`, `bg-[#0f1115]`), jemné rohy (`rounded-xl`) a okraje (`border-violet-900/30`).
- **Knižnice:** Ikony musia byť **VÝHRADNE** z `lucide-react`. Styling **VÝHRADNE** cez Tailwind CSS (žiadne inline styles).
- **Dashboard Primary Size (CRITICAL):** Hlavné widgety na nástenke (`Tasks`, `Calendar`, `Quick Action`, `Pipeline`) majú primárnu výšku **340px** (`md:h-[340px]`). Na menších oknách sa systém NESMIE pokúšať bubliny zmenšovať – namiesto toho sa musí povoliť skrolovanie celej stránky.

## 🧩 4. VIBE CODE PROTOKOL: "Anti-Spaghetti"
- **Prísny limit:** Súbor nesmie presiahnuť **150 riadkov**. Ak je dlhší, musí sa rozdeliť na menšie, nezávislé moduly.
- **Separácia Logiky:** 
  - UI = `/components`
  - Matematika/API volania = `/hooks` alebo `/actions`
  - Typy = `/types`
- **Žiadne hardcoded dáta:** Všetky kľúče, URL adresy a Stripe ID musia ísť do `.env`.

## 💳 5. PLATBY: "Stripe-Only"
- **Zákaz custom platobnej logiky:** Záležitosti okolo faktúr a platieb sa riešia v Stripe Customer Portal.
- **Source of Truth = Webhook:** Tlačidlá na webe prístup neudeľujú. Prístup sa odomyká VÝHRADNE cez Stripe Webhook na základe `subscription.status`.

## 🤖 6. AGENT & AI WORKFLOW
- **Nestrácaj kontext:** IDčká (napr. z `contact_id`) sa musia odovzdávať po celý čas behu nástrojov bez nutnosti ich opakovaného hľadania.
- **Self-Healing:** Ak tool zlyhá, systém musí automaticky uskutočniť nápravný krok pred tým, než eskaluje chybu používateľovi.
- **Slovak Response:** Agent vždy komunikuje, loguje a sumarizuje smerom k užívateľovi (cez Verifier) v priateľskej **slovenčine**. Žiadne stack traces nejdú do UI.

## 💻 7. DEV & DEPLOYMENT PROSTREDIE
- **Windows / PowerShell Environment:** Ak spúšťaš skripty, v syntaxi použi VÝHRADNE `Invoke-RestMethod` (žiadny bash `curl -X POST`).
- **Lokálne Testovanie:** Aplikácia sa vyvíja cez `npm run dev`. Po finálnej zmene AI kódu musí byť server reštartovaný.
- **Git:** Zmeny sa posielajú do produkcie výhradne na pokyn používateľa (`git push origin main` automaticky odštartuje deploy na Railway).

> **AI INSTRUCTION:** Pred akýmkoľvek zásahom do kódu si pripomeň pravidlo Soft Deletes a limit dĺžky kódu. Prvým krokom pri akejkoľvek integrácii nech je validácia správneho umiestnenia dizajnových princípov (Violet Branding) a kontrola `registry.ts`.
