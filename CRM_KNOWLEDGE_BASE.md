# CRM Agent Customization - Architecture, Design & Tools

Tento dokument slúži ako prehľad dizajnového jazyka, architektúry a zoznamu všetkých modulov (Tools) v systéme. Môžeš ho nahrať ako custom inštrukcie pre AI, aby poznalo aktuálny stav.

## 🎨 Dizajnový Jazyk & UI (Violet Branding)

Systém používa konzistentnú tému zameranú na **Violet / Fialové** farby, aby pôsobil prémiovo, moderne a čisto.

- **Primary Colors:** `violet-500`, `violet-600` pre aktívne prvky (tlačidlá, ikonky, hover efekty).
- **Backgrounds & Panels:** Tmavé pozadia (`bg-slate-900`, `bg-[#0f1115]`, `bg-[#0b0c10]`), s jemnými fialovými nádychmi pri hover (`hover:bg-violet-900/20`, `bg-violet-950/30`).
- **Borders & Dividers:** Jemné orámovania na oddelenie obsahu (`border-violet-900/30`, `border-white/5`, `border-white/10`).
- **Typography:** Čitateľné písma, biely text pre primárne údaje, `text-slate-400` alebo `text-white/60` pre sekundárne.
- **Efekty:** Glassmorphism, zaoblené rohy (`rounded-lg`, `rounded-xl`), jemné tieňovanie (`shadow-lg shadow-violet-900/20`), plynulé prechody (`transition-all duration-200`).
- **Ikony:** Výhradne `lucide-react`.

## 🏗️ Architektúra "The Black Box" Tool System

- **Registry:** Všetky nástroje (Tools) sú registrované v `src/tools/registry.ts`.
- **Modulárnosť:** Každý nástroj je nezávislá sekcia. Výpadok alebo zmazanie jedného toolu nesmie zničiť celú aplikáciu.
- **Routing:** Tooly sú štandardne dostupné na `/dashboard/[tool-id]`.
- **Backend/DB:** Údaje sa ukladajú výhradne do Directusu, nie Supabase. Zabezpečené soft-deletes a správne relácie na centrálne kontakty.
- **Paywall/Stripe:** Prístup ku prémiovým tools je riešený cez Stripe Webhook (kontrola `stripePriceId` definovaného v `registry.ts`).

## 🛠️ Zoznam registrovaných nástrojov (Tools)

1. **Google Maps Scraper** `google-maps`
   - Oprávnenia: Obmedzené e-maily
   - Popis: Automatizované získavanie kontaktov z Google Maps (Safe Mode).
2. **Projekty** `projects`
   - Popis: Správa klientskych projektov, sledovanie štádií a termínov.
3. **Kalendár** `calendar`
   - Popis: Plná synchronizácia s Google Kalendárom, správa úloh a stretnutí.
4. **Leads Inbox** `leads`
   - Popis: Synchronizácia s Gmailom a správa potenciálnych klientov z e-mailov.
5. **Booking System** `booking`
   - Popis: Vlastný scheduler typu Cal.com pre plánovanie stretnutí.
6. **To Do** `todo`
   - Popis: Osobný task manažér pre každodenné úlohy.
7. **Notes** `notes`
   - Popis: Rýchle poznámky a myšlienky na jednom mieste.
8. **Moje Súbory** `files`
   - Popis: Správa všetkých firemných súborov cez Google Drive.
9. **Fakturácia** `invoicing`
   - Popis: Vlastný fakturačný systém pre firmu.
10. **Cenové Ponuky** `quotes`
    - Popis: Tvorba a správa custom cenových ponúk.
11. **Zmluvy** `contracts`
    - Popis: Generovanie a správa klientskych zmlúv.
12. **Cold Outreach** `outreach`
    - Oprávnenia: Obmedzené e-maily
    - Popis: Automatizovaný cold outreach s AI analýzou odpovedí.
13. **Dummy Tool** `dummy-tool`
    - Popis: Testovací tool na validáciu prístupov a platieb.

Tieto pravidlá a zoznam nástrojov musí AI vždy rešpektovať pri tvorbe nových funkcií.
